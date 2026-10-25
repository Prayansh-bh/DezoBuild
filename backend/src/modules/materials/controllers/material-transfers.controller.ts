import type { IncomingMessage } from 'node:http';
import { MaterialTransferService } from '../services/material-transfer.service';
import {
  CreateMaterialTransferSchema,
  UpdateMaterialTransferSchema,
  SubmitMaterialTransferSchema,
  ApproveMaterialTransferSchema,
  RejectMaterialTransferSchema,
  CancelMaterialTransferSchema,
  DispatchMaterialTransferSchema,
  ReceiveMaterialTransferSchema,
  ListMaterialTransfersQuerySchema,
} from '../dto/material-transfer.dto';
import { requireAuth } from '../../auth/auth.guard';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard';
import { DtoValidator } from '../../../common/validation/validator';
import {
  createSuccessResponse,
  type ApiResponse,
} from '../../../common/dto/api-response.dto';
import type { MaterialTransferWithRelations } from '../repositories/material-transfer.repository.interface';
import {
  MATERIAL_TRANSFER_PERMISSIONS,
  MATERIAL_TRANSFER_ENTITLEMENT,
} from '../constants/material-transfer.constants';

export class MaterialTransfersController {
  private readonly transferService: MaterialTransferService;

  constructor(transferService?: MaterialTransferService) {
    this.transferService =
      transferService || MaterialTransferService.getInstance();
  }

  public async listMaterialTransfers(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<
    ApiResponse<{ items: MaterialTransferWithRelations[]; total: number }>
  > {
    await RbacGuard.requirePermission(req, MATERIAL_TRANSFER_PERMISSIONS.VIEW);
    await EntitlementGuard.requireFeature(req, MATERIAL_TRANSFER_ENTITLEMENT);

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(
      ListMaterialTransfersQuerySchema,
      req.query || {}
    );

    const result = await this.transferService.listMaterialTransfers(
      principal.tenantId,
      principal.userId,
      query
    );

    return createSuccessResponse(
      result,
      'Material transfers retrieved successfully'
    );
  }

  public async getMaterialTransfer(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<MaterialTransferWithRelations>> {
    await RbacGuard.requirePermission(req, MATERIAL_TRANSFER_PERMISSIONS.VIEW);
    await EntitlementGuard.requireFeature(req, MATERIAL_TRANSFER_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';

    const transfer = await this.transferService.getMaterialTransferById(
      principal.tenantId,
      principal.userId,
      id
    );

    return createSuccessResponse(
      transfer,
      'Material transfer details retrieved successfully'
    );
  }

  public async createMaterialTransfer(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<MaterialTransferWithRelations>> {
    await RbacGuard.requirePermission(req, MATERIAL_TRANSFER_PERMISSIONS.TRANSFER);
    await EntitlementGuard.requireFeature(req, MATERIAL_TRANSFER_ENTITLEMENT);

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(
      CreateMaterialTransferSchema,
      req.body || {}
    );

    const transfer = await this.transferService.createMaterialTransfer(
      principal.tenantId,
      principal.userId,
      dto
    );

    return createSuccessResponse(
      transfer,
      'Material transfer draft created successfully'
    );
  }

  public async updateMaterialTransfer(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<MaterialTransferWithRelations>> {
    await RbacGuard.requirePermission(req, MATERIAL_TRANSFER_PERMISSIONS.TRANSFER);
    await EntitlementGuard.requireFeature(req, MATERIAL_TRANSFER_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(
      UpdateMaterialTransferSchema,
      req.body || {}
    );

    const updated = await this.transferService.updateMaterialTransfer(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(
      updated,
      'Material transfer updated successfully'
    );
  }

  public async submitMaterialTransfer(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<MaterialTransferWithRelations>> {
    await RbacGuard.requirePermission(req, MATERIAL_TRANSFER_PERMISSIONS.TRANSFER);
    await EntitlementGuard.requireFeature(req, MATERIAL_TRANSFER_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = req.body
      ? DtoValidator.validate(SubmitMaterialTransferSchema, req.body)
      : undefined;

    const submitted = await this.transferService.submitMaterialTransfer(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(
      submitted,
      'Material transfer submitted successfully'
    );
  }

  public async approveMaterialTransfer(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<MaterialTransferWithRelations>> {
    await RbacGuard.requirePermission(req, MATERIAL_TRANSFER_PERMISSIONS.TRANSFER);
    await EntitlementGuard.requireFeature(req, MATERIAL_TRANSFER_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = req.body
      ? DtoValidator.validate(ApproveMaterialTransferSchema, req.body)
      : undefined;

    const approved = await this.transferService.approveMaterialTransfer(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(
      approved,
      'Material transfer approved successfully'
    );
  }

  public async rejectMaterialTransfer(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<MaterialTransferWithRelations>> {
    await RbacGuard.requirePermission(req, MATERIAL_TRANSFER_PERMISSIONS.TRANSFER);
    await EntitlementGuard.requireFeature(req, MATERIAL_TRANSFER_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(
      RejectMaterialTransferSchema,
      req.body || {}
    );

    const rejected = await this.transferService.rejectMaterialTransfer(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(
      rejected,
      'Material transfer rejected successfully'
    );
  }

  public async cancelMaterialTransfer(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<MaterialTransferWithRelations>> {
    await RbacGuard.requirePermission(req, MATERIAL_TRANSFER_PERMISSIONS.TRANSFER);
    await EntitlementGuard.requireFeature(req, MATERIAL_TRANSFER_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = req.body
      ? DtoValidator.validate(CancelMaterialTransferSchema, req.body)
      : undefined;

    const cancelled = await this.transferService.cancelMaterialTransfer(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(
      cancelled,
      'Material transfer cancelled successfully'
    );
  }

  public async dispatchMaterialTransfer(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<MaterialTransferWithRelations>> {
    await RbacGuard.requirePermission(req, MATERIAL_TRANSFER_PERMISSIONS.TRANSFER);
    await EntitlementGuard.requireFeature(req, MATERIAL_TRANSFER_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = req.body
      ? DtoValidator.validate(DispatchMaterialTransferSchema, req.body)
      : undefined;

    const dispatched = await this.transferService.dispatchMaterialTransfer(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(
      dispatched,
      'Material transfer dispatched successfully'
    );
  }

  public async receiveMaterialTransfer(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<MaterialTransferWithRelations>> {
    await RbacGuard.requirePermission(req, MATERIAL_TRANSFER_PERMISSIONS.RECEIVE);
    await EntitlementGuard.requireFeature(req, MATERIAL_TRANSFER_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = req.body
      ? DtoValidator.validate(ReceiveMaterialTransferSchema, req.body)
      : undefined;

    const received = await this.transferService.receiveMaterialTransfer(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(
      received,
      'Material transfer received successfully'
    );
  }

  public async deleteMaterialTransfer(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<{ success: boolean }>> {
    await RbacGuard.requirePermission(req, MATERIAL_TRANSFER_PERMISSIONS.TRANSFER);
    await EntitlementGuard.requireFeature(req, MATERIAL_TRANSFER_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';

    const result = await this.transferService.deleteMaterialTransfer(
      principal.tenantId,
      principal.userId,
      id
    );

    return createSuccessResponse(
      result,
      'Material transfer deleted successfully'
    );
  }
}
