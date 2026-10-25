import type { PrismaClient } from '@prisma/client';
import { PrismaStoreRepository } from '../repositories/prisma-store.repository';
import type {
  IStoreRepository,
  StoreWithRelations,
} from '../repositories/store.repository.interface';
import type {
  CreateStoreDto,
  UpdateStoreDto,
  ListStoreQueryDto,
} from '../dto/store.dto';
import { AuthorizationService } from '../../rbac/services/authorization.service';
import { DatabaseService } from '../../../database/database.service';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../../../common/errors/app-error';

export interface StoreServiceDependencies {
  storeRepo?: IStoreRepository;
  authService?: AuthorizationService;
  prisma?: PrismaClient;
}

export class StoreService {
  private static instance: StoreService;
  private readonly storeRepo: IStoreRepository;
  private readonly authService: AuthorizationService;
  private readonly prisma: PrismaClient;

  constructor(deps?: StoreServiceDependencies) {
    this.storeRepo = deps?.storeRepo || PrismaStoreRepository.getInstance();
    this.authService = deps?.authService || AuthorizationService.getInstance();
    this.prisma = deps?.prisma || DatabaseService.getInstance().getClient();
  }

  public static getInstance(deps?: StoreServiceDependencies): StoreService {
    if (!StoreService.instance || deps) {
      StoreService.instance = new StoreService(deps);
    }
    return StoreService.instance;
  }

  public static resetInstance(): void {
    StoreService.instance = undefined as unknown as StoreService;
  }

  public async listStores(
    tenantId: string,
    userId: string,
    filters: ListStoreQueryDto
  ): Promise<{ items: StoreWithRelations[]; total: number }> {
    const authCtx = await this.authService.getUserAuthorizationContext(tenantId, userId);

    let allowedStoreIds: string[] | undefined = undefined;
    if (!authCtx.isTenantAdmin) {
      allowedStoreIds = authCtx.storeIds;
      if (allowedStoreIds.length === 0) {
        return { items: [], total: 0 };
      }
    }

    const [items, total] = await Promise.all([
      this.storeRepo.findMany(tenantId, filters, allowedStoreIds),
      this.storeRepo.count(tenantId, filters, allowedStoreIds),
    ]);

    return { items, total };
  }

  public async getStoreById(
    tenantId: string,
    userId: string,
    storeId: string
  ): Promise<StoreWithRelations> {
    const access = await this.authService.hasStoreAccess(
      tenantId,
      userId,
      storeId,
      'materials:view'
    );
    if (!access.granted) {
      // Check if store exists in tenant to return 404 vs 403
      const storeInTenant = await this.storeRepo.findById(tenantId, storeId);
      if (!storeInTenant) {
        throw new NotFoundError(`Store with ID ${storeId} not found in this tenant`);
      }
      throw new ForbiddenError(access.reason || 'User does not have access to this store');
    }

    const store = await this.storeRepo.findById(tenantId, storeId);
    if (!store) {
      throw new NotFoundError(`Store with ID ${storeId} not found in this tenant`);
    }

    return store;
  }

  public async createStore(
    tenantId: string,
    userId: string,
    dto: CreateStoreDto
  ): Promise<StoreWithRelations> {
    // Check unique store code within tenant
    const existing = await this.storeRepo.findByCode(tenantId, dto.code);
    if (existing) {
      throw new ConflictError(
        `Store with code "${dto.code}" already exists in this tenant`
      );
    }

    // Validate project association if specified
    if (dto.projectId && !dto.isCentralWarehouse && dto.storeType !== 'CENTRAL') {
      const project = await this.prisma.project.findUnique({
        where: { id: dto.projectId },
      });

      if (!project) {
        throw new NotFoundError(`Project with ID ${dto.projectId} not found`);
      }

      if (project.tenantId !== tenantId) {
        throw new ForbiddenError(
          'Cross-tenant project association is strictly forbidden'
        );
      }
    }

    return this.storeRepo.create(tenantId, dto);
  }

  public async updateStore(
    tenantId: string,
    userId: string,
    storeId: string,
    dto: UpdateStoreDto
  ): Promise<StoreWithRelations> {
    const access = await this.authService.hasStoreAccess(
      tenantId,
      userId,
      storeId,
      'materials:manage'
    );
    if (!access.granted) {
      const storeInTenant = await this.storeRepo.findById(tenantId, storeId);
      if (!storeInTenant) {
        throw new NotFoundError(`Store with ID ${storeId} not found in this tenant`);
      }
      throw new ForbiddenError(access.reason || 'User does not have permission to manage this store');
    }

    return this.storeRepo.update(tenantId, storeId, dto);
  }
}
