import { Prisma, type PrismaClient } from '@prisma/client';
import { DatabaseService } from '../../../database/database.service';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../../common/errors';
import type {
  IMaterialReturnRepository,
  MaterialReturnWithRelations,
} from './material-return.repository.interface';
import type {
  CreateMaterialReturnDto,
  UpdateMaterialReturnDto,
  ListMaterialReturnsQueryDto,
} from '../dto/material-return.dto';

export class PrismaMaterialReturnRepository implements IMaterialReturnRepository {
  private static instance: PrismaMaterialReturnRepository;
  private readonly prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || DatabaseService.getInstance().getClient();
  }

  public static getInstance(): PrismaMaterialReturnRepository {
    if (!PrismaMaterialReturnRepository.instance) {
      PrismaMaterialReturnRepository.instance = new PrismaMaterialReturnRepository();
    }
    return PrismaMaterialReturnRepository.instance;
  }

  private get includeRelations() {
    return {
      lines: {
        include: {
          material: true,
          materialIssueLine: {
            select: {
              id: true,
              materialId: true,
              quantityRequested: true,
              quantityIssued: true,
              uom: true,
              wbsNodeId: true,
              taskId: true,
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
      materialIssue: {
        select: {
          id: true,
          issueNumber: true,
          status: true,
          issueDate: true,
          storeId: true,
          projectId: true,
        },
      },
      returnedBy: {
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
    } as const;
  }

  public async findById(
    tenantId: string,
    id: string,
    projectId?: string
  ): Promise<MaterialReturnWithRelations | null> {
    const where: Prisma.MaterialReturnWhereInput = {
      id,
      tenantId,
    };
    if (projectId) {
      where.projectId = projectId;
    }

    return this.prisma.materialReturn.findFirst({
      where,
      include: this.includeRelations,
    }) as unknown as Promise<MaterialReturnWithRelations | null>;
  }

  public async findByReturnNumber(
    tenantId: string,
    returnNumber: string
  ): Promise<MaterialReturnWithRelations | null> {
    return this.prisma.materialReturn.findFirst({
      where: {
        tenantId,
        returnNumber,
      },
      include: this.includeRelations,
    }) as unknown as Promise<MaterialReturnWithRelations | null>;
  }

  public async findMany(
    tenantId: string,
    allowedProjectIds?: string[],
    filter?: ListMaterialReturnsQueryDto
  ): Promise<{ items: MaterialReturnWithRelations[]; total: number }> {
    const where: Prisma.MaterialReturnWhereInput = {
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

    if (filter?.materialIssueId) {
      where.materialIssueId = filter.materialIssueId;
    }

    if (filter?.status) {
      where.status = filter.status;
    }

    if (filter?.returnedById) {
      where.returnedById = filter.returnedById;
    }

    if (filter?.startDate || filter?.endDate) {
      where.returnDate = {};
      if (filter.startDate) {
        where.returnDate.gte = new Date(filter.startDate);
      }
      if (filter.endDate) {
        where.returnDate.lte = new Date(filter.endDate);
      }
    }

    if (filter?.search) {
      const s = filter.search.trim();
      where.OR = [
        { returnNumber: { contains: s, mode: 'insensitive' } },
        { remarks: { contains: s, mode: 'insensitive' } },
        { rejectionReason: { contains: s, mode: 'insensitive' } },
        { cancellationReason: { contains: s, mode: 'insensitive' } },
      ];
    }

    const page = Math.max(1, filter?.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter?.limit ?? 50));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.materialReturn.findMany({
        where,
        include: this.includeRelations,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.materialReturn.count({ where }),
    ]);

    return {
      items: items as unknown as MaterialReturnWithRelations[],
      total,
    };
  }

  public async allocateReturnNumber(
    tenantId: string,
    projectId: string,
    projectCode: string,
    date?: Date
  ): Promise<string> {
    const d = date || new Date();
    const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
    const cleanProjectCode = projectCode
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '');

    const rows = await this.prisma.$queryRaw<Array<{ last_sequence: number }>>`
      INSERT INTO "material_return_sequences" ("id", "tenant_id", "project_id", "sequence_date", "last_sequence", "updated_at")
      VALUES (gen_random_uuid(), ${tenantId}::uuid, ${projectId}::uuid, ${dateStr}, 1, CURRENT_TIMESTAMP)
      ON CONFLICT ("tenant_id", "project_id", "sequence_date")
      DO UPDATE SET "last_sequence" = "material_return_sequences"."last_sequence" + 1, "updated_at" = CURRENT_TIMESTAMP
      RETURNING "last_sequence";
    `;

    const nextSeq = rows[0]?.last_sequence ?? 1;
    const seqStr = String(nextSeq).padStart(4, '0');

    return `MR-${cleanProjectCode}-${dateStr}-${seqStr}`;
  }

  public async create(
    tenantId: string,
    returnedById: string,
    returnNumber: string,
    data: CreateMaterialReturnDto,
    linesData: Array<{
      materialIssueLineId: string;
      materialId: string;
      quantityReturned: number;
      uom: string;
      condition?: string;
      remarks?: string | null;
    }>
  ): Promise<MaterialReturnWithRelations> {
    const returnDate = data.returnDate ? new Date(data.returnDate) : new Date();

    const created = await this.prisma.materialReturn.create({
      data: {
        tenantId,
        projectId: data.projectId,
        storeId: data.storeId,
        materialIssueId: data.materialIssueId,
        returnNumber,
        status: 'DRAFT',
        returnDate,
        returnedById,
        remarks: data.remarks || null,
        lines: {
          create: linesData.map((line) => ({
            tenantId,
            materialIssueLineId: line.materialIssueLineId,
            materialId: line.materialId,
            quantityReturned: new Prisma.Decimal(line.quantityReturned),
            uom: line.uom,
            condition: line.condition || 'GOOD',
            remarks: line.remarks || null,
          })),
        },
      },
      include: this.includeRelations,
    });

    return created as unknown as MaterialReturnWithRelations;
  }

  public async update(
    tenantId: string,
    id: string,
    data: UpdateMaterialReturnDto,
    linesData?: Array<{
      materialIssueLineId: string;
      materialId: string;
      quantityReturned: number;
      uom: string;
      condition?: string;
      remarks?: string | null;
    }>
  ): Promise<MaterialReturnWithRelations> {
    const existing = await this.prisma.materialReturn.findFirst({
      where: { id, tenantId },
      include: { lines: true },
    });

    if (!existing) {
      throw new NotFoundError(`Material return with ID ${id} not found.`);
    }

    if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
      throw new BadRequestError(
        `Cannot update material return in status '${existing.status}'. Only DRAFT or REJECTED returns can be updated.`
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (linesData && linesData.length > 0) {
        await tx.materialReturnLine.deleteMany({
          where: { materialReturnId: id, tenantId },
        });

        await tx.materialReturnLine.createMany({
          data: linesData.map((line) => ({
            tenantId,
            materialReturnId: id,
            materialIssueLineId: line.materialIssueLineId,
            materialId: line.materialId,
            quantityReturned: new Prisma.Decimal(line.quantityReturned),
            uom: line.uom,
            condition: line.condition || 'GOOD',
            remarks: line.remarks || null,
          })),
        });
      }

      const updateData: Prisma.MaterialReturnUpdateInput = {};

      if (data.storeId !== undefined) {
        updateData.store = { connect: { id: data.storeId } };
      }
      if (data.returnDate !== undefined) {
        updateData.returnDate = data.returnDate ? new Date(data.returnDate) : new Date();
      }
      if (data.remarks !== undefined) {
        updateData.remarks = data.remarks;
      }

      const updated = await tx.materialReturn.update({
        where: { id, tenantId },
        data: updateData,
        include: this.includeRelations,
      });

      return updated as unknown as MaterialReturnWithRelations;
    });
  }

  public async submit(
    tenantId: string,
    id: string,
    userId: string,
    remarks?: string | null
  ): Promise<MaterialReturnWithRelations> {
    const existing = await this.prisma.materialReturn.findFirst({
      where: { id, tenantId },
      include: { lines: true },
    });

    if (!existing) {
      throw new NotFoundError(`Material return with ID ${id} not found.`);
    }

    if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
      throw new BadRequestError(
        `Only DRAFT or REJECTED material returns can be submitted. Current status: ${existing.status}`
      );
    }

    if (!existing.lines || existing.lines.length === 0) {
      throw new BadRequestError('Cannot submit a material return with no line items.');
    }

    const updated = await this.prisma.materialReturn.update({
      where: { id, tenantId },
      data: {
        status: 'SUBMITTED',
        returnedById: userId,
        remarks: remarks || existing.remarks,
        rejectionReason: null,
      },
      include: this.includeRelations,
    });

    return updated as unknown as MaterialReturnWithRelations;
  }

  public async verify(
    tenantId: string,
    id: string,
    userId: string,
    remarks?: string | null
  ): Promise<MaterialReturnWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock MaterialReturn row FOR UPDATE
      const returnRows = await tx.$queryRawUnsafe<
        Array<{
          id: string;
          tenant_id: string;
          status: string;
          project_id: string;
          store_id: string;
          material_issue_id: string;
          returned_by_id: string;
          remarks: string | null;
        }>
      >(
        `SELECT id, tenant_id, status, project_id, store_id, material_issue_id, returned_by_id, remarks
         FROM material_returns
         WHERE id = $1::uuid AND tenant_id = $2::uuid
         FOR UPDATE`,
        id,
        tenantId
      );

      if (!returnRows || returnRows.length === 0) {
        throw new NotFoundError(`Material return with ID ${id} not found.`);
      }
      const ret = returnRows[0];

      if (ret.status === 'VERIFIED') {
        // Idempotent re-query return
        return (await tx.materialReturn.findUnique({
          where: { id, tenantId },
          include: this.includeRelations,
        })) as unknown as MaterialReturnWithRelations;
      }

      if (ret.status !== 'SUBMITTED') {
        throw new BadRequestError(
          `Only SUBMITTED material returns can be verified. Current status: ${ret.status}`
        );
      }

      // 2. Segregation of Duties Check
      if (ret.returned_by_id === userId) {
        throw new ForbiddenError(
          'Segregation of duties violation: Verifier cannot be the return submitter.'
        );
      }

      // 3. Fetch all lines for this return
      const lines = await tx.materialReturnLine.findMany({
        where: { materialReturnId: id, tenantId },
      });

      if (lines.length === 0) {
        throw new BadRequestError('Material return contains no line items to verify.');
      }

      // 4. Deterministic Deadlock Prevention: Sort lines by materialIssueLineId ASC
      const sortedLines = [...lines].sort((a, b) =>
        a.materialIssueLineId.localeCompare(b.materialIssueLineId)
      );

      // 5. Process each return line under source issue line lock
      for (const line of sortedLines) {
        const qtyToReturn = Number(line.quantityReturned);
        if (qtyToReturn <= 0) {
          throw new BadRequestError(
            `Returned quantity for line ${line.id} must be strictly greater than 0.`
          );
        }

        // Lock source MaterialIssueLine FOR UPDATE
        const issueLineRows = await tx.$queryRawUnsafe<
          Array<{
            id: string;
            tenant_id: string;
            material_issue_id: string;
            material_id: string;
            quantity_issued: string | number;
            uom: string;
          }>
        >(
          `SELECT id, tenant_id, material_issue_id, material_id, quantity_issued, uom
           FROM material_issue_lines
           WHERE id = $1::uuid AND tenant_id = $2::uuid
           FOR UPDATE`,
          line.materialIssueLineId,
          tenantId
        );

        if (!issueLineRows || issueLineRows.length === 0) {
          throw new NotFoundError(
            `Source material issue line ${line.materialIssueLineId} not found.`
          );
        }

        const issueLine = issueLineRows[0];

        if (issueLine.material_issue_id !== ret.material_issue_id) {
          throw new BadRequestError(
            `Return line references issue line ${line.materialIssueLineId} which does not belong to material issue ${ret.material_issue_id}.`
          );
        }

        if (issueLine.material_id !== line.materialId) {
          throw new BadRequestError(
            `Material mismatch on return line: expected ${issueLine.material_id}, got ${line.materialId}`
          );
        }

        if (issueLine.uom !== line.uom) {
          throw new BadRequestError(
            `UOM mismatch on return line: expected ${issueLine.uom}, got ${line.uom}`
          );
        }

        // Calculate verified return quantity for this source issue line under lock
        const prevReturnsRows = await tx.$queryRawUnsafe<
          Array<{
            total_verified_returned: string | number;
          }>
        >(
          `SELECT COALESCE(SUM(mrl.quantity_returned), 0) AS total_verified_returned
           FROM material_return_lines mrl
           JOIN material_returns mr ON mr.id = mrl.material_return_id
           WHERE mr.tenant_id = $1::uuid
             AND mr.status = 'VERIFIED'
             AND mrl.material_issue_line_id = $2::uuid
             AND mr.id != $3::uuid`,
          tenantId,
          line.materialIssueLineId,
          id
        );

        const previouslyVerifiedQty = Number(
          prevReturnsRows[0]?.total_verified_returned ?? 0
        );
        const issuedQty = Number(issueLine.quantity_issued);
        const returnableQuantity = issuedQty - previouslyVerifiedQty;

        if (qtyToReturn > returnableQuantity + 0.0001) {
          throw new BadRequestError(
            `Over-return rejected: Returned quantity (${qtyToReturn}) exceeds returnable quantity (${returnableQuantity}) for issue line ${line.materialIssueLineId}. Issued: ${issuedQty}, Previously returned: ${previouslyVerifiedQty}.`
          );
        }

        // 6. Physical Stock Mutation ONLY for GOOD condition
        if (line.condition === 'GOOD') {
          // Lock and Ensure StoreStockBalance row exists
          await tx.$executeRaw`
            INSERT INTO "store_stock_balances" ("id", "tenant_id", "store_id", "material_id", "quantity_on_hand", "reserved_quantity", "created_at", "updated_at")
            VALUES (gen_random_uuid(), ${tenantId}::uuid, ${ret.store_id}::uuid, ${line.materialId}::uuid, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
            WHERE "store_id" = ${ret.store_id}::uuid AND "material_id" = ${line.materialId}::uuid
            FOR UPDATE;
          `;

          const currentOnHand = Number(balRows[0]?.quantity_on_hand ?? 0);

          // Fetch unit rate snapshot from original issue movement or material standardRate
          const origMovement = await tx.stockMovement.findFirst({
            where: {
              tenantId,
              referenceType: 'MATERIAL_ISSUE',
              referenceId: ret.material_issue_id,
              materialId: line.materialId,
            },
            select: { unitRate: true },
          });

          let unitRate = origMovement?.unitRate ? Number(origMovement.unitRate) : 0;
          if (unitRate === 0) {
            const material = await tx.material.findUnique({
              where: { id: line.materialId },
              select: { standardRate: true },
            });
            unitRate = material ? Number(material.standardRate) : 0;
          }

          const idempotencyKey = `MR-${id}-${line.id}`;

          const existingMovement = await tx.stockMovement.findUnique({
            where: {
              tenantId_idempotencyKey: {
                tenantId,
                idempotencyKey,
              },
            },
          });

          if (!existingMovement) {
            // Create StockMovement.RETURN
            await tx.stockMovement.create({
              data: {
                tenantId,
                storeId: ret.store_id,
                materialId: line.materialId,
                movementType: 'RETURN',
                quantity: new Prisma.Decimal(qtyToReturn),
                uom: line.uom,
                unitRate: new Prisma.Decimal(unitRate),
                referenceType: 'MATERIAL_RETURN',
                referenceId: id,
                reason:
                  line.remarks ||
                  ret.remarks ||
                  'Material return to store (good condition)',
                performedById: userId,
                idempotencyKey,
                occurredAt: new Date(),
              },
            });

            // Increment StoreStockBalance
            const newOnHand = currentOnHand + qtyToReturn;
            await tx.storeStockBalance.update({
              where: { id: balRows[0].id },
              data: { quantityOnHand: new Prisma.Decimal(newOnHand) },
            });
          }
        }
        // If DAMAGED, DEFECTIVE, or UNUSABLE: no stock movement and no StoreStockBalance increment
      }

      // 7. Transition MaterialReturn to VERIFIED
      const updatedReturn = await tx.materialReturn.update({
        where: { id, tenantId },
        data: {
          status: 'VERIFIED',
          verifiedById: userId,
          verifiedAt: new Date(),
          remarks: remarks || ret.remarks,
        },
        include: this.includeRelations,
      });

      return updatedReturn as unknown as MaterialReturnWithRelations;
    });
  }

  public async reject(
    tenantId: string,
    id: string,
    userId: string,
    rejectionReason: string
  ): Promise<MaterialReturnWithRelations> {
    const existing = await this.prisma.materialReturn.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundError(`Material return with ID ${id} not found.`);
    }

    if (existing.status !== 'SUBMITTED') {
      throw new BadRequestError(
        `Only SUBMITTED material returns can be rejected. Current status: ${existing.status}`
      );
    }

    const updated = await this.prisma.materialReturn.update({
      where: { id, tenantId },
      data: {
        status: 'REJECTED',
        verifiedById: userId,
        verifiedAt: new Date(),
        rejectionReason,
      },
      include: this.includeRelations,
    });

    return updated as unknown as MaterialReturnWithRelations;
  }

  public async cancel(
    tenantId: string,
    id: string,
    userId: string,
    cancellationReason?: string | null
  ): Promise<MaterialReturnWithRelations> {
    const existing = await this.prisma.materialReturn.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundError(`Material return with ID ${id} not found.`);
    }

    if (existing.status === 'VERIFIED') {
      throw new BadRequestError('Cannot cancel an already VERIFIED material return.');
    }

    if (existing.status === 'CANCELLED') {
      throw new BadRequestError('Material return is already CANCELLED.');
    }

    const updated = await this.prisma.materialReturn.update({
      where: { id, tenantId },
      data: {
        status: 'CANCELLED',
        cancellationReason: cancellationReason || null,
      },
      include: this.includeRelations,
    });

    return updated as unknown as MaterialReturnWithRelations;
  }

  public async delete(tenantId: string, id: string): Promise<void> {
    const existing = await this.prisma.materialReturn.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundError(`Material return with ID ${id} not found.`);
    }

    if (existing.status !== 'DRAFT') {
      throw new BadRequestError(
        `Cannot delete material return in status '${existing.status}'. Only DRAFT returns can be deleted.`
      );
    }

    await this.prisma.materialReturn.delete({
      where: { id, tenantId },
    });
  }
}
