import type { PrismaClient, SafetyIncident, Prisma } from '@prisma/client';
import type { PrismaTransactionClient } from '../constants/quality.constants.js';

export class SafetyIncidentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private getClient(tx?: PrismaTransactionClient): PrismaTransactionClient {
    return tx || this.prisma;
  }

  async create(
    data: Prisma.SafetyIncidentCreateArgs['data'],
    tx?: PrismaTransactionClient
  ): Promise<SafetyIncident> {
    return this.getClient(tx).safetyIncident.create({ data });
  }

  async findById(
    tenantId: string,
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<SafetyIncident | null> {
    return this.getClient(tx).safetyIncident.findFirst({
      where: { id, tenantId },
      include: {
        actions: true,
      },
    });
  }

  async findByNumber(
    tenantId: string,
    incidentNumber: string,
    tx?: PrismaTransactionClient
  ): Promise<SafetyIncident | null> {
    return this.getClient(tx).safetyIncident.findFirst({
      where: { tenantId, incidentNumber },
    });
  }

  async list(
    tenantId: string,
    filter: {
      projectId?: string;
      status?: string;
      incidentType?: string;
      severity?: string;
      riskLevel?: string;
    },
    pagination: { skip: number; take: number },
    tx?: PrismaTransactionClient
  ): Promise<{ items: SafetyIncident[]; total: number }> {
    const client = this.getClient(tx);
    const where: Prisma.SafetyIncidentWhereInput = {
      tenantId,
      ...(filter.projectId ? { projectId: filter.projectId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.incidentType ? { incidentType: filter.incidentType } : {}),
      ...(filter.severity ? { severity: filter.severity } : {}),
      ...(filter.riskLevel ? { riskLevel: filter.riskLevel } : {}),
    };

    const [items, total] = await Promise.all([
      client.safetyIncident.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
        include: {
          actions: true,
        },
      }),
      client.safetyIncident.count({ where }),
    ]);

    return { items, total };
  }

  async update(
    tenantId: string,
    id: string,
    data: Prisma.SafetyIncidentUpdateArgs['data'],
    tx?: PrismaTransactionClient
  ): Promise<SafetyIncident> {
    return this.getClient(tx).safetyIncident.update({
      where: { id },
      data,
    });
  }
}
