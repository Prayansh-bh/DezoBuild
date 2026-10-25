import type { PrismaClient, QualitySafetyAction, Prisma } from '@prisma/client';
import type { PrismaTransactionClient } from '../constants/quality.constants.js';

export class ActionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private getClient(tx?: PrismaTransactionClient): PrismaTransactionClient {
    return tx || this.prisma;
  }

  async create(
    data: Prisma.QualitySafetyActionCreateArgs['data'],
    tx?: PrismaTransactionClient
  ): Promise<QualitySafetyAction> {
    return this.getClient(tx).qualitySafetyAction.create({ data });
  }

  async findById(
    tenantId: string,
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<QualitySafetyAction | null> {
    return this.getClient(tx).qualitySafetyAction.findFirst({
      where: { id, tenantId },
      include: {
        assignedTo: true,
        assignedVendor: true,
      },
    });
  }

  async findByNumber(
    tenantId: string,
    actionNumber: string,
    tx?: PrismaTransactionClient
  ): Promise<QualitySafetyAction | null> {
    return this.getClient(tx).qualitySafetyAction.findFirst({
      where: { tenantId, actionNumber },
    });
  }

  async list(
    tenantId: string,
    filter: {
      projectId?: string;
      status?: string;
      priority?: string;
      actionType?: string;
      ncrId?: string;
      incidentId?: string;
      observationId?: string;
      assignedToId?: string;
      assignedVendorId?: string;
    },
    pagination: { skip: number; take: number },
    tx?: PrismaTransactionClient
  ): Promise<{ items: QualitySafetyAction[]; total: number }> {
    const client = this.getClient(tx);
    const where: Prisma.QualitySafetyActionWhereInput = {
      tenantId,
      ...(filter.projectId ? { projectId: filter.projectId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.priority ? { priority: filter.priority } : {}),
      ...(filter.actionType ? { actionType: filter.actionType } : {}),
      ...(filter.ncrId ? { ncrId: filter.ncrId } : {}),
      ...(filter.incidentId ? { incidentId: filter.incidentId } : {}),
      ...(filter.observationId ? { observationId: filter.observationId } : {}),
      ...(filter.assignedToId ? { assignedToId: filter.assignedToId } : {}),
      ...(filter.assignedVendorId ? { assignedVendorId: filter.assignedVendorId } : {}),
    };

    const [items, total] = await Promise.all([
      client.qualitySafetyAction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
        include: {
          assignedTo: true,
          assignedVendor: true,
        },
      }),
      client.qualitySafetyAction.count({ where }),
    ]);

    return { items, total };
  }

  async update(
    tenantId: string,
    id: string,
    data: Prisma.QualitySafetyActionUpdateArgs['data'],
    tx?: PrismaTransactionClient
  ): Promise<QualitySafetyAction> {
    return this.getClient(tx).qualitySafetyAction.update({
      where: { id },
      data,
    });
  }
}
