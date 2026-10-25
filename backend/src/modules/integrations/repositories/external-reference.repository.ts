import { PrismaClient, Prisma, type ExternalReference } from '@prisma/client';
import type { CreateExternalReferenceDto } from '../dto/integration.dto.js';

export class ExternalReferenceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async upsert(
    tenantId: string,
    dto: CreateExternalReferenceDto,
    tx?: Prisma.TransactionClient
  ): Promise<ExternalReference> {
    const client = tx || this.prisma;

    return client.externalReference.upsert({
      where: {
        tenantId_integrationConnectionId_entityType_entityId: {
          tenantId,
          integrationConnectionId: dto.integrationConnectionId,
          entityType: dto.entityType,
          entityId: dto.entityId,
        },
      },
      create: {
        tenantId,
        integrationConnectionId: dto.integrationConnectionId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        externalEntityType: dto.externalEntityType,
        externalEntityId: dto.externalEntityId,
        externalVersion: dto.externalVersion || null,
        syncStatus: dto.syncStatus || 'SYNCED',
        lastSyncedAt: new Date(),
        metadata: dto.metadata ? (dto.metadata as Prisma.InputJsonValue) : undefined,
      },
      update: {
        externalEntityType: dto.externalEntityType,
        externalEntityId: dto.externalEntityId,
        externalVersion: dto.externalVersion || null,
        syncStatus: dto.syncStatus || 'SYNCED',
        lastSyncedAt: new Date(),
        metadata: dto.metadata ? (dto.metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  public async findByInternalEntity(
    tenantId: string,
    connectionId: string,
    entityType: string,
    entityId: string,
    tx?: Prisma.TransactionClient
  ): Promise<ExternalReference | null> {
    const client = tx || this.prisma;
    return client.externalReference.findFirst({
      where: {
        tenantId,
        integrationConnectionId: connectionId,
        entityType,
        entityId,
      },
    });
  }

  public async findByExternalEntity(
    tenantId: string,
    connectionId: string,
    externalEntityType: string,
    externalEntityId: string,
    tx?: Prisma.TransactionClient
  ): Promise<ExternalReference | null> {
    const client = tx || this.prisma;
    return client.externalReference.findFirst({
      where: {
        tenantId,
        integrationConnectionId: connectionId,
        externalEntityType,
        externalEntityId,
      },
    });
  }
}
