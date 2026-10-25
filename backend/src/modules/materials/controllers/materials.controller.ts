import type { IncomingMessage } from 'node:http';
import { MaterialService } from '../services/material.service';
import {
  CreateMaterialSchema,
  UpdateMaterialSchema,
  ListMaterialQuerySchema,
} from '../dto/material.dto';
import { requireAuth } from '../../auth/auth.guard';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard';
import { DtoValidator } from '../../../common/validation/validator';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto';
import type { Material } from '@prisma/client';

export class MaterialsController {
  private readonly materialService: MaterialService;

  constructor(materialService?: MaterialService) {
    this.materialService = materialService || MaterialService.getInstance();
  }

  public async listMaterials(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<{ items: Material[]; total: number }>> {
    await RbacGuard.requirePermission(req, 'materials:view');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(ListMaterialQuerySchema, req.query || {});

    const result = await this.materialService.listMaterials(principal.tenantId, query);
    return createSuccessResponse(result, 'Materials retrieved successfully');
  }

  public async getMaterial(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<Material>> {
    await RbacGuard.requirePermission(req, 'materials:view');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';

    const material = await this.materialService.getMaterialById(principal.tenantId, id);
    return createSuccessResponse(material, 'Material details retrieved successfully');
  }

  public async createMaterial(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<Material>> {
    await RbacGuard.requirePermission(req, 'materials:manage');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(CreateMaterialSchema, req.body || {});

    const material = await this.materialService.createMaterial(principal.tenantId, dto);
    return createSuccessResponse(material, 'Material created successfully');
  }

  public async updateMaterial(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<Material>> {
    await RbacGuard.requirePermission(req, 'materials:manage');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(UpdateMaterialSchema, req.body || {});

    const material = await this.materialService.updateMaterial(principal.tenantId, id, dto);
    return createSuccessResponse(material, 'Material updated successfully');
  }
}
