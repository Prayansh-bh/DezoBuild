import type { IncomingMessage } from 'node:http';
import { MaterialReturnService } from '../services/material-return.service';
import {
  CreateMaterialReturnSchema,
  UpdateMaterialReturnSchema,
  SubmitMaterialReturnSchema,
  VerifyMaterialReturnSchema,
  RejectMaterialReturnSchema,
  CancelMaterialReturnSchema,
  ListMaterialReturnsQuerySchema,
} from '../dto/material-return.dto';
import { requireAuth } from '../../auth/auth.guard';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard';
import { DtoValidator } from '../../../common/validation/validator';
import {
  createSuccessResponse,
  type ApiResponse,
} from '../../../common/dto/api-response.dto';
import type { MaterialReturnWithRelations } from '../repositories/material-return.repository.interface';
import {
  MATERIAL_RETURN_PERMISSIONS,
  MATERIAL_RETURN_ENTITLEMENT,
} from '../constants/material-return.constants';

export class MaterialReturnsController {
  private readonly returnService: MaterialReturnService;

  constructor(returnService?: MaterialReturnService) {
    this.returnService =
      returnService || MaterialReturnService.getInstance();
  }

  public async listMaterialReturns(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<
    ApiResponse<{ items: MaterialReturnWithRelations[]; total: number }>
  > {
    await RbacGuard.requirePermission(req, MATERIAL_RETURN_PERMISSIONS.VIEW);
    await EntitlementGuard.requireFeature(req, MATERIAL_RETURN_ENTITLEMENT);

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(
      ListMaterialReturnsQuerySchema,
      req.query || {}
    );

    const result = await this.returnService.listMaterialReturns(
      principal.tenantId,
      principal.userId,
      query
    );

    return createSuccessResponse(
      result,
      'Material returns retrieved successfully'
    );
  }

  public async getMaterialReturn(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<MaterialReturnWithRelations>> {
    await RbacGuard.requirePermission(req, MATERIAL_RETURN_PERMISSIONS.VIEW);
    await EntitlementGuard.requireFeature(req, MATERIAL_RETURN_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';

    const ret = await this.returnService.getMaterialReturnById(
      principal.tenantId,
      principal.userId,
      id
    );

    return createSuccessResponse(
      ret,
      'Material return details retrieved successfully'
    );
  }

  public async createMaterialReturn(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<MaterialReturnWithRelations>> {
    await RbacGuard.requirePermission(req, MATERIAL_RETURN_PERMISSIONS.ISSUE);
    await EntitlementGuard.requireFeature(req, MATERIAL_RETURN_ENTITLEMENT);

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(
      CreateMaterialReturnSchema,
      req.body || {}
    );

    const ret = await this.returnService.createMaterialReturn(
      principal.tenantId,
      principal.userId,
      dto
    );

    return createSuccessResponse(
      ret,
      'Material return created successfully'
    );
  }

  public async updateMaterialReturn(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<MaterialReturnWithRelations>> {
    await RbacGuard.requirePermission(req, MATERIAL_RETURN_PERMISSIONS.ISSUE);
    await EntitlementGuard.requireFeature(req, MATERIAL_RETURN_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(
      UpdateMaterialReturnSchema,
      req.body || {}
    );

    const ret = await this.returnService.updateMaterialReturn(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(
      ret,
      'Material return updated successfully'
    );
  }

  public async submitMaterialReturn(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<MaterialReturnWithRelations>> {
    await RbacGuard.requirePermission(req, MATERIAL_RETURN_PERMISSIONS.ISSUE);
    await EntitlementGuard.requireFeature(req, MATERIAL_RETURN_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(
      SubmitMaterialReturnSchema,
      req.body || {}
    );

    const ret = await this.returnService.submitMaterialReturn(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(
      ret,
      'Material return submitted successfully'
    );
  }

  public async verifyMaterialReturn(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<MaterialReturnWithRelations>> {
    await RbacGuard.requirePermission(req, MATERIAL_RETURN_PERMISSIONS.ISSUE);
    await EntitlementGuard.requireFeature(req, MATERIAL_RETURN_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(
      VerifyMaterialReturnSchema,
      req.body || {}
    );

    const ret = await this.returnService.verifyMaterialReturn(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(
      ret,
      'Material return verified successfully'
    );
  }

  public async rejectMaterialReturn(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<MaterialReturnWithRelations>> {
    await RbacGuard.requirePermission(req, MATERIAL_RETURN_PERMISSIONS.ISSUE);
    await EntitlementGuard.requireFeature(req, MATERIAL_RETURN_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(
      RejectMaterialReturnSchema,
      req.body || {}
    );

    const ret = await this.returnService.rejectMaterialReturn(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(
      ret,
      'Material return rejected successfully'
    );
  }

  public async cancelMaterialReturn(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<MaterialReturnWithRelations>> {
    await RbacGuard.requirePermission(req, MATERIAL_RETURN_PERMISSIONS.ISSUE);
    await EntitlementGuard.requireFeature(req, MATERIAL_RETURN_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(
      CancelMaterialReturnSchema,
      req.body || {}
    );

    const ret = await this.returnService.cancelMaterialReturn(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(
      ret,
      'Material return cancelled successfully'
    );
  }

  public async deleteMaterialReturn(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await RbacGuard.requirePermission(req, MATERIAL_RETURN_PERMISSIONS.ISSUE);
    await EntitlementGuard.requireFeature(req, MATERIAL_RETURN_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';

    await this.returnService.deleteMaterialReturn(
      principal.tenantId,
      principal.userId,
      id
    );

    return createSuccessResponse(
      { deleted: true },
      'Material return deleted successfully'
    );
  }
}
