import type { IncomingMessage } from 'node:http';
import { BoqService } from '../services/boq.service';
import {
  CreateBoqItemSchema,
  BulkCreateBoqSchema,
  UpdateBoqItemSchema,
  ListBoqQuerySchema,
  type BoqBillingPositionDto,
} from '../dto/boq.dto';
import { requireAuth } from '../../auth/auth.guard';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard';
import { DtoValidator } from '../../../common/validation/validator';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto';
import type { BoqItemEntity } from '../repositories/boq.repository.interface';

export class BoqController {
  private readonly boqService: BoqService;

  constructor(boqService?: BoqService) {
    this.boqService = boqService || BoqService.getInstance();
  }

  public async listBoqItems(
    req: IncomingMessage & { params?: { projectId?: string }; query?: Record<string, string> }
  ): Promise<ApiResponse<{ items: BoqItemEntity[]; total: number }>> {
    await RbacGuard.requirePermission(req, 'projects:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const query = DtoValidator.validate(ListBoqQuerySchema, req.query || {});

    const result = await this.boqService.listBoqItems(
      principal.tenantId,
      principal.userId,
      projectId,
      query
    );

    return createSuccessResponse(result, 'BOQ items retrieved successfully');
  }

  public async getBoqItem(
    req: IncomingMessage & { params?: { projectId?: string; boqItemId?: string } }
  ): Promise<ApiResponse<BoqItemEntity>> {
    await RbacGuard.requirePermission(req, 'projects:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const boqItemId = req.params?.boqItemId || '';

    const item = await this.boqService.getBoqItem(
      principal.tenantId,
      principal.userId,
      projectId,
      boqItemId
    );

    return createSuccessResponse(item, 'BOQ item details retrieved successfully');
  }

  public async createBoqItem(
    req: IncomingMessage & { params?: { projectId?: string }; body?: unknown }
  ): Promise<ApiResponse<BoqItemEntity>> {
    await RbacGuard.requireAnyPermission(req, ['projects:wbs:edit', 'projects:manage']);
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const dto = DtoValidator.validate(CreateBoqItemSchema, req.body || {});

    const item = await this.boqService.createBoqItem(
      principal.tenantId,
      principal.userId,
      projectId,
      dto
    );

    return createSuccessResponse(item, 'BOQ item created successfully');
  }

  public async createBulkBoq(
    req: IncomingMessage & { params?: { projectId?: string }; body?: unknown }
  ): Promise<ApiResponse<BoqItemEntity[]>> {
    await RbacGuard.requireAnyPermission(req, ['projects:wbs:edit', 'projects:manage']);
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const dto = DtoValidator.validate(BulkCreateBoqSchema, req.body || {});

    const items = await this.boqService.createBulkBoqItems(
      principal.tenantId,
      principal.userId,
      projectId,
      dto
    );

    return createSuccessResponse(items, `${items.length} BOQ items imported successfully`);
  }

  public async updateBoqItem(
    req: IncomingMessage & { params?: { projectId?: string; boqItemId?: string }; body?: unknown }
  ): Promise<ApiResponse<BoqItemEntity>> {
    await RbacGuard.requireAnyPermission(req, ['projects:wbs:edit', 'projects:manage']);
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const boqItemId = req.params?.boqItemId || '';
    const dto = DtoValidator.validate(UpdateBoqItemSchema, req.body || {});

    const item = await this.boqService.updateBoqItem(
      principal.tenantId,
      principal.userId,
      projectId,
      boqItemId,
      dto
    );

    return createSuccessResponse(item, 'BOQ item updated successfully');
  }

  public async deleteBoqItem(
    req: IncomingMessage & { params?: { projectId?: string; boqItemId?: string } }
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await RbacGuard.requireAnyPermission(req, ['projects:wbs:edit', 'projects:manage']);
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const boqItemId = req.params?.boqItemId || '';

    await this.boqService.deleteBoqItem(
      principal.tenantId,
      principal.userId,
      projectId,
      boqItemId
    );

    return createSuccessResponse({ deleted: true }, 'BOQ item deleted successfully');
  }

  public async getBillingPositions(
    req: IncomingMessage & { params?: { projectId?: string } }
  ): Promise<ApiResponse<BoqBillingPositionDto[]>> {
    await RbacGuard.requirePermission(req, 'projects:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';

    const positions = await this.boqService.getBillingPositions(
      principal.tenantId,
      principal.userId,
      projectId
    );

    return createSuccessResponse(positions, 'BOQ billing positions retrieved successfully');
  }
}
