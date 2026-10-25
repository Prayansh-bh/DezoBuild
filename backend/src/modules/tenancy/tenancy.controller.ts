import type { IncomingMessage } from "node:http";
import { TenancyService } from "./services/tenancy.service";
import { requireAuth } from "../../common/middleware/auth.guard";
import { DtoValidator } from "../../common/validation/validator";
import { createSuccessResponse, type ApiResponse } from "../../common/dto/api-response.dto";
import { createTenantDtoSchema, updateTenantDtoSchema } from "./dto/tenant.dto";
import { createCompanyDtoSchema, updateCompanyDtoSchema } from "./dto/company.dto";
import { createBranchDtoSchema, updateBranchDtoSchema } from "./dto/branch.dto";
import { createDepartmentDtoSchema, updateDepartmentDtoSchema } from "./dto/department.dto";
import type { TenantEntity } from "./repositories/tenant.repository.interface";
import type { CompanyEntity } from "./repositories/company.repository.interface";
import type { BranchEntity } from "./repositories/branch.repository.interface";
import type { DepartmentEntity } from "./repositories/department.repository.interface";
import { ForbiddenError } from "../../common/errors/app-error";

export class TenancyController {
  private readonly tenancyService: TenancyService;

  constructor(tenancyService?: TenancyService) {
    this.tenancyService = tenancyService || TenancyService.getInstance();
  }

  // ==========================================
  // TENANTS
  // ==========================================

  public async getTenant(req: IncomingMessage & { params?: { id?: string } }): Promise<ApiResponse<TenantEntity>> {
    const principal = await requireAuth(req);
    const targetTenantId = req.params?.id;

    // Cross-tenant protection: caller can only inspect their own tenant
    if (targetTenantId && targetTenantId !== principal.tenantId) {
      throw new ForbiddenError("Access to foreign tenant is strictly forbidden.");
    }

    const tenant = await this.tenancyService.getTenantById(principal.tenantId);
    return createSuccessResponse(tenant, "Tenant details retrieved");
  }

  public async createTenant(req: IncomingMessage & { body?: unknown }): Promise<ApiResponse<TenantEntity>> {
    const principal = await requireAuth(req);

    // Platform Boundary Gate: Ordinary customer users bound to an existing tenant
    // are strictly prohibited from provisioning arbitrary new tenants.
    // Tenant provisioning is reserved for SUPER_ADMIN / Platform Governance context.
    const isPlatformContext =
      principal.tenantId === "PLATFORM" ||
      principal.tenantId === "00000000-0000-0000-0000-000000000000";

    if (!isPlatformContext) {
      throw new ForbiddenError("Tenant provisioning is strictly restricted to platform administration.");
    }

    const validatedDto = DtoValidator.validate(createTenantDtoSchema, req.body);
    const tenant = await this.tenancyService.createTenant(validatedDto);
    return createSuccessResponse(tenant, "Tenant created successfully");
  }

  public async updateTenant(req: IncomingMessage & { params?: { id?: string }; body?: unknown }): Promise<ApiResponse<TenantEntity>> {
    const principal = await requireAuth(req);
    const targetTenantId = req.params?.id || principal.tenantId;

    if (targetTenantId !== principal.tenantId) {
      throw new ForbiddenError("Access to foreign tenant is strictly forbidden.");
    }

    const validatedDto = DtoValidator.validate(updateTenantDtoSchema, req.body);
    const tenant = await this.tenancyService.updateTenant(principal.tenantId, validatedDto);
    return createSuccessResponse(tenant, "Tenant updated successfully");
  }

  // ==========================================
  // COMPANIES
  // ==========================================

  public async listCompanies(req: IncomingMessage): Promise<ApiResponse<CompanyEntity[]>> {
    const principal = await requireAuth(req);
    const companies = await this.tenancyService.listCompanies(principal.tenantId);
    return createSuccessResponse(companies, "Companies retrieved successfully");
  }

  public async getCompany(req: IncomingMessage & { params?: { id?: string } }): Promise<ApiResponse<CompanyEntity>> {
    const principal = await requireAuth(req);
    const id = req.params?.id!;
    const company = await this.tenancyService.getCompanyById(id, principal.tenantId);
    return createSuccessResponse(company, "Company details retrieved");
  }

  public async createCompany(req: IncomingMessage & { body?: unknown }): Promise<ApiResponse<CompanyEntity>> {
    const principal = await requireAuth(req);
    const validatedDto = DtoValidator.validate(createCompanyDtoSchema, req.body);
    const company = await this.tenancyService.createCompany(principal.tenantId, validatedDto);
    return createSuccessResponse(company, "Company created successfully");
  }

