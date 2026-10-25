import { PrismaClient } from '@prisma/client';
import type {
  IMaterialTransferRepository,
  MaterialTransferWithRelations,
} from '../repositories/material-transfer.repository.interface';
import { PrismaMaterialTransferRepository } from '../repositories/prisma-material-transfer.repository';
import type { IStoreRepository } from '../repositories/store.repository.interface';
import { PrismaStoreRepository } from '../repositories/prisma-store.repository';
import type { IMaterialRepository } from '../repositories/material.repository.interface';
import { PrismaMaterialRepository } from '../repositories/prisma-material.repository';
import type {
  CreateMaterialTransferDto,
  UpdateMaterialTransferDto,
  SubmitMaterialTransferDto,
  ApproveMaterialTransferDto,
  RejectMaterialTransferDto,
  CancelMaterialTransferDto,
  DispatchMaterialTransferDto,
  ReceiveMaterialTransferDto,
  ListMaterialTransfersQueryDto,
} from '../dto/material-transfer.dto';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../../common/errors/app-error';
import { AuthorizationService } from '../../rbac/services/authorization.service';
import { EntitlementService } from '../../subscriptions/services/entitlement.service';
import { DatabaseService } from '../../../database/database.service';
import { ActiveApprovalGuard } from '../../approvals/helpers/active-approval.guard.js';

import {
  MATERIAL_TRANSFER_ENTITLEMENT,
  MATERIAL_TRANSFER_PERMISSIONS,
} from '../constants/material-transfer.constants';

export interface MaterialTransferServiceDependencies {
  materialTransferRepository?: IMaterialTransferRepository;
  storeRepository?: IStoreRepository;
  materialRepository?: IMaterialRepository;
  authorizationService?: AuthorizationService;
  entitlementService?: EntitlementService;
  prisma?: PrismaClient;
}

export class MaterialTransferService {
  private static instance: MaterialTransferService;
  private readonly transferRepo: IMaterialTransferRepository;
  private readonly storeRepo: IStoreRepository;
  private readonly materialRepo: IMaterialRepository;
  private readonly authService: AuthorizationService;
  private readonly entitlementService: EntitlementService;
  private readonly prisma: any;

  constructor(deps?: MaterialTransferServiceDependencies) {
    this.transferRepo =
      deps?.materialTransferRepository ??
      PrismaMaterialTransferRepository.getInstance();
    this.storeRepo =
      deps?.storeRepository ?? PrismaStoreRepository.getInstance();
    this.materialRepo =
      deps?.materialRepository ?? PrismaMaterialRepository.getInstance();
    this.authService =
      deps?.authorizationService ?? AuthorizationService.getInstance();
    this.entitlementService =
      deps?.entitlementService ?? new EntitlementService();
    this.prisma = deps?.prisma ?? DatabaseService.getInstance().getClient();
  }

  public static getInstance(
    deps?: MaterialTransferServiceDependencies
  ): MaterialTransferService {
    if (!MaterialTransferService.instance || deps) {
      MaterialTransferService.instance = new MaterialTransferService(deps);
    }
    return MaterialTransferService.instance;
  }

  public static resetInstance(): void {
    MaterialTransferService.instance =
      undefined as unknown as MaterialTransferService;
  }

  private async verifyEntitlement(tenantId: string): Promise<void> {
    const isEntitled = await this.entitlementService.isFeatureEntitled(
      tenantId,
      MATERIAL_TRANSFER_ENTITLEMENT
    );
    if (!isEntitled) {
      throw new ForbiddenError(
        `Feature entitlement ${MATERIAL_TRANSFER_ENTITLEMENT} required for Material Transfer.`
      );
    }
  }

