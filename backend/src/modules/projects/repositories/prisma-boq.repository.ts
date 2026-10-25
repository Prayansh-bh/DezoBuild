import type { PrismaClient } from '@prisma/client';
import type {
  IBoqRepository,
  BoqItemEntity,
  CreateBoqItemParams,
  UpdateBoqItemParams,
  ListBoqFilterParams,
} from './boq.repository.interface';
import type { BoqStatus, BoqUom } from '../constants/boq.constants';
import { DatabaseService } from '../../../database/database.service';

export class PrismaBoqRepository implements IBoqRepository {
  private readonly prismaClient?: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prismaClient = prismaClient;
  }

  private get prisma(): any {
    return this.prismaClient || DatabaseService.getInstance().getClient();
  }

  async findById(tenantId: string, projectId: string, boqItemId: string): Promise<BoqItemEntity | null> {
    const record = await this.prisma.boqItem.findFirst({
      where: {
        id: boqItemId,
        projectId,
        tenantId,
      },
      include: {
        wbsNode: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        parent: {
          select: {
            id: true,
            itemNumber: true,
            description: true,
          },
        },
        _count: {
          select: {
            children: true,
            measurementRecords: true,
          },
        },
      },
    });

    return record ? this.mapBoqItem(record) : null;
  }

  async findByItemNumber(projectId: string, itemNumber: string): Promise<BoqItemEntity | null> {
    const record = await this.prisma.boqItem.findFirst({
      where: {
        projectId,
        itemNumber: { equals: itemNumber.trim(), mode: 'insensitive' },
      },
      include: {
        wbsNode: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        parent: {
          select: {
            id: true,
            itemNumber: true,
            description: true,
          },
        },
        _count: {
          select: {
            children: true,
            measurementRecords: true,
          },
        },
      },
    });

    return record ? this.mapBoqItem(record) : null;
  }

  async findAllByProject(
    tenantId: string,
    projectId: string,
    filters?: ListBoqFilterParams
  ): Promise<{ items: BoqItemEntity[]; total: number }> {
    const where: any = {
      tenantId,
      projectId,
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.wbsNodeId) {
      where.wbsNodeId = filters.wbsNodeId;
    }

    if (filters?.search) {
      where.OR = [
        { itemNumber: { contains: filters.search.trim(), mode: 'insensitive' } },
        { description: { contains: filters.search.trim(), mode: 'insensitive' } },
      ];
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [total, records] = await Promise.all([
      this.prisma.boqItem.count({ where }),
      this.prisma.boqItem.findMany({
        where,
        orderBy: [{ itemNumber: 'asc' }],
        skip,
        take: limit,
        include: {
          wbsNode: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          parent: {
            select: {
              id: true,
              itemNumber: true,
              description: true,
            },
          },
          _count: {
            select: {
              children: true,
              measurementRecords: true,
            },
          },
        },
      }),
    ]);

    return {
      items: records.map((r: any) => this.mapBoqItem(r)),
      total,
    };
  }

  async create(params: CreateBoqItemParams): Promise<BoqItemEntity> {
    const record = await this.prisma.boqItem.create({
      data: {
        id: params.id,
        tenantId: params.tenantId,
        projectId: params.projectId,
        wbsNodeId: params.wbsNodeId ?? null,
        parentId: params.parentId ?? null,
        itemNumber: params.itemNumber.trim(),
        description: params.description.trim(),
        specification: params.specification ?? null,
        uom: params.uom,
        quantity: params.quantity,
        unitRate: params.unitRate,
        totalAmount: params.totalAmount,
        executedQuantity: 0,
        status: 'ACTIVE',
        createdById: params.createdById,
      },
      include: {
        wbsNode: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        parent: {
          select: {
            id: true,
            itemNumber: true,
            description: true,
          },
        },
        _count: {
          select: {
            children: true,
            measurementRecords: true,
          },
        },
      },
    });

    return this.mapBoqItem(record);
  }

  async createBulk(
    tenantId: string,
    projectId: string,
    items: CreateBoqItemParams[]
  ): Promise<BoqItemEntity[]> {
    return this.prisma.$transaction(async (tx: any) => {
      const createdItems: BoqItemEntity[] = [];
      for (const item of items) {
        const record = await tx.boqItem.create({
          data: {
            id: item.id,
            tenantId,
            projectId,
            wbsNodeId: item.wbsNodeId ?? null,
            parentId: item.parentId ?? null,
            itemNumber: item.itemNumber.trim(),
            description: item.description.trim(),
            specification: item.specification ?? null,
            uom: item.uom,
            quantity: item.quantity,
            unitRate: item.unitRate,
            totalAmount: item.totalAmount,
            executedQuantity: 0,
            status: 'ACTIVE',
            createdById: item.createdById,
          },
          include: {
            wbsNode: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            parent: {
              select: {
                id: true,
                itemNumber: true,
                description: true,
              },
            },
            _count: {
              select: {
                children: true,
                measurementRecords: true,
              },
            },
          },
        });
        createdItems.push(this.mapBoqItem(record));
      }
      return createdItems;
    });
  }

  async update(
    tenantId: string,
    projectId: string,
    boqItemId: string,
    params: UpdateBoqItemParams
  ): Promise<BoqItemEntity> {
    const data: any = { updatedAt: new Date() };

    if (params.wbsNodeId !== undefined) data.wbsNodeId = params.wbsNodeId;
    if (params.parentId !== undefined) data.parentId = params.parentId;
    if (params.description !== undefined) data.description = params.description.trim();
    if (params.specification !== undefined) data.specification = params.specification;
    if (params.uom !== undefined) data.uom = params.uom;
    if (params.quantity !== undefined) data.quantity = params.quantity;
    if (params.unitRate !== undefined) data.unitRate = params.unitRate;
    if (params.totalAmount !== undefined) data.totalAmount = params.totalAmount;
    if (params.status !== undefined) data.status = params.status;

    const record = await this.prisma.boqItem.update({
      where: { id: boqItemId },
      data,
      include: {
        wbsNode: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        parent: {
          select: {
            id: true,
            itemNumber: true,
            description: true,
          },
        },
        _count: {
          select: {
            children: true,
            measurementRecords: true,
          },
        },
      },
    });

    return this.mapBoqItem(record);
  }

  async delete(tenantId: string, projectId: string, boqItemId: string): Promise<void> {
    await this.prisma.boqItem.delete({
      where: { id: boqItemId },
    });
  }

  async countMeasurementRecords(tenantId: string, projectId: string, boqItemId: string): Promise<number> {
    return this.prisma.digitalMbRecord.count({
      where: {
        tenantId,
        projectId,
        boqItemId,
      },
    });
  }

  async countChildren(projectId: string, boqItemId: string): Promise<number> {
    return this.prisma.boqItem.count({
      where: {
        projectId,
        parentId: boqItemId,
      },
    });
  }

  private mapBoqItem(record: any): BoqItemEntity {
    return {
      id: record.id,
      tenantId: record.tenantId,
      projectId: record.projectId,
      wbsNodeId: record.wbsNodeId ?? null,
      parentId: record.parentId ?? null,
      itemNumber: record.itemNumber,
      description: record.description,
      specification: record.specification ?? null,
      uom: record.uom as BoqUom,
      quantity: record.quantity,
      unitRate: record.unitRate,
      totalAmount: record.totalAmount,
      executedQuantity: record.executedQuantity,
      status: record.status as BoqStatus,
      createdById: record.createdById,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      wbsNode: record.wbsNode ?? null,
      parent: record.parent ?? null,
      children: record.children ? record.children.map((c: any) => this.mapBoqItem(c)) : undefined,
      _count: record._count,
    };
  }
}
