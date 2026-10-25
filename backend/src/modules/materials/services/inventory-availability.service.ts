import type { PrismaClient } from '@prisma/client';
import { DatabaseService } from '../../../database/database.service';
import type { IInventoryAvailabilityRepository } from '../repositories/inventory-availability.repository.interface';
import { PrismaInventoryAvailabilityRepository } from '../repositories/prisma-inventory-availability.repository';
import { AuthorizationService } from '../../rbac/services/authorization.service';
import { EntitlementService } from '../../subscriptions/services/entitlement.service';
import {
  ForbiddenError,
  NotFoundError,
} from '../../../common/errors';
import type {
  ListAvailabilityQueryDto,
  GetShortagesQueryDto,
  MaterialAvailabilityItem,
  Material360Availability,
  ProjectAvailabilityPosition,
  StoreAvailabilityPosition,
  MaterialShortageItem,
} from '../dto/inventory-availability.dto';

export interface InventoryAvailabilityServiceDependencies {
  availabilityRepo?: IInventoryAvailabilityRepository;
  authService?: AuthorizationService;
  entitlementService?: EntitlementService;
  prisma?: PrismaClient;
}

export class InventoryAvailabilityService {
  private static instance: InventoryAvailabilityService;
  private readonly availabilityRepo: IInventoryAvailabilityRepository;
  private readonly authService: AuthorizationService;
  private readonly entitlementService: EntitlementService;
  private readonly prisma: PrismaClient;

  constructor(deps?: InventoryAvailabilityServiceDependencies) {
    this.availabilityRepo =
      deps?.availabilityRepo ||
      PrismaInventoryAvailabilityRepository.getInstance();
    this.authService = deps?.authService || AuthorizationService.getInstance();
    this.entitlementService =
      deps?.entitlementService || new EntitlementService();
    this.prisma = deps?.prisma || DatabaseService.getInstance().getClient();
  }

  public static getInstance(
    deps?: InventoryAvailabilityServiceDependencies
  ): InventoryAvailabilityService {
    if (!InventoryAvailabilityService.instance || deps) {
      InventoryAvailabilityService.instance = new InventoryAvailabilityService(
        deps
      );
    }
    return InventoryAvailabilityService.instance;
  }

  public static resetInstance(): void {
    InventoryAvailabilityService.instance =
      undefined as unknown as InventoryAvailabilityService;
  }

  private async verifyEntitlement(tenantId: string): Promise<void> {
    const isEntitled = await this.entitlementService.isFeatureEntitled(
      tenantId,
      'materials:core'
    );
    if (!isEntitled) {
      throw new ForbiddenError(
        'Feature entitlement materials:core is required for Inventory Availability Intelligence.'
      );
    }
  }

  private async verifyViewPermission(
    tenantId: string,
    userId: string
  ): Promise<void> {
    const hasViewPerm = await this.authService.hasPermission(
      tenantId,
      userId,
      'materials:view'
    );
    if (!hasViewPerm) {
      throw new ForbiddenError('Missing required permission: materials:view');
    }
  }

  public async getAvailabilityList(
    tenantId: string,
    userId: string,
    query?: ListAvailabilityQueryDto
  ): Promise<{ items: MaterialAvailabilityItem[]; total: number }> {
    await this.verifyEntitlement(tenantId);
    await this.verifyViewPermission(tenantId, userId);

    const authCtx = await this.authService.getUserAuthorizationContext(
      tenantId,
      userId
    );
    let allowedProjectIds: string[] | undefined;
    let allowedStoreIds: string[] | undefined;

    if (!authCtx.isTenantAdmin) {
      allowedProjectIds = authCtx.projectIds;
      allowedStoreIds = authCtx.storeIds;

      if (allowedProjectIds.length === 0 && allowedStoreIds.length === 0) {
        return { items: [], total: 0 };
      }
    }

    if (query?.projectId) {
      const access = await this.authService.hasProjectAccess(
        tenantId,
        userId,
        query.projectId,
        'materials:view'
      );
      if (!access.granted) {
        throw new ForbiddenError(access.reason || 'Access to project denied.');
      }
    }

    if (query?.storeId) {
      const access = await this.authService.hasStoreAccess(
        tenantId,
        userId,
        query.storeId,
        'materials:view'
      );
      if (!access.granted) {
        throw new ForbiddenError(access.reason || 'Access to store denied.');
      }
    }

    return this.availabilityRepo.findAvailabilityList(tenantId, {
      allowedStoreIds,
      allowedProjectIds,
      filter: query,
    });
  }