  public async listMaterialTransfers(
    tenantId: string,
    userId: string,
    query?: ListMaterialTransfersQueryDto
  ): Promise<{ items: MaterialTransferWithRelations[]; total: number }> {
    if (!tenantId || !userId) {
      throw new BadRequestError('Tenant and user contexts are required.');
    }

    await this.verifyEntitlement(tenantId);

    const hasViewPerm = await this.authService.hasPermission(
      tenantId,
      userId,
      MATERIAL_TRANSFER_PERMISSIONS.VIEW
    );
    if (!hasViewPerm) {
      throw new ForbiddenError(
        `Missing required permission: ${MATERIAL_TRANSFER_PERMISSIONS.VIEW}`
      );
    }

    const authCtx = await this.authService.getUserAuthorizationContext(
      tenantId,
      userId
    );
    let allowedStoreIds: string[] | undefined;

    if (!authCtx.isTenantAdmin) {
      allowedStoreIds = authCtx.storeIds;
      if (allowedStoreIds.length === 0 && authCtx.projectIds.length > 0) {
        // Find stores in allowed projects
        const stores = await this.prisma.store.findMany({
          where: {
            tenantId,
            projectId: { in: authCtx.projectIds },
          },
          select: { id: true },
        });
        allowedStoreIds = stores.map((s: { id: string }) => s.id);
      }
    }

    if (query?.sourceStoreId) {
      const access = await this.authService.hasStoreAccess(
        tenantId,
        userId,
        query.sourceStoreId,
        MATERIAL_TRANSFER_PERMISSIONS.VIEW
      );
      if (!access.granted) {
        throw new ForbiddenError(access.reason || 'Access to source store denied.');
      }
    }

    if (query?.destinationStoreId) {
      const access = await this.authService.hasStoreAccess(
        tenantId,
        userId,
        query.destinationStoreId,
        MATERIAL_TRANSFER_PERMISSIONS.VIEW
      );
      if (!access.granted) {
        throw new ForbiddenError(access.reason || 'Access to destination store denied.');
      }
    }

    return this.transferRepo.findMany(tenantId, allowedStoreIds, query);
  }

  public async getMaterialTransferById(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<MaterialTransferWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const hasViewPerm = await this.authService.hasPermission(
      tenantId,
      userId,
      MATERIAL_TRANSFER_PERMISSIONS.VIEW
    );
    if (!hasViewPerm) {
      throw new ForbiddenError(
        `Missing required permission: ${MATERIAL_TRANSFER_PERMISSIONS.VIEW}`
      );
    }

    const transfer = await this.transferRepo.findById(tenantId, id);
    if (!transfer) {
      throw new NotFoundError(`Material transfer with ID ${id} not found.`);
    }

    const sourceAccess = await this.authService.hasStoreAccess(
      tenantId,
      userId,
      transfer.sourceStoreId,
      MATERIAL_TRANSFER_PERMISSIONS.VIEW
    );
    const destAccess = await this.authService.hasStoreAccess(
      tenantId,
      userId,
      transfer.destinationStoreId,
      MATERIAL_TRANSFER_PERMISSIONS.VIEW
    );

    if (!sourceAccess.granted && !destAccess.granted) {
      throw new ForbiddenError('Access to transfer stores denied.');
    }

    return transfer;
  }

