import { Prisma, type NotificationDelivery } from '@prisma/client';
import type {
  NotificationProvider,
  NotificationPayload,
  NotificationDeliveryResult,
} from './notification-provider.interface.js';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
} from '../constants/alert.constants.js';
import type { NotificationRepository } from '../repositories/notification.repository.js';

export class InAppNotificationProvider implements NotificationProvider {
  public readonly channel = NotificationChannel.IN_APP;

  constructor(private readonly notificationRepo: NotificationRepository) {}

  public async deliver(
    payload: NotificationPayload
  ): Promise<NotificationDeliveryResult> {
    try {
      // Idempotency fast-path: Check if notification already delivered
      if (payload.alertId) {
        const existing = await this.notificationRepo.findExistingDelivery(
          payload.tenantId,
          payload.recipientUserId,
          payload.alertId,
          this.channel
        );

        if (existing) {
          return {
            success: true,
            channel: this.channel,
            deliveryId: existing.id,
          };
        }
      } else if (payload.eventId) {
        const existing = await this.notificationRepo.findExistingByEvent(
          payload.tenantId,
          payload.recipientUserId,
          payload.eventId,
          this.channel
        );

        if (existing) {
          return {
            success: true,
            channel: this.channel,
            deliveryId: existing.id,
          };
        }
      }

      try {
        const delivery = await this.notificationRepo.create({
          tenantId: payload.tenantId,
          alertId: payload.alertId,
          eventId: payload.eventId,
          recipientUserId: payload.recipientUserId,
          channel: this.channel,
          status: NotificationDeliveryStatus.SENT,
          title: payload.title,
          body: payload.body,
          metadata: payload.metadata,
        });

        return {
          success: true,
          channel: this.channel,
          deliveryId: delivery.id,
        };
      } catch (insertErr: any) {
        // Concurrency race: another concurrent worker already inserted this notification
        if (
          (insertErr instanceof Prisma.PrismaClientKnownRequestError &&
            insertErr.code === 'P2002') ||
          insertErr?.code === '23505'
        ) {
          let existing: NotificationDelivery | null = null;
          if (payload.alertId) {
            existing = await this.notificationRepo.findExistingDelivery(
              payload.tenantId,
              payload.recipientUserId,
              payload.alertId,
              this.channel
            );
          } else if (payload.eventId) {
            existing = await this.notificationRepo.findExistingByEvent(
              payload.tenantId,
              payload.recipientUserId,
              payload.eventId,
              this.channel
            );
          }

          if (existing) {
            return {
              success: true,
              channel: this.channel,
              deliveryId: existing.id,
            };
          }
        }
        throw insertErr;
      }
    } catch (err: any) {
      return {
        success: false,
        channel: this.channel,
        error: err?.message || 'In-app notification delivery failed',
      };
    }
  }
}
