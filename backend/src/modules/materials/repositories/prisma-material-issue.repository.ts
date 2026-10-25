import { Prisma, type PrismaClient } from '@prisma/client';
import { DatabaseService } from '../../../database/database.service';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../../common/errors';
import type {
  IMaterialIssueRepository,
  MaterialIssueWithRelations,
} from './material-issue.repository.interface';
import type {
  CreateMaterialIssueDto,
  UpdateMaterialIssueDto,
  ListMaterialIssuesQueryDto,
} from '../dto/material-issue.dto';

export class PrismaMaterialIssueRepository implements IMaterialIssueRepository {
  private static instance: PrismaMaterialIssueRepository;
  private readonly prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || DatabaseService.getInstance().getClient();
  }

  public static getInstance(): PrismaMaterialIssueRepository {
    if (!PrismaMaterialIssueRepository.instance) {
      PrismaMaterialIssueRepository.instance = new PrismaMaterialIssueRepository();
    }
    return PrismaMaterialIssueRepository.instance;
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
      requestedBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      issuedBy: {
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
  ): Promise<MaterialIssueWithRelations | null> {
    const where: Prisma.MaterialIssueWhereInput = {
      id,
      tenantId,
    };
    if (projectId) {
      where.projectId = projectId;
    }

    return this.prisma.materialIssue.findFirst({
      where,
      include: this.includeRelations,
    }) as unknown as Promise<MaterialIssueWithRelations | null>;
  }

  public async findByIssueNumber(
    tenantId: string,
    issueNumber: string
  ): Promise<MaterialIssueWithRelations | null> {
    return this.prisma.materialIssue.findFirst({
      where: {
        tenantId,
        issueNumber,
      },
      include: this.includeRelations,
    }) as unknown as Promise<MaterialIssueWithRelations | null>;
  }

  public async findMany(
    tenantId: string,
    allowedProjectIds?: string[],
    filter?: ListMaterialIssuesQueryDto
  ): Promise<{ items: MaterialIssueWithRelations[]; total: number }> {
    const where: Prisma.MaterialIssueWhereInput = {
      tenantId,
    };

    if (allowedProjectIds !== undefined) {
      if (allowedProjectIds.length === 0) {
        return { items: [], total: 0 };
      }
      where.projectId = { in: allowedProjectIds };
    }

    if (filter?.projectId) {
      where.projectId = filter.projectId;
    }

    if (filter?.storeId) {
      where.storeId = filter.storeId;
    }

    if (filter?.status) {
      where.status = filter.status;
    }

    if (filter?.requestedById) {
      where.requestedById = filter.requestedById;
    }

    if (filter?.startDate || filter?.endDate) {
      where.issueDate = {};
      if (filter.startDate) {
        where.issueDate.gte = new Date(filter.startDate);
      }
      if (filter.endDate) {
        where.issueDate.lte = new Date(filter.endDate);
      }
    }

    if (filter?.search) {
      const s = filter.search.trim();
      where.OR = [
        { issueNumber: { contains: s, mode: 'insensitive' } },
        { purpose: { contains: s, mode: 'insensitive' } },
        { remarks: { contains: s, mode: 'insensitive' } },
      ];
    }

    const page = Math.max(1, filter?.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter?.limit ?? 50));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.materialIssue.findMany({
        where,
        include: this.includeRelations,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.materialIssue.count({ where }),
    ]);

    return {
      items: items as unknown as MaterialIssueWithRelations[],
      total,
    };
  }

  public async allocateIssueNumber(
    tenantId: string,
    projectId: string,
    projectCode: string,
    date: Date = new Date()
  ): Promise<string> {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const sequenceDate = `${yyyy}${mm}${dd}`;

    const rows = await this.prisma.$queryRawUnsafe<Array<{ last_sequence: number }>>(
      `INSERT INTO "material_issue_sequences" ("id", "tenant_id", "project_id", "sequence_date", "last_sequence", "updated_at")
       VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, 1, CURRENT_TIMESTAMP)
       ON CONFLICT ("tenant_id", "project_id", "sequence_date")
       DO UPDATE SET "last_sequence" = "material_issue_sequences"."last_sequence" + 1, "updated_at" = CURRENT_TIMESTAMP
       RETURNING "last_sequence"`,
      tenantId,
      projectId,
      sequenceDate
    );

    const seq = rows[0]?.last_sequence ?? 1;
    const paddedSeq = String(seq).padStart(4, '0');
    return `MI-${projectCode}-${sequenceDate}-${paddedSeq}`;
  }

  public async create(
    tenantId: string,
    requestedById: string,
    issueNumber: string,
    data: CreateMaterialIssueDto
  ): Promise<MaterialIssueWithRelations> {
    const issueDate = data.issueDate ? new Date(data.issueDate) : new Date();

    const created = await this.prisma.materialIssue.create({
      data: {
        tenantId,
        projectId: data.projectId,
        storeId: data.storeId,
        issueNumber,
        status: 'DRAFT',
        issueDate,
        purpose: data.purpose || null,
        remarks: data.remarks || null,
        requestedById,
        lines: {
          createMany: {
            data: data.lines.map((line) => ({
              tenantId,
              materialId: line.materialId,
              quantityRequested: new Prisma.Decimal(line.quantityRequested),
              quantityIssued: new Prisma.Decimal(line.quantityIssued ?? 0),
              uom: line.uom,
              wbsNodeId: line.wbsNodeId || null,
              taskId: line.taskId || null,
              reservationLineId: line.reservationLineId || null,
              remarks: line.remarks || null,
            })),
          },
        },
      },
      include: this.includeRelations,
    });

    return created as unknown as MaterialIssueWithRelations;
  }

  public async update(
    tenantId: string,
    id: string,
    data: UpdateMaterialIssueDto
  ): Promise<MaterialIssueWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const issue = await tx.materialIssue.findFirst({
        where: { id, tenantId },
      });

      if (!issue) {
        throw new NotFoundError(`Material issue with ID ${id} not found.`);
      }

      if (issue.status !== 'DRAFT') {
        throw new BadRequestError(
          `Cannot update material issue in status '${issue.status}'. Only DRAFT issues can be modified.`
        );
      }

      const updateData: Prisma.MaterialIssueUpdateInput = {};

      if (data.storeId) {
        updateData.store = { connect: { id: data.storeId } };
      }
      if (data.issueDate) {
        updateData.issueDate = new Date(data.issueDate);
      }
      if (data.purpose !== undefined) {
        updateData.purpose = data.purpose || null;
      }
      if (data.remarks !== undefined) {
        updateData.remarks = data.remarks || null;
      }

      if (data.lines && data.lines.length > 0) {
        await tx.materialIssueLine.deleteMany({
          where: { materialIssueId: id, tenantId },
        });

        await tx.materialIssueLine.createMany({
          data: data.lines.map((line) => ({
            tenantId,
            materialIssueId: id,
            materialId: line.materialId,
            quantityRequested: new Prisma.Decimal(line.quantityRequested),
            quantityIssued: new Prisma.Decimal(line.quantityIssued ?? 0),
            uom: line.uom,
            wbsNodeId: line.wbsNodeId || null,
            taskId: line.taskId || null,
            reservationLineId: line.reservationLineId || null,
            remarks: line.remarks || null,
          })),
        });
      }

      const updated = await tx.materialIssue.update({
        where: { id, tenantId },
        data: updateData,
        include: this.includeRelations,
      });

      return updated as unknown as MaterialIssueWithRelations;
    });
  }

  public async submit(
    tenantId: string,
    id: string,
    userId: string,
    remarks?: string | null
  ): Promise<MaterialIssueWithRelations> {
    const issue = await this.prisma.materialIssue.findFirst({
      where: { id, tenantId },
      include: { lines: true },
    });

    if (!issue) {
      throw new NotFoundError(`Material issue with ID ${id} not found.`);
    }

    if (issue.status !== 'DRAFT') {
      throw new BadRequestError(
        `Only DRAFT material issues can be submitted. Current status: ${issue.status}`
      );
    }

    if (!issue.lines || issue.lines.length === 0) {
      throw new BadRequestError('Material issue must contain at least one line item before submission.');
    }

    const updated = await this.prisma.materialIssue.update({
      where: { id, tenantId },
      data: {
        status: 'SUBMITTED',
        remarks: remarks || issue.remarks,
      },
      include: this.includeRelations,
    });

    return updated as unknown as MaterialIssueWithRelations;
  }

  public async approve(
    tenantId: string,
    id: string,
    userId: string,
    remarks?: string | null
  ): Promise<MaterialIssueWithRelations> {
    const issue = await this.prisma.materialIssue.findFirst({
      where: { id, tenantId },
    });

    if (!issue) {
      throw new NotFoundError(`Material issue with ID ${id} not found.`);
    }

    if (issue.status !== 'SUBMITTED') {
      throw new BadRequestError(
        `Only SUBMITTED material issues can be approved. Current status: ${issue.status}`
      );
    }

    if (issue.requestedById === userId) {
      throw new ForbiddenError(
        'Segregation of duties violation: Approver cannot be the requester of the material issue.'
      );
    }

    const updated = await this.prisma.materialIssue.update({
      where: { id, tenantId },
      data: {
        status: 'APPROVED',
        approvedById: userId,
        approvedAt: new Date(),
        remarks: remarks || issue.remarks,
      },
      include: this.includeRelations,
    });

    return updated as unknown as MaterialIssueWithRelations;
  }

  public async issue(
    tenantId: string,
    id: string,
    userId: string,
    issuedLines?: { lineId: string; quantityIssued: number }[],
    remarks?: string | null
  ): Promise<MaterialIssueWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock MaterialIssue row FOR UPDATE
      const issueRows = await tx.$queryRawUnsafe<
        Array<{
          id: string;
          tenant_id: string;
          status: string;
          project_id: string;
          store_id: string;
          requested_by_id: string;
          purpose: string | null;
          remarks: string | null;
        }>
      >(
        `SELECT id, tenant_id, status, project_id, store_id, requested_by_id, purpose, remarks
         FROM material_issues
         WHERE id = $1::uuid AND tenant_id = $2::uuid
         FOR UPDATE`,
        id,
        tenantId
      );

      if (!issueRows || issueRows.length === 0) {
        throw new NotFoundError(`Material issue with ID ${id} not found.`);
      }
      const issue = issueRows[0];

      if (issue.status === 'ISSUED') {
        // Idempotent re-query return
        return (await tx.materialIssue.findUnique({
          where: { id, tenantId },
          include: this.includeRelations,
        })) as unknown as MaterialIssueWithRelations;
      }

      if (issue.status !== 'APPROVED' && issue.status !== 'SUBMITTED') {
        throw new BadRequestError(
          `Only APPROVED or SUBMITTED material issues can be issued. Current status: ${issue.status}`
        );
      }

      // 2. Segregation of Duties Check
      if (issue.requested_by_id === userId) {
        throw new ForbiddenError(
          'Segregation of duties violation: Issuer cannot be the requester of the material issue.'
        );
      }

      // 3. Fetch all lines for this issue
      const lines = await tx.materialIssueLine.findMany({
        where: { materialIssueId: id, tenantId },
      });

      if (lines.length === 0) {
        throw new BadRequestError('Material issue contains no line items to issue.');
      }

      // Map issued quantities
      const qtyMap = new Map<string, number>();
      if (issuedLines && issuedLines.length > 0) {
        for (const il of issuedLines) {
          qtyMap.set(il.lineId, il.quantityIssued);
        }
      }

      // 4. Deterministic Deadlock Prevention: Sort lines by materialId ASC
      const sortedLines = [...lines].sort((a, b) =>
        a.materialId.localeCompare(b.materialId)
      );

      // Track modified reservations to update their statuses
      const affectedReservationIds = new Set<string>();

      // 5. Process each line under row lock
      for (const line of sortedLines) {
        const qtyToIssue = qtyMap.has(line.id)
          ? qtyMap.get(line.id)!
          : Number(line.quantityRequested);

        if (qtyToIssue <= 0) {
          throw new BadRequestError(
            `Issued quantity for line ${line.id} must be strictly greater than 0.`
          );
        }

        // Lock and Ensure StoreStockBalance row exists
        await tx.$executeRaw`
          INSERT INTO "store_stock_balances" ("id", "tenant_id", "store_id", "material_id", "quantity_on_hand", "reserved_quantity", "created_at", "updated_at")
          VALUES (gen_random_uuid(), ${tenantId}::uuid, ${issue.store_id}::uuid, ${line.materialId}::uuid, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
          WHERE "store_id" = ${issue.store_id}::uuid AND "material_id" = ${line.materialId}::uuid
          FOR UPDATE;
        `;

        const currentOnHand = Number(balRows[0]?.quantity_on_hand ?? 0);
        const currentReserved = Number(balRows[0]?.reserved_quantity ?? 0);

        if (line.reservationLineId) {
          // ==========================================
          // RESERVATION FULFILLMENT PATH
          // ==========================================
          const resLine = await tx.inventoryReservationLine.findFirst({
            where: { id: line.reservationLineId, tenantId },
          });

          if (!resLine) {
            throw new NotFoundError(
              `Referenced reservation line ${line.reservationLineId} not found.`
            );
          }

          const reservation = await tx.inventoryReservation.findFirst({
            where: { id: resLine.reservationId, tenantId },
          });

          if (!reservation) {
            throw new NotFoundError(
              `Referenced inventory reservation ${resLine.reservationId} not found.`
            );
          }

          if (
            reservation.status !== 'ACTIVE' &&
            reservation.status !== 'PARTIALLY_FULFILLED'
          ) {
            throw new BadRequestError(
              `Cannot issue against reservation in status '${reservation.status}'. Only ACTIVE or PARTIALLY_FULFILLED reservations can be fulfilled.`
            );
          }

          if (reservation.storeId !== issue.store_id) {
            throw new BadRequestError(
              `Reservation store (${reservation.storeId}) does not match issue store (${issue.store_id}).`
            );
          }

          if (reservation.projectId !== issue.project_id) {
            throw new BadRequestError(
              `Reservation project (${reservation.projectId}) does not match issue project (${issue.project_id}).`
            );
          }

          if (resLine.materialId !== line.materialId) {
            throw new BadRequestError(
              `Material mismatch: reservation line is for ${resLine.materialId}, issue line is for ${line.materialId}.`
            );
          }

          const reservedTotal = Number(resLine.quantityReserved);
          const fulfilledPrev = Number(resLine.quantityFulfilled);
          const releasedPrev = Number(resLine.quantityReleased);
          const remainingReserved = reservedTotal - fulfilledPrev - releasedPrev;

          if (qtyToIssue > remainingReserved + 0.0001) {
            throw new BadRequestError(
              `Issued quantity (${qtyToIssue}) exceeds remaining reserved quantity (${remainingReserved}) on reservation line ${line.reservationLineId}.`
            );
          }

          if (qtyToIssue > currentOnHand + 0.0001) {
            throw new BadRequestError(
              `Insufficient physical stock on hand for material ${line.materialId}. On-hand: ${currentOnHand}, Requested: ${qtyToIssue}.`
            );
          }

          // Fetch material unit rate
          const material = await tx.material.findUnique({
            where: { id: line.materialId },
            select: { standardRate: true },
          });
          const unitRate = material ? Number(material.standardRate) : 0;
          const idempotencyKey = `MI-${id}-${line.id}`;

          const existingMovement = await tx.stockMovement.findUnique({
            where: {
              tenantId_idempotencyKey: {
                tenantId,
                idempotencyKey,
              },
            },
          });

          if (!existingMovement) {
            // Create StockMovement.ISSUE
            await tx.stockMovement.create({
              data: {
                tenantId,
                storeId: issue.store_id,
                materialId: line.materialId,
                movementType: 'ISSUE',
                quantity: new Prisma.Decimal(qtyToIssue),
                uom: line.uom,
                unitRate: new Prisma.Decimal(unitRate),
                referenceType: 'MATERIAL_ISSUE',
                referenceId: id,
                reason:
                  line.remarks ||
                  issue.purpose ||
                  `Material issue fulfilling reservation ${reservation.reservationNumber}`,
                performedById: userId,
                idempotencyKey,
                occurredAt: new Date(),
              },
            });

            // Decrement BOTH quantityOnHand and reservedQuantity
            const newOnHand = currentOnHand - qtyToIssue;
            const newReserved = Math.max(0, currentReserved - qtyToIssue);
            await tx.storeStockBalance.update({
              where: { id: balRows[0].id },
              data: {
                quantityOnHand: new Prisma.Decimal(newOnHand),
                reservedQuantity: new Prisma.Decimal(newReserved),
              },
            });

            // Update Issue Line quantityIssued
            await tx.materialIssueLine.update({
              where: { id: line.id },
              data: { quantityIssued: new Prisma.Decimal(qtyToIssue) },
            });

            // Update Reservation Line quantityFulfilled
            await tx.inventoryReservationLine.update({
              where: { id: resLine.id },
              data: {
                quantityFulfilled: new Prisma.Decimal(
                  fulfilledPrev + qtyToIssue
                ),
              },
            });

            affectedReservationIds.add(reservation.id);
          }
        } else {
          // ==========================================
          // UNRESERVED DIRECT ISSUE PATH
          // ==========================================
          const availableQuantity = currentOnHand - currentReserved;

          if (qtyToIssue > availableQuantity + 0.0001) {
            throw new BadRequestError(
              `Insufficient stock for material ${line.materialId} in store ${issue.store_id}. Available: ${availableQuantity}, Requested to issue: ${qtyToIssue}.`
            );
          }

          // Fetch material unit rate
          const material = await tx.material.findUnique({
            where: { id: line.materialId },
            select: { standardRate: true },
          });
          const unitRate = material ? Number(material.standardRate) : 0;
          const idempotencyKey = `MI-${id}-${line.id}`;

          const existingMovement = await tx.stockMovement.findUnique({
            where: {
              tenantId_idempotencyKey: {
                tenantId,
                idempotencyKey,
              },
            },
          });

          if (!existingMovement) {
            // Create StockMovement.ISSUE
            await tx.stockMovement.create({
              data: {
                tenantId,
                storeId: issue.store_id,
                materialId: line.materialId,
                movementType: 'ISSUE',
                quantity: new Prisma.Decimal(qtyToIssue),
                uom: line.uom,
                unitRate: new Prisma.Decimal(unitRate),
                referenceType: 'MATERIAL_ISSUE',
                referenceId: id,
                reason:
                  line.remarks ||
                  issue.purpose ||
                  'Material issue for project consumption',
                performedById: userId,
                idempotencyKey,
                occurredAt: new Date(),
              },
            });

            // Decrement StoreStockBalance quantityOnHand ONLY (reservedQuantity unchanged)
            const newOnHand = currentOnHand - qtyToIssue;
            await tx.storeStockBalance.update({
              where: { id: balRows[0].id },
              data: { quantityOnHand: new Prisma.Decimal(newOnHand) },
            });

            // Update Line quantityIssued
            await tx.materialIssueLine.update({
              where: { id: line.id },
              data: { quantityIssued: new Prisma.Decimal(qtyToIssue) },
            });
          }
        }
      }

      // 6. Update statuses of all affected reservations
      for (const resId of affectedReservationIds) {
        const resLines = await tx.inventoryReservationLine.findMany({
          where: { reservationId: resId, tenantId },
        });

        const allFulfilledOrReleased = resLines.every((rl) => {
          const res = Number(rl.quantityReserved);
          const ful = Number(rl.quantityFulfilled);
          const rel = Number(rl.quantityReleased);
          return ful + rel >= res - 0.0001;
        });

        const newStatus = allFulfilledOrReleased
          ? 'FULFILLED'
          : 'PARTIALLY_FULFILLED';

        await tx.inventoryReservation.update({
          where: { id: resId, tenantId },
          data: { status: newStatus },
        });
      }

      // 7. Transition MaterialIssue to ISSUED
      const updatedIssue = await tx.materialIssue.update({
        where: { id, tenantId },
        data: {
          status: 'ISSUED',
          issuedById: userId,
          issuedAt: new Date(),
          remarks: remarks || issue.remarks,
        },
        include: this.includeRelations,
      });

      return updatedIssue as unknown as MaterialIssueWithRelations;
    });
  }

  public async cancel(
    tenantId: string,
    id: string,
    userId: string,
    cancellationReason?: string | null
  ): Promise<MaterialIssueWithRelations> {
    const issue = await this.prisma.materialIssue.findFirst({
      where: { id, tenantId },
    });

    if (!issue) {
      throw new NotFoundError(`Material issue with ID ${id} not found.`);
    }

    if (issue.status === 'ISSUED') {
      throw new BadRequestError('Cannot cancel an already ISSUED material issue.');
    }

    if (issue.status === 'CANCELLED') {
      throw new BadRequestError('Material issue is already CANCELLED.');
    }

    const updated = await this.prisma.materialIssue.update({
      where: { id, tenantId },
      data: {
        status: 'CANCELLED',
        cancelledById: userId,
        cancelledAt: new Date(),
        cancellationReason: cancellationReason || null,
      },
      include: this.includeRelations,
    });

    return updated as unknown as MaterialIssueWithRelations;
  }

  public async delete(tenantId: string, id: string): Promise<void> {
    const issue = await this.prisma.materialIssue.findFirst({
      where: { id, tenantId },
    });

    if (!issue) {
      throw new NotFoundError(`Material issue with ID ${id} not found.`);
    }

    if (issue.status !== 'DRAFT') {
      throw new BadRequestError(
        `Cannot delete material issue in status '${issue.status}'. Only DRAFT issues can be deleted.`
      );
    }

    await this.prisma.materialIssue.delete({
      where: { id, tenantId },
    });
  }
}
