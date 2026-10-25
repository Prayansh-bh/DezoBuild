import type { IncomingMessage } from 'node:http';
import { PurchaseOrderService } from '../services/purchase-order.service';
import {
  CreatePurchaseOrderSchema,
  UpdatePurchaseOrderSchema,
  SubmitPurchaseOrderSchema,
  ApprovePurchaseOrderSchema,
  RejectPurchaseOrderSchema,
  OrderPurchaseOrderSchema,
  CancelPurchaseOrderSchema,
  ListPurchaseOrdersQuerySchema,
} from '../dto/purchase-order.dto';
import { requireAuth } from '../../auth/auth.guard';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard';
import { DtoValidator } from '../../../common/validation/validator';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto';
import type { PurchaseOrderWithRelations } from '../repositories/purchase-order.repository.interface';

export class PurchaseOrdersController {
  private readonly poService: PurchaseOrderService;

  constructor(poService?: PurchaseOrderService) {
    this.poService = poService || PurchaseOrderService.getInstance();
  }

  public async listPurchaseOrders(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<{ items: PurchaseOrderWithRelations[]; total: number }>> {
    await RbacGuard.requirePermission(req, 'materials:view');
    await EntitlementGuard.requireFeature(req, 'materials:po_matching');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(ListPurchaseOrdersQuerySchema, req.query || {});

    const result = await this.poService.listPurchaseOrders(
      principal.tenantId,
      principal.userId,
      query
    );

    return createSuccessResponse(result, 'Purchase orders retrieved successfully');
  }

  public async getPurchaseOrder(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<PurchaseOrderWithRelations>> {
    await RbacGuard.requirePermission(req, 'materials:view');
    await EntitlementGuard.requireFeature(req, 'materials:po_matching');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';

    const po = await this.poService.getPurchaseOrderById(
      principal.tenantId,
      principal.userId,
      id
    );

    return createSuccessResponse(po, 'Purchase order details retrieved successfully');
  }

  public async createPurchaseOrder(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<PurchaseOrderWithRelations>> {
    await RbacGuard.requirePermission(req, 'materials:po:create');
    await EntitlementGuard.requireFeature(req, 'materials:po_matching');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(CreatePurchaseOrderSchema, req.body || {});

    const po = await this.poService.createPurchaseOrder(
      principal.tenantId,
      principal.userId,
      dto
    );

    return createSuccessResponse(po, 'Purchase order created successfully');
  }

  public async updatePurchaseOrder(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<PurchaseOrderWithRelations>> {
    await RbacGuard.requirePermission(req, 'materials:po:create');
    await EntitlementGuard.requireFeature(req, 'materials:po_matching');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(UpdatePurchaseOrderSchema, req.body || {});

    const po = await this.poService.updatePurchaseOrder(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(po, 'Purchase order updated successfully');
  }

  public async submitPurchaseOrder(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<PurchaseOrderWithRelations>> {
    await RbacGuard.requirePermission(req, 'materials:po:create');
    await EntitlementGuard.requireFeature(req, 'materials:po_matching');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(SubmitPurchaseOrderSchema, req.body || {});

    const po = await this.poService.submitPurchaseOrder(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(po, 'Purchase order submitted successfully');
  }

  public async approvePurchaseOrder(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<PurchaseOrderWithRelations>> {
    await RbacGuard.requirePermission(req, 'materials:po:approve');
    await EntitlementGuard.requireFeature(req, 'materials:po_matching');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(ApprovePurchaseOrderSchema, req.body || {});

    const po = await this.poService.approvePurchaseOrder(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(po, 'Purchase order approved successfully');
  }

  public async rejectPurchaseOrder(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<PurchaseOrderWithRelations>> {
    await RbacGuard.requirePermission(req, 'materials:po:approve');
    await EntitlementGuard.requireFeature(req, 'materials:po_matching');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(RejectPurchaseOrderSchema, req.body || {});

    const po = await this.poService.rejectPurchaseOrder(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(po, 'Purchase order rejected successfully');
  }

  public async orderPurchaseOrder(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<PurchaseOrderWithRelations>> {
    await RbacGuard.requirePermission(req, 'materials:po:create');
    await EntitlementGuard.requireFeature(req, 'materials:po_matching');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(OrderPurchaseOrderSchema, req.body || {});

    const po = await this.poService.orderPurchaseOrder(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(po, 'Purchase order ordered successfully');
  }

  public async cancelPurchaseOrder(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<PurchaseOrderWithRelations>> {
    await EntitlementGuard.requireFeature(req, 'materials:po_matching');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(CancelPurchaseOrderSchema, req.body || {});

    const po = await this.poService.cancelPurchaseOrder(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(po, 'Purchase order cancelled successfully');
  }

  public async deletePurchaseOrder(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await RbacGuard.requirePermission(req, 'materials:po:create');
    await EntitlementGuard.requireFeature(req, 'materials:po_matching');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';

    await this.poService.deletePurchaseOrder(
      principal.tenantId,
      principal.userId,
      id
    );

    return createSuccessResponse({ deleted: true }, 'Purchase order deleted successfully');
  }
}
