import type { IncomingMessage } from 'node:http';
import { InventoryReservationService } from '../services/inventory-reservation.service';
import {
  CreateInventoryReservationSchema,
  UpdateInventoryReservationSchema,
  SubmitInventoryReservationSchema,
  ApproveInventoryReservationSchema,
  RejectInventoryReservationSchema,
  ReleaseInventoryReservationSchema,
  CancelInventoryReservationSchema,
  ListInventoryReservationsQuerySchema,
} from '../dto/inventory-reservation.dto';
import { requireAuth } from '../../auth/auth.guard';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard';
import { DtoValidator } from '../../../common/validation/validator';
import {
  createSuccessResponse,
  type ApiResponse,
} from '../../../common/dto/api-response.dto';
import type { InventoryReservationWithRelations } from '../repositories/inventory-reservation.repository.interface';

export class InventoryReservationsController {
  private readonly reservationService: InventoryReservationService;

  constructor(reservationService?: InventoryReservationService) {
    this.reservationService =
      reservationService || InventoryReservationService.getInstance();
  }

  public async listReservations(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<
    ApiResponse<{ items: InventoryReservationWithRelations[]; total: number }>
  > {
    await RbacGuard.requirePermission(req, 'materials:view');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(
      ListInventoryReservationsQuerySchema,
      req.query || {}
    );

    const result = await this.reservationService.listReservations(
      principal.tenantId,
      principal.userId,
      query
    );

    return createSuccessResponse(
      result,
      'Inventory reservations retrieved successfully'
    );
  }

  public async getReservation(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<InventoryReservationWithRelations>> {
    await RbacGuard.requirePermission(req, 'materials:view');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';

    const result = await this.reservationService.getReservationById(
      principal.tenantId,
      principal.userId,
      id
    );

    return createSuccessResponse(
      result,
      'Inventory reservation retrieved successfully'
    );
  }

  public async createReservation(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<InventoryReservationWithRelations>> {
    await RbacGuard.requireAnyPermission(req, [
      'materials:stock:issue',
      'materials:manage',
    ]);
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(
      CreateInventoryReservationSchema,
      req.body || {}
    );

    const result = await this.reservationService.createReservation(
      principal.tenantId,
      principal.userId,
      dto
    );

    return createSuccessResponse(
      result,
      'Inventory reservation created successfully'
    );
  }

  public async updateReservation(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<InventoryReservationWithRelations>> {
    await RbacGuard.requireAnyPermission(req, [
      'materials:stock:issue',
      'materials:manage',
    ]);
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(
      UpdateInventoryReservationSchema,
      req.body || {}
    );

    const result = await this.reservationService.updateReservation(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(
      result,
      'Inventory reservation updated successfully'
    );
  }

  public async submitReservation(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<InventoryReservationWithRelations>> {
    await RbacGuard.requireAnyPermission(req, [
      'materials:stock:issue',
      'materials:manage',
    ]);
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(
      SubmitInventoryReservationSchema,
      req.body || {}
    );

    const result = await this.reservationService.submitReservation(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(
      result,
      'Inventory reservation submitted successfully'
    );
  }

  public async approveReservation(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<InventoryReservationWithRelations>> {
    await RbacGuard.requireAnyPermission(req, [
      'materials:stock:issue',
      'materials:manage',
    ]);
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(
      ApproveInventoryReservationSchema,
      req.body || {}
    );

    const result = await this.reservationService.approveReservation(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(
      result,
      'Inventory reservation approved and activated successfully'
    );
  }

  public async rejectReservation(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<InventoryReservationWithRelations>> {
    await RbacGuard.requireAnyPermission(req, [
      'materials:stock:issue',
      'materials:manage',
    ]);
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(
      RejectInventoryReservationSchema,
      req.body || {}
    );

    const result = await this.reservationService.rejectReservation(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(
      result,
      'Inventory reservation rejected successfully'
    );
  }

  public async releaseReservation(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<InventoryReservationWithRelations>> {
    await RbacGuard.requireAnyPermission(req, [
      'materials:stock:issue',
      'materials:manage',
    ]);
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(
      ReleaseInventoryReservationSchema,
      req.body || {}
    );

    const result = await this.reservationService.releaseReservation(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(
      result,
      'Inventory reservation released successfully'
    );
  }

  public async cancelReservation(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<InventoryReservationWithRelations>> {
    await RbacGuard.requireAnyPermission(req, [
      'materials:stock:issue',
      'materials:manage',
    ]);
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(
      CancelInventoryReservationSchema,
      req.body || {}
    );

    const result = await this.reservationService.cancelReservation(
      principal.tenantId,
      principal.userId,
      id,
      dto
    );

    return createSuccessResponse(
      result,
      'Inventory reservation cancelled successfully'
    );
  }

  public async expireStaleReservations(
    req: IncomingMessage
  ): Promise<ApiResponse<{ count: number }>> {
    await RbacGuard.requireAnyPermission(req, [
      'materials:stock:issue',
      'materials:manage',
    ]);
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const result = await this.reservationService.expireStaleReservations(
      principal.tenantId,
      principal.userId
    );

    return createSuccessResponse(
      result,
      `Expired ${result.count} stale inventory reservations`
    );
  }

  public async deleteReservation(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<{ success: boolean }>> {
    await RbacGuard.requireAnyPermission(req, [
      'materials:stock:issue',
      'materials:manage',
    ]);
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';

    await this.reservationService.deleteDraftReservation(
      principal.tenantId,
      principal.userId,
      id
    );

    return createSuccessResponse(
      { success: true },
      'Draft inventory reservation deleted successfully'
    );
  }
}
