import { PrismaClient, Prisma } from '@prisma/client';
import type {
  IPurchaseOrderRepository,
  PurchaseOrderWithRelations,
  CalculatedTotals,
  CalculatedLine,
} from '../repositories/purchase-order.repository.interface';
import { PrismaPurchaseOrderRepository } from '../repositories/prisma-purchase-order.repository';
import type {
  CreatePurchaseOrderDto,
  CreatePurchaseOrderLineDto,
  UpdatePurchaseOrderDto,
  SubmitPurchaseOrderDto,
  ApprovePurchaseOrderDto,
  RejectPurchaseOrderDto,
  OrderPurchaseOrderDto,
  CancelPurchaseOrderDto,
  ListPurchaseOrdersQueryDto,
} from '../dto/purchase-order.dto';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../../common/errors/app-error';
import { AuthorizationService } from '../../rbac/services/authorization.service';
import { EntitlementService } from '../../subscriptions/services/entitlement.service';
import { DatabaseService } from '../../../database/database.service';
import { ActiveApprovalGuard } from '../../approvals/helpers/active-approval.guard.js';


export interface PurchaseOrderServiceDependencies {
  poRepository?: IPurchaseOrderRepository;
  authorizationService?: AuthorizationService;
  entitlementService?: EntitlementService;
  prisma?: PrismaClient;
}

export class PurchaseOrderService {
  private static instance: PurchaseOrderService;
  private readonly poRepo: IPurchaseOrderRepository;
  private readonly authService: AuthorizationService;
  private readonly entitlementService: EntitlementService;
  private readonly prisma: any;

  constructor(deps?: PurchaseOrderServiceDependencies) {
    this.poRepo = deps?.poRepository ?? new PrismaPurchaseOrderRepository();
    this.authService = deps?.authorizationService ?? AuthorizationService.getInstance();
    this.entitlementService = deps?.entitlementService ?? new EntitlementService();
    this.prisma = deps?.prisma ?? DatabaseService.getInstance().getClient();
  }

  public static getInstance(deps?: PurchaseOrderServiceDependencies): PurchaseOrderService {
    if (!PurchaseOrderService.instance || deps) {
      PurchaseOrderService.instance = new PurchaseOrderService(deps);
    }
    return PurchaseOrderService.instance;
  }

  public static resetInstance(): void {
    PurchaseOrderService.instance = undefined as unknown as PurchaseOrderService;
  }

  private async verifyEntitlement(tenantId: string): Promise<void> {
    const isEntitled = await this.entitlementService.isFeatureEntitled(tenantId, 'materials:po_matching');
    if (!isEntitled) {
      throw new ForbiddenError('Feature entitlement materials:po_matching required for Purchase Orders.');
    }
  }

