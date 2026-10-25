import { PrismaClient, Prisma } from '@prisma/client';
import type {
  IGoodsReceiptRepository,
  GoodsReceiptWithRelations,
} from '../repositories/goods-receipt.repository.interface';
import { PrismaGoodsReceiptRepository } from '../repositories/prisma-goods-receipt.repository';
import type { IPurchaseOrderRepository } from '../repositories/purchase-order.repository.interface';
import { PrismaPurchaseOrderRepository } from '../repositories/prisma-purchase-order.repository';
import type { IStoreRepository } from '../repositories/store.repository.interface';
import { PrismaStoreRepository } from '../repositories/prisma-store.repository';
import type { IMaterialRepository } from '../repositories/material.repository.interface';
import { PrismaMaterialRepository } from '../repositories/prisma-material.repository';
import type {
  CreateGoodsReceiptDto,
  UpdateGoodsReceiptDto,
  SubmitGoodsReceiptDto,
  VerifyGoodsReceiptDto,
  RejectGoodsReceiptDto,
  CancelGoodsReceiptDto,
  ListGoodsReceiptsQueryDto,
} from '../dto/goods-receipt.dto';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../../common/errors/app-error';
import { AuthorizationService } from '../../rbac/services/authorization.service';
import { EntitlementService } from '../../subscriptions/services/entitlement.service';
import { DatabaseService } from '../../../database/database.service';
import {
  GOODS_RECEIPT_STATUSES,
  GRN_ENTITLEMENT,
  GRN_PERMISSIONS,
} from '../constants/grn.constants';

export interface GoodsReceiptServiceDependencies {
  grnRepository?: IGoodsReceiptRepository;
  poRepository?: IPurchaseOrderRepository;
  storeRepository?: IStoreRepository;
  materialRepository?: IMaterialRepository;
  authorizationService?: AuthorizationService;
  entitlementService?: EntitlementService;
  prisma?: PrismaClient;
}

export class GoodsReceiptService {
  private static instance: GoodsReceiptService;
  private readonly grnRepo: IGoodsReceiptRepository;
  private readonly poRepo: IPurchaseOrderRepository;
  private readonly storeRepo: IStoreRepository;
  private readonly materialRepo: IMaterialRepository;
  private readonly authService: AuthorizationService;
  private readonly entitlementService: EntitlementService;
  private readonly prisma: any;

  constructor(deps?: GoodsReceiptServiceDependencies) {
    this.grnRepo = deps?.grnRepository ?? PrismaGoodsReceiptRepository.getInstance();
    this.poRepo = deps?.poRepository ?? new PrismaPurchaseOrderRepository();
    this.storeRepo = deps?.storeRepository ?? PrismaStoreRepository.getInstance();
    this.materialRepo = deps?.materialRepository ?? PrismaMaterialRepository.getInstance();
    this.authService = deps?.authorizationService ?? AuthorizationService.getInstance();
    this.entitlementService = deps?.entitlementService ?? new EntitlementService();
    this.prisma = deps?.prisma ?? DatabaseService.getInstance().getClient();
  }

  public static getInstance(deps?: GoodsReceiptServiceDependencies): GoodsReceiptService {
    if (!GoodsReceiptService.instance || deps) {
      GoodsReceiptService.instance = new GoodsReceiptService(deps);
    }
    return GoodsReceiptService.instance;
  }

  public static resetInstance(): void {
    GoodsReceiptService.instance = undefined as unknown as GoodsReceiptService;
  }

  private async verifyEntitlement(tenantId: string): Promise<void> {
    const isEntitled = await this.entitlementService.isFeatureEntitled(
      tenantId,
      GRN_ENTITLEMENT
    );
    if (!isEntitled) {
      throw new ForbiddenError(
        `Feature entitlement ${GRN_ENTITLEMENT} required for Goods Receipt Notes.`
      );
    }
  }

