import type { IncomingMessage } from 'node:http';
import { requireAuth } from '../auth/auth.guard';
import { EntitlementService, type EffectiveSubscriptionDetails } from './services/entitlement.service';
import { WorkspaceModuleService, type WorkspaceModuleStatus } from './services/workspace-module.service';
import { createSuccessResponse, type ApiResponse } from '../../common/dto/api-response.dto';
import { DatabaseService } from '../../database/database.service';
import { DtoValidator } from '../../common/validation/validator';
import { ForbiddenError } from '../../common/errors/app-error';
import { updateWorkspaceModuleDtoSchema } from './dto/workspace-module.dto';

export class SubscriptionsController {
  private readonly prisma: any;
  private readonly entitlementService: EntitlementService;
  private readonly workspaceModuleService: WorkspaceModuleService;

  constructor(
    entitlementService?: EntitlementService,
    workspaceModuleService?: WorkspaceModuleService,
    prismaClient?: any
  ) {
    this.prisma = prismaClient || DatabaseService.getInstance().getClient();
    this.entitlementService =
      entitlementService || new EntitlementService(this.prisma);
    this.workspaceModuleService =
      workspaceModuleService || new WorkspaceModuleService(this.prisma, this.entitlementService);
  }

  /**
   * GET /api/v1/tenants/subscription
   * Returns active plan details, quota utilization, and effective feature entitlements for the caller's tenant.
   */
  async getTenantSubscription(req: IncomingMessage): Promise<ApiResponse<EffectiveSubscriptionDetails>> {
    const principal = await requireAuth(req);
    const details = await this.entitlementService.getEffectiveSubscription(principal.tenantId);

    return createSuccessResponse(
      details,
      'Tenant subscription and effective entitlements retrieved successfully'
    );
  }

  /**
   * GET /api/v1/tenants/workspace-modules
   * Returns the list of all canonical features, their platform entitlement,
   * workspace activation state, and effective active resolution for the caller's tenant.
   */
  async getWorkspaceModules(req: IncomingMessage): Promise<ApiResponse<WorkspaceModuleStatus[]>> {
    const principal = await requireAuth(req);
    const modules = await this.workspaceModuleService.getWorkspaceModules(principal.tenantId);

    return createSuccessResponse(
      modules,
      'Tenant workspace modules retrieved successfully'
    );
  }

  /**
   * PUT /api/v1/tenants/workspace-modules
   * Allows Company Owner or Company Admin to activate/deactivate an entitled feature in their workspace.
   * Rejects unentitled activations with 403 FEATURE_NOT_ENTITLED.
   */
  async updateWorkspaceModule(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<WorkspaceModuleStatus>> {
    const principal = await requireAuth(req);

    // Enforce role authorization: Only COMPANY_OWNER or COMPANY_ADMIN
    const userRoles = await this.prisma.userRoleAssignment.findMany({
      where: {
        tenantId: principal.tenantId,
        userId: principal.userId,
      },
      include: {
        role: true,
      },
    });

    const isAuthorized = userRoles.some(
      (ur: any) => ur.role?.name === 'COMPANY_OWNER' || ur.role?.name === 'COMPANY_ADMIN'
    );

    if (!isAuthorized) {
      throw new ForbiddenError(
        'Forbidden: Only Company Owner or Company Admin can configure workspace modules.'
      );
    }

    const dto = DtoValidator.validate(updateWorkspaceModuleDtoSchema, req.body);

    const updated = await this.workspaceModuleService.setWorkspaceModuleEnabled({
      tenantId: principal.tenantId,
      featureKey: dto.featureKey,
      isEnabled: dto.isEnabled,
      actorId: principal.userId,
    });

    return createSuccessResponse(
      updated,
      `Workspace module '${dto.featureKey}' updated successfully`
    );
  }
}