  /**
   * Helper to perform authoritative server-side commercial calculations
   */
  private calculateCommercialTotals(lines: CreatePurchaseOrderLineDto[]): CalculatedTotals {
    let subtotal = new Prisma.Decimal(0);
    let discountTotal = new Prisma.Decimal(0);
    let taxTotal = new Prisma.Decimal(0);
    let grandTotal = new Prisma.Decimal(0);

    const calculatedLines: CalculatedLine[] = [];

    for (const line of lines) {
      const qty = new Prisma.Decimal(line.quantityOrdered);
      const rate = new Prisma.Decimal(line.unitRate);
      const discountPct = new Prisma.Decimal(line.discountRatePercent ?? 0);
      const taxPct = new Prisma.Decimal(line.taxRatePercent ?? 0);

      const gross = qty.mul(rate);
      const discount = gross.mul(discountPct).div(100);
      const net = gross.sub(discount);
      const tax = net.mul(taxPct).div(100);
      const lineTotal = net.add(tax).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

      subtotal = subtotal.add(gross.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP));
      discountTotal = discountTotal.add(discount.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP));
      taxTotal = taxTotal.add(tax.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP));
      grandTotal = grandTotal.add(lineTotal);

      calculatedLines.push({
        materialId: line.materialId,
        indentLineId: line.indentLineId || null,
        quantityOrdered: Number(qty),
        uom: line.uom,
        unitRate: Number(rate),
        taxRatePercent: Number(taxPct),
        discountRatePercent: Number(discountPct),
        lineTotal: Number(lineTotal),
        expectedDeliveryDate: line.expectedDeliveryDate || null,
        wbsNodeId: line.wbsNodeId || null,
        taskId: line.taskId || null,
        remarks: line.remarks || null,
      });
    }

    return {
      subtotalAmount: Number(subtotal.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)),
      discountAmount: Number(discountTotal.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)),
      taxAmount: Number(taxTotal.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)),
      grandTotal: Number(grandTotal.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)),
      lines: calculatedLines,
    };
  }

  /**
   * Helper to validate line items, materials, indent lines, and check quantity oversubscription
   */
  private async validateLinesAndCheckQuantities(
    tenantId: string,
    projectId: string,
    lines: CreatePurchaseOrderLineDto[],
    excludePoId?: string
  ): Promise<void> {
    if (!lines || lines.length === 0) {
      throw new BadRequestError('Purchase order must contain at least one line item.');
    }

    const materialIds = lines.map((l) => l.materialId);
    if (new Set(materialIds).size !== materialIds.length) {
      throw new BadRequestError(
        'Duplicate material lines are not allowed in a purchase order. Consolidate quantities into a single line.'
      );
    }

    for (const line of lines) {
      if (line.quantityOrdered <= 0) {
        throw new BadRequestError('Ordered quantity must be greater than 0.');
      }
      if (line.unitRate < 0) {
        throw new BadRequestError('Unit rate cannot be negative.');
      }

      // Material validation
      const material = await this.prisma.material.findFirst({
        where: { id: line.materialId, tenantId },
      });
      if (!material) {
        throw new NotFoundError(`Material ID ${line.materialId} not found in tenant.`);
      }
      if (material.status !== 'ACTIVE') {
        throw new BadRequestError(`Material ${material.itemCode} is inactive.`);
      }

      if (line.uom !== material.primaryUom && line.uom !== material.secondaryUom) {
        throw new BadRequestError(
          `UOM ${line.uom} is invalid for material ${material.itemCode}. Must be ${material.primaryUom}${
            material.secondaryUom ? ' or ' + material.secondaryUom : ''
          }.`
        );
      }

      // Optional WBS & Task scoping
      if (line.wbsNodeId) {
        const wbs = await this.prisma.wbsNode.findFirst({
          where: { id: line.wbsNodeId, projectId, tenantId },
        });
        if (!wbs) {
          throw new BadRequestError(
            `Referenced WBS node ID ${line.wbsNodeId} not found in this project.`
          );
        }
      }

      if (line.taskId) {
        const task = await this.prisma.task.findFirst({
          where: { id: line.taskId, projectId, tenantId },
        });
        if (!task) {
          throw new BadRequestError(`Referenced task ID ${line.taskId} not found in this project.`);
        }
      }

      // Indent line validation and oversubscription protection
      if (line.indentLineId) {
        const indentLine = await this.prisma.materialIndentLine.findFirst({
          where: { id: line.indentLineId, tenantId },
          include: { indent: true },
        });

        if (!indentLine) {
          throw new NotFoundError(`Referenced indent line ID ${line.indentLineId} not found in tenant.`);
        }

        if (indentLine.indent.projectId !== projectId) {
          throw new BadRequestError('Referenced indent line belongs to a different project.');
        }

        if (indentLine.indent.status !== 'APPROVED') {
          throw new BadRequestError(
            `Cannot order from indent ${indentLine.indent.indentNumber} with status ${indentLine.indent.status}. Indent must be APPROVED.`
          );
        }

        if (indentLine.materialId !== line.materialId) {
          throw new BadRequestError('PO line material does not match referenced indent line material.');
        }

        if (indentLine.uom !== line.uom) {
          throw new BadRequestError('PO line UOM does not match referenced indent line UOM.');
        }

        // Transactional / Atomic Committed Quantity Check
        const committedQty = await this.poRepo.getCommittedIndentLineQuantity(
          tenantId,
          line.indentLineId,
          excludePoId
        );

        const totalRequestedIndentQty = Number(indentLine.quantityRequested);
        const availableQty = totalRequestedIndentQty - committedQty;

        if (line.quantityOrdered > availableQty) {
          throw new BadRequestError(
            `Requested PO quantity (${line.quantityOrdered}) exceeds available uncommitted indent quantity (${availableQty}) for material ${material.itemCode}. Total indent: ${totalRequestedIndentQty}, already committed: ${committedQty}.`
          );
        }
      }
    }
  }

  /**
   * List purchase orders accessible to the user.
   */
  async listPurchaseOrders(
    tenantId: string,
    userId: string,
    query?: ListPurchaseOrdersQueryDto
  ): Promise<{ items: PurchaseOrderWithRelations[]; total: number }> {
    if (!tenantId || !userId) {
      throw new BadRequestError('Tenant and user contexts are required.');
    }

    await this.verifyEntitlement(tenantId);

    const hasViewPerm = await this.authService.hasPermission(tenantId, userId, 'materials:view');
    if (!hasViewPerm) {
      throw new ForbiddenError('Missing required permission: materials:view');
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
        'materials:view'
      );
      if (!access.granted) {
        throw new ForbiddenError(access.reason || 'Access to project denied.');
      }
    }

    return this.poRepo.findMany(tenantId, allowedProjectIds, query);
  }

  /**
   * Get single purchase order by ID.
   */
  async getPurchaseOrderById(
    tenantId: string,
    userId: string,
    id: string,
    projectId?: string
  ): Promise<PurchaseOrderWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const po = await this.poRepo.findById(tenantId, id, projectId);
    if (!po) {
      throw new NotFoundError('Purchase order not found.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      po.projectId,
      'materials:view'
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    return po;
  }

  /**
   * Create a new Purchase Order in DRAFT state.
   */
  async createPurchaseOrder(
    tenantId: string,
    userId: string,
    dto: CreatePurchaseOrderDto
  ): Promise<PurchaseOrderWithRelations> {
    if (!tenantId || !userId) {
      throw new BadRequestError('Tenant and user contexts are required.');
    }

    await this.verifyEntitlement(tenantId);

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      dto.projectId,
      'materials:po:create'
    );
    if (!access.granted) {
      throw new ForbiddenError(
        access.reason || 'Permission materials:po:create or project access denied.'
      );
    }

    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, tenantId },
    });
    if (!project) {
      throw new NotFoundError('Project not found in tenant.');
    }

    const vendor = await this.prisma.vendor.findFirst({
      where: { id: dto.vendorId, tenantId },
    });
    if (!vendor) {
      throw new NotFoundError('Vendor not found in tenant.');
    }
    if (vendor.status !== 'ACTIVE') {
      throw new BadRequestError(`Vendor ${vendor.name} is inactive.`);
    }

    // Line validation & oversubscription check
    await this.validateLinesAndCheckQuantities(tenantId, dto.projectId, dto.lines);

    // Calculate server-side totals
    const calculated = this.calculateCommercialTotals(dto.lines);

    const poNumber = await this.poRepo.allocatePoNumber(
      tenantId,
      dto.projectId,
      project.code,
      new Date()
    );

    return this.poRepo.create(tenantId, dto.projectId, userId, poNumber, dto, calculated);
  }

  /**
   * Update DRAFT or REJECTED purchase order.
   */
  async updatePurchaseOrder(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdatePurchaseOrderDto
  ): Promise<PurchaseOrderWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const po = await this.poRepo.findById(tenantId, id);
    if (!po) {
      throw new NotFoundError('Purchase order not found.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      po.projectId,
      'materials:po:create'
    );
    if (!access.granted) {
      throw new ForbiddenError(
        access.reason || 'Permission materials:po:create or project access denied.'
      );
    }

    if (po.status === 'SUBMITTED') {
      throw new BadRequestError(
        'A submitted purchase order is locked for editing. It must be rejected or cancelled first.'
      );
    }
    if (po.status === 'APPROVED' || po.status === 'ORDERED') {
      throw new BadRequestError(`An ${po.status.toLowerCase()} purchase order is permanently immutable and cannot be updated.`);
    }
    if (po.status === 'CANCELLED' || po.status === 'CLOSED') {
      throw new BadRequestError(`Cannot update purchase order in ${po.status} status.`);
    }

    if (dto.vendorId) {
      const vendor = await this.prisma.vendor.findFirst({
        where: { id: dto.vendorId, tenantId },
      });
      if (!vendor) {
        throw new NotFoundError('Vendor not found in tenant.');
      }
      if (vendor.status !== 'ACTIVE') {
        throw new BadRequestError(`Vendor ${vendor.name} is inactive.`);
      }
    }

    let calculated: CalculatedTotals | undefined;
    if (dto.lines) {
      await this.validateLinesAndCheckQuantities(tenantId, po.projectId, dto.lines, id);
      calculated = this.calculateCommercialTotals(dto.lines);
    }

    return this.poRepo.update(tenantId, id, dto, calculated);
  }

  /**
   * Submit purchase order for approval.
   */
  async submitPurchaseOrder(
    tenantId: string,
    userId: string,
    id: string,
    _dto?: SubmitPurchaseOrderDto
  ): Promise<PurchaseOrderWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const po = await this.poRepo.findById(tenantId, id);
    if (!po) {
      throw new NotFoundError('Purchase order not found.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      po.projectId,
      'materials:po:create'
    );
    if (!access.granted) {
      throw new ForbiddenError(
        access.reason || 'Permission materials:po:create or project access denied.'
      );
    }

    if (po.status === 'SUBMITTED') {
      throw new BadRequestError('Purchase order is already in submitted status.');
    }
    if (po.status === 'APPROVED' || po.status === 'ORDERED') {
      throw new BadRequestError(`Cannot submit purchase order in ${po.status} status.`);
    }
    if (po.status === 'CANCELLED' || po.status === 'CLOSED') {
      throw new BadRequestError(`Cannot submit purchase order in ${po.status} status.`);
    }

    if (!po.lines || po.lines.length === 0) {
      throw new BadRequestError('Purchase order must contain at least one line item before submission.');
    }

    return this.poRepo.submit(tenantId, id, userId);
  }

  /**
   * Approve purchase order.
   * STRICT SEGREGATION OF DUTIES (SoD): Approver cannot be creator or submitter.
   */
  async approvePurchaseOrder(
    tenantId: string,
    userId: string,
    id: string,
    dto?: ApprovePurchaseOrderDto
  ): Promise<PurchaseOrderWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const po = await this.poRepo.findById(tenantId, id);
    if (!po) {
      throw new NotFoundError('Purchase order not found.');
    }

    await ActiveApprovalGuard.assertNoActiveCentralApproval(
      this.prisma,
      tenantId,
      'PURCHASE_ORDER',
      id
    );


    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      po.projectId,
      'materials:po:approve'
    );
    if (!access.granted) {
      throw new ForbiddenError(
        access.reason || 'Permission materials:po:approve or project access denied.'
      );
    }

    if (po.status === 'DRAFT') {
      throw new BadRequestError('Cannot approve a purchase order that has not been submitted.');
    }
    if (po.status === 'APPROVED') {
      throw new BadRequestError('Purchase order is already approved.');
    }
    if (po.status === 'ORDERED') {
      throw new BadRequestError('Purchase order has already been ordered.');
    }
    if (po.status === 'REJECTED') {
      throw new BadRequestError('Cannot approve a rejected purchase order. It must be revised and resubmitted.');
    }
    if (po.status !== 'SUBMITTED') {
      throw new BadRequestError(`Cannot approve purchase order in ${po.status} status.`);
    }

    // STRICT SEGREGATION OF DUTIES
    if (po.createdById === userId || po.submittedById === userId) {
      throw new ForbiddenError(
        'Segregation of Duties violation: The creator or submitter of a Purchase Order cannot approve it.'
      );
    }

    return this.poRepo.approve(tenantId, id, userId, dto?.approvalRemarks);
  }

  /**
   * Reject purchase order with mandatory rejection reason.
   */
  async rejectPurchaseOrder(
    tenantId: string,
    userId: string,
    id: string,
    dto: RejectPurchaseOrderDto
  ): Promise<PurchaseOrderWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const po = await this.poRepo.findById(tenantId, id);
    if (!po) {
      throw new NotFoundError('Purchase order not found.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      po.projectId,
      'materials:po:approve'
    );
    if (!access.granted) {
      throw new ForbiddenError(
        access.reason || 'Permission materials:po:approve or project access denied.'
      );
    }

    if (po.status === 'DRAFT') {
      throw new BadRequestError('Cannot reject a purchase order that is still in draft status.');
    }
    if (po.status === 'REJECTED') {
      throw new BadRequestError('Purchase order is already in rejected status.');
    }
    if (po.status === 'APPROVED' || po.status === 'ORDERED') {
      throw new BadRequestError(`An ${po.status.toLowerCase()} purchase order cannot be rejected.`);
    }
    if (po.status !== 'SUBMITTED') {
      throw new BadRequestError(`Cannot reject purchase order in ${po.status} status.`);
    }

    if (!dto.rejectionReason || dto.rejectionReason.trim().length === 0) {
      throw new BadRequestError('rejectionReason is mandatory when rejecting a purchase order.');
    }

    return this.poRepo.reject(tenantId, id, userId, dto.rejectionReason.trim());
  }

  /**
   * Mark approved purchase order as ORDERED / Dispatched.
   */
  async orderPurchaseOrder(
    tenantId: string,
    userId: string,
    id: string,
    _dto?: OrderPurchaseOrderDto
  ): Promise<PurchaseOrderWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const po = await this.poRepo.findById(tenantId, id);
    if (!po) {
      throw new NotFoundError('Purchase order not found.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      po.projectId,
      'materials:po:create'
    );
    if (!access.granted) {
      throw new ForbiddenError(
        access.reason || 'Permission materials:po:create or project access denied.'
      );
    }

    if (po.status === 'ORDERED') {
      throw new BadRequestError('Purchase order is already in ORDERED status.');
    }
    if (po.status !== 'APPROVED') {
      throw new BadRequestError(`Cannot order a purchase order in ${po.status} status. It must be APPROVED first.`);
    }

    return this.poRepo.order(tenantId, id, userId);
  }

  /**
   * Cancel an approved or ordered purchase order before fulfillment.
   */
  async cancelPurchaseOrder(
    tenantId: string,
    userId: string,
    id: string,
    dto?: CancelPurchaseOrderDto
  ): Promise<PurchaseOrderWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const po = await this.poRepo.findById(tenantId, id);
    if (!po) {
      throw new NotFoundError('Purchase order not found.');
    }

    const canCreate = (
      await this.authService.hasProjectAccess(
        tenantId,
        userId,
        po.projectId,
        'materials:po:create'
      )
    ).granted;

    const canApprove = (
      await this.authService.hasProjectAccess(
        tenantId,
        userId,
        po.projectId,
        'materials:po:approve'
      )
    ).granted;

    if (!canCreate && !canApprove) {
      throw new ForbiddenError(
        'Permission materials:po:create or materials:po:approve required to cancel a purchase order.'
      );
    }

    if (po.status === 'CANCELLED') {
      throw new BadRequestError('Purchase order is already cancelled.');
    }
    if (po.status === 'CLOSED') {
      throw new BadRequestError('Cannot cancel a closed purchase order.');
    }
    if (po.status !== 'APPROVED' && po.status !== 'ORDERED') {
      throw new BadRequestError('Only approved or ordered purchase orders can be cancelled.');
    }

    const receivedTotal = po.lines.reduce(
      (sum, l) => sum + Number(l.quantityReceived),
      0
    );
    if (receivedTotal > 0) {
      throw new BadRequestError(
        'Cannot cancel a purchase order that has already received physical items.'
      );
    }

    return this.poRepo.cancel(tenantId, id, userId, dto?.cancellationReason);
  }

  /**
   * Delete a DRAFT purchase order.
   */
  async deletePurchaseOrder(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<void> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const po = await this.poRepo.findById(tenantId, id);
    if (!po) {
      throw new NotFoundError('Purchase order not found.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      po.projectId,
      'materials:po:create'
    );
    if (!access.granted) {
      throw new ForbiddenError(
        access.reason || 'Permission materials:po:create or project access denied.'
      );
    }

    if (po.status !== 'DRAFT') {
      throw new BadRequestError(
        `Cannot delete purchase order in ${po.status} status. Only DRAFT purchase orders can be deleted.`
      );
    }

    await this.poRepo.delete(tenantId, id);
  }
}