  public async createMaterialTransfer(
    tenantId: string,
    userId: string,
    dto: CreateMaterialTransferDto
  ): Promise<MaterialTransferWithRelations> {
    if (!tenantId || !userId) {
      throw new BadRequestError('Missing tenant or user context.');
    }

    await this.verifyEntitlement(tenantId);

    const hasPerm = await this.authService.hasPermission(
      tenantId,
      userId,
      MATERIAL_TRANSFER_PERMISSIONS.TRANSFER
    );
    if (!hasPerm) {
      throw new ForbiddenError(
        `Missing required permission: ${MATERIAL_TRANSFER_PERMISSIONS.TRANSFER}`
      );
    }

    if (dto.sourceStoreId === dto.destinationStoreId) {
      throw new BadRequestError('Source and destination stores cannot be the same.');
    }

    const sourceStore = await this.storeRepo.findById(tenantId, dto.sourceStoreId);
    if (!sourceStore) {
      throw new NotFoundError(`Source store with ID ${dto.sourceStoreId} not found.`);
    }
    if (sourceStore.status !== 'ACTIVE') {
      throw new BadRequestError(`Source store is inactive.`);
    }

    const destStore = await this.storeRepo.findById(tenantId, dto.destinationStoreId);
    if (!destStore) {
      throw new NotFoundError(`Destination store with ID ${dto.destinationStoreId} not found.`);
    }
    if (destStore.status !== 'ACTIVE') {
      throw new BadRequestError(`Destination store is inactive.`);
    }

    const access = await this.authService.hasStoreAccess(
      tenantId,
      userId,
      dto.sourceStoreId,
      MATERIAL_TRANSFER_PERMISSIONS.TRANSFER
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to source store denied.');
    }

    const validatedLines = await this.validateLineItems(tenantId, dto.lines);

    // Derive scope key for numbering
    let scopeKey = 'CENTRAL';
    if (sourceStore.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: sourceStore.projectId },
        select: { code: true },
      });
      if (project?.code) {
        scopeKey = project.code;
      }
    } else if (sourceStore.code) {
      scopeKey = sourceStore.code;
    }

    const transferDate = dto.transferDate ? new Date(dto.transferDate) : new Date();
    const transferNumber = await this.transferRepo.allocateTransferNumber(
      tenantId,
      scopeKey,
      transferDate
    );

    return this.transferRepo.create(
      tenantId,
      userId,
      transferNumber,
      dto,
      sourceStore.projectId,
      destStore.projectId,
      validatedLines
    );
  }

  public async updateMaterialTransfer(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateMaterialTransferDto
  ): Promise<MaterialTransferWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const hasPerm = await this.authService.hasPermission(
      tenantId,
      userId,
      MATERIAL_TRANSFER_PERMISSIONS.TRANSFER
    );
    if (!hasPerm) {
      throw new ForbiddenError(
        `Missing required permission: ${MATERIAL_TRANSFER_PERMISSIONS.TRANSFER}`
      );
    }

    const transfer = await this.transferRepo.findById(tenantId, id);
    if (!transfer) {
      throw new NotFoundError(`Material transfer with ID ${id} not found.`);
    }

    if (transfer.status !== 'DRAFT' && transfer.status !== 'REJECTED') {
      throw new BadRequestError(
        `Cannot update material transfer in status '${transfer.status}'. Only DRAFT or REJECTED transfers can be updated.`
      );
    }

    const access = await this.authService.hasStoreAccess(
      tenantId,
      userId,
      transfer.sourceStoreId,
      MATERIAL_TRANSFER_PERMISSIONS.TRANSFER
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to source store denied.');
    }

    let sourceProjectId = transfer.sourceProjectId;
    let destinationProjectId = transfer.destinationProjectId;

    const sourceStoreId = dto.sourceStoreId || transfer.sourceStoreId;
    const destStoreId = dto.destinationStoreId || transfer.destinationStoreId;

    if (sourceStoreId === destStoreId) {
      throw new BadRequestError('Source and destination stores cannot be the same.');
    }

    if (dto.sourceStoreId && dto.sourceStoreId !== transfer.sourceStoreId) {
      const sourceStore = await this.storeRepo.findById(tenantId, dto.sourceStoreId);
      if (!sourceStore) {
        throw new NotFoundError(`Source store with ID ${dto.sourceStoreId} not found.`);
      }
      if (sourceStore.status !== 'ACTIVE') {
        throw new BadRequestError('Source store is inactive.');
      }
      const newSourceAccess = await this.authService.hasStoreAccess(
        tenantId,
        userId,
        dto.sourceStoreId,
        MATERIAL_TRANSFER_PERMISSIONS.TRANSFER
      );
      if (!newSourceAccess.granted) {
        throw new ForbiddenError(newSourceAccess.reason || 'Access to source store denied.');
      }
      sourceProjectId = sourceStore.projectId;
    }

    if (dto.destinationStoreId && dto.destinationStoreId !== transfer.destinationStoreId) {
      const destStore = await this.storeRepo.findById(tenantId, dto.destinationStoreId);
      if (!destStore) {
        throw new NotFoundError(`Destination store with ID ${dto.destinationStoreId} not found.`);
      }
      if (destStore.status !== 'ACTIVE') {
        throw new BadRequestError('Destination store is inactive.');
      }
      destinationProjectId = destStore.projectId;
    }

    let validatedLines: Array<{
      materialId: string;
      quantityTransferred: number;
      uom: string;
      remarks?: string | null;
    }> | undefined;

    if (dto.lines && dto.lines.length > 0) {
      validatedLines = await this.validateLineItems(tenantId, dto.lines);
    }

    return this.transferRepo.update(
      tenantId,
      id,
      dto,
      sourceProjectId,
      destinationProjectId,
      validatedLines
    );
  }

  public async submitMaterialTransfer(
    tenantId: string,
    userId: string,
    id: string,
    dto?: SubmitMaterialTransferDto
  ): Promise<MaterialTransferWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const hasPerm = await this.authService.hasPermission(
      tenantId,
      userId,
      MATERIAL_TRANSFER_PERMISSIONS.TRANSFER
    );
    if (!hasPerm) {
      throw new ForbiddenError(
        `Missing required permission: ${MATERIAL_TRANSFER_PERMISSIONS.TRANSFER}`
      );
    }

    const transfer = await this.transferRepo.findById(tenantId, id);
    if (!transfer) {
      throw new NotFoundError(`Material transfer with ID ${id} not found.`);
    }

    const access = await this.authService.hasStoreAccess(
      tenantId,
      userId,
      transfer.sourceStoreId,
      MATERIAL_TRANSFER_PERMISSIONS.TRANSFER
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to source store denied.');
    }

    if (transfer.status !== 'DRAFT' && transfer.status !== 'REJECTED') {
      throw new BadRequestError(
        `Only DRAFT or REJECTED material transfers can be submitted. Current status: ${transfer.status}`
      );
    }

    return this.transferRepo.submit(tenantId, id, userId, dto?.remarks);
  }

  public async approveMaterialTransfer(
    tenantId: string,
    userId: string,
    id: string,
    dto?: ApproveMaterialTransferDto
  ): Promise<MaterialTransferWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const hasPerm = await this.authService.hasPermission(
      tenantId,
      userId,
      MATERIAL_TRANSFER_PERMISSIONS.TRANSFER
    );
    if (!hasPerm) {
      throw new ForbiddenError(
        `Missing required permission: ${MATERIAL_TRANSFER_PERMISSIONS.TRANSFER}`
      );
    }

    const transfer = await this.transferRepo.findById(tenantId, id);
    if (!transfer) {
      throw new NotFoundError(`Material transfer with ID ${id} not found.`);
    }

    await ActiveApprovalGuard.assertNoActiveCentralApproval(
      this.prisma,
      tenantId,
      'MATERIAL_TRANSFER',
      id
    );


    const access = await this.authService.hasStoreAccess(
      tenantId,
      userId,
      transfer.sourceStoreId,
      MATERIAL_TRANSFER_PERMISSIONS.TRANSFER
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to source store denied.');
    }

    if (transfer.status !== 'SUBMITTED') {
      throw new BadRequestError(
        `Only SUBMITTED material transfers can be approved. Current status: ${transfer.status}`
      );
    }

    // Segregation of Duties: Creator cannot approve
    if (transfer.createdById === userId) {
      throw new ForbiddenError(
        'Segregation of duties violation: Approver cannot be the creator of the material transfer.'
      );
    }

    return this.transferRepo.approve(tenantId, id, userId, dto?.approvalRemarks);
  }

  public async rejectMaterialTransfer(
    tenantId: string,
    userId: string,
    id: string,
    dto: RejectMaterialTransferDto
  ): Promise<MaterialTransferWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const hasPerm = await this.authService.hasPermission(
      tenantId,
      userId,
      MATERIAL_TRANSFER_PERMISSIONS.TRANSFER
    );
    if (!hasPerm) {
      throw new ForbiddenError(
        `Missing required permission: ${MATERIAL_TRANSFER_PERMISSIONS.TRANSFER}`
      );
    }

    const transfer = await this.transferRepo.findById(tenantId, id);
    if (!transfer) {
      throw new NotFoundError(`Material transfer with ID ${id} not found.`);
    }

    const access = await this.authService.hasStoreAccess(
      tenantId,
      userId,
      transfer.sourceStoreId,
      MATERIAL_TRANSFER_PERMISSIONS.TRANSFER
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to source store denied.');
    }

    if (transfer.status !== 'SUBMITTED') {
      throw new BadRequestError(
        `Only SUBMITTED material transfers can be rejected. Current status: ${transfer.status}`
      );
    }

    return this.transferRepo.reject(tenantId, id, userId, dto.rejectionReason);
  }

  public async cancelMaterialTransfer(
    tenantId: string,
    userId: string,
    id: string,
    dto?: CancelMaterialTransferDto
  ): Promise<MaterialTransferWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const hasPerm = await this.authService.hasPermission(
      tenantId,
      userId,
      MATERIAL_TRANSFER_PERMISSIONS.TRANSFER
    );
    if (!hasPerm) {
      throw new ForbiddenError(
        `Missing required permission: ${MATERIAL_TRANSFER_PERMISSIONS.TRANSFER}`
      );
    }

    const transfer = await this.transferRepo.findById(tenantId, id);
    if (!transfer) {
      throw new NotFoundError(`Material transfer with ID ${id} not found.`);
    }

    const access = await this.authService.hasStoreAccess(
      tenantId,
      userId,
      transfer.sourceStoreId,
      MATERIAL_TRANSFER_PERMISSIONS.TRANSFER
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to source store denied.');
    }

    if (transfer.status === 'IN_TRANSIT' || transfer.status === 'RECEIVED') {
      throw new BadRequestError(
        `Cannot cancel material transfer in status '${transfer.status}'. Dispatched and received transfers are irrevocable.`
      );
    }

    return this.transferRepo.cancel(tenantId, id, userId, dto?.cancellationReason);
  }

  public async dispatchMaterialTransfer(
    tenantId: string,
    userId: string,
    id: string,
    dto?: DispatchMaterialTransferDto
  ): Promise<MaterialTransferWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const hasPerm = await this.authService.hasPermission(
      tenantId,
      userId,
      MATERIAL_TRANSFER_PERMISSIONS.TRANSFER
    );
    if (!hasPerm) {
      throw new ForbiddenError(
        `Missing required permission: ${MATERIAL_TRANSFER_PERMISSIONS.TRANSFER}`
      );
    }

    const transfer = await this.transferRepo.findById(tenantId, id);
    if (!transfer) {
      throw new NotFoundError(`Material transfer with ID ${id} not found.`);
    }

    if (transfer.status === 'IN_TRANSIT') {
      return transfer;
    }

    if (transfer.status !== 'APPROVED' && transfer.status !== 'SUBMITTED') {
      throw new BadRequestError(
        `Only APPROVED or SUBMITTED material transfers can be dispatched. Current status: ${transfer.status}`
      );
    }

    const access = await this.authService.hasStoreAccess(
      tenantId,
      userId,
      transfer.sourceStoreId,
      MATERIAL_TRANSFER_PERMISSIONS.TRANSFER
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to source store denied.');
    }

    return this.transferRepo.dispatch(tenantId, id, userId, dto);
  }

  public async receiveMaterialTransfer(
    tenantId: string,
    userId: string,
    id: string,
    dto?: ReceiveMaterialTransferDto
  ): Promise<MaterialTransferWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const hasPerm = await this.authService.hasPermission(
      tenantId,
      userId,
      MATERIAL_TRANSFER_PERMISSIONS.RECEIVE
    );
    if (!hasPerm) {
      throw new ForbiddenError(
        `Missing required permission: ${MATERIAL_TRANSFER_PERMISSIONS.RECEIVE}`
      );
    }

    const transfer = await this.transferRepo.findById(tenantId, id);
    if (!transfer) {
      throw new NotFoundError(`Material transfer with ID ${id} not found.`);
    }

    if (transfer.status === 'RECEIVED') {
      return transfer;
    }

    if (transfer.status !== 'IN_TRANSIT') {
      throw new BadRequestError(
        `Only IN_TRANSIT material transfers can be received. Current status: ${transfer.status}`
      );
    }

    const access = await this.authService.hasStoreAccess(
      tenantId,
      userId,
      transfer.destinationStoreId,
      MATERIAL_TRANSFER_PERMISSIONS.RECEIVE
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to destination store denied.');
    }

    // Segregation of Duties: Dispatcher cannot receive
    if (transfer.dispatchedById === userId) {
      throw new ForbiddenError(
        'Segregation of duties violation: Receiver cannot be the dispatcher of the material transfer.'
      );
    }

    return this.transferRepo.receive(tenantId, id, userId, dto);
  }

  public async deleteMaterialTransfer(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<{ success: boolean }> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const hasPerm = await this.authService.hasPermission(
      tenantId,
      userId,
      MATERIAL_TRANSFER_PERMISSIONS.TRANSFER
    );
    if (!hasPerm) {
      throw new ForbiddenError(
        `Missing required permission: ${MATERIAL_TRANSFER_PERMISSIONS.TRANSFER}`
      );
    }

    const transfer = await this.transferRepo.findById(tenantId, id);
    if (!transfer) {
      throw new NotFoundError(`Material transfer with ID ${id} not found.`);
    }

    const access = await this.authService.hasStoreAccess(
      tenantId,
      userId,
      transfer.sourceStoreId,
      MATERIAL_TRANSFER_PERMISSIONS.TRANSFER
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to source store denied.');
    }

    if (transfer.status !== 'DRAFT') {
      throw new BadRequestError(
        `Only DRAFT material transfers can be deleted. Current status: ${transfer.status}`
      );
    }

    await this.transferRepo.delete(tenantId, id);
    return { success: true };
  }

  private async validateLineItems(
    tenantId: string,
    lines: Array<{
      materialId: string;
      quantityTransferred: number;
      remarks?: string | null;
    }>
  ): Promise<
    Array<{
      materialId: string;
      quantityTransferred: number;
      uom: string;
      remarks?: string | null;
    }>
  > {
    const seenMaterialIds = new Set<string>();
    const validated: Array<{
      materialId: string;
      quantityTransferred: number;
      uom: string;
      remarks?: string | null;
    }> = [];

    for (const line of lines) {
      if (seenMaterialIds.has(line.materialId)) {
        throw new BadRequestError(
          `Duplicate material line detected for material ID ${line.materialId}.`
        );
      }
      seenMaterialIds.add(line.materialId);

      const material = await this.materialRepo.findById(tenantId, line.materialId);
      if (!material) {
        throw new NotFoundError(`Material with ID ${line.materialId} not found.`);
      }
      if (material.status !== 'ACTIVE') {
        throw new BadRequestError(`Material ${material.name} (${material.itemCode}) is inactive.`);
      }

      if (line.quantityTransferred <= 0) {
        throw new BadRequestError('Transferred quantity must be strictly greater than 0.');
      }

      validated.push({
        materialId: line.materialId,
        quantityTransferred: line.quantityTransferred,
        uom: material.primaryUom,
        remarks: line.remarks || null,
      });
    }

    return validated;
  }
}
