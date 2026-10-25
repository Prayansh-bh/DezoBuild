import { PrismaClient } from '@prisma/client';

export interface RecordAuditParams {
  tenantId: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  previousState?: string | null;
  newState: string;
  reason?: string | null;
  ipAddress?: string | null;
}

export class FinanceAuditRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async log(
    params: RecordAuditParams,
    tx?: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]
  ): Promise<void> {
    const client = tx || this.prisma;
    await client.financeAuditLog.create({
      data: {
        tenantId: params.tenantId,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        actorId: params.actorId,
        previousState: params.previousState ?? null,
        newState: params.newState,
        reason: params.reason ?? null,
        ipAddress: params.ipAddress ?? null,
      },
    });
  }

  async getAuditTrail(tenantId: string, entityType: string, entityId: string) {
    return this.prisma.financeAuditLog.findMany({
      where: {
        tenantId,
        entityType,
        entityId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}
