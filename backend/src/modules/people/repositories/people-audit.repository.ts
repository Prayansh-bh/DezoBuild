import { PrismaClient, Prisma } from '@prisma/client';

export interface CreatePeopleAuditLogInput {
  tenantId: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  previousState?: any;
  newState?: any;
  reason?: string | null;
  ipAddress?: string | null;
}

export class PeopleAuditRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async log(input: CreatePeopleAuditLogInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.peopleAuditLog.create({
      data: {
        tenantId: input.tenantId,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        actorId: input.actorId,
        previousState: input.previousState ? JSON.parse(JSON.stringify(input.previousState)) : undefined,
        newState: input.newState ? JSON.parse(JSON.stringify(input.newState)) : undefined,
        reason: input.reason ?? undefined,
        ipAddress: input.ipAddress ?? undefined,
      },
    });
  }

  async findByEntity(tenantId: string, entityType: string, entityId: string) {
    return this.prisma.peopleAuditLog.findMany({
      where: {
        tenantId,
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
