import type { PrismaClient } from '@prisma/client';
import { DatabaseService } from '../../../database/database.service';
import type {
  IInventoryReservationRepository,
  InventoryReservationWithRelations,
} from '../repositories/inventory-reservation.repository.interface';
import { PrismaInventoryReservationRepository } from '../repositories/prisma-inventory-reservation.repository';
import type { IMaterialRepository } from '../repositories/material.repository.interface';
import { PrismaMaterialRepository } from '../repositories/prisma-material.repository';
import type { IStoreRepository } from '../repositories/store.repository.interface';
import { PrismaStoreRepository } from '../repositories/prisma-store.repository';
import { AuthorizationService } from '../../rbac/services/authorization.service';
import { EntitlementService } from '../../subscriptions/services/entitlement.service';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../../common/errors';
import type {
  CreateInventoryReservationDto,
  UpdateInventoryReservationDto,
  SubmitInventoryReservationDto,
  ApproveInventoryReservationDto,
  RejectInventoryReservationDto,
  ReleaseInventoryReservationDto,
  CancelInventoryReservationDto,
  ListInventoryReservationsQueryDto,
} from '../dto/inventory-reservation.dto';

export interface InventoryReservationServiceDependencies {
  reservationRepo?: IInventoryReservationRepository;
  materialRepo?: IMaterialRepository;
  storeRepo?: IStoreRepository;
  authService?: AuthorizationService;
  entitlementService?: EntitlementService;
  prisma?: PrismaClient;
}

export class InventoryReservationService {
  private static instance: InventoryReservationService;
  private readonly reservationRepo: IInventoryReservationRepository;
  private readonly materialRepo: IMaterialRepository;
  private readonly storeRepo: IStoreRepository;
  private readonly authService: AuthorizationService;
  private readonly entitlementService: EntitlementService;
  private readonly prisma: PrismaClient;

  constructor(deps?: InventoryReservationServiceDependencies) {
    this.reservationRepo =
      deps?.reservationRepo ||
      PrismaInventoryReservationRepository.getInstance();
    this.materialRepo =
      deps?.materialRepo || PrismaMaterialRepository.getInstance();
    this.storeRepo = deps?.storeRepo || PrismaStoreRepository.getInstance();
    this.authService = deps?.authService || AuthorizationService.getInstance();
    this.entitlementService =
      deps?.entitlementService || new EntitlementService();
    this.prisma = deps?.prisma || DatabaseService.getInstance().getClient();
  }

  public static getInstance(
    deps?: InventoryReservationServiceDependencies
  ): InventoryReservationService {
    if (!InventoryReservationService.instance || deps) {
      InventoryReservationService.instance = new InventoryReservationService(
        deps
      );
    }
    return InventoryReservationService.instance;
  }

  public static resetInstance(): void {
    InventoryReservationService.instance =
      undefined as unknown as InventoryReservationService;
  }

  private async verifyEntitlement(tenantId: string): Promise<void> {
    const isEntitled = await this.entitlementService.isFeatureEntitled(
      tenantId,
      'materials:core'
    );
    if (!isEntitled) {
      throw new ForbiddenError(
        'Feature entitlement materials:core is required for Inventory Reservations.'
      );
    }
  }

  private async verifyWritePermission(
    tenantId: string,
    userId: string
  ): Promise<void> {
    const [hasIssuePerm, hasManagePerm] = await Promise.all([
      this.authService.hasPermission(tenantId, userId, 'materials:stock:issue'),
      this.authService.hasPermission(tenantId, userId, 'materials:manage'),
    ]);

    if (!hasIssuePerm && !hasManagePerm) {
      throw new ForbiddenError(
        'Missing required permission: materials:stock:issue or materials:manage'
      );
    }
  }

