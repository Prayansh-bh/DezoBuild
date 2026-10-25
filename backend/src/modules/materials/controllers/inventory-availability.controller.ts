import type { IncomingMessage } from 'node:http';
import { InventoryAvailabilityService } from '../services/inventory-availability.service';
import {
  ListAvailabilityQuerySchema,
  GetShortagesQuerySchema,
  type MaterialAvailabilityItem,
  type Material360Availability,
  type ProjectAvailabilityPosition,
  type StoreAvailabilityPosition,
  type MaterialShortageItem,
} from '../dto/inventory-availability.dto';
import { requireAuth } from '../../auth/auth.guard';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard';
import { DtoValidator } from '../../../common/validation/validator';
import {
  createSuccessResponse,
  type ApiResponse,
} from '../../../common/dto/api-response.dto';

export class InventoryAvailabilityController {
  private readonly availabilityService: InventoryAvailabilityService;

  constructor(availabilityService?: InventoryAvailabilityService) {
    this.availabilityService =
      availabilityService || InventoryAvailabilityService.getInstance();
  }

  public async listAvailability(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<
    ApiResponse<{ items: MaterialAvailabilityItem[]; total: number }>
  > {
    await RbacGuard.requirePermission(req, 'materials:view');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(
      ListAvailabilityQuerySchema,
      req.query || {}
    );

    const result = await this.availabilityService.getAvailabilityList(
      principal.tenantId,
      principal.userId,
      query
    );

    return createSuccessResponse(
      result,
      'Inventory availability retrieved successfully'
    );
  }

  public async getMaterial360(
    req: IncomingMessage & { params?: { materialId?: string } }
  ): Promise<ApiResponse<Material360Availability>> {
    await RbacGuard.requirePermission(req, 'materials:view');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const materialId = req.params?.materialId || '';

    const result = await this.availabilityService.getMaterial360(
      principal.tenantId,
      principal.userId,
      materialId
    );

    return createSuccessResponse(
      result,
      'Material 360° availability retrieved successfully'
    );
  }

  public async getProjectAvailability(
    req: IncomingMessage & { params?: { projectId?: string } }
  ): Promise<ApiResponse<ProjectAvailabilityPosition>> {
    await RbacGuard.requirePermission(req, 'materials:view');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';

    const result = await this.availabilityService.getProjectAvailability(
      principal.tenantId,
      principal.userId,
      projectId
    );

    return createSuccessResponse(
      result,
      'Project material availability position retrieved successfully'
    );
  }

  public async getStoreAvailability(
    req: IncomingMessage & { params?: { storeId?: string } }
  ): Promise<ApiResponse<StoreAvailabilityPosition>> {
    await RbacGuard.requirePermission(req, 'materials:view');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const storeId = req.params?.storeId || '';

    const result = await this.availabilityService.getStoreAvailability(
      principal.tenantId,
      principal.userId,
      storeId
    );

    return createSuccessResponse(
      result,
      'Store inventory availability position retrieved successfully'
    );
  }

  public async getShortages(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<{ items: MaterialShortageItem[]; total: number }>> {
    await RbacGuard.requirePermission(req, 'materials:view');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(
      GetShortagesQuerySchema,
      req.query || {}
    );

    const result = await this.availabilityService.getShortages(
      principal.tenantId,
      principal.userId,
      query
    );

    return createSuccessResponse(
      result,
      'Material shortages retrieved successfully'
    );
  }
}
