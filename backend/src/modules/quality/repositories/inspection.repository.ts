import type { PrismaClient, InspectionRequest, InspectionChecklistItem, Prisma } from '@prisma/client';
import type { PrismaTransactionClient } from '../constants/quality.constants.js';

export class InspectionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private getClient(tx?: PrismaTransactionClient): PrismaTransactionClient {
    return tx || this.prisma;
  }

  async create(
    data: Prisma.InspectionRequestCreateArgs['data'],
    tx?: PrismaTransactionClient
  ): Promise<InspectionRequest> {
    return this.getClient(tx).inspectionRequest.create({ data });
  }

  async findById(
    tenantId: string,
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<(InspectionRequest & { checklistItems: InspectionChecklistItem[] }) | null> {
    return this.getClient(tx).inspectionRequest.findFirst({
      where: { id, tenantId },
      include: {
        checklistItems: {
          orderBy: { sequenceNumber: 'asc' },
        },
      },
    });
  }

  async findByNumber(
    tenantId: string,
    inspectionNumber: string,
    tx?: PrismaTransactionClient
  ): Promise<InspectionRequest | null> {
    return this.getClient(tx).inspectionRequest.findFirst({
      where: { tenantId, inspectionNumber },
    });
  }

  async list(
    tenantId: string,
    filter: {
      projectId?: string;
      status?: string;
      inspectionType?: string;
      discipline?: string;
      isHoldPoint?: boolean;
    },
    pagination: { skip: number; take: number },
    tx?: PrismaTransactionClient
  ): Promise<{ items: InspectionRequest[]; total: number }> {
    const client = this.getClient(tx);
    const where: Prisma.InspectionRequestWhereInput = {
      tenantId,
      ...(filter.projectId ? { projectId: filter.projectId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.inspectionType ? { inspectionType: filter.inspectionType } : {}),
      ...(filter.discipline ? { discipline: filter.discipline } : {}),
      ...(filter.isHoldPoint !== undefined ? { isHoldPoint: filter.isHoldPoint } : {}),
    };

    const [items, total] = await Promise.all([
      client.inspectionRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
        include: {
          checklistItems: {
            orderBy: { sequenceNumber: 'asc' },
          },
        },
      }),
      client.inspectionRequest.count({ where }),
    ]);

    return { items, total };
  }

  async update(
    tenantId: string,
    id: string,
    data: Prisma.InspectionRequestUpdateArgs['data'],
    tx?: PrismaTransactionClient
  ): Promise<InspectionRequest> {
    return this.getClient(tx).inspectionRequest.update({
      where: { id },
      data,
    });
  }

  // Checklist Items
  async createChecklistItem(
    data: Prisma.InspectionChecklistItemCreateArgs['data'],
    tx?: PrismaTransactionClient
  ): Promise<InspectionChecklistItem> {
    return this.getClient(tx).inspectionChecklistItem.create({ data });
  }

  async createChecklistItems(
    data: Prisma.InspectionChecklistItemCreateManyArgs['data'],
    tx?: PrismaTransactionClient
  ): Promise<Prisma.BatchPayload> {
    return this.getClient(tx).inspectionChecklistItem.createMany({ data });
  }

  async findChecklistItemById(
    tenantId: string,
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<InspectionChecklistItem | null> {
    return this.getClient(tx).inspectionChecklistItem.findFirst({
      where: { id, tenantId },
    });
  }

  async updateChecklistItem(
    tenantId: string,
    id: string,
    data: Prisma.InspectionChecklistItemUpdateArgs['data'],
    tx?: PrismaTransactionClient
  ): Promise<InspectionChecklistItem> {
    return this.getClient(tx).inspectionChecklistItem.update({
      where: { id },
      data,
    });
  }
}
