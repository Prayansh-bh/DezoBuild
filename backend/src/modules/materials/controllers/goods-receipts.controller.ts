import type { IncomingMessage } from 'node:http';
import { GoodsReceiptService } from '../services/goods-receipt.service';
import {
  CreateGoodsReceiptSchema,
  UpdateGoodsReceiptSchema,
  SubmitGoodsReceiptSchema,
  VerifyGoodsReceiptSchema,
  RejectGoodsReceiptSchema,
  CancelGoodsReceiptSchema,
  ListGoodsReceiptsQuerySchema,
} from '../dto/goods-receipt.dto';
import { requireAuth } from '../../auth/auth.guard';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard';
import { DtoValidator } from '../../../common/validation/validator';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto';
import type { GoodsReceiptWithRelations } from '../repositories/goods-receipt.repository.interface';
import {
  GRN_PERMISSIONS,
  GRN_ENTITLEMENT,
} from '../constants/grn.constants';

export class GoodsReceiptsController {
  private readonly grnService: GoodsReceiptService;

  constructor(grnService?: GoodsReceiptService) {
    this.grnService = grnService || GoodsReceiptService.getInstance();
  }

  public async listGoodsReceipts(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<{ items: GoodsReceiptWithRelations[]; total: number }>> {
    await RbacGuard.requirePermission(req, GRN_PERMISSIONS.VIEW);
    await EntitlementGuard.requireFeature(req, GRN_ENTITLEMENT);

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(ListGoodsReceiptsQuerySchema, req.query || {});

    const result = await this.grnService.listGoodsReceipts(
      principal.tenantId,
      principal.userId,
      query
    );

    return createSuccessResponse(result, 'Goods receipts retrieved successfully');
  }

  public async getGoodsReceipt(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<GoodsReceiptWithRelations>> {
    await RbacGuard.requirePermission(req, GRN_PERMISSIONS.VIEW);
    await EntitlementGuard.requireFeature(req, GRN_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';

    const grn = await this.grnService.getGoodsReceiptById(
      principal.tenantId,
      principal.userId,
      id
    );

    return createSuccessResponse(grn, 'Goods receipt details retrieved successfully');
  }

  public async createGoodsReceipt(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<GoodsReceiptWithRelations>> {
    await RbacGuard.requirePermission(req, GRN_PERMISSIONS.CREATE);
    await EntitlementGuard.requireFeature(req, GRN_ENTITLEMENT);

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(CreateGoodsReceiptSchema, req.body || {});

    const grn = await this.grnService.createGoodsReceipt(
      principal.tenantId,
      principal.userId,
      dto
    );

    return createSuccessResponse(grn, 'Goods receipt created successfully');
  }

  public async updateGoodsReceipt(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<GoodsReceiptWithRelations>> {
    await RbacGuard.requirePermission(req, GRN_PERMISSIONS.CREATE);
    await EntitlementGuard.requireFeature(req, GRN_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(UpdateGoodsReceiptSchema, req.body || {});

    const grn = await this.grnService.updateGoodsReceipt(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(grn, 'Goods receipt updated successfully');
  }

  public async submitGoodsReceipt(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<GoodsReceiptWithRelations>> {
    await RbacGuard.requirePermission(req, GRN_PERMISSIONS.CREATE);
    await EntitlementGuard.requireFeature(req, GRN_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(SubmitGoodsReceiptSchema, req.body || {});

    const grn = await this.grnService.submitGoodsReceipt(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(grn, 'Goods receipt submitted successfully');
  }

  public async verifyGoodsReceipt(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<GoodsReceiptWithRelations>> {
    await RbacGuard.requirePermission(req, GRN_PERMISSIONS.VERIFY);
    await EntitlementGuard.requireFeature(req, GRN_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(VerifyGoodsReceiptSchema, req.body || {});

    const grn = await this.grnService.verifyGoodsReceipt(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(grn, 'Goods receipt verified successfully');
  }

  public async rejectGoodsReceipt(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<GoodsReceiptWithRelations>> {
    await RbacGuard.requirePermission(req, GRN_PERMISSIONS.VERIFY);
    await EntitlementGuard.requireFeature(req, GRN_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(RejectGoodsReceiptSchema, req.body || {});

    const grn = await this.grnService.rejectGoodsReceipt(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(grn, 'Goods receipt rejected');
  }

  public async cancelGoodsReceipt(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<GoodsReceiptWithRelations>> {
    await RbacGuard.requirePermission(req, GRN_PERMISSIONS.VERIFY);
    await EntitlementGuard.requireFeature(req, GRN_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(CancelGoodsReceiptSchema, req.body || {});

    const grn = await this.grnService.cancelGoodsReceipt(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(grn, 'Goods receipt cancelled');
  }

  public async deleteGoodsReceipt(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<null>> {
    await RbacGuard.requirePermission(req, GRN_PERMISSIONS.CREATE);
    await EntitlementGuard.requireFeature(req, GRN_ENTITLEMENT);

    const principal = await requireAuth(req);
    const id = req.params?.id || '';

    await this.grnService.deleteGoodsReceipt(
      principal.tenantId,
      principal.userId,
      id
    );

    return createSuccessResponse(null, 'Goods receipt deleted successfully');
  }
}
