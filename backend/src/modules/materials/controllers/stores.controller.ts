import type { IncomingMessage } from 'node:http';
import { StoreService } from '../services/store.service';
import {
  CreateStoreSchema,
  UpdateStoreSchema,
  ListStoreQuerySchema,
} from '../dto/store.dto';
import { requireAuth } from '../../auth/auth.guard';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard';
import { DtoValidator } from '../../../common/validation/validator';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto';
import type { StoreWithRelations } from '../repositories/store.repository.interface';

export class StoresController {
  private readonly storeService: StoreService;

  constructor(storeService?: StoreService) {
    this.storeService = storeService || StoreService.getInstance();
  }

  public async listStores(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<{ items: StoreWithRelations[]; total: number }>> {
    await RbacGuard.requirePermission(req, 'materials:view');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(ListStoreQuerySchema, req.query || {});

    const result = await this.storeService.listStores(
      principal.tenantId,
      principal.userId,
      query
    );
    return createSuccessResponse(result, 'Stores retrieved successfully');
  }

  public async getStore(
    req: IncomingMessage & { params?: { storeId?: string } }
  ): Promise<ApiResponse<StoreWithRelations>> {
    await RbacGuard.requirePermission(req, 'materials:view');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const storeId = req.params?.storeId || '';

    const store = await this.storeService.getStoreById(
      principal.tenantId,
      principal.userId,
      storeId
    );
    return createSuccessResponse(store, 'Store details retrieved successfully');
  }

  public async createStore(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<StoreWithRelations>> {
    await RbacGuard.requirePermission(req, 'materials:manage');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(CreateStoreSchema, req.body || {});

    const store = await this.storeService.createStore(
      principal.tenantId,
      principal.userId,
      dto
    );
    return createSuccessResponse(store, 'Store created successfully');
  }

  public async updateStore(
    req: IncomingMessage & { params?: { storeId?: string }; body?: unknown }
  ): Promise<ApiResponse<StoreWithRelations>> {
    await RbacGuard.requirePermission(req, 'materials:manage');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const storeId = req.params?.storeId || '';
    const dto = DtoValidator.validate(UpdateStoreSchema, req.body || {});

    const store = await this.storeService.updateStore(
      principal.tenantId,
      principal.userId,
      storeId,
      dto
    );
    return createSuccessResponse(store, 'Store updated successfully');
  }
}
