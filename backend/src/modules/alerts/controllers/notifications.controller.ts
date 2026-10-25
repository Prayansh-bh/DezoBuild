import type { IncomingMessage } from 'node:http';
import { NotificationService } from '../services/notification.service.js';
import {
  listNotificationsQuerySchema,
  markNotificationsReadSchema,
} from '../dto/notification.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';

export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  public async listNotifications(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<any>> {
    const principal = await requireAuth(req);
    const query = DtoValidator.validate(
      listNotificationsQuerySchema,
      req.query || {}
    );

    const result = await this.notificationService.listForRecipient(
      principal.tenantId,
      principal.userId,
      query
    );
    return createSuccessResponse(result, 'Notifications retrieved successfully');
  }

  public async getUnreadCount(req: IncomingMessage): Promise<ApiResponse<any>> {
    const principal = await requireAuth(req);
    const count = await this.notificationService.getUnreadCount(
      principal.tenantId,
      principal.userId
    );
    return createSuccessResponse({ unreadCount: count }, 'Unread count retrieved');
  }

  public async markRead(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<any>> {
    const principal = await requireAuth(req);
    const id = req.params?.id!;

    const result = await this.notificationService.markRead(
      principal.tenantId,
      principal.userId,
      id
    );
    return createSuccessResponse(result, 'Notification marked as read');
  }

  public async markAllRead(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<any>> {
    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(
      markNotificationsReadSchema,
      req.body || {}
    );

    const result = await this.notificationService.markAllRead(
      principal.tenantId,
      principal.userId,
      dto.notificationIds
    );
    return createSuccessResponse(result, 'Notifications marked as read');
  }
}
