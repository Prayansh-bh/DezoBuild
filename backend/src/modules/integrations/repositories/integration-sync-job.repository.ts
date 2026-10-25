import { PrismaClient, Prisma, type IntegrationSyncJob } from '@prisma/client';
import {
  IntegrationSyncDirection,
  IntegrationSyncJobStatus,
} from '../constants/integration.constants.js';

export class IntegrationSyncJobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async create(
    data: {
      tenantId: string;
      integrationConnectionId: string;
      direction?: IntegrationSyncDirection;
      entityType: string;
      scopeMetadata?: Record<string, any>;
      idempotencyKey: string;
      maxAttempts?: number;
    },
    tx?: Prisma.TransactionClient
  ): Promise<IntegrationSyncJob> {
    const client = tx || this.prisma;

    try {
      return await client.integrationSyncJob.create({
        data: {
          tenantId: data.tenantId,
          integrationConnectionId: data.integrationConnectionId,
          direction: data.direction ?? IntegrationSyncDirection.OUTBOUND,
          entityType: data.entityType,
          scopeMetadata: data.scopeMetadata ? (data.scopeMetadata as Prisma.InputJsonValue) : undefined,
          status: IntegrationSyncJobStatus.PENDING,
          idempotencyKey: data.idempotencyKey,
          maxAttempts: data.maxAttempts ?? 5,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002' || err?.code === '23505') {
        const existing = await client.integrationSyncJob.findUnique({
          where: {
            tenantId_idempotencyKey: {
              tenantId: data.tenantId,
              idempotencyKey: data.idempotencyKey,
            },
          },
        });
        if (existing) return existing;
      }
      throw err;
    }
  }

  public async findById(id: string, tx?: Prisma.TransactionClient): Promise<IntegrationSyncJob | null> {
    const client = tx || this.prisma;
    return client.integrationSyncJob.findUnique({ where: { id } });
  }

  public async findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
    tx?: Prisma.TransactionClient
  ): Promise<IntegrationSyncJob | null> {
    const client = tx || this.prisma;
    return client.integrationSyncJob.findUnique({
      where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
    });
  }

  public async claimPendingJobs(
    limit: number = 10,
    leaseTimeoutSeconds: number = 300,
    tx?: Prisma.TransactionClient
  ): Promise<IntegrationSyncJob[]> {
    const runClaim = async (innerTx: Prisma.TransactionClient) => {
      const staleThreshold = new Date(Date.now() - leaseTimeoutSeconds * 1000);
      const rows = await innerTx.$queryRaw<IntegrationSyncJob[]>`
        SELECT * FROM "integration_sync_jobs"
        WHERE ("status" = 'PENDING' AND "available_at" <= CURRENT_TIMESTAMP)
           OR ("status" = 'RUNNING' AND "updated_at" <= ${staleThreshold})
        ORDER BY "available_at" ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED;
      `;

      if (!rows || rows.length === 0) {
        return [];
      }

      const jobIds = rows.map((r: any) => r.id);
      await innerTx.integrationSyncJob.updateMany({
        where: { id: { in: jobIds } },
        data: {
          status: IntegrationSyncJobStatus.RUNNING,
          startedAt: new Date(),
          attempts: { increment: 1 },
        },
      });

      return innerTx.integrationSyncJob.findMany({
        where: { id: { in: jobIds } },
      });
    };

    if (tx) {
      return runClaim(tx);
    }
    return this.prisma.$transaction(runClaim);
  }

  public async markCompleted(
    id: string,
    tx?: Prisma.TransactionClient
  ): Promise<IntegrationSyncJob> {
    const client = tx || this.prisma;
    return client.integrationSyncJob.update({
      where: { id },
      data: {
        status: IntegrationSyncJobStatus.COMPLETED,
        completedAt: new Date(),
        lastError: null,
      },
    });
  }

  public async markFailedOrRetry(
    id: string,
    errorMessage: string,
    retryDelaySeconds: number = 60,
    tx?: Prisma.TransactionClient
  ): Promise<IntegrationSyncJob> {
    const client = tx || this.prisma;
    const job = await client.integrationSyncJob.findUnique({ where: { id } });
    if (!job) {
      throw new Error(`IntegrationSyncJob ${id} not found`);
    }

    const isExhausted = job.attempts >= job.maxAttempts;
    const nextAvailableAt = new Date(Date.now() + retryDelaySeconds * 1000 * Math.pow(2, job.attempts - 1));

    return client.integrationSyncJob.update({
      where: { id },
      data: {
        status: isExhausted ? IntegrationSyncJobStatus.FAILED : IntegrationSyncJobStatus.PENDING,
        failedAt: isExhausted ? new Date() : null,
        availableAt: isExhausted ? undefined : nextAvailableAt,
        lastError: errorMessage,
      },
    });
  }
}
