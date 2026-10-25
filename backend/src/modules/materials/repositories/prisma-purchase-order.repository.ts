import { PrismaClient, Prisma } from '@prisma/client';
import { DatabaseService } from '../../../database/database.service';
import { BadRequestError, NotFoundError } from '../../../common/errors/app-error';
import type {
  IPurchaseOrderRepository,
  PurchaseOrderWithRelations,
  CalculatedTotals,
} from './purchase-order.repository.interface';
import type {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  ListPurchaseOrdersQueryDto,
} from '../dto/purchase-order.dto';

export class PrismaPurchaseOrderRepository implements IPurchaseOrderRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || DatabaseService.getInstance().getClient();
  }

  private get includeRelations() {
    return {
      lines: {
        include: {
          material: true,
          indentLine: true,
        },
      },
      project: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      vendor: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      submittedBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      rejectedBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      cancelledBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      orderedBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    } as const;
  }

  public async findById(
    tenantId: string,
    id: string,
    projectId?: string
  ): Promise<PurchaseOrderWithRelations | null> {
    const where: Prisma.PurchaseOrderWhereInput = {
      id,
      tenantId,
    };
    if (projectId) {
      where.projectId = projectId;
    }

    return this.prisma.purchaseOrder.findFirst({
      where,
      include: this.includeRelations,
    }) as unknown as Promise<PurchaseOrderWithRelations | null>;
  }

  public async findByPoNumber(
    tenantId: string,
    poNumber: string
  ): Promise<PurchaseOrderWithRelations | null> {
    return this.prisma.purchaseOrder.findFirst({
      where: {
        tenantId,
        poNumber,
      },
      include: this.includeRelations,
    }) as unknown as Promise<PurchaseOrderWithRelations | null>;
  }

  public async findMany(
    tenantId: string,
    allowedProjectIds?: string[],
    filter?: ListPurchaseOrdersQueryDto
  ): Promise<{ items: PurchaseOrderWithRelations[]; total: number }> {
    const where: Prisma.PurchaseOrderWhereInput = {
      tenantId,
    };

    if (allowedProjectIds && allowedProjectIds.length > 0) {
      where.projectId = { in: allowedProjectIds };
    }

    if (filter?.projectId) {
      where.projectId = filter.projectId;
    }

    if (filter?.vendorId) {
      where.vendorId = filter.vendorId;
    }

    if (filter?.status) {
      where.status = filter.status;
    }

    if (filter?.startDate || filter?.endDate) {
      where.expectedDeliveryDate = {};
      if (filter.startDate) {
        where.expectedDeliveryDate.gte = new Date(filter.startDate);
      }
      if (filter.endDate) {
        where.expectedDeliveryDate.lte = new Date(filter.endDate);
      }
    }

    if (filter?.search) {
      const s = filter.search.trim();
      where.OR = [
        { poNumber: { contains: s, mode: 'insensitive' } },
        { notes: { contains: s, mode: 'insensitive' } },
      ];
    }

    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: this.includeRelations,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return { items: items as unknown as PurchaseOrderWithRelations[], total };
  }

  public async allocatePoNumber(
    tenantId: string,
    projectId: string,
    projectCode: string,
    date: Date
  ): Promise<string> {
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const sequenceDate = `${yyyy}${mm}${dd}`;

    // Atomic sequence allocation using PostgreSQL ON CONFLICT DO UPDATE RETURNING
    const rows = await this.prisma.$queryRawUnsafe<Array<{ last_sequence: number }>>(
      `
      INSERT INTO "purchase_order_sequences" ("id", "tenant_id", "project_id", "sequence_date", "last_sequence", "updated_at")
      VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, 1, NOW())
      ON CONFLICT ("tenant_id", "project_id", "sequence_date")
      DO UPDATE SET "last_sequence" = "purchase_order_sequences"."last_sequence" + 1, "updated_at" = NOW()
      RETURNING "last_sequence";
      `,
      tenantId,
      projectId,
      sequenceDate
    );

    const seq = rows[0]?.last_sequence ?? 1;
    const paddedSeq = String(seq).padStart(4, '0');
    return `PO-${projectCode}-${sequenceDate}-${paddedSeq}`;
  }

  public async getCommittedIndentLineQuantity(
    tenantId: string,
    indentLineId: string,
    excludePoLineId?: string
  ): Promise<number> {
    const rows = await this.prisma.$queryRawUnsafe<Array<{ committed_qty: string | number }>>(
      `
      SELECT COALESCE(SUM(pol.quantity_ordered), 0) AS committed_qty
      FROM "purchase_order_lines" pol
      JOIN "purchase_orders" po ON pol.purchase_order_id = po.id
      WHERE pol.indent_line_id = $1::uuid
        AND po.tenant_id = $2::uuid
        AND po.status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'ORDERED')
        AND ($3::uuid IS NULL OR pol.id != $3::uuid);
      `,
      indentLineId,
      tenantId,
      excludePoLineId || null
    );

    return Number(rows[0]?.committed_qty ?? 0);
  }

  public async create(
    tenantId: string,
    projectId: string,
    userId: string,
    poNumber: string,
    data: CreatePurchaseOrderDto,
    calculated: CalculatedTotals
  ): Promise<PurchaseOrderWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      // Row lock and oversubscription check for indent-backed lines inside tx
      for (const line of calculated.lines) {
        if (line.indentLineId) {
          const lockedRows = await tx.$queryRawUnsafe<Array<{ id: string; quantity_requested: string | number }>>(
            `SELECT id, quantity_requested FROM "material_indent_lines" WHERE id = $1::uuid AND tenant_id = $2::uuid FOR UPDATE`,
            line.indentLineId,
            tenantId
          );
          if (!lockedRows || lockedRows.length === 0) {
            throw new NotFoundError(`Referenced indent line ID ${line.indentLineId} not found in tenant.`);
          }
          const totalRequestedIndentQty = Number(lockedRows[0].quantity_requested);

          const commRows = await tx.$queryRawUnsafe<Array<{ committed_qty: string | number }>>(
            `
            SELECT COALESCE(SUM(pol.quantity_ordered), 0) AS committed_qty
            FROM "purchase_order_lines" pol
            JOIN "purchase_orders" po ON pol.purchase_order_id = po.id
            WHERE pol.indent_line_id = $1::uuid
              AND po.tenant_id = $2::uuid
              AND po.status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'ORDERED');
            `,
            line.indentLineId,
            tenantId
          );
          const committedQty = Number(commRows[0]?.committed_qty ?? 0);
          const availableQty = totalRequestedIndentQty - committedQty;
          if (line.quantityOrdered > availableQty) {
            throw new BadRequestError(
              `Requested PO quantity (${line.quantityOrdered}) exceeds available uncommitted indent quantity (${availableQty}). Total indent: ${totalRequestedIndentQty}, already committed: ${committedQty}.`
            );
          }
        }
      }

      const po = await tx.purchaseOrder.create({
        data: {
          tenantId,
          projectId,
          vendorId: data.vendorId,
          poNumber,
          status: 'DRAFT',
          orderDate: new Date(),
          expectedDeliveryDate: new Date(data.expectedDeliveryDate),
          deliveryAddress: data.deliveryAddress || null,
          paymentTerms: data.paymentTerms || null,
          currency: data.currency || 'INR',
          subtotalAmount: new Prisma.Decimal(calculated.subtotalAmount),
          discountAmount: new Prisma.Decimal(calculated.discountAmount),
          taxAmount: new Prisma.Decimal(calculated.taxAmount),
          grandTotal: new Prisma.Decimal(calculated.grandTotal),
          notes: data.notes || null,
          termsAndConditions: data.termsAndConditions || null,
          createdById: userId,
          lines: {
            create: calculated.lines.map((l) => ({
              tenantId,
              materialId: l.materialId,
              indentLineId: l.indentLineId || null,
              quantityOrdered: new Prisma.Decimal(l.quantityOrdered),
              quantityReceived: new Prisma.Decimal(0),
              uom: l.uom,
              unitRate: new Prisma.Decimal(l.unitRate),
              taxRatePercent: new Prisma.Decimal(l.taxRatePercent),
              discountRatePercent: new Prisma.Decimal(l.discountRatePercent),
              lineTotal: new Prisma.Decimal(l.lineTotal),
              expectedDeliveryDate: l.expectedDeliveryDate ? new Date(l.expectedDeliveryDate) : null,
              wbsNodeId: l.wbsNodeId || null,
              taskId: l.taskId || null,
              remarks: l.remarks || null,
            })),
          },
        },
        include: this.includeRelations,
      });

      return po as unknown as PurchaseOrderWithRelations;
    });
  }

  public async update(
    tenantId: string,
    id: string,
    data: UpdatePurchaseOrderDto,
    calculated?: CalculatedTotals
  ): Promise<PurchaseOrderWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.PurchaseOrderUpdateInput = {};

      if (data.vendorId !== undefined) {
        updateData.vendor = { connect: { id: data.vendorId } };
      }
      if (data.expectedDeliveryDate) {
        updateData.expectedDeliveryDate = new Date(data.expectedDeliveryDate);
      }
      if (data.deliveryAddress !== undefined) {
        updateData.deliveryAddress = data.deliveryAddress;
      }
      if (data.paymentTerms !== undefined) {
        updateData.paymentTerms = data.paymentTerms;
      }
      if (data.currency) {
        updateData.currency = data.currency;
      }
      if (data.notes !== undefined) {
        updateData.notes = data.notes;
      }
      if (data.termsAndConditions !== undefined) {
        updateData.termsAndConditions = data.termsAndConditions;
      }

      if (calculated) {
        // Row lock and oversubscription check for indent-backed lines inside tx
        for (const line of calculated.lines) {
          if (line.indentLineId) {
            const lockedRows = await tx.$queryRawUnsafe<Array<{ id: string; quantity_requested: string | number }>>(
              `SELECT id, quantity_requested FROM "material_indent_lines" WHERE id = $1::uuid AND tenant_id = $2::uuid FOR UPDATE`,
              line.indentLineId,
              tenantId
            );
            if (!lockedRows || lockedRows.length === 0) {
              throw new NotFoundError(`Referenced indent line ID ${line.indentLineId} not found in tenant.`);
            }
            const totalRequestedIndentQty = Number(lockedRows[0].quantity_requested);

            const commRows = await tx.$queryRawUnsafe<Array<{ committed_qty: string | number }>>(
              `
              SELECT COALESCE(SUM(pol.quantity_ordered), 0) AS committed_qty
              FROM "purchase_order_lines" pol
              JOIN "purchase_orders" po ON pol.purchase_order_id = po.id
              WHERE pol.indent_line_id = $1::uuid
                AND po.tenant_id = $2::uuid
                AND po.status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'ORDERED')
                AND po.id != $3::uuid;
              `,
              line.indentLineId,
              tenantId,
              id
            );
            const committedQty = Number(commRows[0]?.committed_qty ?? 0);
            const availableQty = totalRequestedIndentQty - committedQty;
            if (line.quantityOrdered > availableQty) {
              throw new BadRequestError(
                `Requested PO quantity (${line.quantityOrdered}) exceeds available uncommitted indent quantity (${availableQty}). Total indent: ${totalRequestedIndentQty}, already committed: ${committedQty}.`
              );
            }
          }
        }

        updateData.subtotalAmount = new Prisma.Decimal(calculated.subtotalAmount);
        updateData.discountAmount = new Prisma.Decimal(calculated.discountAmount);
        updateData.taxAmount = new Prisma.Decimal(calculated.taxAmount);
        updateData.grandTotal = new Prisma.Decimal(calculated.grandTotal);

        // Replace existing lines
        await tx.purchaseOrderLine.deleteMany({
          where: { purchaseOrderId: id, tenantId },
        });

        await tx.purchaseOrderLine.createMany({
          data: calculated.lines.map((l) => ({
            tenantId,
            purchaseOrderId: id,
            materialId: l.materialId,
            indentLineId: l.indentLineId || null,
            quantityOrdered: new Prisma.Decimal(l.quantityOrdered),
            quantityReceived: new Prisma.Decimal(0),
            uom: l.uom,
            unitRate: new Prisma.Decimal(l.unitRate),
            taxRatePercent: new Prisma.Decimal(l.taxRatePercent),
            discountRatePercent: new Prisma.Decimal(l.discountRatePercent),
            lineTotal: new Prisma.Decimal(l.lineTotal),
            expectedDeliveryDate: l.expectedDeliveryDate ? new Date(l.expectedDeliveryDate) : null,
            wbsNodeId: l.wbsNodeId || null,
            taskId: l.taskId || null,
            remarks: l.remarks || null,
          })),
        });
      }

      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: updateData,
        include: this.includeRelations,
      });

      return updated as unknown as PurchaseOrderWithRelations;
    });
  }

  public async submit(
    tenantId: string,
    id: string,
    userId: string
  ): Promise<PurchaseOrderWithRelations> {
    return this.prisma.purchaseOrder.update({
      where: { id, tenantId },
      data: {
        status: 'SUBMITTED',
        submittedById: userId,
        submittedAt: new Date(),
        // Clear rejection metadata when resubmitting
        rejectedById: null,
        rejectedAt: null,
        rejectionReason: null,
      },
      include: this.includeRelations,
    }) as unknown as Promise<PurchaseOrderWithRelations>;
  }

  public async approve(
    tenantId: string,
    id: string,
    userId: string,
    approvalRemarks?: string | null
  ): Promise<PurchaseOrderWithRelations> {
    return this.prisma.purchaseOrder.update({
      where: { id, tenantId },
      data: {
        status: 'APPROVED',
        approvedById: userId,
        approvedAt: new Date(),
        approvalRemarks: approvalRemarks || null,
        rejectedById: null,
        rejectedAt: null,
        rejectionReason: null,
      },
      include: this.includeRelations,
    }) as unknown as Promise<PurchaseOrderWithRelations>;
  }

  public async reject(
    tenantId: string,
    id: string,
    userId: string,
    rejectionReason: string
  ): Promise<PurchaseOrderWithRelations> {
    return this.prisma.purchaseOrder.update({
      where: { id, tenantId },
      data: {
        status: 'REJECTED',
        rejectedById: userId,
        rejectedAt: new Date(),
        rejectionReason,
        approvedById: null,
        approvedAt: null,
        approvalRemarks: null,
        orderedById: null,
        orderedAt: null,
      },
      include: this.includeRelations,
    }) as unknown as Promise<PurchaseOrderWithRelations>;
  }

  public async order(
    tenantId: string,
    id: string,
    userId: string
  ): Promise<PurchaseOrderWithRelations> {
    return this.prisma.purchaseOrder.update({
      where: { id, tenantId },
      data: {
        status: 'ORDERED',
        orderedById: userId,
        orderedAt: new Date(),
      },
      include: this.includeRelations,
    }) as unknown as Promise<PurchaseOrderWithRelations>;
  }

  public async cancel(
    tenantId: string,
    id: string,
    userId: string,
    cancellationReason?: string | null
  ): Promise<PurchaseOrderWithRelations> {
    return this.prisma.purchaseOrder.update({
      where: { id, tenantId },
      data: {
        status: 'CANCELLED',
        cancelledById: userId,
        cancelledAt: new Date(),
        cancellationReason: cancellationReason || null,
      },
      include: this.includeRelations,
    }) as unknown as Promise<PurchaseOrderWithRelations>;
  }

  public async delete(tenantId: string, id: string): Promise<void> {
    await this.prisma.purchaseOrder.delete({
      where: { id, tenantId },
    });
  }
}
