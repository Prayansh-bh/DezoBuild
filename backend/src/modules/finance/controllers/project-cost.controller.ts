import type { IncomingMessage } from 'node:http';
import { ProjectCostService } from '../services/project-cost.service.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildFinanceContext } from '../helpers/context.helper.js';

export class ProjectCostController {
  constructor(private readonly projectCostService: ProjectCostService) {}

  public async getProjectCostSummary(
    req: IncomingMessage & { params?: { projectId?: string } }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'finance:view');
    await EntitlementGuard.requireFeature(req, 'finance:commercial');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const context = buildFinanceContext(principal, req);

    const result = await this.projectCostService.getProjectCostSummary(context, projectId);
    return createSuccessResponse(result, 'Project financial & cost summary retrieved successfully');
  }
}
