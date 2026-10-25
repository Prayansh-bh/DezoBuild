import type { IncomingMessage } from 'node:http';
import { WbsService } from '../services/wbs.service';
import { CreateWbsNodeSchema, UpdateWbsNodeSchema } from '../dto/wbs.dto';
import { requireAuth } from '../../auth/auth.guard';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard';
import { DtoValidator } from '../../../common/validation/validator';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto';
import type { WbsNodeEntity } from '../repositories/wbs.repository.interface';

export class WbsController {
  private readonly wbsService: WbsService;

  constructor(wbsService?: WbsService) {
    this.wbsService = wbsService || WbsService.getInstance();
  }

  public async listWbsNodes(
    req: IncomingMessage & { params?: { projectId?: string } }
  ): Promise<ApiResponse<WbsNodeEntity[]>> {
    await RbacGuard.requirePermission(req, 'projects:view');
    await EntitlementGuard.requireFeature(req, 'projects:wbs');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';

    const nodes = await this.wbsService.listWbsNodes(
      principal.tenantId,
      principal.userId,
      projectId
    );

    return createSuccessResponse(nodes, 'WBS nodes retrieved successfully');
  }

  public async getWbsNode(
    req: IncomingMessage & { params?: { projectId?: string; nodeId?: string } }
  ): Promise<ApiResponse<WbsNodeEntity>> {
    await RbacGuard.requirePermission(req, 'projects:view');
    await EntitlementGuard.requireFeature(req, 'projects:wbs');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const nodeId = req.params?.nodeId || '';

    const node = await this.wbsService.getWbsNode(
      principal.tenantId,
      principal.userId,
      projectId,
      nodeId
    );

    return createSuccessResponse(node, 'WBS node details retrieved successfully');
  }

  public async createWbsNode(
    req: IncomingMessage & { params?: { projectId?: string }; body?: unknown }
  ): Promise<ApiResponse<WbsNodeEntity>> {
    await RbacGuard.requirePermission(req, 'projects:wbs:edit');
    await EntitlementGuard.requireFeature(req, 'projects:wbs');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const dto = DtoValidator.validate(CreateWbsNodeSchema, req.body || {});

    const node = await this.wbsService.createWbsNode(
      principal.tenantId,
      principal.userId,
      projectId,
      dto
    );

    return createSuccessResponse(node, 'WBS node created successfully');
  }

  public async updateWbsNode(
    req: IncomingMessage & { params?: { projectId?: string; nodeId?: string }; body?: unknown }
  ): Promise<ApiResponse<WbsNodeEntity>> {
    await RbacGuard.requirePermission(req, 'projects:wbs:edit');
    await EntitlementGuard.requireFeature(req, 'projects:wbs');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const nodeId = req.params?.nodeId || '';
    const dto = DtoValidator.validate(UpdateWbsNodeSchema, req.body || {});

    const node = await this.wbsService.updateWbsNode(
      principal.tenantId,
      principal.userId,
      projectId,
      nodeId,
      dto
    );

    return createSuccessResponse(node, 'WBS node updated successfully');
  }

  public async deleteWbsNode(
    req: IncomingMessage & { params?: { projectId?: string; nodeId?: string } }
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await RbacGuard.requirePermission(req, 'projects:wbs:edit');
    await EntitlementGuard.requireFeature(req, 'projects:wbs');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const nodeId = req.params?.nodeId || '';

    await this.wbsService.deleteWbsNode(
      principal.tenantId,
      principal.userId,
      projectId,
      nodeId
    );

    return createSuccessResponse({ deleted: true }, 'WBS node deleted successfully');
  }
}
