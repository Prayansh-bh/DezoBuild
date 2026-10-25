import { PrismaClient, Prisma } from '@prisma/client';
import { DatabaseService } from '../../../database/database.service';
import type {
  IMaterialIndentRepository,
  MaterialIndentWithRelations,
} from './material-indent.repository.interface';
import type {
  CreateMaterialIndentDto,
  UpdateMaterialIndentDto,
  ListMaterialIndentQueryDto,
} from '../dto/material-indent.dto';

export class PrismaMaterialIndentRepository implements IMaterialIndentRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || DatabaseService.getInstance().getClient();
  }

  private get includeRelations() {
    return {
      lines: {
        include: {
          material: true,
        },
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
    } as const;
  }

  public async findById(
    tenantId: string,
    id: string,
    projectId?: string
  ): Promise<MaterialIndentWithRelations | null> {
    const where: Prisma.MaterialIndentWhereInput = {
      id,
      tenantId,
    };
    if (projectId) {
      where.projectId = projectId;
    }

    return this.prisma.materialIndent.findFirst({
      where,
      include: this.includeRelations,
    }) as unknown as Promise<MaterialIndentWithRelations | null>;
  }

  public async findByIndentNumber(
    tenantId: string,
    indentNumber: string
  ): Promise<MaterialIndentWithRelations | null> {
    return this.prisma.materialIndent.findFirst({
      where: {
        tenantId,
        indentNumber,
      },
      include: this.includeRelations,
    }) as unknown as Promise<MaterialIndentWithRelations | null>;
  }

  public async findMany(
    tenantId: string,
    allowedProjectIds?: string[],
    filter?: ListMaterialIndentQueryDto
  ): Promise<{ items: MaterialIndentWithRelations[]; total: number }> {
    const where: Prisma.MaterialIndentWhereInput = {
      tenantId,
    };

    if (allowedProjectIds && allowedProjectIds.length > 0) {
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

    if (filter?.priority) {
      where.priority = filter.priority;
    }

    if (filter?.startDate || filter?.endDate) {
      where.requiredByDate = {};
      if (filter.startDate) {
        where.requiredByDate.gte = new Date(filter.startDate);
      }
      if (filter.endDate) {
        where.requiredByDate.lte = new Date(filter.endDate);
      }
    }

    if (filter?.search) {
      const s = filter.search.trim();
      where.OR = [
        { indentNumber: { contains: s, mode: 'insensitive' } },
        { remarks: { contains: s, mode: 'insensitive' } },
      ];
    }

    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.materialIndent.findMany({
        where,
        include: this.includeRelations,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.materialIndent.count({ where }),
    ]);

    return { items: items as unknown as MaterialIndentWithRelations[], total };
  }

  public async allocateIndentNumber(
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
      INSERT INTO "material_indent_sequences" ("id", "tenant_id", "project_id", "sequence_date", "last_sequence", "updated_at")
      VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, 1, NOW())
      ON CONFLICT ("tenant_id", "project_id", "sequence_date")
      DO UPDATE SET "last_sequence" = "material_indent_sequences"."last_sequence" + 1, "updated_at" = NOW()
      RETURNING "last_sequence";
      `,
      tenantId,
      projectId,
      sequenceDate
    );

    const seq = rows[0]?.last_sequence ?? 1;
    const paddedSeq = String(seq).padStart(4, '0');
    return `IND-${projectCode}-${sequenceDate}-${paddedSeq}`;
  }

  public async create(
    tenantId: string,
    projectId: string,
    userId: string,
    indentNumber: string,
    data: CreateMaterialIndentDto
  ): Promise<MaterialIndentWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const indent = await tx.materialIndent.create({
        data: {
          tenantId,
          projectId,
          storeId: data.storeId || null,
          indentNumber,
          status: 'DRAFT',
          priority: data.priority || 'NORMAL',
          requiredByDate: new Date(data.requiredByDate),
          remarks: data.remarks || null,
          createdById: userId,
          lines: {
            create: data.lines.map((l) => ({
              tenantId,
              materialId: l.materialId,
              quantityRequested: new Prisma.Decimal(l.quantityRequested),
              quantityFulfilled: new Prisma.Decimal(0),
              uom: l.uom,
              purpose: l.purpose || null,
              wbsNodeId: l.wbsNodeId || null,
              taskId: l.taskId || null,
              remarks: l.remarks || null,
            })),
          },
        },
        include: this.includeRelations,
      });

      return indent as unknown as MaterialIndentWithRelations;
    });
  }

  public async update(
    tenantId: string,
    id: string,
    data: UpdateMaterialIndentDto
  ): Promise<MaterialIndentWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.MaterialIndentUpdateInput = {};

      if (data.storeId !== undefined) {
        updateData.store = data.storeId ? { connect: { id: data.storeId } } : { disconnect: true };
      }
      if (data.requiredByDate) {
        updateData.requiredByDate = new Date(data.requiredByDate);
      }
      if (data.priority) {
        updateData.priority = data.priority;
      }
      if (data.remarks !== undefined) {
        updateData.remarks = data.remarks;
      }

      if (data.lines && data.lines.length > 0) {
        // Replace existing lines
        await tx.materialIndentLine.deleteMany({
          where: { indentId: id, tenantId },
        });

        await tx.materialIndentLine.createMany({
          data: data.lines.map((l) => ({
            tenantId,
            indentId: id,
            materialId: l.materialId,
            quantityRequested: new Prisma.Decimal(l.quantityRequested),
            quantityFulfilled: new Prisma.Decimal(0),
            uom: l.uom,
            purpose: l.purpose || null,
            wbsNodeId: l.wbsNodeId || null,
            taskId: l.taskId || null,
            remarks: l.remarks || null,
          })),
        });
      }

      const updated = await tx.materialIndent.update({
        where: { id },
        data: updateData,
        include: this.includeRelations,
      });

      return updated as unknown as MaterialIndentWithRelations;
    });
  }

  public async submit(
    tenantId: string,
    id: string,
    userId: string
  ): Promise<MaterialIndentWithRelations> {
    return this.prisma.materialIndent.update({
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
    }) as unknown as Promise<MaterialIndentWithRelations>;
  }

  public async approve(
    tenantId: string,
    id: string,
    userId: string,
    approvalRemarks?: string | null
  ): Promise<MaterialIndentWithRelations> {
    return this.prisma.materialIndent.update({
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
    }) as unknown as Promise<MaterialIndentWithRelations>;
  }

  public async reject(
    tenantId: string,
    id: string,
    userId: string,
    rejectionReason: string
  ): Promise<MaterialIndentWithRelations> {
    return this.prisma.materialIndent.update({
      where: { id, tenantId },
      data: {
        status: 'REJECTED',
        rejectedById: userId,
        rejectedAt: new Date(),
        rejectionReason,
        approvedById: null,
        approvedAt: null,
        approvalRemarks: null,
      },
      include: this.includeRelations,
    }) as unknown as Promise<MaterialIndentWithRelations>;
  }

  public async cancel(
    tenantId: string,
    id: string,
    userId: string,
    cancellationReason?: string | null
  ): Promise<MaterialIndentWithRelations> {
    return this.prisma.materialIndent.update({
      where: { id, tenantId },
      data: {
        status: 'CANCELLED',
        cancelledById: userId,
        cancelledAt: new Date(),
        cancellationReason: cancellationReason || null,
      },
      include: this.includeRelations,
    }) as unknown as Promise<MaterialIndentWithRelations>;
  }

  public async delete(tenantId: string, id: string): Promise<void> {
    await this.prisma.materialIndent.delete({
      where: { id, tenantId },
    });
  }
}
