import type { IncomingMessage } from 'node:http';
import { EmployeeService } from '../services/employee.service.js';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  updateEmployeeStatusSchema,
  listEmployeesQuerySchema,
} from '../dto/employee.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildPeopleContext } from '../helpers/context.helper.js';

export class EmployeesController {
  constructor(private readonly employeeService: EmployeeService) {}

  public async listEmployees(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'people:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(listEmployeesQuerySchema, req.query || {});
    const context = buildPeopleContext(principal, req);

    const result = await this.employeeService.listEmployees(context, query);
    return createSuccessResponse(result, 'Employees retrieved successfully');
  }

  public async createEmployee(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'people:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(createEmployeeSchema, req.body || {});
    const context = buildPeopleContext(principal, req);

    const result = await this.employeeService.createEmployee(context, dto);
    return createSuccessResponse(result, 'Employee created successfully');
  }

  public async getEmployee(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'people:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const context = buildPeopleContext(principal, req);

    const result = await this.employeeService.getEmployeeById(context, id);
    return createSuccessResponse(result, 'Employee retrieved successfully');
  }

  public async updateEmployee(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'people:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(updateEmployeeSchema, req.body || {});
    const context = buildPeopleContext(principal, req);

    const result = await this.employeeService.updateEmployee(context, id, dto);
    return createSuccessResponse(result, 'Employee updated successfully');
  }

  public async updateEmployeeStatus(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'people:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(updateEmployeeStatusSchema, req.body || {});
    const context = buildPeopleContext(principal, req);

    const result = await this.employeeService.updateEmployeeStatus(context, id, dto);
    return createSuccessResponse(result, 'Employee status updated successfully');
  }
}