  public async updateCompany(req: IncomingMessage & { params?: { id?: string }; body?: unknown }): Promise<ApiResponse<CompanyEntity>> {
    const principal = await requireAuth(req);
    const id = req.params?.id!;
    const validatedDto = DtoValidator.validate(updateCompanyDtoSchema, req.body);
    const company = await this.tenancyService.updateCompany(id, principal.tenantId, validatedDto);
    return createSuccessResponse(company, "Company updated successfully");
  }

  public async deleteCompany(req: IncomingMessage & { params?: { id?: string } }): Promise<ApiResponse<{ message: string }>> {
    const principal = await requireAuth(req);
    const id = req.params?.id!;
    await this.tenancyService.deleteCompany(id, principal.tenantId);
    return createSuccessResponse({ message: "Company deleted successfully" }, "Company deleted");
  }

  // ==========================================
  // BRANCHES
  // ==========================================

  public async listBranches(req: IncomingMessage & { query?: { companyId?: string } }): Promise<ApiResponse<BranchEntity[]>> {
    const principal = await requireAuth(req);
    const companyId = req.query?.companyId;
    const branches = await this.tenancyService.listBranches(principal.tenantId, companyId);
    return createSuccessResponse(branches, "Branches retrieved successfully");
  }

  public async getBranch(req: IncomingMessage & { params?: { id?: string } }): Promise<ApiResponse<BranchEntity>> {
    const principal = await requireAuth(req);
    const id = req.params?.id!;
    const branch = await this.tenancyService.getBranchById(id, principal.tenantId);
    return createSuccessResponse(branch, "Branch details retrieved");
  }

  public async createBranch(req: IncomingMessage & { body?: unknown }): Promise<ApiResponse<BranchEntity>> {
    const principal = await requireAuth(req);
    const validatedDto = DtoValidator.validate(createBranchDtoSchema, req.body);
    const branch = await this.tenancyService.createBranch(principal.tenantId, validatedDto);
    return createSuccessResponse(branch, "Branch created successfully");
  }

  public async updateBranch(req: IncomingMessage & { params?: { id?: string }; body?: unknown }): Promise<ApiResponse<BranchEntity>> {
    const principal = await requireAuth(req);
    const id = req.params?.id!;
    const validatedDto = DtoValidator.validate(updateBranchDtoSchema, req.body);
    const branch = await this.tenancyService.updateBranch(id, principal.tenantId, validatedDto);
    return createSuccessResponse(branch, "Branch updated successfully");
  }

  public async deleteBranch(req: IncomingMessage & { params?: { id?: string } }): Promise<ApiResponse<{ message: string }>> {
    const principal = await requireAuth(req);
    const id = req.params?.id!;
    await this.tenancyService.deleteBranch(id, principal.tenantId);
    return createSuccessResponse({ message: "Branch deleted successfully" }, "Branch deleted");
  }

  // ==========================================
  // DEPARTMENTS
  // ==========================================

  public async listDepartments(req: IncomingMessage): Promise<ApiResponse<DepartmentEntity[]>> {
    const principal = await requireAuth(req);
    const departments = await this.tenancyService.listDepartments(principal.tenantId);
    return createSuccessResponse(departments, "Departments retrieved successfully");
  }

  public async getDepartment(req: IncomingMessage & { params?: { id?: string } }): Promise<ApiResponse<DepartmentEntity>> {
    const principal = await requireAuth(req);
    const id = req.params?.id!;
    const department = await this.tenancyService.getDepartmentById(id, principal.tenantId);
    return createSuccessResponse(department, "Department details retrieved");
  }

  public async createDepartment(req: IncomingMessage & { body?: unknown }): Promise<ApiResponse<DepartmentEntity>> {
    const principal = await requireAuth(req);
    const validatedDto = DtoValidator.validate(createDepartmentDtoSchema, req.body);
    const department = await this.tenancyService.createDepartment(principal.tenantId, validatedDto);
    return createSuccessResponse(department, "Department created successfully");
  }

  public async updateDepartment(req: IncomingMessage & { params?: { id?: string }; body?: unknown }): Promise<ApiResponse<DepartmentEntity>> {
    const principal = await requireAuth(req);
    const id = req.params?.id!;
    const validatedDto = DtoValidator.validate(updateDepartmentDtoSchema, req.body);
    const department = await this.tenancyService.updateDepartment(id, principal.tenantId, validatedDto);
    return createSuccessResponse(department, "Department updated successfully");
  }

  public async deleteDepartment(req: IncomingMessage & { params?: { id?: string } }): Promise<ApiResponse<{ message: string }>> {
    const principal = await requireAuth(req);
    const id = req.params?.id!;
    await this.tenancyService.deleteDepartment(id, principal.tenantId);
    return createSuccessResponse({ message: "Department deleted successfully" }, "Department deleted");
  }
}
