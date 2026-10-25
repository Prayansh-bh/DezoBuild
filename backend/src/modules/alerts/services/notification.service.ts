import type { NotificationRepository } from '../repositories/notification.repository.js';
import type {
  NotificationProvider,
  NotificationPayload,
  NotificationDeliveryResult,
} from '../providers/notification-provider.interface.js';
import {
  NotificationChannel,
} from '../constants/alert.constants.js';
import type { ListNotificationsQueryDto } from '../dto/notification.dto.js';
import { InAppNotificationProvider } from '../providers/in-app-notification.provider.js';

export class NotificationService {
  private readonly providers: Map<NotificationChannel, NotificationProvider> = new Map();

  constructor(private readonly notificationRepo: NotificationRepository) {
    // Default register In-App provider
    const inAppProvider = new InAppNotificationProvider(this.notificationRepo);
    this.registerProvider(inAppProvider);
  }

  public registerProvider(provider: NotificationProvider): void {
    this.providers.set(provider.channel, provider);
  }

  public async send(
    payload: NotificationPayload,
    channel: NotificationChannel = NotificationChannel.IN_APP
  ): Promise<NotificationDeliveryResult> {
    const provider = this.providers.get(channel);
    if (!provider) {
      return {
        success: false,
        channel,
        error: `Notification provider for channel ${channel} is not registered`,
      };
    }

    return provider.deliver(payload);
  }

  public async listForRecipient(
    tenantId: string,
    userId: string,
    query: ListNotificationsQueryDto
  ) {
    return this.notificationRepo.listForRecipient(tenantId, userId, query);
  }

  public async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    return this.notificationRepo.countUnread(tenantId, userId);
  }

  public async markRead(tenantId: string, userId: string, notificationId: string) {
    return this.notificationRepo.markRead(tenantId, userId, notificationId);
  }

  public async markAllRead(
    tenantId: string,
    userId: string,
    notificationIds?: string[]
  ) {
    return this.notificationRepo.markAllRead(tenantId, userId, notificationIds);
  }
}
