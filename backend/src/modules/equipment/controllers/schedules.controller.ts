import type { IncomingMessage } from 'node:http';
import { MaintenanceService } from '../services/maintenance.service.js';
import {
  createMaintenanceScheduleSchema,
  listMaintenanceSchedulesQuerySchema,
} from '../dto/maintenance.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildEquipmentContext } from '../helpers/context.helper.js';

export class SchedulesController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  public async listSchedules(
    req: IncomingMessage & { params?: { id?: string }; query?: Record<string, string> }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'equipment:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const equipmentId = req.params?.id || '';
    const query = DtoValidator.validate(listMaintenanceSchedulesQuerySchema, req.query || {});
    const context = buildEquipmentContext(principal, req);

    const result = await this.maintenanceService.listSchedules(context, equipmentId, query);
    return createSuccessResponse(result, 'Maintenance schedules retrieved successfully');
  }

  public async createSchedule(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'equipment:maintenance:create');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const equipmentId = req.params?.id || '';
    const dto = DtoValidator.validate(createMaintenanceScheduleSchema, req.body || {});
    const context = buildEquipmentContext(principal, req);

    const result = await this.maintenanceService.createSchedule(context, equipmentId, dto);
    return createSuccessResponse(result, 'Maintenance schedule created successfully');
  }
}
