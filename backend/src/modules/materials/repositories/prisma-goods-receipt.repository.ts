import { Prisma, type PrismaClient } from '@prisma/client';
import { DatabaseService } from '../../../database/database.service';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../../common/errors';
import type {
  IGoodsReceiptRepository,
  GoodsReceiptWithRelations,
} from './goods-receipt.repository.interface';
import type {
  CreateGoodsReceiptDto,
  UpdateGoodsReceiptDto,
  ListGoodsReceiptsQueryDto,
} from '../dto/goods-receipt.dto';

export class PrismaGoodsReceiptRepository implements IGoodsReceiptRepository {
  private static instance: PrismaGoodsReceiptRepository;
  private readonly prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || DatabaseService.getInstance().getClient();
  }

  public static getInstance(): PrismaGoodsReceiptRepository {
    if (!PrismaGoodsReceiptRepository.instance) {
      PrismaGoodsReceiptRepository.instance = new PrismaGoodsReceiptRepository();
    }
    return PrismaGoodsReceiptRepository.instance;
  }

  private get includeRelations() {
    return {
      lines: {
        include: {
          material: true,
          purchaseOrderLine: true,
        },
        orderBy: { createdAt: 'asc' as const },
      },
      project: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      store: {
        select: {
          id: true,
          code: true,
          name: true,
          storeType: true,
          isCentralWarehouse: true,
          projectId: true,
        },
      },
      purchaseOrder: {
        select: {
          id: true,
          poNumber: true,
          status: true,
          vendorId: true,
          projectId: true,
          createdById: true,
        },
      },
      vendor: {
        select: {
          id: true,
          code: true,
          name: true,
          gstin: true,
        },
      },
      receivedBy: {
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
      verifiedBy: {
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
    } as const;
  }

  public async findById(
    tenantId: string,
    id: string,
    projectId?: string
  ): Promise<GoodsReceiptWithRelations | null> {
    const where: Prisma.GoodsReceiptNoteWhereInput = {
      id,
      tenantId,
    };
    if (projectId) {
      where.projectId = projectId;
    }

    return this.prisma.goodsReceiptNote.findFirst({
      where,
      include: this.includeRelations,
    }) as unknown as Promise<GoodsReceiptWithRelations | null>;
  }

  public async findByGrnNumber(
    tenantId: string,
    grnNumber: string
  ): Promise<GoodsReceiptWithRelations | null> {
    return this.prisma.goodsReceiptNote.findFirst({
      where: {
        tenantId,
        grnNumber,
      },
      include: this.includeRelations,
    }) as unknown as Promise<GoodsReceiptWithRelations | null>;
  }

  public async findMany(
    tenantId: string,
    allowedProjectIds?: string[],
    filter?: ListGoodsReceiptsQueryDto
  ): Promise<{ items: GoodsReceiptWithRelations[]; total: number }> {
    const where: Prisma.GoodsReceiptNoteWhereInput = {
      tenantId,
    };

    if (allowedProjectIds && allowedProjectIds.length > 0) {
      where.projectId = { in: allowedProjectIds };
    }

    if (filter?.projectId) {
      where.projectId = filter.projectId;
    }

    if (filter?.purchaseOrderId) {
      where.purchaseOrderId = filter.purchaseOrderId;
    }

    if (filter?.storeId) {
      where.storeId = filter.storeId;
    }

    if (filter?.vendorId) {
      where.vendorId = filter.vendorId;
    }

    if (filter?.status) {
      where.status = filter.status;
    }

    if (filter?.startDate || filter?.endDate) {
      where.receiptDate = {};
      if (filter.startDate) {
        where.receiptDate.gte = new Date(filter.startDate);
      }
      if (filter.endDate) {
        where.receiptDate.lte = new Date(filter.endDate);
      }
    }

    if (filter?.search) {
      where.OR = [
        { grnNumber: { contains: filter.search, mode: 'insensitive' } },
        { deliveryChallanNumber: { contains: filter.search, mode: 'insensitive' } },
        { vehicleNumber: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const page = filter?.page || 1;
    const limit = filter?.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.goodsReceiptNote.findMany({
        where,
        include: this.includeRelations,
        skip,
        take: limit,
        orderBy: { receiptDate: 'desc' },
      }),
      this.prisma.goodsReceiptNote.count({ where }),
    ]);

    return {
      items: items as unknown as GoodsReceiptWithRelations[],
      total,
    };
  }

  public async allocateGrnNumber(
    tenantId: string,
    projectId: string,
    projectCode: string,
    date?: Date
  ): Promise<string> {
    const targetDate = date || new Date();
    const utcYear = targetDate.getUTCFullYear();
    const utcMonth = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
    const utcDay = String(targetDate.getUTCDate()).padStart(2, '0');
    const sequenceDate = `${utcYear}${utcMonth}${utcDay}`;

    const rows = await this.prisma.$queryRawUnsafe<Array<{ last_sequence: number }>>(
      `
      INSERT INTO "goods_receipt_sequences" ("id", "tenant_id", "project_id", "sequence_date", "last_sequence", "updated_at")
      VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, 1, CURRENT_TIMESTAMP)
      ON CONFLICT ("tenant_id", "project_id", "sequence_date")
      DO UPDATE SET "last_sequence" = "goods_receipt_sequences"."last_sequence" + 1, "updated_at" = CURRENT_TIMESTAMP
      RETURNING "last_sequence";
      `,
      tenantId,
      projectId,
      sequenceDate
    );

    const seq = rows[0]?.last_sequence ?? 1;
    const paddedSeq = String(seq).padStart(4, '0');
    return `GRN-${projectCode}-${sequenceDate}-${paddedSeq}`;
  }

  public async create(
    tenantId: string,
    projectId: string,
    vendorId: string,
    receivedById: string,
    grnNumber: string,
    data: CreateGoodsReceiptDto,
    unitRates: Map<string, number>
  ): Promise<GoodsReceiptWithRelations> {
    const receiptDate = data.receiptDate ? new Date(data.receiptDate) : new Date();
    const challanDate = data.deliveryChallanDate ? new Date(data.deliveryChallanDate) : null;

    const grn = await this.prisma.goodsReceiptNote.create({
      data: {
        tenantId,
        projectId,
        storeId: data.storeId,
        purchaseOrderId: data.purchaseOrderId,
        vendorId,
        grnNumber,
        status: 'DRAFT',
        receiptDate,
        deliveryChallanNumber: data.deliveryChallanNumber || null,
        deliveryChallanDate: challanDate,
        vehicleNumber: data.vehicleNumber || null,
        remarks: data.remarks || null,
        receivedById,
        lines: {
          create: data.lines.map((line) => {
            const authoritativeRate =
              line.unitRate !== undefined
                ? line.unitRate
                : unitRates.get(line.purchaseOrderLineId) ?? 0;

            return {
              tenantId,
              purchaseOrderLineId: line.purchaseOrderLineId,
              materialId: line.materialId,
              quantityDelivered: new Prisma.Decimal(line.quantityDelivered),
              quantityAccepted: new Prisma.Decimal(line.quantityAccepted),
              quantityRejected: new Prisma.Decimal(line.quantityRejected ?? 0),
              uom: line.uom,
              unitRate: new Prisma.Decimal(authoritativeRate),
              storageLocation: line.storageLocation || null,
              remarks: line.remarks || null,
            };
          }),
        },
      },
      include: this.includeRelations,
    });

    return grn as unknown as GoodsReceiptWithRelations;
  }

  public async update(
    tenantId: string,
    id: string,
    data: UpdateGoodsReceiptDto,
    unitRates?: Map<string, number>
  ): Promise<GoodsReceiptWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.GoodsReceiptNoteUpdateInput = {};

      if (data.storeId) {
        updateData.store = { connect: { id: data.storeId } };
      }
      if (data.receiptDate) {
        updateData.receiptDate = new Date(data.receiptDate);
      }
      if (data.deliveryChallanNumber !== undefined) {
        updateData.deliveryChallanNumber = data.deliveryChallanNumber || null;
      }
      if (data.deliveryChallanDate !== undefined) {
        updateData.deliveryChallanDate = data.deliveryChallanDate
          ? new Date(data.deliveryChallanDate)
          : null;
      }
      if (data.vehicleNumber !== undefined) {
        updateData.vehicleNumber = data.vehicleNumber || null;
      }
      if (data.remarks !== undefined) {
        updateData.remarks = data.remarks || null;
      }

      if (data.lines && data.lines.length > 0) {
        await tx.goodsReceiptLine.deleteMany({
          where: { grnId: id, tenantId },
        });

        await tx.goodsReceiptLine.createMany({
          data: data.lines.map((line) => {
            const rate =
              line.unitRate !== undefined
                ? line.unitRate
                : (unitRates?.get(line.purchaseOrderLineId) ?? 0);

            return {
              tenantId,
              grnId: id,
              purchaseOrderLineId: line.purchaseOrderLineId,
              materialId: line.materialId,
              quantityDelivered: new Prisma.Decimal(line.quantityDelivered),
              quantityAccepted: new Prisma.Decimal(line.quantityAccepted),
              quantityRejected: new Prisma.Decimal(line.quantityRejected ?? 0),
              uom: line.uom,
              unitRate: new Prisma.Decimal(rate),
              storageLocation: line.storageLocation || null,
              remarks: line.remarks || null,
            };
          }),
        });
      }

      const updated = await tx.goodsReceiptNote.update({
        where: { id, tenantId },
        data: updateData,
        include: this.includeRelations,
      });

      return updated as unknown as GoodsReceiptWithRelations;
    });
  }

  public async submit(
    tenantId: string,
    id: string,
    userId: string
  ): Promise<GoodsReceiptWithRelations> {
    return this.prisma.goodsReceiptNote.update({
      where: { id, tenantId },
      data: {
        status: 'SUBMITTED',
        submittedById: userId,
        submittedAt: new Date(),
        rejectedById: null,
        rejectedAt: null,
        rejectionReason: null,
      },
      include: this.includeRelations,
    }) as unknown as Promise<GoodsReceiptWithRelations>;
  }

  public async verify(
    tenantId: string,
    id: string,
    userId: string,
    verificationRemarks?: string | null
  ): Promise<GoodsReceiptWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock GRN row FOR UPDATE
      const grnRows = await tx.$queryRawUnsafe<
        Array<{
          id: string;
          tenant_id: string;
          status: string;
          project_id: string;
          store_id: string;
          purchase_order_id: string;
          received_by_id: string;
        }>
      >(
        `SELECT id, tenant_id, status, project_id, store_id, purchase_order_id, received_by_id
         FROM goods_receipt_notes
         WHERE id = $1::uuid AND tenant_id = $2::uuid
         FOR UPDATE`,
        id,
        tenantId
      );

      if (!grnRows || grnRows.length === 0) {
        throw new NotFoundError(`Goods receipt with ID ${id} not found.`);
      }
      const grn = grnRows[0];

      if (grn.status === 'VERIFIED') {
        // Idempotent re-query return
        return (await tx.goodsReceiptNote.findUnique({
          where: { id, tenantId },
          include: this.includeRelations,
        })) as unknown as GoodsReceiptWithRelations;
      }

      if (grn.status !== 'SUBMITTED') {
        throw new BadRequestError(
          `Only SUBMITTED goods receipts can be verified. Current status: ${grn.status}`
        );
      }

      // 2. Lock PurchaseOrder row FOR UPDATE
      const poRows = await tx.$queryRawUnsafe<
        Array<{
          id: string;
          status: string;
          created_by_id: string;
        }>
      >(
        `SELECT id, status, created_by_id
         FROM purchase_orders
         WHERE id = $1::uuid AND tenant_id = $2::uuid
         FOR UPDATE`,
        grn.purchase_order_id,
        tenantId
      );

      if (!poRows || poRows.length === 0) {
        throw new NotFoundError(
          `Purchase order with ID ${grn.purchase_order_id} not found.`
        );
      }
      const po = poRows[0];

      if (po.status !== 'ORDERED') {
        throw new BadRequestError(
          `Purchase order must be in ORDERED status for GRN verification. Current status: ${po.status}`
        );
      }

      // 3. Segregation of Duties Check
      if (grn.received_by_id === userId) {
        throw new ForbiddenError(
          'Segregation of duties violation: Verifier cannot be the receiver of the goods receipt note.'
        );
      }
      if (po.created_by_id === userId) {
        throw new ForbiddenError(
          'Segregation of duties violation: Verifier cannot be the creator of the purchase order.'
        );
      }

      // 4. Fetch all GRN lines
      const grnLines = await tx.goodsReceiptLine.findMany({
        where: { grnId: id, tenantId },
      });

      if (grnLines.length === 0) {
        throw new BadRequestError('Goods receipt contains no line items to verify.');
      }

      // 5. Process each line under row lock
      for (const line of grnLines) {
        const qtyDelivered = Number(line.quantityDelivered);
        const qtyAccepted = Number(line.quantityAccepted);
        const qtyRejected = Number(line.quantityRejected);

        // Invariant: delivered = accepted + rejected
        if (Math.abs(qtyDelivered - (qtyAccepted + qtyRejected)) >= 0.0001) {
          throw new BadRequestError(
            `Line invariant violated: delivered (${qtyDelivered}) != accepted (${qtyAccepted}) + rejected (${qtyRejected})`
          );
        }

        // Lock PO line FOR UPDATE
        const poLineRows = await tx.$queryRawUnsafe<
          Array<{
            id: string;
            material_id: string;
            uom: string;
            unit_rate: string | number;
            quantity_ordered: string | number;
            quantity_received: string | number;
          }>
        >(
          `SELECT id, material_id, uom, unit_rate, quantity_ordered, quantity_received
           FROM purchase_order_lines
           WHERE id = $1::uuid AND tenant_id = $2::uuid
           FOR UPDATE`,
          line.purchaseOrderLineId,
          tenantId
        );

        if (!poLineRows || poLineRows.length === 0) {
          throw new NotFoundError(
            `Referenced PO line ID ${line.purchaseOrderLineId} not found.`
          );
        }
        const poLine = poLineRows[0];

        // Integrity checks
        if (poLine.material_id !== line.materialId) {
          throw new BadRequestError(
            `Material mismatch on GRN line: expected ${poLine.material_id}, got ${line.materialId}`
          );
        }
        if (poLine.uom !== line.uom) {
          throw new BadRequestError(
            `UOM mismatch on GRN line: expected ${poLine.uom}, got ${line.uom}`
          );
        }

        const poQtyOrdered = Number(poLine.quantity_ordered);
        const poQtyReceived = Number(poLine.quantity_received);
        const remainingQty = poQtyOrdered - poQtyReceived;

        // Zero over-receipt tolerance (0%)
        if (qtyAccepted > remainingQty + 0.0001) {
          throw new BadRequestError(
            `Over-receipt rejected (0% tolerance): Accepted quantity (${qtyAccepted}) exceeds remaining PO line quantity (${remainingQty}). Ordered: ${poQtyOrdered}, Already Received: ${poQtyReceived}.`
          );
        }

        if (qtyAccepted > 0) {
          // Stock Movement & Balance Mutation
          const idempotencyKey = `GRN-${id}-${line.id}`;

          const existingMovement = await tx.stockMovement.findUnique({
            where: {
              tenantId_idempotencyKey: {
                tenantId,
                idempotencyKey,
              },
            },
          });

          if (!existingMovement) {
            // Create StockMovement.RECEIPT
            await tx.stockMovement.create({
              data: {
                tenantId,
                storeId: grn.store_id,
                materialId: line.materialId,
                movementType: 'RECEIPT',
                quantity: new Prisma.Decimal(qtyAccepted),
                uom: line.uom,
                unitRate: new Prisma.Decimal(Number(poLine.unit_rate)),
                referenceType: 'GRN',
                referenceId: id,
                reason: `Physical receipt against PO line ${line.purchaseOrderLineId}`,
                performedById: userId,
                idempotencyKey,
                occurredAt: new Date(),
              },
            });

            // Lock and Update StoreStockBalance
            await tx.$executeRaw`
              INSERT INTO "store_stock_balances" ("id", "tenant_id", "store_id", "material_id", "quantity_on_hand", "reserved_quantity", "created_at", "updated_at")
              VALUES (gen_random_uuid(), ${tenantId}::uuid, ${grn.store_id}::uuid, ${line.materialId}::uuid, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              ON CONFLICT ("store_id", "material_id") DO NOTHING;
            `;

            const balRows = await tx.$queryRaw<
              Array<{
                id: string;
                quantity_on_hand: string | number;
              }>
            >`
              SELECT "id", "quantity_on_hand"
              FROM "store_stock_balances"
              WHERE "store_id" = ${grn.store_id}::uuid AND "material_id" = ${line.materialId}::uuid
              FOR UPDATE;
            `;

            const currentOnHand = Number(balRows[0]?.quantity_on_hand ?? 0);
            const newOnHand = currentOnHand + qtyAccepted;

            await tx.storeStockBalance.update({
              where: { id: balRows[0].id },
              data: { quantityOnHand: new Prisma.Decimal(newOnHand) },
            });
          }

          // Update PO Line quantityReceived
          const newPoQtyReceived = poQtyReceived + qtyAccepted;
          await tx.purchaseOrderLine.update({
            where: { id: line.purchaseOrderLineId },
            data: {
              quantityReceived: new Prisma.Decimal(newPoQtyReceived),
            },
          });
        }
      }

      // 6. Check if all PO lines are fully received -> Transition PO to CLOSED
      const allPoLines = await tx.purchaseOrderLine.findMany({
        where: { purchaseOrderId: grn.purchase_order_id, tenantId },
      });
      const allFullyReceived =
        allPoLines.length > 0 &&
        allPoLines.every(
          (pl) => Number(pl.quantityReceived) >= Number(pl.quantityOrdered)
        );

      if (allFullyReceived) {
        await tx.purchaseOrder.update({
          where: { id: grn.purchase_order_id },
          data: { status: 'CLOSED' },
        });
      }

      // 7. Transition GRN to VERIFIED
      const updatedGrn = await tx.goodsReceiptNote.update({
        where: { id, tenantId },
        data: {
          status: 'VERIFIED',
          verifiedById: userId,
          verifiedAt: new Date(),
          verificationRemarks: verificationRemarks || null,
        },
        include: this.includeRelations,
      });

      return updatedGrn as unknown as GoodsReceiptWithRelations;
    });
  }

  public async reject(
    tenantId: string,
    id: string,
    userId: string,
    rejectionReason: string
  ): Promise<GoodsReceiptWithRelations> {
    return this.prisma.goodsReceiptNote.update({
      where: { id, tenantId },
      data: {
        status: 'REJECTED',
        rejectedById: userId,
        rejectedAt: new Date(),
        rejectionReason,
      },
      include: this.includeRelations,
    }) as unknown as Promise<GoodsReceiptWithRelations>;
  }

  public async cancel(
    tenantId: string,
    id: string,
    userId: string,
    cancellationReason?: string | null
  ): Promise<GoodsReceiptWithRelations> {
    return this.prisma.goodsReceiptNote.update({
      where: { id, tenantId },
      data: {
        status: 'CANCELLED',
        cancelledById: userId,
        cancelledAt: new Date(),
        cancellationReason: cancellationReason || null,
      },
      include: this.includeRelations,
    }) as unknown as Promise<GoodsReceiptWithRelations>;
  }

  public async delete(tenantId: string, id: string): Promise<void> {
    await this.prisma.goodsReceiptNote.delete({
      where: { id, tenantId },
    });
  }
}
