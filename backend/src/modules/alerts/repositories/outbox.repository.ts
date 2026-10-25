import { PrismaClient, Prisma, type OutboxEvent } from '@prisma/client';
import type { CreateOutboxEventDto } from '../dto/outbox.dto.js';
import { OutboxEventStatus } from '../constants/outbox.constants.js';

export class OutboxRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async create(
    data: CreateOutboxEventDto,
    tx?: Prisma.TransactionClient
  ): Promise<OutboxEvent> {
    const client = tx || this.prisma;

    return client.outboxEvent.create({
      data: {
        tenantId: data.tenantId,
        eventType: data.eventType,
        aggregateType: data.aggregateType,
        aggregateId: data.aggregateId,
        projectId: data.projectId || null,
        branchId: data.branchId || null,
        payload: data.payload as Prisma.InputJsonValue,
        correlationId: data.correlationId || null,
        causationId: data.causationId || null,
        idempotencyKey: data.idempotencyKey,
        status: OutboxEventStatus.PENDING,
        availableAt: data.availableAt || new Date(),
        maxAttempts: data.maxAttempts ?? 5,
        attempts: 0,
      },
    });
  }

  public async findById(
    id: string,
    tx?: Prisma.TransactionClient
  ): Promise<OutboxEvent | null> {
    const client = tx || this.prisma;
    return client.outboxEvent.findUnique({
      where: { id },
    });
  }

  public async findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
    tx?: Prisma.TransactionClient
  ): Promise<OutboxEvent | null> {
    const client = tx || this.prisma;
    return client.outboxEvent.findUnique({
      where: {
        tenantId_idempotencyKey: {
          tenantId,
          idempotencyKey,
        },
      },
    });
  }

  /**
   * Safe worker claiming using PostgreSQL `SELECT ... FOR UPDATE SKIP LOCKED`
   * and automatic stale processing lease recovery.
   */
  public async claimPendingEvents(
    limit: number = 20,
    leaseTimeoutSeconds: number = 300,
    tx?: Prisma.TransactionClient
  ): Promise<OutboxEvent[]> {
    const client = tx || this.prisma;

    const claimed = await client.$queryRaw<OutboxEvent[]>`
      WITH claimable AS (
        SELECT id
        FROM outbox_events
        WHERE (status = 'PENDING' AND available_at <= NOW())
           OR (status = 'PROCESSING' AND updated_at < NOW() - (${leaseTimeoutSeconds} || ' seconds')::INTERVAL)
        ORDER BY available_at ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE outbox_events e
      SET status = 'PROCESSING',
          attempts = e.attempts + 1,
          updated_at = NOW()
      FROM claimable
      WHERE e.id = claimable.id
      RETURNING
        e.id,
        e.tenant_id AS "tenantId",
        e.event_type AS "eventType",
        e.aggregate_type AS "aggregateType",
        e.aggregate_id AS "aggregateId",
        e.project_id AS "projectId",
        e.branch_id AS "branchId",
        e.payload,
        e.correlation_id AS "correlationId",
        e.causation_id AS "causationId",
        e.idempotency_key AS "idempotencyKey",
        e.status,
        e.available_at AS "availableAt",
        e.attempts,
        e.max_attempts AS "maxAttempts",
        e.processed_at AS "processedAt",
        e.failed_at AS "failedAt",
        e.last_error AS "lastError",
        e.created_at AS "createdAt",
        e.updated_at AS "updatedAt"
    `;

    return claimed;
  }

  public async markProcessed(
    id: string,
    tx?: Prisma.TransactionClient
  ): Promise<OutboxEvent> {
    const client = tx || this.prisma;
    return client.outboxEvent.update({
      where: { id },
      data: {
        status: OutboxEventStatus.PROCESSED,
        processedAt: new Date(),
        lastError: null,
      },
    });
  }

  public async markFailedOrRetry(
    id: string,
    error: string,
    retryDelaySeconds: number = 60,
    tx?: Prisma.TransactionClient
  ): Promise<OutboxEvent> {
    const client = tx || this.prisma;

    const current = await client.outboxEvent.findUnique({
      where: { id },
      select: { attempts: true, maxAttempts: true },
    });

    if (!current) {
      throw new Error(`Outbox event ${id} not found`);
    }

    if (current.attempts >= current.maxAttempts) {
      // Permanently failed
      return client.outboxEvent.update({
        where: { id },
        data: {
          status: OutboxEventStatus.FAILED,
          failedAt: new Date(),
          lastError: error,
        },
      });
    }

    // Schedule retry with exponential backoff / delay
    const nextAvailableAt = new Date(Date.now() + retryDelaySeconds * 1000);
    return client.outboxEvent.update({
      where: { id },
      data: {
        status: OutboxEventStatus.PENDING,
        availableAt: nextAvailableAt,
        lastError: error,
      },
    });
  }
}
