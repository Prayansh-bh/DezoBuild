import type { IncomingMessage } from 'node:http';
import { MaterialIndentService } from '../services/material-indent.service';
import {
  CreateMaterialIndentSchema,
  UpdateMaterialIndentSchema,
  SubmitMaterialIndentSchema,
  ApproveMaterialIndentSchema,
  RejectMaterialIndentSchema,
  CancelMaterialIndentSchema,
  ListMaterialIndentQuerySchema,
} from '../dto/material-indent.dto';
import { requireAuth } from '../../auth/auth.guard';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard';
import { DtoValidator } from '../../../common/validation/validator';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto';
import type { MaterialIndentWithRelations } from '../repositories/material-indent.repository.interface';

export class MaterialIndentsController {
  private readonly indentService: MaterialIndentService;

  constructor(indentService?: MaterialIndentService) {
    this.indentService = indentService || MaterialIndentService.getInstance();
  }

  public async listIndents(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<{ items: MaterialIndentWithRelations[]; total: number }>> {
    await RbacGuard.requirePermission(req, 'materials:view');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(ListMaterialIndentQuerySchema, req.query || {});

    const result = await this.indentService.listIndents(
      principal.tenantId,
      principal.userId,
      query
    );

    return createSuccessResponse(result, 'Material indents retrieved successfully');
  }

  public async getIndent(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<MaterialIndentWithRelations>> {
    await RbacGuard.requirePermission(req, 'materials:view');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';

    const indent = await this.indentService.getIndentById(
      principal.tenantId,
      principal.userId,
      id
    );

    return createSuccessResponse(indent, 'Material indent details retrieved successfully');
  }

  public async createIndent(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<MaterialIndentWithRelations>> {
    await RbacGuard.requirePermission(req, 'materials:indent:create');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(CreateMaterialIndentSchema, req.body || {});

    const indent = await this.indentService.createIndent(
      principal.tenantId,
      principal.userId,
      dto
    );

    return createSuccessResponse(indent, 'Material indent created successfully');
  }

  public async updateIndent(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<MaterialIndentWithRelations>> {
    await RbacGuard.requirePermission(req, 'materials:indent:create');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(UpdateMaterialIndentSchema, req.body || {});

    const indent = await this.indentService.updateIndent(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(indent, 'Material indent updated successfully');
  }

  public async submitIndent(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<MaterialIndentWithRelations>> {
    await RbacGuard.requirePermission(req, 'materials:indent:create');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(SubmitMaterialIndentSchema, req.body || {});

    const indent = await this.indentService.submitIndent(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(indent, 'Material indent submitted successfully');
  }

  public async approveIndent(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<MaterialIndentWithRelations>> {
    await RbacGuard.requirePermission(req, 'materials:indent:approve');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(ApproveMaterialIndentSchema, req.body || {});

    const indent = await this.indentService.approveIndent(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(indent, 'Material indent approved successfully');
  }

  public async rejectIndent(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<MaterialIndentWithRelations>> {
    await RbacGuard.requirePermission(req, 'materials:indent:approve');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(RejectMaterialIndentSchema, req.body || {});

    const indent = await this.indentService.rejectIndent(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(indent, 'Material indent rejected successfully');
  }

  public async cancelIndent(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<MaterialIndentWithRelations>> {
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(CancelMaterialIndentSchema, req.body || {});

    const indent = await this.indentService.cancelIndent(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(indent, 'Material indent cancelled successfully');
  }

  public async deleteIndent(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await RbacGuard.requirePermission(req, 'materials:indent:create');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';

    await this.indentService.deleteIndent(
      principal.tenantId,
      principal.userId,
      id
    );

    return createSuccessResponse({ deleted: true }, 'Material indent deleted successfully');
  }
}
