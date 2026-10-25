import { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError, ConflictError } from '../../../common/errors/index.js';
import { PeopleRequestContext } from '../constants/people.constants.js';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  UpdateEmployeeStatusDto,
  ListEmployeesQueryDto,
} from '../dto/employee.dto.js';
import { EmployeeRepository } from '../repositories/employee.repository.js';
import { PeopleAuditRepository } from '../repositories/people-audit.repository.js';

export class EmployeeService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly employeeRepo: EmployeeRepository,
    private readonly auditRepo: PeopleAuditRepository
  ) {}

  async createEmployee(context: PeopleRequestContext, dto: CreateEmployeeDto) {
    // 1. Check duplicate employeeNumber in tenant
    const existing = await this.employeeRepo.findByEmployeeNumber(context.tenantId, dto.employeeNumber);
    if (existing) {
      throw new ConflictError(`Employee with number '${dto.employeeNumber}' already exists in this organization`);
    }

    // 2. Validate Company exists and belongs to tenant
    const company = await this.prisma.company.findFirst({
      where: { id: dto.companyId, tenantId: context.tenantId },
    });
    if (!company) {
      throw new NotFoundError(`Company '${dto.companyId}' not found in tenant`);
    }

    // 3. Validate Branch if provided
    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, tenantId: context.tenantId, companyId: dto.companyId },
      });
      if (!branch) {
        throw new ValidationError(`Branch '${dto.branchId}' is invalid or does not belong to the selected company`, [
          { name: 'branchId', reason: 'Branch not found or company mismatch' },
        ]);
      }
    }

    // 4. Validate Department if provided
    if (dto.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: { id: dto.departmentId, tenantId: context.tenantId },
      });
      if (!department) {
        throw new NotFoundError(`Department '${dto.departmentId}' not found in tenant`);
      }
    }

    // 5. Validate User if provided
    if (dto.userId) {
      const user = await this.prisma.user.findFirst({
        where: { id: dto.userId, tenantId: context.tenantId },
      });
      if (!user) {
        throw new NotFoundError(`User '${dto.userId}' not found in tenant`);
      }
      const existingUserEmployee = await this.employeeRepo.findByUserId(context.tenantId, dto.userId);
      if (existingUserEmployee) {
        throw new ConflictError(`User '${dto.userId}' is already linked to employee '${existingUserEmployee.employeeNumber}'`);
      }
    }

    // 6. Validate Reporting Manager if provided
    if (dto.reportingManagerId) {
      const manager = await this.employeeRepo.findById(context.tenantId, dto.reportingManagerId);
      if (!manager) {
        throw new NotFoundError(`Reporting manager '${dto.reportingManagerId}' not found in tenant`);
      }
    }

    // 7. Create Employee
    const employee = await this.employeeRepo.create(context.tenantId, dto);

    // 8. Audit Log
    await this.auditRepo.log({
      tenantId: context.tenantId,
      entityType: 'EMPLOYEE',
      entityId: employee.id,
      action: 'CREATED',
      actorId: context.user.id,
      newState: employee,
      ipAddress: context.ipAddress,
    });

    return employee;
  }

  async getEmployeeById(context: PeopleRequestContext, id: string) {
    const employee = await this.employeeRepo.findById(context.tenantId, id);
    if (!employee) {
      throw new NotFoundError(`Employee '${id}' not found`);
    }
    return employee;
  }

  async updateEmployee(context: PeopleRequestContext, id: string, dto: UpdateEmployeeDto) {
    const existing = await this.getEmployeeById(context, id);

    // Validate Company if changed
    if (dto.companyId && dto.companyId !== existing.companyId) {
      const company = await this.prisma.company.findFirst({
        where: { id: dto.companyId, tenantId: context.tenantId },
      });
      if (!company) {
        throw new NotFoundError(`Company '${dto.companyId}' not found in tenant`);
      }
    }

    // Validate Branch if changed
    if (dto.branchId) {
      const companyId = dto.companyId ?? existing.companyId;
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, tenantId: context.tenantId, companyId },
      });
      if (!branch) {
        throw new ValidationError(`Branch '${dto.branchId}' is invalid or does not belong to company`, [
          { name: 'branchId', reason: 'Branch not found or company mismatch' },
        ]);
      }
    }

    // Validate Department if changed
    if (dto.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: { id: dto.departmentId, tenantId: context.tenantId },
      });
      if (!department) {
        throw new NotFoundError(`Department '${dto.departmentId}' not found in tenant`);
      }
    }

    // Validate User if changed
    if (dto.userId && dto.userId !== existing.userId) {
      const user = await this.prisma.user.findFirst({
        where: { id: dto.userId, tenantId: context.tenantId },
      });
      if (!user) {
        throw new NotFoundError(`User '${dto.userId}' not found in tenant`);
      }
      const existingUserEmployee = await this.employeeRepo.findByUserId(context.tenantId, dto.userId);
      if (existingUserEmployee && existingUserEmployee.id !== id) {
        throw new ConflictError(`User '${dto.userId}' is already linked to employee '${existingUserEmployee.employeeNumber}'`);
      }
    }

    // Validate Reporting Manager if changed
    if (dto.reportingManagerId) {
      if (dto.reportingManagerId === id) {
        throw new ValidationError('An employee cannot be their own reporting manager', [
          { name: 'reportingManagerId', reason: 'Self-reporting not allowed' },
        ]);
      }
      const manager = await this.employeeRepo.findById(context.tenantId, dto.reportingManagerId);
      if (!manager) {
        throw new NotFoundError(`Reporting manager '${dto.reportingManagerId}' not found in tenant`);
      }
    }

    const updated = await this.employeeRepo.update(context.tenantId, id, dto);

    await this.auditRepo.log({
      tenantId: context.tenantId,
      entityType: 'EMPLOYEE',
      entityId: id,
      action: 'UPDATED',
      actorId: context.user.id,
      previousState: existing,
      newState: updated,
      ipAddress: context.ipAddress,
    });

    return updated;
  }

  async updateEmployeeStatus(context: PeopleRequestContext, id: string, dto: UpdateEmployeeStatusDto) {
    const existing = await this.getEmployeeById(context, id);

    if (existing.employmentStatus === dto.status) {
      return existing;
    }

    // Valid state transitions
    if (['TERMINATED', 'RETIRED'].includes(existing.employmentStatus)) {
      throw new ConflictError(`Cannot alter status of already ${existing.employmentStatus.toLowerCase()} employee`);
    }

    let exitDate: Date | null | undefined = undefined;
    if (dto.exitDate) {
      exitDate = new Date(dto.exitDate);
      if (exitDate < new Date(existing.joiningDate)) {
        throw new ValidationError('exitDate cannot be prior to joiningDate', [
          { name: 'exitDate', reason: 'Invalid exit date' },
        ]);
      }
    } else if (['TERMINATED', 'RETIRED', 'RESIGNED'].includes(dto.status) && !existing.exitDate) {
      exitDate = new Date();
    }

    const updated = await this.employeeRepo.updateStatus(
      context.tenantId,
      id,
      dto.status,
      exitDate
    );

    await this.auditRepo.log({
      tenantId: context.tenantId,
      entityType: 'EMPLOYEE',
      entityId: id,
      action: 'STATUS_CHANGED',
      actorId: context.user.id,
      previousState: { status: existing.employmentStatus, exitDate: existing.exitDate },
      newState: { status: updated.employmentStatus, exitDate: updated.exitDate },
      reason: dto.reason,
      ipAddress: context.ipAddress,
    });

    return updated;
  }

  async listEmployees(context: PeopleRequestContext, query: ListEmployeesQueryDto) {
    return this.employeeRepo.list(context.tenantId, query);
  }
}
