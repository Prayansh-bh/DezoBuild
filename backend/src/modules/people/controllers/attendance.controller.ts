import type { IncomingMessage } from 'node:http';
import { AttendanceService } from '../services/attendance.service.js';
import {
  createPunchSchema,
  createManualAttendanceSchema,
  importAttendanceSchema,
  biometricSyncBatchSchema,
  listAttendanceQuerySchema,
} from '../dto/attendance.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildPeopleContext } from '../helpers/context.helper.js';

export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  public async listAttendance(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'people:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(listAttendanceQuerySchema, req.query || {});
    const context = buildPeopleContext(principal, req);

    const result = await this.attendanceService.listAttendance(context, query);
    return createSuccessResponse(result, 'Attendance records retrieved successfully');
  }

  public async recordPunch(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'people:attendance:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(createPunchSchema, req.body || {});
    const context = buildPeopleContext(principal, req);

    const result = await this.attendanceService.recordPunch(context, dto);
    return createSuccessResponse(result, 'Attendance punch recorded successfully');
  }

  public async createManualAttendance(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'people:attendance:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(createManualAttendanceSchema, req.body || {});
    const context = buildPeopleContext(principal, req);

    const result = await this.attendanceService.createManualAttendance(context, dto);
    return createSuccessResponse(result, 'Manual attendance recorded successfully');
  }

  public async importAttendance(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'people:attendance:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(importAttendanceSchema, req.body || {});
    const context = buildPeopleContext(principal, req);

    const result = await this.attendanceService.importAttendance(context, dto);
    return createSuccessResponse(result, 'Attendance batch imported successfully');
  }

  public async biometricSync(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'people:attendance:create');
    await EntitlementGuard.requireFeature(req, 'hardware:biometric');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(biometricSyncBatchSchema, req.body || {});
    const context = buildPeopleContext(principal, req);

    const result = await this.attendanceService.biometricSync(context, dto);
    return createSuccessResponse(result, 'Biometric attendance sync processed successfully');
  }
}
