import { PrismaClient, Prisma, type WebhookEvent } from '@prisma/client';
import { WebhookEventStatus } from '../constants/integration.constants.js';

export class WebhookEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async create(
    data: {
      providerKey: string;
      externalEventId: string;
      tenantId?: string | null;
      eventType: string;
      payload: Record<string, any>;
      signature?: string | null;
      correlationId?: string | null;
      status?: WebhookEventStatus;
      lastError?: string | null;
    },
    tx?: Prisma.TransactionClient
  ): Promise<WebhookEvent> {
    const client = tx || this.prisma;

    try {
      return await client.webhookEvent.create({
        data: {
          providerKey: data.providerKey,
          externalEventId: data.externalEventId,
          tenantId: data.tenantId || null,
          eventType: data.eventType,
          payload: data.payload as Prisma.InputJsonValue,
          signature: data.signature || null,
          status: data.status ?? WebhookEventStatus.RECEIVED,
          correlationId: data.correlationId || null,
          lastError: data.lastError || null,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002' || err?.code === '23505') {
        const existing = await client.webhookEvent.findUnique({
          where: {
            providerKey_externalEventId: {
              providerKey: data.providerKey,
              externalEventId: data.externalEventId,
            },
          },
        });
        if (existing) return existing;
      }
      throw err;
    }
  }

  public async findByExternalId(
    providerKey: string,
    externalEventId: string,
    tx?: Prisma.TransactionClient
  ): Promise<WebhookEvent | null> {
    const client = tx || this.prisma;
    return client.webhookEvent.findUnique({
      where: {
        providerKey_externalEventId: {
          providerKey,
          externalEventId,
        },
      },
    });
  }

  public async updateStatus(
    id: string,
    status: WebhookEventStatus,
    lastError?: string | null,
    tx?: Prisma.TransactionClient
  ): Promise<WebhookEvent> {
    const client = tx || this.prisma;
    return client.webhookEvent.update({
      where: { id },
      data: {
        status,
        processedAt: status === WebhookEventStatus.PROCESSED ? new Date() : undefined,
        failedAt: status === WebhookEventStatus.FAILED ? new Date() : undefined,
        lastError: lastError !== undefined ? lastError : undefined,
        attempts: { increment: 1 },
      },
    });
  }
}
