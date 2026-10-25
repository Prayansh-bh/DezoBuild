import { z } from 'zod';
import { NotificationChannel, NotificationDeliveryStatus } from '../constants/alert.constants.js';

export const createNotificationDeliverySchema = z.object({
  tenantId: z.string().uuid(),
  alertId: z.string().uuid().optional().nullable(),
  eventId: z.string().uuid().optional().nullable(),
  recipientUserId: z.string().uuid(),
  channel: z.nativeEnum(NotificationChannel).optional().default(NotificationChannel.IN_APP),
  status: z.nativeEnum(NotificationDeliveryStatus).optional().default(NotificationDeliveryStatus.PENDING),
  title: z.string().min(1).max(255),
  body: z.string().min(1),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export type CreateNotificationDeliveryDto = z.input<typeof createNotificationDeliverySchema>;

export const listNotificationsQuerySchema = z.object({
  unreadOnly: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
  channel: z.nativeEnum(NotificationChannel).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListNotificationsQueryDto = z.input<typeof listNotificationsQuerySchema>;

export const markNotificationsReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).optional(),
});

export type MarkNotificationsReadDto = z.infer<typeof markNotificationsReadSchema>;
