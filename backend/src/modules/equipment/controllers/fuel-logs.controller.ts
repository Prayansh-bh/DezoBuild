import type { IncomingMessage } from 'node:http';
import { FuelLogService } from '../services/fuel-log.service.js';
import {
  createFuelLogSchema,
  listFuelLogsQuerySchema,
} from '../dto/fuel-log.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildEquipmentContext } from '../helpers/context.helper.js';

export class FuelLogsController {
  constructor(private readonly fuelLogService: FuelLogService) {}

  public async listFuelLogs(
    req: IncomingMessage & { params?: { id?: string }; query?: Record<string, string> }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'equipment:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const equipmentId = req.params?.id || '';
    const query = DtoValidator.validate(listFuelLogsQuerySchema, req.query || {});
    const context = buildEquipmentContext(principal, req);

    const result = await this.fuelLogService.list(context, equipmentId, query);
    return createSuccessResponse(result, 'Equipment fuel logs retrieved successfully');
  }

  public async createFuelLog(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'equipment:fuel:log');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const equipmentId = req.params?.id || '';
    const dto = DtoValidator.validate(createFuelLogSchema, req.body || {});
    const context = buildEquipmentContext(principal, req);

    const result = await this.fuelLogService.create(context, equipmentId, dto);
    return createSuccessResponse(result, 'Equipment fuel log recorded successfully');
  }
}
