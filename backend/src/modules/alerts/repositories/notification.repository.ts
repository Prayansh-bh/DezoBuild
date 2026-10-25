import { PrismaClient, Prisma, type NotificationDelivery } from '@prisma/client';
import type {
  CreateNotificationDeliveryDto,
  ListNotificationsQueryDto,
} from '../dto/notification.dto.js';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
} from '../constants/alert.constants.js';

export class NotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async create(
    data: CreateNotificationDeliveryDto,
    tx?: Prisma.TransactionClient
  ): Promise<NotificationDelivery> {
    const client = tx || this.prisma;

    return client.notificationDelivery.create({
      data: {
        tenantId: data.tenantId,
        alertId: data.alertId || null,
        eventId: data.eventId || null,
        recipientUserId: data.recipientUserId,
        channel: data.channel ?? NotificationChannel.IN_APP,
        status: data.status ?? NotificationDeliveryStatus.SENT,
        title: data.title,
        body: data.body,
        deliveredAt: new Date(),
        metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  public async findExistingDelivery(
    tenantId: string,
    recipientUserId: string,
    alertId: string,
    channel: NotificationChannel = NotificationChannel.IN_APP,
    tx?: Prisma.TransactionClient
  ): Promise<NotificationDelivery | null> {
    const client = tx || this.prisma;
    return client.notificationDelivery.findFirst({
      where: {
        tenantId,
        recipientUserId,
        alertId,
        channel,
      },
    });
  }

  public async findExistingByEvent(
    tenantId: string,
    recipientUserId: string,
    eventId: string,
    channel: NotificationChannel = NotificationChannel.IN_APP,
    tx?: Prisma.TransactionClient
  ): Promise<NotificationDelivery | null> {
    const client = tx || this.prisma;
    return client.notificationDelivery.findFirst({
      where: {
        tenantId,
        recipientUserId,
        eventId,
        channel,
      },
    });
  }

  public async listForRecipient(
    tenantId: string,
    userId: string,
    filters?: Partial<ListNotificationsQueryDto>,
    tx?: Prisma.TransactionClient
  ): Promise<{ items: NotificationDelivery[]; total: number }> {
    const client = tx || this.prisma;

    const where: Prisma.NotificationDeliveryWhereInput = {
      tenantId,
      recipientUserId: userId,
      ...(filters?.channel ? { channel: filters.channel } : {}),
      ...(filters?.unreadOnly ? { readAt: null } : {}),
    };

    const [items, total] = await Promise.all([
      client.notificationDelivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters?.limit ?? 50,
        skip: filters?.offset ?? 0,
        include: {
          alert: {
            select: {
              id: true,
              alertType: true,
              severity: true,
              status: true,
              projectId: true,
            },
          },
        },
      }),
      client.notificationDelivery.count({ where }),
    ]);

    return { items, total };
  }

  public async countUnread(
    tenantId: string,
    userId: string,
    tx?: Prisma.TransactionClient
  ): Promise<number> {
    const client = tx || this.prisma;
    return client.notificationDelivery.count({
      where: {
        tenantId,
        recipientUserId: userId,
        readAt: null,
      },
    });
  }

  public async markRead(
    tenantId: string,
    userId: string,
    notificationId: string,
    tx?: Prisma.TransactionClient
  ): Promise<NotificationDelivery> {
    const client = tx || this.prisma;
    return client.notificationDelivery.update({
      where: {
        id: notificationId,
        tenantId,
        recipientUserId: userId,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  public async markAllRead(
    tenantId: string,
    userId: string,
    notificationIds?: string[],
    tx?: Prisma.TransactionClient
  ): Promise<{ count: number }> {
    const client = tx || this.prisma;

    const where: Prisma.NotificationDeliveryWhereInput = {
      tenantId,
      recipientUserId: userId,
      readAt: null,
      ...(notificationIds && notificationIds.length > 0
        ? { id: { in: notificationIds } }
        : {}),
    };

    const result = await client.notificationDelivery.updateMany({
      where,
      data: {
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }
}