  public async listGoodsReceipts(
    tenantId: string,
    userId: string,
    query?: ListGoodsReceiptsQueryDto
  ): Promise<{ items: GoodsReceiptWithRelations[]; total: number }> {
    if (!tenantId || !userId) {
      throw new BadRequestError('Tenant and user contexts are required.');
    }

    await this.verifyEntitlement(tenantId);

    const hasViewPerm = await this.authService.hasPermission(
      tenantId,
      userId,
      GRN_PERMISSIONS.VIEW
    );
    if (!hasViewPerm) {
      throw new ForbiddenError(`Missing required permission: ${GRN_PERMISSIONS.VIEW}`);
    }

    const authCtx = await this.authService.getUserAuthorizationContext(tenantId, userId);
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
        GRN_PERMISSIONS.VIEW
      );
      if (!access.granted) {
        throw new ForbiddenError(access.reason || 'Access to project denied.');
      }
    }

    return this.grnRepo.findMany(tenantId, allowedProjectIds, query);
  }

  public async getGoodsReceiptById(
    tenantId: string,
    userId: string,
    id: string,
    projectId?: string
  ): Promise<GoodsReceiptWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const grn = await this.grnRepo.findById(tenantId, id, projectId);
    if (!grn) {
      throw new NotFoundError('Goods receipt note not found.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      grn.projectId,
      GRN_PERMISSIONS.VIEW
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    return grn;
  }

  public async createGoodsReceipt(
    tenantId: string,
    userId: string,
    dto: CreateGoodsReceiptDto
  ): Promise<GoodsReceiptWithRelations> {
    if (!tenantId || !userId) {
      throw new BadRequestError('Tenant and user contexts are required.');
    }

    await this.verifyEntitlement(tenantId);

    const hasCreatePerm = await this.authService.hasPermission(
      tenantId,
      userId,
      GRN_PERMISSIONS.CREATE
    );
    if (!hasCreatePerm) {
      throw new ForbiddenError(`Missing required permission: ${GRN_PERMISSIONS.CREATE}`);
    }

    // 1. Fetch & validate PO
    const po = await this.poRepo.findById(tenantId, dto.purchaseOrderId);
    if (!po) {
      throw new NotFoundError(
        `Purchase order with ID ${dto.purchaseOrderId} not found in this tenant.`
      );
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      po.projectId,
      GRN_PERMISSIONS.CREATE
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    // PO Status MUST be ORDERED
    if (po.status !== 'ORDERED') {
      throw new BadRequestError(
        `Goods receipts can only be created against purchase orders in ORDERED status. Current status: ${po.status}`
      );
    }

    // 2. Fetch & validate Store
    const store = await this.storeRepo.findById(tenantId, dto.storeId);
    if (!store) {
      throw new NotFoundError(
        `Store with ID ${dto.storeId} not found in this tenant.`
      );
    }

    if (store.status !== 'ACTIVE') {
      throw new BadRequestError(
        `Destination store ${store.code} is inactive. Receipts can only be posted to ACTIVE stores.`
      );
    }

    // Destination rule: store must match PO project OR be a central warehouse
    const isCentral =
      (store as any).isCentralWarehouse === true || (store as any).storeType === 'CENTRAL';
    if (!isCentral && store.projectId !== po.projectId) {
      throw new BadRequestError(
        `Store ${store.code} belongs to project ${store.projectId} and is not valid for PO project ${po.projectId}. Must be a site store of the PO project or a central warehouse.`
      );
    }

    // 3. Validate Line Items against PO Lines
    const poLineMap = new Map(po.lines.map((l) => [l.id, l]));
    const unitRatesMap = new Map<string, number>();

    for (const line of dto.lines) {
      const poLine = poLineMap.get(line.purchaseOrderLineId);
      if (!poLine) {
        throw new BadRequestError(
          `Line references PO line ID ${line.purchaseOrderLineId} which does not belong to purchase order ${po.poNumber}.`
        );
      }

      if (poLine.materialId !== line.materialId) {
        throw new BadRequestError(
          `Material ID ${line.materialId} on GRN line does not match PO line material ${poLine.materialId}.`
        );
      }

      if (poLine.uom !== line.uom) {
        throw new BadRequestError(
          `UOM '${line.uom}' on GRN line does not match PO line UOM '${poLine.uom}'.`
        );
      }

      const material = await this.materialRepo.findById(tenantId, line.materialId);
      if (!material) {
        throw new NotFoundError(`Material ID ${line.materialId} not found in this tenant.`);
      }
      if (material.status !== 'ACTIVE') {
        throw new BadRequestError(`Material ${material.itemCode} is inactive.`);
      }

      const poOrdered = Number(poLine.quantityOrdered);
      const poReceived = Number(poLine.quantityReceived);
      const remaining = poOrdered - poReceived;

      if (line.quantityAccepted > remaining + 0.0001) {
        throw new BadRequestError(
          `Over-receipt rejected (0% tolerance): Accepted quantity (${line.quantityAccepted}) exceeds remaining PO line quantity (${remaining}). Ordered: ${poOrdered}, Received: ${poReceived}.`
        );
      }

      unitRatesMap.set(line.purchaseOrderLineId, Number(poLine.unitRate));
    }

    // 4. Allocate unique GRN number
    const receiptDate = dto.receiptDate ? new Date(dto.receiptDate) : new Date();
    const grnNumber = await this.grnRepo.allocateGrnNumber(
      tenantId,
      po.projectId,
      po.project.code,
      receiptDate
    );

    // 5. Create GRN in repository
    return this.grnRepo.create(
      tenantId,
      po.projectId,
      po.vendorId,
      userId,
      grnNumber,
      dto,
      unitRatesMap
    );
  }

  public async updateGoodsReceipt(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateGoodsReceiptDto
  ): Promise<GoodsReceiptWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const grn = await this.grnRepo.findById(tenantId, id);
    if (!grn) {
      throw new NotFoundError('Goods receipt note not found.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      grn.projectId,
      GRN_PERMISSIONS.CREATE
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    if (grn.status !== 'DRAFT' && grn.status !== 'REJECTED') {
      throw new BadRequestError(
        `Goods receipts can only be updated in DRAFT or REJECTED status. Current status: ${grn.status}`
      );
    }

    // Validate store if changed
    if (dto.storeId) {
      const store = await this.storeRepo.findById(tenantId, dto.storeId);
      if (!store) {
        throw new NotFoundError(`Store with ID ${dto.storeId} not found.`);
      }
      if (store.status !== 'ACTIVE') {
        throw new BadRequestError(`Store ${store.code} is inactive.`);
      }
      const isCentral =
        (store as any).isCentralWarehouse === true || (store as any).storeType === 'CENTRAL';
      if (!isCentral && store.projectId !== grn.projectId) {
        throw new BadRequestError(
          `Store ${store.code} belongs to project ${store.projectId} and is not valid for PO project ${grn.projectId}.`
        );
      }
    }

    let unitRatesMap: Map<string, number> | undefined;
    if (dto.lines && dto.lines.length > 0) {
      const po = await this.poRepo.findById(tenantId, grn.purchaseOrderId);
      if (!po) {
        throw new NotFoundError(`Linked purchase order ${grn.purchaseOrderId} not found.`);
      }

      const poLineMap = new Map(po.lines.map((l) => [l.id, l]));
      unitRatesMap = new Map<string, number>();

      for (const line of dto.lines) {
        const poLine = poLineMap.get(line.purchaseOrderLineId);
        if (!poLine) {
          throw new BadRequestError(
            `Line references PO line ID ${line.purchaseOrderLineId} which does not belong to purchase order ${po.poNumber}.`
          );
        }

        if (poLine.materialId !== line.materialId) {
          throw new BadRequestError(
            `Material mismatch on GRN line: expected ${poLine.materialId}, got ${line.materialId}`
          );
        }

        if (poLine.uom !== line.uom) {
          throw new BadRequestError(
            `UOM mismatch on GRN line: expected ${poLine.uom}, got ${line.uom}`
          );
        }

        const poOrdered = Number(poLine.quantityOrdered);
        const poReceived = Number(poLine.quantityReceived);
        const remaining = poOrdered - poReceived;

        if (line.quantityAccepted > remaining + 0.0001) {
          throw new BadRequestError(
            `Over-receipt rejected (0% tolerance): Accepted quantity (${line.quantityAccepted}) exceeds remaining PO line quantity (${remaining}).`
          );
        }

        unitRatesMap.set(line.purchaseOrderLineId, Number(poLine.unitRate));
      }
    }

    return this.grnRepo.update(tenantId, id, dto, unitRatesMap);
  }

  public async submitGoodsReceipt(
    tenantId: string,
    userId: string,
    id: string,
    dto?: SubmitGoodsReceiptDto
  ): Promise<GoodsReceiptWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const grn = await this.grnRepo.findById(tenantId, id);
    if (!grn) {
      throw new NotFoundError('Goods receipt note not found.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      grn.projectId,
      GRN_PERMISSIONS.CREATE
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    if (grn.status !== 'DRAFT' && grn.status !== 'REJECTED') {
      throw new BadRequestError(
        `Only DRAFT or REJECTED goods receipts can be submitted. Current status: ${grn.status}`
      );
    }

    if (!grn.lines || grn.lines.length === 0) {
      throw new BadRequestError('Cannot submit a goods receipt note without line items.');
    }

    // Verify PO status is still ORDERED
    const po = await this.poRepo.findById(tenantId, grn.purchaseOrderId);
    if (!po || po.status !== 'ORDERED') {
      throw new BadRequestError(
        `Cannot submit goods receipt because linked purchase order is not in ORDERED status (current: ${
          po?.status || 'NOT_FOUND'
        }).`
      );
    }

    return this.grnRepo.submit(tenantId, id, userId);
  }

  public async verifyGoodsReceipt(
    tenantId: string,
    userId: string,
    id: string,
    dto: VerifyGoodsReceiptDto
  ): Promise<GoodsReceiptWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const grn = await this.grnRepo.findById(tenantId, id);
    if (!grn) {
      throw new NotFoundError('Goods receipt note not found.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      grn.projectId,
      GRN_PERMISSIONS.VERIFY
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    if (grn.status === 'VERIFIED') {
      // Idempotent return
      return grn;
    }

    if (grn.status !== 'SUBMITTED') {
      throw new BadRequestError(
        `Only SUBMITTED goods receipts can be verified. Current status: ${grn.status}`
      );
    }

    // Segregation of Duties Check
    if (grn.receivedById === userId) {
      throw new ForbiddenError(
        'Segregation of duties violation: Verifier cannot be the receiver of the goods receipt note.'
      );
    }

    if (grn.purchaseOrder && (grn.purchaseOrder as any).createdById === userId) {
      throw new ForbiddenError(
        'Segregation of duties violation: Verifier cannot be the creator of the purchase order.'
      );
    }

    return this.grnRepo.verify(tenantId, id, userId, dto.verificationRemarks);
  }

  public async rejectGoodsReceipt(
    tenantId: string,
    userId: string,
    id: string,
    dto: RejectGoodsReceiptDto
  ): Promise<GoodsReceiptWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const grn = await this.grnRepo.findById(tenantId, id);
    if (!grn) {
      throw new NotFoundError('Goods receipt note not found.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      grn.projectId,
      GRN_PERMISSIONS.VERIFY
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    if (grn.status !== 'SUBMITTED') {
      throw new BadRequestError(
        `Only SUBMITTED goods receipts can be rejected. Current status: ${grn.status}`
      );
    }

    return this.grnRepo.reject(tenantId, id, userId, dto.rejectionReason);
  }

  public async cancelGoodsReceipt(
    tenantId: string,
    userId: string,
    id: string,
    dto: CancelGoodsReceiptDto
  ): Promise<GoodsReceiptWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const grn = await this.grnRepo.findById(tenantId, id);
    if (!grn) {
      throw new NotFoundError('Goods receipt note not found.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      grn.projectId,
      GRN_PERMISSIONS.VERIFY
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    if (grn.status === 'VERIFIED') {
      throw new BadRequestError('Verified goods receipts cannot be cancelled.');
    }

    if (grn.status === 'CANCELLED') {
      return grn;
    }

    return this.grnRepo.cancel(tenantId, id, userId, dto.cancellationReason);
  }

  public async deleteGoodsReceipt(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<void> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const grn = await this.grnRepo.findById(tenantId, id);
    if (!grn) {
      throw new NotFoundError('Goods receipt note not found.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      grn.projectId,
      GRN_PERMISSIONS.CREATE
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    if (grn.status !== 'DRAFT' && grn.status !== 'REJECTED') {
      throw new BadRequestError(
        `Only DRAFT or REJECTED goods receipts can be deleted. Current status: ${grn.status}`
      );
    }

    await this.grnRepo.delete(tenantId, id);
  }
}
