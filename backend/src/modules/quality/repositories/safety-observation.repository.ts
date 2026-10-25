import type { PrismaClient, SafetyObservation, Prisma } from '@prisma/client';
import type { PrismaTransactionClient } from '../constants/quality.constants.js';

export class SafetyObservationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private getClient(tx?: PrismaTransactionClient): PrismaTransactionClient {
    return tx || this.prisma;
  }

  async create(
    data: Prisma.SafetyObservationCreateArgs['data'],
    tx?: PrismaTransactionClient
  ): Promise<SafetyObservation> {
    return this.getClient(tx).safetyObservation.create({ data });
  }

  async findById(
    tenantId: string,
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<SafetyObservation | null> {
    return this.getClient(tx).safetyObservation.findFirst({
      where: { id, tenantId },
      include: {
        actions: true,
      },
    });
  }

  async findByNumber(
    tenantId: string,
    observationNumber: string,
    tx?: PrismaTransactionClient
  ): Promise<SafetyObservation | null> {
    return this.getClient(tx).safetyObservation.findFirst({
      where: { tenantId, observationNumber },
    });
  }

  async list(
    tenantId: string,
    filter: {
      projectId?: string;
      status?: string;
      observationType?: string;
      riskLevel?: string;
    },
    pagination: { skip: number; take: number },
    tx?: PrismaTransactionClient
  ): Promise<{ items: SafetyObservation[]; total: number }> {
    const client = this.getClient(tx);
    const where: Prisma.SafetyObservationWhereInput = {
      tenantId,
      ...(filter.projectId ? { projectId: filter.projectId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.observationType ? { observationType: filter.observationType } : {}),
      ...(filter.riskLevel ? { riskLevel: filter.riskLevel } : {}),
    };

    const [items, total] = await Promise.all([
      client.safetyObservation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
        include: {
          actions: true,
        },
      }),
      client.safetyObservation.count({ where }),
    ]);

    return { items, total };
  }

  async update(
    tenantId: string,
    id: string,
    data: Prisma.SafetyObservationUpdateArgs['data'],
    tx?: PrismaTransactionClient
  ): Promise<SafetyObservation> {
    return this.getClient(tx).safetyObservation.update({
      where: { id },
      data,
    });
  }
}
