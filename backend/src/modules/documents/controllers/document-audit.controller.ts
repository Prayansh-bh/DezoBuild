import type { IncomingMessage } from 'node:http';
import { DocumentAuditService } from '../services/document-audit.service.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';

export class DocumentAuditController {
  constructor(private readonly auditService: DocumentAuditService) {}

  public async listLogs(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    await RbacGuard.requirePermission(req, 'documents:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const query = req.query || {};

    const result = await this.auditService.list(principal.tenantId, {
      projectId: query.projectId,
      entityType: query.entityType,
      entityId: query.entityId,
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 50,
    });

    return createSuccessResponse(result, 'Document audit logs retrieved successfully');
  }
}
