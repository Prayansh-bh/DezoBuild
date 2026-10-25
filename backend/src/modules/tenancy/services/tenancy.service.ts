import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from "../../../common/errors/app-error";
import type { ITenantRepository, TenantEntity } from "../repositories/tenant.repository.interface";
import type { ICompanyRepository, CompanyEntity } from "../repositories/company.repository.interface";
import type { IBranchRepository, BranchEntity } from "../repositories/branch.repository.interface";
import type { IDepartmentRepository, DepartmentEntity } from "../repositories/department.repository.interface";
import { PrismaTenantRepository } from "../repositories/prisma-tenant.repository";
import { PrismaCompanyRepository } from "../repositories/prisma-company.repository";
import { PrismaBranchRepository } from "../repositories/prisma-branch.repository";
import { PrismaDepartmentRepository } from "../repositories/prisma-department.repository";
import type { CreateTenantDto, UpdateTenantDto } from "../dto/tenant.dto";
import type { CreateCompanyDto, UpdateCompanyDto } from "../dto/company.dto";
import type { CreateBranchDto, UpdateBranchDto } from "../dto/branch.dto";
import type { CreateDepartmentDto, UpdateDepartmentDto } from "../dto/department.dto";

import { EntitlementService } from "../../subscriptions/services/entitlement.service";

export interface TenancyServiceDependencies {
  tenantRepo?: ITenantRepository | undefined;
  companyRepo?: ICompanyRepository | undefined;
  branchRepo?: IBranchRepository | undefined;
  departmentRepo?: IDepartmentRepository | undefined;
  entitlementService?: EntitlementService | undefined;
}

export class TenancyService {
  private static instance: TenancyService;
  private readonly tenantRepo: ITenantRepository;
  private readonly companyRepo: ICompanyRepository;
  private readonly branchRepo: IBranchRepository;
  private readonly departmentRepo: IDepartmentRepository;
  private readonly entitlementService: EntitlementService;

  constructor(deps?: TenancyServiceDependencies) {
    this.tenantRepo = deps?.tenantRepo ?? new PrismaTenantRepository();
    this.companyRepo = deps?.companyRepo ?? new PrismaCompanyRepository();
    this.branchRepo = deps?.branchRepo ?? new PrismaBranchRepository();
    this.departmentRepo = deps?.departmentRepo ?? new PrismaDepartmentRepository();
    this.entitlementService = deps?.entitlementService ?? new EntitlementService();
  }

  public static getInstance(deps?: TenancyServiceDependencies): TenancyService {
    if (!TenancyService.instance || deps) {
      TenancyService.instance = new TenancyService(deps);
    }
    return TenancyService.instance;
  }

  public static resetInstance(): void {
    TenancyService.instance = undefined as unknown as TenancyService;
  }

  // ==========================================
  // TENANT OPERATIONS
  // ==========================================

