import type { IncomingMessage } from 'node:http';
import { OperatingLogService } from '../services/operating-log.service.js';
import {
  createOperatingLogSchema,
  correctOperatingLogSchema,
  listOperatingLogsQuerySchema,
} from '../dto/operating-log.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildEquipmentContext } from '../helpers/context.helper.js';

export class OperatingLogsController {
  constructor(private readonly operatingLogService: OperatingLogService) {}

  public async listOperatingLogs(
    req: IncomingMessage & { params?: { id?: string }; query?: Record<string, string> }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'equipment:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const equipmentId = req.params?.id || '';
    const query = DtoValidator.validate(listOperatingLogsQuerySchema, req.query || {});
    const context = buildEquipmentContext(principal, req);

    const result = await this.operatingLogService.list(context, equipmentId, query);
    return createSuccessResponse(result, 'Equipment operating logs retrieved successfully');
  }

  public async createOperatingLog(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'equipment:fuel:log');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const equipmentId = req.params?.id || '';
    const dto = DtoValidator.validate(createOperatingLogSchema, req.body || {});
    const context = buildEquipmentContext(principal, req);

    const result = await this.operatingLogService.create(context, equipmentId, dto);
    return createSuccessResponse(result, 'Equipment operating log recorded successfully');
  }

  public async correctOperatingLog(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'equipment:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const logId = req.params?.id || '';
    const dto = DtoValidator.validate(correctOperatingLogSchema, req.body || {});
    const context = buildEquipmentContext(principal, req);

    const result = await this.operatingLogService.correct(context, logId, dto);
    return createSuccessResponse(result, 'Equipment operating log corrected successfully');
  }
}
