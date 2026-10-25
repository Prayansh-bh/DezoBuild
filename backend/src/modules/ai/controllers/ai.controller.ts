import type { IncomingMessage } from 'node:http';
import { AIService } from '../services/ai.service.js';
import { executeAIRequestSchema, queryAIRequestsSchema } from '../dto/ai.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { AIFeatureKey } from '../constants/ai.constants.js';

export class AIController {
  constructor(private readonly aiService: AIService) {}

  public async executeRequest(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<any>> {
    const dto = DtoValidator.validate(executeAIRequestSchema, req.body || {});

    // Enforce feature entitlement
    if (dto.featureKey === AIFeatureKey.SCHEDULE_FORECASTING) {
      await EntitlementGuard.requireFeature(req, 'ai:schedule_forecasting');
    }

    await RbacGuard.requirePermission(req, 'ai:generate');
    const principal = await requireAuth(req);

    const result = await this.aiService.execute(
      principal.tenantId,
      principal.userId,
      dto
    );

    return createSuccessResponse(result, 'AI execution completed');
  }

  public async getRequest(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'ai:view');
    const principal = await requireAuth(req);
    const id = req.params?.id!;

    const result = await this.aiService.getRequestById(principal.tenantId, id);
    return createSuccessResponse(result, 'AI request retrieved');
  }

  public async listRequests(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'ai:view');
    const principal = await requireAuth(req);
    const query = DtoValidator.validate(queryAIRequestsSchema, req.query || {});

    const result = await this.aiService.listRequests(principal.tenantId, query);
    return createSuccessResponse(result, 'AI requests retrieved');
  }
}
