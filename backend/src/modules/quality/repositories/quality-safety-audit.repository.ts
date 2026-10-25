import type { PrismaClient, QualitySafetyAuditLog, Prisma } from '@prisma/client';
import type { PrismaTransactionClient } from '../constants/quality.constants.js';

export class QualitySafetyAuditRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private getClient(tx?: PrismaTransactionClient): PrismaTransactionClient {
    return tx || this.prisma;
  }

  async record(
    data: Prisma.QualitySafetyAuditLogCreateArgs['data'],
    tx?: PrismaTransactionClient
  ): Promise<QualitySafetyAuditLog> {
    return this.getClient(tx).qualitySafetyAuditLog.create({ data });
  }

  async listByEntity(
    tenantId: string,
    entityType: string,
    entityId: string,
    tx?: PrismaTransactionClient
  ): Promise<QualitySafetyAuditLog[]> {
    return this.getClient(tx).qualitySafetyAuditLog.findMany({
      where: { tenantId, entityType, entityId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listByProject(
    tenantId: string,
    projectId: string,
    pagination: { skip: number; take: number },
    tx?: PrismaTransactionClient
  ): Promise<{ items: QualitySafetyAuditLog[]; total: number }> {
    const client = this.getClient(tx);
    const where: Prisma.QualitySafetyAuditLogWhereInput = {
      tenantId,
      projectId,
    };

    const [items, total] = await Promise.all([
      client.qualitySafetyAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      client.qualitySafetyAuditLog.count({ where }),
    ]);

    return { items, total };
  }
}
