import { PrismaClient, Prisma, type IntegrationConnection } from '@prisma/client';
import type {
  CreateIntegrationConnectionDto,
  UpdateIntegrationConnectionDto,
  QueryIntegrationConnectionsDto,
} from '../dto/integration.dto.js';
import { IntegrationConnectionStatus } from '../constants/integration.constants.js';

export class IntegrationConnectionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async create(
    tenantId: string,
    createdById: string,
    dto: CreateIntegrationConnectionDto,
    encryptedSecret?: string,
    tx?: Prisma.TransactionClient
  ): Promise<IntegrationConnection> {
    const client = tx || this.prisma;

    return client.integrationConnection.create({
      data: {
        tenantId,
        createdById,
        integrationType: dto.integrationType,
        providerKey: dto.providerKey,
        name: dto.name,
        status: IntegrationConnectionStatus.ACTIVE,
        config: dto.config as Prisma.InputJsonValue,
        encryptedSecret: encryptedSecret || null,
        secretRef: dto.secretRef || null,
      },
    });
  }

  public async findById(
    tenantId: string,
    id: string,
    tx?: Prisma.TransactionClient
  ): Promise<IntegrationConnection | null> {
    const client = tx || this.prisma;
    return client.integrationConnection.findFirst({
      where: { id, tenantId },
    });
  }

  public async findByProvider(
    tenantId: string,
    providerKey: string,
    tx?: Prisma.TransactionClient
  ): Promise<IntegrationConnection | null> {
    const client = tx || this.prisma;
    return client.integrationConnection.findFirst({
      where: { tenantId, providerKey, status: IntegrationConnectionStatus.ACTIVE },
    });
  }

  public async findMany(
    tenantId: string,
    query: QueryIntegrationConnectionsDto,
    tx?: Prisma.TransactionClient
  ): Promise<{ items: IntegrationConnection[]; total: number }> {
    const client = tx || this.prisma;

    const where: Prisma.IntegrationConnectionWhereInput = {
      tenantId,
      ...(query.integrationType ? { integrationType: query.integrationType } : {}),
      ...(query.providerKey ? { providerKey: query.providerKey } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      client.integrationConnection.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit ?? 50,
        skip: query.offset ?? 0,
      }),
      client.integrationConnection.count({ where }),
    ]);

    return { items, total };
  }

  public async update(
    tenantId: string,
    id: string,
    dto: UpdateIntegrationConnectionDto,
    encryptedSecret?: string,
    tx?: Prisma.TransactionClient
  ): Promise<IntegrationConnection> {
    const client = tx || this.prisma;

    return client.integrationConnection.update({
      where: { id, tenantId },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.config ? { config: dto.config as Prisma.InputJsonValue } : {}),
        ...(encryptedSecret ? { encryptedSecret } : {}),
        ...(dto.secretRef !== undefined ? { secretRef: dto.secretRef } : {}),
      },
    });
  }

  public async updateHealth(
    tenantId: string,
    id: string,
    status: IntegrationConnectionStatus,
    lastError?: string | null,
    lastConnectedAt?: Date,
    lastSyncAt?: Date,
    tx?: Prisma.TransactionClient
  ): Promise<IntegrationConnection> {
    const client = tx || this.prisma;

    return client.integrationConnection.update({
      where: { id, tenantId },
      data: {
        status,
        lastError: lastError !== undefined ? lastError : undefined,
        ...(lastConnectedAt ? { lastConnectedAt } : {}),
        ...(lastSyncAt ? { lastSyncAt } : {}),
      },
    });
  }
}
