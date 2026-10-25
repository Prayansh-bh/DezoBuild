import type { Prisma, PrismaClient, OutboxEvent } from '@prisma/client';
import { OutboxRepository } from '../repositories/outbox.repository.js';
import type { CreateOutboxEventDto } from '../dto/outbox.dto.js';

export class OutboxWriter {
  /**
   * Transactionally records an OutboxEvent within an active database transaction.
   * Ensures the outbox insert is committed atomically alongside domain entity mutations.
   */
  public static async recordEvent(
    prismaOrTx: Prisma.TransactionClient | PrismaClient,
    eventData: CreateOutboxEventDto
  ): Promise<OutboxEvent> {
    const repo = new OutboxRepository(prismaOrTx as PrismaClient);
    return repo.create(eventData, prismaOrTx as Prisma.TransactionClient);
  }
}