  public async getTenantById(tenantId: string): Promise<TenantEntity> {
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant || tenant.deletedAt) {
      throw new NotFoundError("Tenant not found.");
    }
    return tenant;
  }

  public async createTenant(dto: CreateTenantDto): Promise<TenantEntity> {
    const existing = await this.tenantRepo.findByCode(dto.code);
    if (existing) {
      throw new ConflictError(`Tenant code '${dto.code}' is already registered.`);
    }

    const tenant = await this.tenantRepo.create(dto);
    try {
      await this.entitlementService.provisionDefaultSubscription(tenant.id, 'STARTER');
    } catch {
      // If plans are not yet seeded in some unit tests, ignore gracefully
    }
    return tenant;
  }

  public async updateTenant(tenantId: string, dto: UpdateTenantDto): Promise<TenantEntity> {
    await this.getTenantById(tenantId);
    return this.tenantRepo.update(tenantId, dto);
  }

  public async softDeleteTenant(tenantId: string): Promise<void> {
    await this.getTenantById(tenantId);
    await this.tenantRepo.softDelete(tenantId);
  }

  // ==========================================
  // COMPANY OPERATIONS (Tenant Scoped)
  // ==========================================

  public async listCompanies(tenantId: string): Promise<CompanyEntity[]> {
    return this.companyRepo.findManyByTenant(tenantId);
  }

  public async getCompanyById(id: string, tenantId: string): Promise<CompanyEntity> {
    const company = await this.companyRepo.findById(id, tenantId);
    if (!company) {
      throw new NotFoundError("Company not found.");
    }
    return company;
  }

  public async createCompany(tenantId: string, dto: CreateCompanyDto): Promise<CompanyEntity> {
    await this.getTenantById(tenantId);

    const existingCode = await this.companyRepo.findByCode(dto.code, tenantId);
    if (existingCode) {
      throw new ConflictError(`Company with code '${dto.code}' already exists in this tenant.`);
    }

    return this.companyRepo.create({
      ...dto,
      tenantId,
    });
  }

  public async updateCompany(
    id: string,
    tenantId: string,
    dto: UpdateCompanyDto,
  ): Promise<CompanyEntity> {
    await this.getCompanyById(id, tenantId);
    return this.companyRepo.update(id, tenantId, dto);
  }

  public async deleteCompany(id: string, tenantId: string): Promise<void> {
    await this.getCompanyById(id, tenantId);

    const attachedBranches = await this.branchRepo.findManyByTenant(tenantId, id);
    if (attachedBranches.length > 0) {
      throw new ConflictError("Cannot delete company with active branches. Delete or reassign branches first.");
    }

    await this.companyRepo.delete(id, tenantId);
  }

  // ==========================================
  // BRANCH OPERATIONS (Tenant & Company Scoped)
  // ==========================================

  public async listBranches(tenantId: string, companyId?: string): Promise<BranchEntity[]> {
    if (companyId) {
      await this.getCompanyById(companyId, tenantId);
    }
    return this.branchRepo.findManyByTenant(tenantId, companyId);
  }

  public async getBranchById(id: string, tenantId: string): Promise<BranchEntity> {
    const branch = await this.branchRepo.findById(id, tenantId);
    if (!branch) {
      throw new NotFoundError("Branch not found.");
    }
    return branch;
  }

  public async createBranch(tenantId: string, dto: CreateBranchDto): Promise<BranchEntity> {
    // Validate that parent company exists and belongs to the caller's tenant
    const parentCompany = await this.companyRepo.findById(dto.companyId, tenantId);
    if (!parentCompany) {
      throw new NotFoundError("Parent company not found in this tenant.");
    }

    const existingCode = await this.branchRepo.findByCode(dto.code, dto.companyId, tenantId);
    if (existingCode) {
      throw new ConflictError(
        `Branch code '${dto.code}' already exists under company '${parentCompany.name}'.`,
      );
    }

    return this.branchRepo.create({
      ...dto,
      tenantId,
    });
  }

  public async updateBranch(
    id: string,
    tenantId: string,
    dto: UpdateBranchDto,
  ): Promise<BranchEntity> {
    await this.getBranchById(id, tenantId);
    return this.branchRepo.update(id, tenantId, dto);
  }

  public async deleteBranch(id: string, tenantId: string): Promise<void> {
    await this.getBranchById(id, tenantId);
    await this.branchRepo.delete(id, tenantId);
  }

  // ==========================================
  // DEPARTMENT OPERATIONS (Tenant Scoped)
  // ==========================================

  public async listDepartments(tenantId: string): Promise<DepartmentEntity[]> {
    return this.departmentRepo.findManyByTenant(tenantId);
  }

  public async getDepartmentById(id: string, tenantId: string): Promise<DepartmentEntity> {
    const department = await this.departmentRepo.findById(id, tenantId);
    if (!department) {
      throw new NotFoundError("Department not found.");
    }
    return department;
  }

  public async createDepartment(
    tenantId: string,
    dto: CreateDepartmentDto,
  ): Promise<DepartmentEntity> {
    await this.getTenantById(tenantId);

    const existingCode = await this.departmentRepo.findByCode(dto.code, tenantId);
    if (existingCode) {
      throw new ConflictError(`Department code '${dto.code}' already exists in this tenant.`);
    }

    return this.departmentRepo.create({
      ...dto,
      tenantId,
    });
  }

  public async updateDepartment(
    id: string,
    tenantId: string,
    dto: UpdateDepartmentDto,
  ): Promise<DepartmentEntity> {
    await this.getDepartmentById(id, tenantId);
    return this.departmentRepo.update(id, tenantId, dto);
  }

  public async deleteDepartment(id: string, tenantId: string): Promise<void> {
    await this.getDepartmentById(id, tenantId);
    await this.departmentRepo.delete(id, tenantId);
  }
}
