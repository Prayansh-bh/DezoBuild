import type { IncomingMessage } from 'node:http';
import { QualitySafetyAuditService } from '../services/quality-safety-audit.service.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildQualityContext } from '../helpers/quality-context.helper.js';

export class QualitySafetyAuditController {
  constructor(private readonly auditService: QualitySafetyAuditService) {}

  public async listByEntity(
    req: IncomingMessage & { query?: Record<string, string>; params?: { entityType?: string; entityId?: string } }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requireAnyPermission(req, ['quality:view', 'safety:view']);
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const entityType = req.params?.entityType || '';
    const entityId = req.params?.entityId || '';
    const context = await buildQualityContext(principal, req);

    const result = await this.auditService.listByEntity(context, entityType, entityId);
    return createSuccessResponse(result, 'Audit logs retrieved successfully');
  }

  public async listByProject(
    req: IncomingMessage & { query?: Record<string, string>; params?: { projectId?: string } }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requireAnyPermission(req, ['quality:view', 'safety:view']);
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const page = req.query?.page ? Number.parseInt(req.query.page, 10) : 1;
    const limit = req.query?.limit ? Number.parseInt(req.query.limit, 10) : 20;
    const context = await buildQualityContext(principal, req);

    const result = await this.auditService.listByProject(context, projectId, { page, limit });
    return createSuccessResponse(result, 'Project quality/safety audit logs retrieved successfully');
  }

  public async list(
    req: IncomingMessage & { query?: Record<string, string>; params?: { projectId?: string } }
  ): Promise<ApiResponse<any>> {
    const projectId = req.params?.projectId || req.query?.projectId || '';
    req.params = { ...(req.params || {}), projectId };
    return this.listByProject(req);
  }
}
