import { Prisma, type PrismaClient } from '@prisma/client';
import { DatabaseService } from '../../../database/database.service';
import type {
  IMaterialTransferRepository,
  MaterialTransferWithRelations,
} from './material-transfer.repository.interface';
import type {
  CreateMaterialTransferDto,
  UpdateMaterialTransferDto,
  ListMaterialTransfersQueryDto,
  DispatchMaterialTransferDto,
  ReceiveMaterialTransferDto,
} from '../dto/material-transfer.dto';
import {
  NotFoundError,
  BadRequestError,
} from '../../../common/errors/app-error';

export class PrismaMaterialTransferRepository implements IMaterialTransferRepository {
  private static instance: PrismaMaterialTransferRepository;
  private readonly prisma: PrismaClient;

  private readonly includeRelations = {
    lines: {
      include: {
        material: true,
      },
      orderBy: { createdAt: 'asc' as const },
    },
    sourceStore: {
      select: {
        id: true,
        code: true,
        name: true,
        storeType: true,
        isCentralWarehouse: true,
        projectId: true,
      },
    },
    destinationStore: {
      select: {
        id: true,
        code: true,
        name: true,
        storeType: true,
        isCentralWarehouse: true,
        projectId: true,
      },
    },
    sourceProject: {
      select: {
        id: true,
        code: true,
        name: true,
      },
    },
    destinationProject: {
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
    dispatchedBy: {
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    },
    receivedBy: {
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
  };

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || DatabaseService.getInstance().getClient();
  }

  public static getInstance(prisma?: PrismaClient): PrismaMaterialTransferRepository {
    if (!PrismaMaterialTransferRepository.instance || prisma) {
      PrismaMaterialTransferRepository.instance = new PrismaMaterialTransferRepository(prisma);
    }
    return PrismaMaterialTransferRepository.instance;
  }

  public static resetInstance(): void {
    PrismaMaterialTransferRepository.instance =
      undefined as unknown as PrismaMaterialTransferRepository;
  }

  public async findById(
    tenantId: string,
    id: string
  ): Promise<MaterialTransferWithRelations | null> {
    const transfer = await this.prisma.materialTransfer.findFirst({
      where: { id, tenantId },
      include: this.includeRelations,
    });

    return transfer as unknown as MaterialTransferWithRelations | null;
  }

  public async findByTransferNumber(
    tenantId: string,
    transferNumber: string
  ): Promise<MaterialTransferWithRelations | null> {
    const transfer = await this.prisma.materialTransfer.findFirst({
      where: { transferNumber, tenantId },
      include: this.includeRelations,
    });

    return transfer as unknown as MaterialTransferWithRelations | null;
  }

  public async findMany(
    tenantId: string,
    allowedStoreIds?: string[],
    filter?: ListMaterialTransfersQueryDto
  ): Promise<{ items: MaterialTransferWithRelations[]; total: number }> {
    const where: Prisma.MaterialTransferWhereInput = { tenantId };

    if (allowedStoreIds && allowedStoreIds.length > 0) {
      where.OR = [
        { sourceStoreId: { in: allowedStoreIds } },
        { destinationStoreId: { in: allowedStoreIds } },
      ];
    }

    if (filter?.sourceStoreId) {
      where.sourceStoreId = filter.sourceStoreId;
    }
    if (filter?.destinationStoreId) {
      where.destinationStoreId = filter.destinationStoreId;
    }
    if (filter?.sourceProjectId) {
      where.sourceProjectId = filter.sourceProjectId;
    }
    if (filter?.destinationProjectId) {
      where.destinationProjectId = filter.destinationProjectId;
    }
    if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.search) {
      where.OR = [
        { transferNumber: { contains: filter.search, mode: 'insensitive' } },
        { remarks: { contains: filter.search, mode: 'insensitive' } },
        { deliveryChallanNumber: { contains: filter.search, mode: 'insensitive' } },
        { vehicleNumber: { contains: filter.search, mode: 'insensitive' } },
      ];
    }
    if (filter?.startDate || filter?.endDate) {
      where.transferDate = {};
      if (filter.startDate) {
        where.transferDate.gte = new Date(filter.startDate);
      }
      if (filter.endDate) {
        where.transferDate.lte = new Date(filter.endDate);
      }
    }

    const page = filter?.page || 1;
    const limit = filter?.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.materialTransfer.findMany({
        where,
        skip,
        take: limit,
        include: this.includeRelations,
        orderBy: { transferDate: 'desc' },
      }),
      this.prisma.materialTransfer.count({ where }),
    ]);

    return {
      items: items as unknown as MaterialTransferWithRelations[],
      total,
    };
  }

  public async allocateTransferNumber(
    tenantId: string,
    scopeKey: string,
    date?: Date
  ): Promise<string> {
    const targetDate = date || new Date();
    const yyyy = targetDate.getUTCFullYear();
    const mm = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getUTCDate()).padStart(2, '0');
    const sequenceDate = `${yyyy}${mm}${dd}`;

    const cleanScopeKey = scopeKey.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase() || 'GLOBAL';

    const rows = await this.prisma.$queryRaw<Array<{ last_sequence: number }>>`
      INSERT INTO "material_transfer_sequences" ("id", "tenant_id", "scope_key", "sequence_date", "last_sequence", "updated_at")
      VALUES (gen_random_uuid(), ${tenantId}::uuid, ${cleanScopeKey}, ${sequenceDate}, 1, CURRENT_TIMESTAMP)
      ON CONFLICT ("tenant_id", "scope_key", "sequence_date")
      DO UPDATE SET "last_sequence" = "material_transfer_sequences"."last_sequence" + 1, "updated_at" = CURRENT_TIMESTAMP
      RETURNING "last_sequence";
    `;

    const nextSeq = rows[0]?.last_sequence ?? 1;
    const paddedSeq = String(nextSeq).padStart(4, '0');

    return `MT-${cleanScopeKey}-${sequenceDate}-${paddedSeq}`;
  }

  public async create(
    tenantId: string,
    createdById: string,
    transferNumber: string,
    data: CreateMaterialTransferDto,
    sourceProjectId?: string | null,
    destinationProjectId?: string | null,
    linesData?: Array<{
      materialId: string;
      quantityTransferred: number;
      uom: string;
      remarks?: string | null;
    }>
  ): Promise<MaterialTransferWithRelations> {
    const linesToCreate = (linesData && linesData.length > 0)
      ? linesData.map((l) => ({
          tenantId,
          materialId: l.materialId,
          quantityTransferred: new Prisma.Decimal(l.quantityTransferred),
          quantityReceived: new Prisma.Decimal(0),
          uom: l.uom,
          remarks: l.remarks || null,
        }))
      : [];

    const created = await this.prisma.materialTransfer.create({
      data: {
        tenantId,
        sourceStoreId: data.sourceStoreId,
        destinationStoreId: data.destinationStoreId,
        sourceProjectId: sourceProjectId || null,
        destinationProjectId: destinationProjectId || null,
        transferNumber,
        status: 'DRAFT',
        transferDate: data.transferDate ? new Date(data.transferDate) : new Date(),
        deliveryChallanNumber: data.deliveryChallanNumber || null,
        vehicleNumber: data.vehicleNumber || null,
        driverName: data.driverName || null,
        driverPhone: data.driverPhone || null,
        remarks: data.remarks || null,
        createdById,
        lines: {
          create: linesToCreate,
        },
      },
      include: this.includeRelations,
    });

    return created as unknown as MaterialTransferWithRelations;
  }

  public async update(
    tenantId: string,
    id: string,
    data: UpdateMaterialTransferDto,
    sourceProjectId?: string | null,
    destinationProjectId?: string | null,
    linesData?: Array<{
      materialId: string;
      quantityTransferred: number;
      uom: string;
      remarks?: string | null;
    }>
  ): Promise<MaterialTransferWithRelations> {
    const existing = await this.prisma.materialTransfer.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundError(`Material transfer with ID ${id} not found.`);
    }

    if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
      throw new BadRequestError(
        `Cannot update material transfer in status '${existing.status}'. Only DRAFT or REJECTED transfers can be updated.`
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (linesData && linesData.length > 0) {
        await tx.materialTransferLine.deleteMany({
          where: { materialTransferId: id, tenantId },
        });

        await tx.materialTransferLine.createMany({
          data: linesData.map((l) => ({
            tenantId,
            materialTransferId: id,
            materialId: l.materialId,
            quantityTransferred: new Prisma.Decimal(l.quantityTransferred),
            quantityReceived: new Prisma.Decimal(0),
            uom: l.uom,
            remarks: l.remarks || null,
          })),
        });
      }

      const updateData: Prisma.MaterialTransferUpdateInput = {};

      if (data.sourceStoreId) {
        updateData.sourceStore = { connect: { id: data.sourceStoreId } };
        updateData.sourceProject = sourceProjectId ? { connect: { id: sourceProjectId } } : { disconnect: true };
      }
      if (data.destinationStoreId) {
        updateData.destinationStore = { connect: { id: data.destinationStoreId } };
        updateData.destinationProject = destinationProjectId ? { connect: { id: destinationProjectId } } : { disconnect: true };
      }
      if (data.transferDate !== undefined) {
        updateData.transferDate = data.transferDate ? new Date(data.transferDate) : new Date();
      }
      if (data.deliveryChallanNumber !== undefined) {
        updateData.deliveryChallanNumber = data.deliveryChallanNumber;
      }
      if (data.vehicleNumber !== undefined) {
        updateData.vehicleNumber = data.vehicleNumber;
      }
      if (data.driverName !== undefined) {
        updateData.driverName = data.driverName;
      }
      if (data.driverPhone !== undefined) {
        updateData.driverPhone = data.driverPhone;
      }
      if (data.remarks !== undefined) {
        updateData.remarks = data.remarks;
      }

      const updated = await tx.materialTransfer.update({
        where: { id, tenantId },
        data: updateData,
        include: this.includeRelations,
      });

      return updated as unknown as MaterialTransferWithRelations;
    });
  }

  public async submit(
    tenantId: string,
    id: string,
    userId: string,
    remarks?: string | null
  ): Promise<MaterialTransferWithRelations> {
    const existing = await this.prisma.materialTransfer.findFirst({
      where: { id, tenantId },
      include: { lines: true },
    });

    if (!existing) {
      throw new NotFoundError(`Material transfer with ID ${id} not found.`);
    }

    if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
      throw new BadRequestError(
        `Only DRAFT or REJECTED material transfers can be submitted. Current status: ${existing.status}`
      );
    }

    if (!existing.lines || existing.lines.length === 0) {
      throw new BadRequestError('Cannot submit a material transfer with no line items.');
    }

    const updated = await this.prisma.materialTransfer.update({
      where: { id, tenantId },
      data: {
        status: 'SUBMITTED',
        submittedById: userId,
        submittedAt: new Date(),
        remarks: remarks || existing.remarks,
        rejectionReason: null,
      },
      include: this.includeRelations,
    });

    return updated as unknown as MaterialTransferWithRelations;
  }

  public async approve(
    tenantId: string,
    id: string,
    userId: string,
    approvalRemarks?: string | null
  ): Promise<MaterialTransferWithRelations> {
    const existing = await this.prisma.materialTransfer.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundError(`Material transfer with ID ${id} not found.`);
    }

    if (existing.status !== 'SUBMITTED') {
      throw new BadRequestError(
        `Only SUBMITTED material transfers can be approved. Current status: ${existing.status}`
      );
    }

    const updated = await this.prisma.materialTransfer.update({
      where: { id, tenantId },
      data: {
        status: 'APPROVED',
        approvedById: userId,
        approvedAt: new Date(),
        approvalRemarks: approvalRemarks || existing.approvalRemarks,
      },
      include: this.includeRelations,
    });

    return updated as unknown as MaterialTransferWithRelations;
  }

  public async reject(
    tenantId: string,
    id: string,
    userId: string,
    rejectionReason: string
  ): Promise<MaterialTransferWithRelations> {
    const existing = await this.prisma.materialTransfer.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundError(`Material transfer with ID ${id} not found.`);
    }

    if (existing.status !== 'SUBMITTED') {
      throw new BadRequestError(
        `Only SUBMITTED material transfers can be rejected. Current status: ${existing.status}`
      );
    }

    const updated = await this.prisma.materialTransfer.update({
      where: { id, tenantId },
      data: {
        status: 'REJECTED',
        rejectedById: userId,
        rejectedAt: new Date(),
        rejectionReason,
      },
      include: this.includeRelations,
    });

    return updated as unknown as MaterialTransferWithRelations;
  }

  public async cancel(
    tenantId: string,
    id: string,
    userId: string,
    cancellationReason?: string | null
  ): Promise<MaterialTransferWithRelations> {
    const existing = await this.prisma.materialTransfer.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundError(`Material transfer with ID ${id} not found.`);
    }

    if (existing.status === 'IN_TRANSIT' || existing.status === 'RECEIVED') {
      throw new BadRequestError(
        `Cannot cancel material transfer in status '${existing.status}'. Dispatched and received transfers are irrevocable.`
      );
    }

    if (existing.status === 'CANCELLED') {
      return (await this.prisma.materialTransfer.findUnique({
        where: { id, tenantId },
        include: this.includeRelations,
      })) as unknown as MaterialTransferWithRelations;
    }

    const updated = await this.prisma.materialTransfer.update({
      where: { id, tenantId },
      data: {
        status: 'CANCELLED',
        cancelledById: userId,
        cancelledAt: new Date(),
        cancellationReason: cancellationReason || existing.cancellationReason,
      },
      include: this.includeRelations,
    });

    return updated as unknown as MaterialTransferWithRelations;
  }

  public async dispatch(
    tenantId: string,
    id: string,
    userId: string,
    data?: DispatchMaterialTransferDto
  ): Promise<MaterialTransferWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock MaterialTransfer row FOR UPDATE
      const transferRows = await tx.$queryRawUnsafe<
        Array<{
          id: string;
          tenant_id: string;
          status: string;
          source_store_id: string;
          destination_store_id: string;
          created_by_id: string;
          remarks: string | null;
        }>
      >(
        `SELECT id, tenant_id, status, source_store_id, destination_store_id, created_by_id, remarks
         FROM material_transfers
         WHERE id = $1::uuid AND tenant_id = $2::uuid
         FOR UPDATE`,
        id,
        tenantId
      );

      if (!transferRows || transferRows.length === 0) {
        throw new NotFoundError(`Material transfer with ID ${id} not found.`);
      }
      const transfer = transferRows[0];

      if (transfer.status === 'IN_TRANSIT') {
        // Idempotent return
        return (await tx.materialTransfer.findUnique({
          where: { id, tenantId },
          include: this.includeRelations,
        })) as unknown as MaterialTransferWithRelations;
      }

      if (transfer.status !== 'APPROVED' && transfer.status !== 'SUBMITTED') {
        throw new BadRequestError(
          `Only APPROVED or SUBMITTED material transfers can be dispatched. Current status: ${transfer.status}`
        );
      }

      // 2. Fetch lines
      const lines = await tx.materialTransferLine.findMany({
        where: { materialTransferId: id, tenantId },
      });

      if (lines.length === 0) {
        throw new BadRequestError('Material transfer contains no line items to dispatch.');
      }

      // 3. Deterministic Deadlock Prevention: Sort lines by materialId ASC
      const sortedLines = [...lines].sort((a, b) =>
        a.materialId.localeCompare(b.materialId)
      );

      // 4. Process each line under source StoreStockBalance lock
      for (const line of sortedLines) {
        const qtyToTransfer = Number(line.quantityTransferred);
        if (qtyToTransfer <= 0) {
          throw new BadRequestError(
            `Transferred quantity for line ${line.id} must be strictly greater than 0.`
          );
        }

        // Lock & Ensure StoreStockBalance row exists
        await tx.$executeRaw`
          INSERT INTO "store_stock_balances" ("id", "tenant_id", "store_id", "material_id", "quantity_on_hand", "reserved_quantity", "created_at", "updated_at")
          VALUES (gen_random_uuid(), ${tenantId}::uuid, ${transfer.source_store_id}::uuid, ${line.materialId}::uuid, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT ("store_id", "material_id") DO NOTHING;
        `;

        const balRows = await tx.$queryRaw<
          Array<{
            id: string;
            quantity_on_hand: string | number;
            reserved_quantity: string | number;
          }>
        >`
          SELECT "id", "quantity_on_hand", "reserved_quantity"
          FROM "store_stock_balances"
          WHERE "store_id" = ${transfer.source_store_id}::uuid AND "material_id" = ${line.materialId}::uuid
          FOR UPDATE;
        `;

        const currentOnHand = Number(balRows[0]?.quantity_on_hand ?? 0);
        const currentReserved = Number(balRows[0]?.reserved_quantity ?? 0);
        const availableQuantity = currentOnHand - currentReserved;

        // Negative stock prevention
        if (qtyToTransfer > availableQuantity + 0.0001) {
          throw new BadRequestError(
            `Insufficient stock for material ${line.materialId} in source store ${transfer.source_store_id}. Available: ${availableQuantity}, Requested to transfer: ${qtyToTransfer}.`
          );
        }

        // Standard rate lookup
        const material = await tx.material.findUnique({
          where: { id: line.materialId },
          select: { standardRate: true },
        });
        const unitRate = material ? Number(material.standardRate) : 0;

        const idempotencyKey = `MT-${id}-${line.id}-OUT`;
        const existingMovement = await tx.stockMovement.findUnique({
          where: {
            tenantId_idempotencyKey: {
              tenantId,
              idempotencyKey,
            },
          },
        });

        if (!existingMovement) {
          // Create StockMovement.TRANSFER_OUT
          await tx.stockMovement.create({
            data: {
              tenantId,
              storeId: transfer.source_store_id,
              materialId: line.materialId,
              movementType: 'TRANSFER_OUT',
              quantity: new Prisma.Decimal(qtyToTransfer),
              uom: line.uom,
              unitRate: new Prisma.Decimal(unitRate),
              referenceType: 'MATERIAL_TRANSFER',
              referenceId: id,
              reason:
                line.remarks ||
                data?.remarks ||
                transfer.remarks ||
                'Inter-store stock transfer dispatch',
              performedById: userId,
              idempotencyKey,
              occurredAt: new Date(),
            },
          });

          // Decrement StoreStockBalance
          const newOnHand = currentOnHand - qtyToTransfer;
          await tx.storeStockBalance.update({
            where: { id: balRows[0].id },
            data: { quantityOnHand: new Prisma.Decimal(newOnHand) },
          });
        }
      }

      // 5. Transition MaterialTransfer to IN_TRANSIT
      const updatedTransfer = await tx.materialTransfer.update({
        where: { id, tenantId },
        data: {
          status: 'IN_TRANSIT',
          dispatchedById: userId,
          dispatchedAt: new Date(),
          dispatchDate: new Date(),
          deliveryChallanNumber: data?.deliveryChallanNumber || undefined,
          vehicleNumber: data?.vehicleNumber || undefined,
          driverName: data?.driverName || undefined,
          driverPhone: data?.driverPhone || undefined,
          remarks: data?.remarks || transfer.remarks,
        },
        include: this.includeRelations,
      });

      return updatedTransfer as unknown as MaterialTransferWithRelations;
    });
  }

  public async receive(
    tenantId: string,
    id: string,
    userId: string,
    data?: ReceiveMaterialTransferDto
  ): Promise<MaterialTransferWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock MaterialTransfer row FOR UPDATE
      const transferRows = await tx.$queryRawUnsafe<
        Array<{
          id: string;
          tenant_id: string;
          status: string;
          source_store_id: string;
          destination_store_id: string;
          dispatched_by_id: string | null;
          remarks: string | null;
        }>
      >(
        `SELECT id, tenant_id, status, source_store_id, destination_store_id, dispatched_by_id, remarks
         FROM material_transfers
         WHERE id = $1::uuid AND tenant_id = $2::uuid
         FOR UPDATE`,
        id,
        tenantId
      );

      if (!transferRows || transferRows.length === 0) {
        throw new NotFoundError(`Material transfer with ID ${id} not found.`);
      }
      const transfer = transferRows[0];

      if (transfer.status === 'RECEIVED') {
        // Idempotent return
        return (await tx.materialTransfer.findUnique({
          where: { id, tenantId },
          include: this.includeRelations,
        })) as unknown as MaterialTransferWithRelations;
      }

      if (transfer.status !== 'IN_TRANSIT') {
        throw new BadRequestError(
          `Only IN_TRANSIT material transfers can be received. Current status: ${transfer.status}`
        );
      }

      // 2. Fetch lines
      const lines = await tx.materialTransferLine.findMany({
        where: { materialTransferId: id, tenantId },
      });

      if (lines.length === 0) {
        throw new BadRequestError('Material transfer contains no line items to receive.');
      }

      // 3. Deterministic Deadlock Prevention: Sort lines by materialId ASC
      const sortedLines = [...lines].sort((a, b) =>
        a.materialId.localeCompare(b.materialId)
      );

      // 4. Process each line under destination StoreStockBalance lock
      for (const line of sortedLines) {
        const qtyToReceive = Number(line.quantityTransferred);
        if (qtyToReceive <= 0) {
          throw new BadRequestError(
            `Received quantity for line ${line.id} must be strictly greater than 0.`
          );
        }

        // Lock & Ensure StoreStockBalance row exists in destination store
        await tx.$executeRaw`
          INSERT INTO "store_stock_balances" ("id", "tenant_id", "store_id", "material_id", "quantity_on_hand", "reserved_quantity", "created_at", "updated_at")
          VALUES (gen_random_uuid(), ${tenantId}::uuid, ${transfer.destination_store_id}::uuid, ${line.materialId}::uuid, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT ("store_id", "material_id") DO NOTHING;
        `;

        const balRows = await tx.$queryRaw<
          Array<{
            id: string;
            quantity_on_hand: string | number;
            reserved_quantity: string | number;
          }>
        >`
          SELECT "id", "quantity_on_hand", "reserved_quantity"
          FROM "store_stock_balances"
          WHERE "store_id" = ${transfer.destination_store_id}::uuid AND "material_id" = ${line.materialId}::uuid
          FOR UPDATE;
        `;

        const currentOnHand = Number(balRows[0]?.quantity_on_hand ?? 0);

        // Standard rate lookup
        const material = await tx.material.findUnique({
          where: { id: line.materialId },
          select: { standardRate: true },
        });
        const unitRate = material ? Number(material.standardRate) : 0;

        const idempotencyKey = `MT-${id}-${line.id}-IN`;
        const existingMovement = await tx.stockMovement.findUnique({
          where: {
            tenantId_idempotencyKey: {
              tenantId,
              idempotencyKey,
            },
          },
        });

        if (!existingMovement) {
          // Create StockMovement.TRANSFER_IN
          await tx.stockMovement.create({
            data: {
              tenantId,
              storeId: transfer.destination_store_id,
              materialId: line.materialId,
              movementType: 'TRANSFER_IN',
              quantity: new Prisma.Decimal(qtyToReceive),
              uom: line.uom,
              unitRate: new Prisma.Decimal(unitRate),
              referenceType: 'MATERIAL_TRANSFER',
              referenceId: id,
              reason:
                line.remarks ||
                data?.receiptRemarks ||
                transfer.remarks ||
                'Inter-store stock transfer arrival and acceptance',
              performedById: userId,
              idempotencyKey,
              occurredAt: new Date(),
            },
          });

          // Increment destination StoreStockBalance
          const newOnHand = currentOnHand + qtyToReceive;
          await tx.storeStockBalance.update({
            where: { id: balRows[0].id },
            data: { quantityOnHand: new Prisma.Decimal(newOnHand) },
          });

          // Update quantityReceived on transfer line
          await tx.materialTransferLine.update({
            where: { id: line.id },
            data: { quantityReceived: new Prisma.Decimal(qtyToReceive) },
          });
        }
      }

      // 5. Transition MaterialTransfer to RECEIVED
      const updatedTransfer = await tx.materialTransfer.update({
        where: { id, tenantId },
        data: {
          status: 'RECEIVED',
          receivedById: userId,
          receivedAt: new Date(),
          receivedDate: new Date(),
          receiptRemarks: data?.receiptRemarks || undefined,
        },
        include: this.includeRelations,
      });

      return updatedTransfer as unknown as MaterialTransferWithRelations;
    });
  }

  public async delete(tenantId: string, id: string): Promise<void> {
    const existing = await this.prisma.materialTransfer.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundError(`Material transfer with ID ${id} not found.`);
    }

    if (existing.status !== 'DRAFT') {
      throw new BadRequestError(
        `Only DRAFT material transfers can be deleted. Current status: ${existing.status}`
      );
    }

    await this.prisma.materialTransfer.delete({
      where: { id, tenantId },
    });
  }
}
