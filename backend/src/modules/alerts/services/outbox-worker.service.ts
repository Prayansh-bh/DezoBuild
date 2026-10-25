import type { PrismaClient } from '@prisma/client';
import type { OutboxRepository } from '../repositories/outbox.repository.js';
import type { AlertRepository } from '../repositories/alert.repository.js';
import type { NotificationService } from './notification.service.js';
import { EventRegistry } from '../helpers/event.registry.js';
import { logger } from '../../../common/logging/logger.js';
import { OutboxEventStatus } from '../constants/outbox.constants.js';

export interface BatchProcessingResult {
  claimedCount: number;
  processedCount: number;
  failedCount: number;
  retriedCount: number;
  errors: Array<{ eventId: string; error: string }>;
}

export class OutboxWorkerService {
  private readonly eventRegistry = EventRegistry.getInstance();

  constructor(
    private readonly outboxRepo: OutboxRepository,
    private readonly alertRepo: AlertRepository,
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaClient
  ) {}

  /**
   * Claims and processes a batch of pending or stale-lease outbox events atomically.
   */
  public async processBatch(
    limit: number = 20,
    leaseTimeoutSeconds: number = 300,
    retryDelaySeconds: number = 60
  ): Promise<BatchProcessingResult> {
    const claimedEvents = await this.outboxRepo.claimPendingEvents(
      limit,
      leaseTimeoutSeconds
    );

    const result: BatchProcessingResult = {
      claimedCount: claimedEvents.length,
      processedCount: 0,
      failedCount: 0,
      retriedCount: 0,
      errors: [],
    };

    if (claimedEvents.length === 0) {
      return result;
    }

    for (const event of claimedEvents) {
      try {
        await this.eventRegistry.dispatch(event, {
          alertRepo: this.alertRepo,
          notificationService: this.notificationService,
          prisma: this.prisma,
        });

        await this.outboxRepo.markProcessed(event.id);
        result.processedCount++;
      } catch (err: any) {
        const errorMessage = err?.message || 'Unknown processing error';
        logger.error(`Failed to process OutboxEvent ${event.id}`, {
          eventId: event.id,
          eventType: event.eventType,
          error: errorMessage,
        });

        const updated = await this.outboxRepo.markFailedOrRetry(
          event.id,
          errorMessage,
          retryDelaySeconds
        );

        if (updated.status === OutboxEventStatus.FAILED) {
          result.failedCount++;
        } else {
          result.retriedCount++;
        }

        result.errors.push({
          eventId: event.id,
          error: errorMessage,
        });
      }
    }

    return result;
  }

  /**
   * Processes a single event by ID (useful for tests or immediate dispatch).
   */
  public async processSingleEvent(
    eventId: string,
    retryDelaySeconds: number = 60
  ): Promise<void> {
    const event = await this.outboxRepo.findById(eventId);
    if (!event) {
      throw new Error(`OutboxEvent ${eventId} not found`);
    }

    try {
      await this.eventRegistry.dispatch(event, {
        alertRepo: this.alertRepo,
        notificationService: this.notificationService,
        prisma: this.prisma,
      });

      await this.outboxRepo.markProcessed(event.id);
    } catch (err: any) {
      const errorMessage = err?.message || 'Unknown processing error';
      await this.outboxRepo.markFailedOrRetry(
        event.id,
        errorMessage,
        retryDelaySeconds
      );
      throw err;
    }
  }
}
