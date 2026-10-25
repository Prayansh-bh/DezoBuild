import { Prisma, type PrismaClient } from '@prisma/client';
import { DatabaseService } from '../../../database/database.service';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../../common/errors';
import type {
  IInventoryReservationRepository,
  InventoryReservationWithRelations,
} from './inventory-reservation.repository.interface';
import type {
  CreateInventoryReservationDto,
  UpdateInventoryReservationDto,
  ListInventoryReservationsQueryDto,
} from '../dto/inventory-reservation.dto';

export class PrismaInventoryReservationRepository
  implements IInventoryReservationRepository
{
  private static instance: PrismaInventoryReservationRepository;
  private readonly prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || DatabaseService.getInstance().getClient();
  }

  public static getInstance(): PrismaInventoryReservationRepository {
    if (!PrismaInventoryReservationRepository.instance) {
      PrismaInventoryReservationRepository.instance =
        new PrismaInventoryReservationRepository();
    }
    return PrismaInventoryReservationRepository.instance;
  }

  private get includeRelations() {
    return {
      lines: {
        include: {
          material: true,
          wbsNode: {
            select: {
              id: true,
              code: true,
              name: true,
              projectId: true,
            },
          },
          task: {
            select: {
              id: true,
              name: true,
              status: true,
              projectId: true,
            },
          },
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
      releasedBy: {
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
      rejectedBy: {
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
    id: string
  ): Promise<InventoryReservationWithRelations | null> {
    return this.prisma.inventoryReservation.findFirst({
      where: { id, tenantId },
      include: this.includeRelations,
    }) as unknown as Promise<InventoryReservationWithRelations | null>;
  }

  public async findByReservationNumber(
    tenantId: string,
    reservationNumber: string
  ): Promise<InventoryReservationWithRelations | null> {
    return this.prisma.inventoryReservation.findFirst({
      where: { tenantId, reservationNumber },
      include: this.includeRelations,
    }) as unknown as Promise<InventoryReservationWithRelations | null>;
  }

  public async findMany(
    tenantId: string,
    allowedProjectIds?: string[],
    filter?: ListInventoryReservationsQueryDto
  ): Promise<{ items: InventoryReservationWithRelations[]; total: number }> {
    const where: Prisma.InventoryReservationWhereInput = { tenantId };

    if (allowedProjectIds !== undefined) {
      if (allowedProjectIds.length === 0) {
        return { items: [], total: 0 };
      }
      where.projectId = { in: allowedProjectIds };
    }

    if (filter?.storeId) {
      where.storeId = filter.storeId;
    }
    if (filter?.projectId) {
      where.projectId = filter.projectId;
    }
    if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.materialId) {
      where.lines = {
        some: { materialId: filter.materialId },
      };
    }
    if (filter?.startDate || filter?.endDate) {
      where.reservationDate = {};
      if (filter.startDate) {
        where.reservationDate.gte = new Date(filter.startDate);
      }
      if (filter.endDate) {
        where.reservationDate.lte = new Date(filter.endDate);
      }
    }
    if (filter?.search) {
      const s = filter.search.trim();
      where.OR = [
        { reservationNumber: { contains: s, mode: 'insensitive' } },
        { purpose: { contains: s, mode: 'insensitive' } },
        { remarks: { contains: s, mode: 'insensitive' } },
      ];
    }

    const page = Math.max(1, filter?.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter?.limit ?? 50));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.inventoryReservation.findMany({
        where,
        skip,
        take: limit,
        include: this.includeRelations,
        orderBy: { reservationDate: 'desc' },
      }),
      this.prisma.inventoryReservation.count({ where }),
    ]);

    return {
      items: items as unknown as InventoryReservationWithRelations[],
      total,
    };
  }

  public async allocateReservationNumber(
    tenantId: string,
    scopeKey: string,
    date?: Date
  ): Promise<string> {
    const targetDate = date || new Date();
    const yyyy = targetDate.getUTCFullYear();
    const mm = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getUTCDate()).padStart(2, '0');
    const sequenceDate = `${yyyy}${mm}${dd}`;

    const cleanScopeKey =
      scopeKey.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase() || 'GLOBAL';

    const rows = await this.prisma.$queryRaw<Array<{ last_sequence: number }>>`
      INSERT INTO "inventory_reservation_sequences" ("id", "tenant_id", "scope_key", "sequence_date", "last_sequence", "updated_at")
      VALUES (gen_random_uuid(), ${tenantId}::uuid, ${cleanScopeKey}, ${sequenceDate}, 1, CURRENT_TIMESTAMP)
      ON CONFLICT ("tenant_id", "scope_key", "sequence_date")
      DO UPDATE SET "last_sequence" = "inventory_reservation_sequences"."last_sequence" + 1, "updated_at" = CURRENT_TIMESTAMP
      RETURNING "last_sequence";
    `;

    const nextSeq = rows[0]?.last_sequence ?? 1;
    const paddedSeq = String(nextSeq).padStart(4, '0');

    return `RES-${cleanScopeKey}-${sequenceDate}-${paddedSeq}`;
  }

  public async create(
    tenantId: string,
    createdById: string,
    reservationNumber: string,
    derivedProjectId: string,
    data: CreateInventoryReservationDto
  ): Promise<InventoryReservationWithRelations> {
    const reservationDate = data.reservationDate
      ? new Date(data.reservationDate)
      : new Date();
    const requiredDate = data.requiredDate ? new Date(data.requiredDate) : null;
    const expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;

    const created = await this.prisma.inventoryReservation.create({
      data: {
        tenantId,
        storeId: data.storeId,
        projectId: derivedProjectId,
        reservationNumber,
        status: 'DRAFT',
        priority: data.priority || 'NORMAL',
        reservationDate,
        requiredDate,
        expiryDate,
        purpose: data.purpose || null,
        remarks: data.remarks || null,
        createdById,
        lines: {
          createMany: {
            data: data.lines.map((l) => ({
              tenantId,
              materialId: l.materialId,
              quantityReserved: new Prisma.Decimal(l.quantityReserved),
              quantityFulfilled: new Prisma.Decimal(0),
              quantityReleased: new Prisma.Decimal(0),
              uom: l.uom,
              wbsNodeId: l.wbsNodeId || null,
              taskId: l.taskId || null,
              materialIndentLineId: l.materialIndentLineId || null,
              remarks: l.remarks || null,
            })),
          },
        },
      },
      include: this.includeRelations,
    });

    return created as unknown as InventoryReservationWithRelations;
  }

  public async update(
    tenantId: string,
    id: string,
    data: UpdateInventoryReservationDto
  ): Promise<InventoryReservationWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryReservation.findFirst({
        where: { id, tenantId },
      });

      if (!existing) {
        throw new NotFoundError(`Inventory reservation with ID ${id} not found.`);
      }

      if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
        throw new BadRequestError(
          `Cannot update reservation in status '${existing.status}'. Only DRAFT or REJECTED reservations can be modified.`
        );
      }

      const updateData: Prisma.InventoryReservationUpdateInput = {};

      if (data.projectId) {
        updateData.project = { connect: { id: data.projectId } };
      }
      if (data.priority) {
        updateData.priority = data.priority;
      }
      if (data.reservationDate) {
        updateData.reservationDate = new Date(data.reservationDate);
      }
      if (data.requiredDate !== undefined) {
        updateData.requiredDate = data.requiredDate
          ? new Date(data.requiredDate)
          : null;
      }
      if (data.expiryDate !== undefined) {
        updateData.expiryDate = data.expiryDate
          ? new Date(data.expiryDate)
          : null;
      }
      if (data.purpose !== undefined) {
        updateData.purpose = data.purpose || null;
      }
      if (data.remarks !== undefined) {
        updateData.remarks = data.remarks || null;
      }

      if (data.lines && data.lines.length > 0) {
        await tx.inventoryReservationLine.deleteMany({
          where: { reservationId: id, tenantId },
        });

        await tx.inventoryReservationLine.createMany({
          data: data.lines.map((l) => ({
            tenantId,
            reservationId: id,
            materialId: l.materialId,
            quantityReserved: new Prisma.Decimal(l.quantityReserved),
            quantityFulfilled: new Prisma.Decimal(0),
            quantityReleased: new Prisma.Decimal(0),
            uom: l.uom,
            wbsNodeId: l.wbsNodeId || null,
            taskId: l.taskId || null,
            materialIndentLineId: l.materialIndentLineId || null,
            remarks: l.remarks || null,
          })),
        });
      }

      const updated = await tx.inventoryReservation.update({
        where: { id, tenantId },
        data: updateData,
        include: this.includeRelations,
      });

      return updated as unknown as InventoryReservationWithRelations;
    });
  }

  public async submit(
    tenantId: string,
    id: string,
    userId: string,
    remarks?: string | null
  ): Promise<InventoryReservationWithRelations> {
    const existing = await this.prisma.inventoryReservation.findFirst({
      where: { id, tenantId },
      include: { lines: true },
    });

    if (!existing) {
      throw new NotFoundError(`Inventory reservation with ID ${id} not found.`);
    }

    if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
      throw new BadRequestError(
        `Only DRAFT or REJECTED reservations can be submitted. Current status: ${existing.status}`
      );
    }

    if (!existing.lines || existing.lines.length === 0) {
      throw new BadRequestError(
        'Inventory reservation must contain at least one line item before submission.'
      );
    }

    const updated = await this.prisma.inventoryReservation.update({
      where: { id, tenantId },
      data: {
        status: 'SUBMITTED',
        submittedById: userId,
        submittedAt: new Date(),
        remarks: remarks || existing.remarks,
        rejectionReason: null,
        rejectedById: null,
        rejectedAt: null,
      },
      include: this.includeRelations,
    });

    return updated as unknown as InventoryReservationWithRelations;
  }

  public async approve(
    tenantId: string,
    id: string,
    userId: string,
    approvalRemarks?: string | null
  ): Promise<InventoryReservationWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock InventoryReservation row FOR UPDATE
      const resRows = await tx.$queryRawUnsafe<
        Array<{
          id: string;
          tenant_id: string;
          status: string;
          store_id: string;
          project_id: string;
          created_by_id: string;
          remarks: string | null;
        }>
      >(
        `SELECT id, tenant_id, status, store_id, project_id, created_by_id, remarks
         FROM inventory_reservations
         WHERE id = $1::uuid AND tenant_id = $2::uuid
         FOR UPDATE`,
        id,
        tenantId
      );

      if (!resRows || resRows.length === 0) {
        throw new NotFoundError(`Inventory reservation with ID ${id} not found.`);
      }
      const reservation = resRows[0];

      if (reservation.status === 'ACTIVE') {
        // Idempotent return
        return (await tx.inventoryReservation.findUnique({
          where: { id, tenantId },
          include: this.includeRelations,
        })) as unknown as InventoryReservationWithRelations;
      }

      if (reservation.status !== 'SUBMITTED') {
        throw new BadRequestError(
          `Only SUBMITTED reservations can be approved. Current status: ${reservation.status}`
        );
      }

      // Segregation of duties: Creator cannot approve own reservation
      if (reservation.created_by_id === userId) {
        throw new ForbiddenError(
          'Segregation of duties violation: Approver cannot be the creator of the inventory reservation.'
        );
      }

      // 2. Fetch all lines
      const lines = await tx.inventoryReservationLine.findMany({
        where: { reservationId: id, tenantId },
      });

      if (lines.length === 0) {
        throw new BadRequestError(
          'Inventory reservation contains no line items to approve.'
        );
      }

      // 3. Deterministic Deadlock Prevention: Sort lines by materialId ASC
      const sortedLines = [...lines].sort((a, b) =>
        a.materialId.localeCompare(b.materialId)
      );

      // 4. Process each line under StoreStockBalance row lock
      for (const line of sortedLines) {
        const qtyToReserve = Number(line.quantityReserved);
        if (qtyToReserve <= 0) {
          throw new BadRequestError(
            `Reserved quantity for line ${line.id} must be strictly greater than 0.`
          );
        }

        // Lock & Ensure StoreStockBalance row exists
        await tx.$executeRaw`
          INSERT INTO "store_stock_balances" ("id", "tenant_id", "store_id", "material_id", "quantity_on_hand", "reserved_quantity", "created_at", "updated_at")
          VALUES (gen_random_uuid(), ${tenantId}::uuid, ${reservation.store_id}::uuid, ${line.materialId}::uuid, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
          WHERE "store_id" = ${reservation.store_id}::uuid AND "material_id" = ${line.materialId}::uuid
          FOR UPDATE;
        `;

        const currentOnHand = Number(balRows[0]?.quantity_on_hand ?? 0);
        const currentReserved = Number(balRows[0]?.reserved_quantity ?? 0);
        const availableQuantity = currentOnHand - currentReserved;

        // Over-reservation check
        if (qtyToReserve > availableQuantity + 0.0001) {
          throw new BadRequestError(
            `Insufficient available stock for material ${line.materialId} in store ${reservation.store_id}. Available: ${availableQuantity}, Requested to reserve: ${qtyToReserve}.`
          );
        }

        // Atomically increment reserved_quantity (quantity_on_hand remains unchanged)
        const newReserved = currentReserved + qtyToReserve;
        await tx.storeStockBalance.update({
          where: { id: balRows[0].id },
          data: { reservedQuantity: new Prisma.Decimal(newReserved) },
        });
      }

      // 5. Update status to ACTIVE
      const updated = await tx.inventoryReservation.update({
        where: { id, tenantId },
        data: {
          status: 'ACTIVE',
          approvedById: userId,
          approvedAt: new Date(),
          releaseRemarks: approvalRemarks || reservation.remarks,
        },
        include: this.includeRelations,
      });

      return updated as unknown as InventoryReservationWithRelations;
    });
  }

  public async reject(
    tenantId: string,
    id: string,
    userId: string,
    rejectionReason: string
  ): Promise<InventoryReservationWithRelations> {
    const existing = await this.prisma.inventoryReservation.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundError(`Inventory reservation with ID ${id} not found.`);
    }

    if (existing.status !== 'SUBMITTED') {
      throw new BadRequestError(
        `Only SUBMITTED reservations can be rejected. Current status: ${existing.status}`
      );
    }

    const updated = await this.prisma.inventoryReservation.update({
      where: { id, tenantId },
      data: {
        status: 'REJECTED',
        rejectedById: userId,
        rejectedAt: new Date(),
        rejectionReason,
      },
      include: this.includeRelations,
    });

    return updated as unknown as InventoryReservationWithRelations;
  }

  public async release(
    tenantId: string,
    id: string,
    userId: string,
    releaseRemarks?: string | null
  ): Promise<InventoryReservationWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const resRows = await tx.$queryRawUnsafe<
        Array<{
          id: string;
          tenant_id: string;
          status: string;
          store_id: string;
        }>
      >(
        `SELECT id, tenant_id, status, store_id
         FROM inventory_reservations
         WHERE id = $1::uuid AND tenant_id = $2::uuid
         FOR UPDATE`,
        id,
        tenantId
      );

      if (!resRows || resRows.length === 0) {
        throw new NotFoundError(`Inventory reservation with ID ${id} not found.`);
      }
      const reservation = resRows[0];

      if (reservation.status === 'RELEASED') {
        return (await tx.inventoryReservation.findUnique({
          where: { id, tenantId },
          include: this.includeRelations,
        })) as unknown as InventoryReservationWithRelations;
      }

      if (
        reservation.status !== 'ACTIVE' &&
        reservation.status !== 'PARTIALLY_FULFILLED'
      ) {
        throw new BadRequestError(
          `Only ACTIVE or PARTIALLY_FULFILLED reservations can be released. Current status: ${reservation.status}`
        );
      }

      const lines = await tx.inventoryReservationLine.findMany({
        where: { reservationId: id, tenantId },
      });

      const sortedLines = [...lines].sort((a, b) =>
        a.materialId.localeCompare(b.materialId)
      );

      for (const line of sortedLines) {
        const reserved = Number(line.quantityReserved);
        const fulfilled = Number(line.quantityFulfilled);
        const previouslyReleased = Number(line.quantityReleased);
        const activeQty = Math.max(0, reserved - fulfilled - previouslyReleased);

        if (activeQty > 0) {
          const balRows = await tx.$queryRaw<
            Array<{
              id: string;
              reserved_quantity: string | number;
            }>
          >`
            SELECT "id", "reserved_quantity"
            FROM "store_stock_balances"
            WHERE "store_id" = ${reservation.store_id}::uuid AND "material_id" = ${line.materialId}::uuid
            FOR UPDATE;
          `;

          if (balRows && balRows.length > 0) {
            const currentReserved = Number(balRows[0].reserved_quantity);
            const newReserved = Math.max(0, currentReserved - activeQty);

            await tx.storeStockBalance.update({
              where: { id: balRows[0].id },
              data: { reservedQuantity: new Prisma.Decimal(newReserved) },
            });
          }

          await tx.inventoryReservationLine.update({
            where: { id: line.id },
            data: {
              quantityReleased: new Prisma.Decimal(previouslyReleased + activeQty),
            },
          });
        }
      }

      const updated = await tx.inventoryReservation.update({
        where: { id, tenantId },
        data: {
          status: 'RELEASED',
          releasedById: userId,
          releasedAt: new Date(),
          releaseRemarks: releaseRemarks || null,
        },
        include: this.includeRelations,
      });

      return updated as unknown as InventoryReservationWithRelations;
    });
  }

  public async cancel(
    tenantId: string,
    id: string,
    userId: string,
    cancellationReason?: string | null
  ): Promise<InventoryReservationWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const resRows = await tx.$queryRawUnsafe<
        Array<{
          id: string;
          tenant_id: string;
          status: string;
          store_id: string;
        }>
      >(
        `SELECT id, tenant_id, status, store_id
         FROM inventory_reservations
         WHERE id = $1::uuid AND tenant_id = $2::uuid
         FOR UPDATE`,
        id,
        tenantId
      );

      if (!resRows || resRows.length === 0) {
        throw new NotFoundError(`Inventory reservation with ID ${id} not found.`);
      }
      const reservation = resRows[0];

      if (reservation.status === 'CANCELLED') {
        return (await tx.inventoryReservation.findUnique({
          where: { id, tenantId },
          include: this.includeRelations,
        })) as unknown as InventoryReservationWithRelations;
      }

      if (
        reservation.status === 'FULFILLED' ||
        reservation.status === 'RELEASED' ||
        reservation.status === 'EXPIRED'
      ) {
        throw new BadRequestError(
          `Cannot cancel reservation in terminal status '${reservation.status}'.`
        );
      }

      // If ACTIVE or PARTIALLY_FULFILLED, release remaining active hold
      if (
        reservation.status === 'ACTIVE' ||
        reservation.status === 'PARTIALLY_FULFILLED'
      ) {
        const lines = await tx.inventoryReservationLine.findMany({
          where: { reservationId: id, tenantId },
        });

        const sortedLines = [...lines].sort((a, b) =>
          a.materialId.localeCompare(b.materialId)
        );

        for (const line of sortedLines) {
          const reserved = Number(line.quantityReserved);
          const fulfilled = Number(line.quantityFulfilled);
          const previouslyReleased = Number(line.quantityReleased);
          const activeQty = Math.max(0, reserved - fulfilled - previouslyReleased);

          if (activeQty > 0) {
            const balRows = await tx.$queryRaw<
              Array<{
                id: string;
                reserved_quantity: string | number;
              }>
            >`
              SELECT "id", "reserved_quantity"
              FROM "store_stock_balances"
              WHERE "store_id" = ${reservation.store_id}::uuid AND "material_id" = ${line.materialId}::uuid
              FOR UPDATE;
            `;

            if (balRows && balRows.length > 0) {
              const currentReserved = Number(balRows[0].reserved_quantity);
              const newReserved = Math.max(0, currentReserved - activeQty);

              await tx.storeStockBalance.update({
                where: { id: balRows[0].id },
                data: { reservedQuantity: new Prisma.Decimal(newReserved) },
              });
            }

            await tx.inventoryReservationLine.update({
              where: { id: line.id },
              data: {
                quantityReleased: new Prisma.Decimal(
                  previouslyReleased + activeQty
                ),
              },
            });
          }
        }
      }

      const updated = await tx.inventoryReservation.update({
        where: { id, tenantId },
        data: {
          status: 'CANCELLED',
          cancelledById: userId,
          cancelledAt: new Date(),
          cancellationReason: cancellationReason || null,
        },
        include: this.includeRelations,
      });

      return updated as unknown as InventoryReservationWithRelations;
    });
  }

  public async expireStaleReservations(
    tenantId: string,
    currentDate: Date = new Date()
  ): Promise<number> {
    const staleReservations = await this.prisma.inventoryReservation.findMany({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'PARTIALLY_FULFILLED'] },
        expiryDate: { lt: currentDate },
      },
      select: { id: true },
    });

    let expiredCount = 0;

    for (const res of staleReservations) {
      await this.prisma.$transaction(async (tx) => {
        const resRows = await tx.$queryRawUnsafe<
          Array<{
            id: string;
            tenant_id: string;
            status: string;
            store_id: string;
          }>
        >(
          `SELECT id, tenant_id, status, store_id
           FROM inventory_reservations
           WHERE id = $1::uuid AND tenant_id = $2::uuid
           FOR UPDATE`,
          res.id,
          tenantId
        );

        if (!resRows || resRows.length === 0) return;
        const reservation = resRows[0];

        if (
          reservation.status !== 'ACTIVE' &&
          reservation.status !== 'PARTIALLY_FULFILLED'
        ) {
          return;
        }

        const lines = await tx.inventoryReservationLine.findMany({
          where: { reservationId: res.id, tenantId },
        });

        const sortedLines = [...lines].sort((a, b) =>
          a.materialId.localeCompare(b.materialId)
        );

        for (const line of sortedLines) {
          const reserved = Number(line.quantityReserved);
          const fulfilled = Number(line.quantityFulfilled);
          const previouslyReleased = Number(line.quantityReleased);
          const activeQty = Math.max(0, reserved - fulfilled - previouslyReleased);

          if (activeQty > 0) {
            const balRows = await tx.$queryRaw<
              Array<{
                id: string;
                reserved_quantity: string | number;
              }>
            >`
              SELECT "id", "reserved_quantity"
              FROM "store_stock_balances"
              WHERE "store_id" = ${reservation.store_id}::uuid AND "material_id" = ${line.materialId}::uuid
              FOR UPDATE;
            `;

            if (balRows && balRows.length > 0) {
              const currentReserved = Number(balRows[0].reserved_quantity);
              const newReserved = Math.max(0, currentReserved - activeQty);

              await tx.storeStockBalance.update({
                where: { id: balRows[0].id },
                data: { reservedQuantity: new Prisma.Decimal(newReserved) },
              });
            }

            await tx.inventoryReservationLine.update({
              where: { id: line.id },
              data: {
                quantityReleased: new Prisma.Decimal(
                  previouslyReleased + activeQty
                ),
              },
            });
          }
        }

        await tx.inventoryReservation.update({
          where: { id: res.id, tenantId },
          data: {
            status: 'EXPIRED',
          },
        });

        expiredCount++;
      });
    }

    return expiredCount;
  }

  public async deleteDraft(tenantId: string, id: string): Promise<void> {
    const existing = await this.prisma.inventoryReservation.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundError(`Inventory reservation with ID ${id} not found.`);
    }

    if (existing.status !== 'DRAFT') {
      throw new BadRequestError(
        `Cannot delete reservation in status '${existing.status}'. Only DRAFT reservations can be deleted.`
      );
    }

    await this.prisma.inventoryReservation.delete({
      where: { id, tenantId },
    });
  }
}