  public async listReservations(
    tenantId: string,
    userId: string,
    query?: ListInventoryReservationsQueryDto
  ): Promise<{ items: InventoryReservationWithRelations[]; total: number }> {
    await this.verifyEntitlement(tenantId);

    const hasViewPerm = await this.authService.hasPermission(
      tenantId,
      userId,
      'materials:view'
    );
    if (!hasViewPerm) {
      throw new ForbiddenError('Missing required permission: materials:view');
    }

    const authCtx = await this.authService.getUserAuthorizationContext(
      tenantId,
      userId
    );
    let allowedProjectIds: string[] | undefined;

    if (!authCtx.isTenantAdmin) {
      allowedProjectIds = authCtx.projectIds;
      if (allowedProjectIds.length === 0) {
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

    return this.reservationRepo.findMany(tenantId, allowedProjectIds, query);
  }

  public async getReservationById(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<InventoryReservationWithRelations> {
    await this.verifyEntitlement(tenantId);

    const hasViewPerm = await this.authService.hasPermission(
      tenantId,
      userId,
      'materials:view'
    );
    if (!hasViewPerm) {
      throw new ForbiddenError('Missing required permission: materials:view');
    }

    const reservation = await this.reservationRepo.findById(tenantId, id);
    if (!reservation) {
      throw new NotFoundError(
        `Inventory reservation with ID ${id} not found in this tenant.`
      );
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      reservation.projectId,
      'materials:view'
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    return reservation;
  }

  public async createReservation(
    tenantId: string,
    userId: string,
    dto: CreateInventoryReservationDto
  ): Promise<InventoryReservationWithRelations> {
    await this.verifyEntitlement(tenantId);
    await this.verifyWritePermission(tenantId, userId);

    // 1. Validate Store
    const store = await this.storeRepo.findById(tenantId, dto.storeId);
    if (!store) {
      throw new NotFoundError(
        `Store with ID ${dto.storeId} not found in this tenant.`
      );
    }
    if (store.status !== 'ACTIVE') {
      throw new BadRequestError(
        `Cannot reserve from inactive store: ${store.name} (${store.code}).`
      );
    }

    // 2. Validate Store Access
    const storeAccess = await this.authService.hasStoreAccess(
      tenantId,
      userId,
      store.id,
      'materials:stock:issue'
    );
    if (!storeAccess.granted) {
      const manageAccess = await this.authService.hasStoreAccess(
        tenantId,
        userId,
        store.id,
        'materials:manage'
      );
      if (!manageAccess.granted) {
        throw new ForbiddenError(
          storeAccess.reason || 'Store access denied for stock reservation.'
        );
      }
    }

    // 3. Determine and Validate Project Scope
    let derivedProjectId: string;
    let scopeKey = 'GLOBAL';

    if (store.projectId) {
      // Project Site Store: Project is authoritative from Store
      derivedProjectId = store.projectId;
      if (dto.projectId && dto.projectId !== store.projectId) {
        throw new BadRequestError(
          `Project site store ${store.code} belongs strictly to project ${store.projectId}. Cannot reserve for a different project.`
        );
      }

      const project = await this.prisma.project.findFirst({
        where: { id: derivedProjectId, tenantId },
      });
      if (!project) {
        throw new NotFoundError(
          `Project with ID ${derivedProjectId} not found in this tenant.`
        );
      }
      if (project.status === 'ARCHIVED') {
        throw new BadRequestError(
          `Cannot create reservation for archived project: ${project.name}.`
        );
      }
      scopeKey = project.code;
    } else {
      // Central Warehouse Store: Project must be provided and active
      if (!dto.projectId) {
        throw new BadRequestError(
          'Beneficiary project must be specified when reserving from a Central Warehouse store.'
        );
      }
      derivedProjectId = dto.projectId;

      const project = await this.prisma.project.findFirst({
        where: { id: derivedProjectId, tenantId },
      });
      if (!project) {
        throw new NotFoundError(
          `Beneficiary project with ID ${derivedProjectId} not found in this tenant.`
        );
      }
      if (project.status === 'ARCHIVED') {
        throw new BadRequestError(
          `Cannot create reservation for archived project: ${project.name}.`
        );
      }

      const projAccess = await this.authService.hasProjectAccess(
        tenantId,
        userId,
        derivedProjectId,
        'materials:view'
      );
      if (!projAccess.granted) {
        throw new ForbiddenError(
          projAccess.reason || 'Access to beneficiary project denied.'
        );
      }
      scopeKey = project.code;
    }

    // 4. Validate Materials and Lines
    for (const line of dto.lines) {
      const material = await this.materialRepo.findById(
        tenantId,
        line.materialId
      );
      if (!material) {
        throw new NotFoundError(
          `Material with ID ${line.materialId} not found in this tenant.`
        );
      }
      if (material.status !== 'ACTIVE') {
        throw new BadRequestError(
          `Material ${material.name} (${material.itemCode}) is inactive and cannot be reserved.`
        );
      }
      if (line.uom !== material.primaryUom) {
        throw new BadRequestError(
          `UOM mismatch for material ${material.name}: expected ${material.primaryUom}, got ${line.uom}.`
        );
      }
      if (line.quantityReserved <= 0) {
        throw new BadRequestError('Reserved quantity must be strictly greater than 0.');
      }
    }

    // 5. Allocate Sequence Number
    const reservationNumber =
      await this.reservationRepo.allocateReservationNumber(
        tenantId,
        scopeKey,
        dto.reservationDate ? new Date(dto.reservationDate) : new Date()
      );

    // 6. Create Draft Reservation
    return this.reservationRepo.create(
      tenantId,
      userId,
      reservationNumber,
      derivedProjectId,
      dto
    );
  }

  public async updateReservation(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateInventoryReservationDto
  ): Promise<InventoryReservationWithRelations> {
    await this.verifyEntitlement(tenantId);
    await this.verifyWritePermission(tenantId, userId);

    const existing = await this.reservationRepo.findById(tenantId, id);
    if (!existing) {
      throw new NotFoundError(
        `Inventory reservation with ID ${id} not found in this tenant.`
      );
    }

    if (dto.lines && dto.lines.length > 0) {
      for (const line of dto.lines) {
        const material = await this.materialRepo.findById(
          tenantId,
          line.materialId
        );
        if (!material) {
          throw new NotFoundError(
            `Material with ID ${line.materialId} not found in this tenant.`
          );
        }
        if (material.status !== 'ACTIVE') {
          throw new BadRequestError(
            `Material ${material.name} (${material.itemCode}) is inactive.`
          );
        }
        if (line.uom !== material.primaryUom) {
          throw new BadRequestError(
            `UOM mismatch for material ${material.name}: expected ${material.primaryUom}, got ${line.uom}.`
          );
        }
      }
    }

    return this.reservationRepo.update(tenantId, id, dto);
  }

  public async submitReservation(
    tenantId: string,
    userId: string,
    id: string,
    dto?: SubmitInventoryReservationDto
  ): Promise<InventoryReservationWithRelations> {
    await this.verifyEntitlement(tenantId);
    await this.verifyWritePermission(tenantId, userId);

    return this.reservationRepo.submit(tenantId, id, userId, dto?.remarks);
  }

  public async approveReservation(
    tenantId: string,
    userId: string,
    id: string,
    dto?: ApproveInventoryReservationDto
  ): Promise<InventoryReservationWithRelations> {
    await this.verifyEntitlement(tenantId);
    await this.verifyWritePermission(tenantId, userId);

    return this.reservationRepo.approve(
      tenantId,
      id,
      userId,
      dto?.approvalRemarks
    );
  }

  public async rejectReservation(
    tenantId: string,
    userId: string,
    id: string,
    dto: RejectInventoryReservationDto
  ): Promise<InventoryReservationWithRelations> {
    await this.verifyEntitlement(tenantId);
    await this.verifyWritePermission(tenantId, userId);

    return this.reservationRepo.reject(
      tenantId,
      id,
      userId,
      dto.rejectionReason
    );
  }

  public async releaseReservation(
    tenantId: string,
    userId: string,
    id: string,
    dto?: ReleaseInventoryReservationDto
  ): Promise<InventoryReservationWithRelations> {
    await this.verifyEntitlement(tenantId);
    await this.verifyWritePermission(tenantId, userId);

    return this.reservationRepo.release(
      tenantId,
      id,
      userId,
      dto?.releaseRemarks
    );
  }

  public async cancelReservation(
    tenantId: string,
    userId: string,
    id: string,
    dto?: CancelInventoryReservationDto
  ): Promise<InventoryReservationWithRelations> {
    await this.verifyEntitlement(tenantId);
    await this.verifyWritePermission(tenantId, userId);

    return this.reservationRepo.cancel(
      tenantId,
      id,
      userId,
      dto?.cancellationReason
    );
  }

  public async expireStaleReservations(
    tenantId: string,
    userId: string
  ): Promise<{ count: number }> {
    await this.verifyEntitlement(tenantId);
    await this.verifyWritePermission(tenantId, userId);

    const count = await this.reservationRepo.expireStaleReservations(
      tenantId,
      new Date()
    );
    return { count };
  }

  public async deleteDraftReservation(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<void> {
    await this.verifyEntitlement(tenantId);
    await this.verifyWritePermission(tenantId, userId);

    await this.reservationRepo.deleteDraft(tenantId, id);
  }
}
