import type { NotificationChannel } from '../constants/alert.constants.js';

export interface NotificationPayload {
  tenantId: string;
  recipientUserId: string;
  title: string;
  body: string;
  alertId?: string | null;
  eventId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface NotificationDeliveryResult {
  success: boolean;
  channel: NotificationChannel;
  deliveryId?: string;
  error?: string;
}

export interface NotificationProvider {
  readonly channel: NotificationChannel;
  deliver(payload: NotificationPayload): Promise<NotificationDeliveryResult>;
}