  public async getMaterial360(
    tenantId: string,
    userId: string,
    materialId: string
  ): Promise<Material360Availability> {
    await this.verifyEntitlement(tenantId);
    await this.verifyViewPermission(tenantId, userId);

    const authCtx = await this.authService.getUserAuthorizationContext(
      tenantId,
      userId
    );
    let allowedProjectIds: string[] | undefined;
    let allowedStoreIds: string[] | undefined;

    if (!authCtx.isTenantAdmin) {
      allowedProjectIds = authCtx.projectIds;
      allowedStoreIds = authCtx.storeIds;
    }

    const result = await this.availabilityRepo.getMaterial360(
      tenantId,
      materialId,
      allowedStoreIds,
      allowedProjectIds
    );

    if (!result) {
      throw new NotFoundError(
        `Material with ID ${materialId} not found in this tenant.`
      );
    }

    return result;
  }

  public async getProjectAvailability(
    tenantId: string,
    userId: string,
    projectId: string
  ): Promise<ProjectAvailabilityPosition> {
    await this.verifyEntitlement(tenantId);
    await this.verifyViewPermission(tenantId, userId);

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      projectId,
      'materials:view'
    );
    if (!access.granted) {
      // Check if project exists in tenant
      const projectExists = await this.prisma.project.findFirst({
        where: { id: projectId, tenantId },
      });
      if (!projectExists) {
        throw new NotFoundError(
          `Project with ID ${projectId} not found in this tenant.`
        );
      }
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    const result = await this.availabilityRepo.getProjectAvailability(
      tenantId,
      projectId
    );

    if (!result) {
      throw new NotFoundError(
        `Project with ID ${projectId} not found in this tenant.`
      );
    }

    return result;
  }

  public async getStoreAvailability(
    tenantId: string,
    userId: string,
    storeId: string
  ): Promise<StoreAvailabilityPosition> {
    await this.verifyEntitlement(tenantId);
    await this.verifyViewPermission(tenantId, userId);

    const access = await this.authService.hasStoreAccess(
      tenantId,
      userId,
      storeId,
      'materials:view'
    );
    if (!access.granted) {
      const storeExists = await this.prisma.store.findFirst({
        where: { id: storeId, tenantId },
      });
      if (!storeExists) {
        throw new NotFoundError(
          `Store with ID ${storeId} not found in this tenant.`
        );
      }
      throw new ForbiddenError(access.reason || 'Access to store denied.');
    }

    const result = await this.availabilityRepo.getStoreAvailability(
      tenantId,
      storeId
    );

    if (!result) {
      throw new NotFoundError(
        `Store with ID ${storeId} not found in this tenant.`
      );
    }

    return result;
  }

  public async getShortages(
    tenantId: string,
    userId: string,
    query?: GetShortagesQueryDto
  ): Promise<{ items: MaterialShortageItem[]; total: number }> {
    await this.verifyEntitlement(tenantId);
    await this.verifyViewPermission(tenantId, userId);

    const authCtx = await this.authService.getUserAuthorizationContext(
      tenantId,
      userId
    );
    let allowedProjectIds: string[] | undefined;
    let allowedStoreIds: string[] | undefined;

    if (!authCtx.isTenantAdmin) {
      allowedProjectIds = authCtx.projectIds;
      allowedStoreIds = authCtx.storeIds;

      if (allowedProjectIds.length === 0 && allowedStoreIds.length === 0) {
        return { items: [], total: 0 };
      }
    }

    if (query?.projectId) {
      const access = await this.authService.hasProjectAccess(
        tenantId,
        userId,
        query.projectId,
        'materials:view'
      );
      if (!access.granted) {
        throw new ForbiddenError(access.reason || 'Access to project denied.');
      }
    }

    if (query?.storeId) {
      const access = await this.authService.hasStoreAccess(
        tenantId,
        userId,
        query.storeId,
        'materials:view'
      );
      if (!access.granted) {
        throw new ForbiddenError(access.reason || 'Access to store denied.');
      }
    }

    return this.availabilityRepo.getShortages(tenantId, {
      allowedProjectIds,
      allowedStoreIds,
      filter: query,
    });
  }
}
