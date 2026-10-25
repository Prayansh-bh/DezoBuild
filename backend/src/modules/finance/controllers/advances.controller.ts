import type { IncomingMessage } from 'node:http';
import { AdvanceService } from '../services/advance.service.js';
import {
  createAdvanceRecordSchema,
  listAdvanceRecordsQuerySchema,
} from '../dto/advance.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildFinanceContext } from '../helpers/context.helper.js';

export class AdvancesController {
  constructor(private readonly advanceService: AdvanceService) {}

  public async listAdvances(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'finance:view');
    await EntitlementGuard.requireFeature(req, 'finance:commercial');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(listAdvanceRecordsQuerySchema, req.query || {});
    const context = buildFinanceContext(principal, req);

    const result = await this.advanceService.listAdvances(context, query);
    return createSuccessResponse(result, 'Advance records retrieved successfully');
  }

  public async createAdvance(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'finance:payment:create');
    await EntitlementGuard.requireFeature(req, 'finance:commercial');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(createAdvanceRecordSchema, req.body || {});
    const context = buildFinanceContext(principal, req);

    const result = await this.advanceService.createAdvance(context, dto);
    return createSuccessResponse(result, 'Advance record created successfully');
  }

  public async getAdvance(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'finance:view');
    await EntitlementGuard.requireFeature(req, 'finance:commercial');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const context = buildFinanceContext(principal, req);

    const result = await this.advanceService.getAdvanceById(context, id);
    return createSuccessResponse(result, 'Advance record retrieved successfully');
  }
}
