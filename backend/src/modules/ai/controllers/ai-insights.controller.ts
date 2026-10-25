import type { IncomingMessage } from 'node:http';
import { AIInsightService } from '../services/ai-insight.service.js';
import { queryAIInsightsSchema } from '../dto/ai.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';

export class AIInsightsController {
  constructor(private readonly insightService: AIInsightService) {}

  public async listInsights(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'ai:view');
    const principal = await requireAuth(req);
    const query = DtoValidator.validate(queryAIInsightsSchema, req.query || {});

    const result = await this.insightService.listInsights(
      principal.tenantId,
      query
    );

    return createSuccessResponse(result, 'AI insights retrieved');
  }

  public async getInsight(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'ai:view');
    const principal = await requireAuth(req);
    const id = req.params?.id!;

    const result = await this.insightService.getInsightById(principal.tenantId, id);
    return createSuccessResponse(result, 'AI insight retrieved');
  }

  public async acknowledgeInsight(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'ai:generate');
    const principal = await requireAuth(req);
    const id = req.params?.id!;

    const result = await this.insightService.acknowledgeInsight(principal.tenantId, id);
    return createSuccessResponse(result, 'AI insight acknowledged');
  }

  public async dismissInsight(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'ai:generate');
    const principal = await requireAuth(req);
    const id = req.params?.id!;

    const result = await this.insightService.dismissInsight(principal.tenantId, id);
    return createSuccessResponse(result, 'AI insight dismissed');
  }
}
