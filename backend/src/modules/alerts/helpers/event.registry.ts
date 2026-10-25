import type { OutboxEvent, PrismaClient } from '@prisma/client';
import type { AlertRepository } from '../repositories/alert.repository.js';
import type { NotificationService } from '../services/notification.service.js';

export interface EventHandlerContext {
  alertRepo: AlertRepository;
  notificationService: NotificationService;
  prisma: PrismaClient;
}

export type DomainEventHandler = (
  event: OutboxEvent,
  context: EventHandlerContext
) => Promise<void>;

export class EventRegistry {
  private static instance: EventRegistry;
  private readonly handlers: Map<string, DomainEventHandler[]> = new Map();

  public static getInstance(): EventRegistry {
    if (!EventRegistry.instance) {
      EventRegistry.instance = new EventRegistry();
    }
    return EventRegistry.instance;
  }

  public register(eventType: string, handler: DomainEventHandler): void {
    const list = this.handlers.get(eventType) || [];
    list.push(handler);
    this.handlers.set(eventType, list);
  }

  public getHandlers(eventType: string): DomainEventHandler[] {
    return this.handlers.get(eventType) || [];
  }

  public async dispatch(
    event: OutboxEvent,
    context: EventHandlerContext
  ): Promise<void> {
    const handlers = this.getHandlers(event.eventType);
    for (const handler of handlers) {
      await handler(event, context);
    }
  }

  public clear(): void {
    this.handlers.clear();
  }
}
