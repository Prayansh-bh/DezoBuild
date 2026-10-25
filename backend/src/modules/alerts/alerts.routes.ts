import type { HttpRouter } from '../../common/http/router.js';
import { DatabaseService } from '../../database/database.service.js';
import { appConfig } from '../../config/app.config.js';

import { AlertRepository } from './repositories/alert.repository.js';
import { NotificationRepository } from './repositories/notification.repository.js';
import { OutboxRepository } from './repositories/outbox.repository.js';

import { AlertService } from './services/alert.service.js';
import { NotificationService } from './services/notification.service.js';
import { OutboxWorkerService } from './services/outbox-worker.service.js';

import { AlertsController } from './controllers/alerts.controller.js';
import { NotificationsController } from './controllers/notifications.controller.js';

import { registerBuiltInDomainEventHandlers } from './helpers/domain-event.handlers.js';

// Auto-register built-in domain event handlers on module load
registerBuiltInDomainEventHandlers();

export function registerAlertsRoutes(
  router: HttpRouter,
  customControllers?: {
    alertsController?: AlertsController;
    notificationsController?: NotificationsController;
  }
): void {
  const prefix = appConfig.app.apiPrefix;
  const prisma = DatabaseService.getInstance().getClient();

  // Repositories
  const alertRepo = new AlertRepository(prisma);
  const notificationRepo = new NotificationRepository(prisma);
  const outboxRepo = new OutboxRepository(prisma);

  // Services
  const alertService = new AlertService(alertRepo);
  const notificationService = new NotificationService(notificationRepo);

  // Controllers
  const alertsController =
    customControllers?.alertsController || new AlertsController(alertService);
  const notificationsController =
    customControllers?.notificationsController ||
    new NotificationsController(notificationService);

  // ==========================================
  // 1. ALERTS ENDPOINTS
  // ==========================================
  router.get(`${prefix}/alerts`, async (req) => alertsController.listAlerts(req));
  router.get(`${prefix}/alerts/:id`, async (req) => alertsController.getAlert(req));
  router.patch(`${prefix}/alerts/:id/acknowledge`, async (req) =>
    alertsController.acknowledgeAlert(req)
  );
  router.patch(`${prefix}/alerts/:id/resolve`, async (req) =>
    alertsController.resolveAlert(req)
  );
  router.patch(`${prefix}/alerts/:id/dismiss`, async (req) =>
    alertsController.dismissAlert(req)
  );

  // ==========================================
  // 2. NOTIFICATIONS ENDPOINTS
  // ==========================================
  router.get(`${prefix}/notifications/unread-count`, async (req) =>
    notificationsController.getUnreadCount(req)
  );
  router.get(`${prefix}/notifications`, async (req) =>
    notificationsController.listNotifications(req)
  );
  router.patch(`${prefix}/notifications/:id/read`, async (req) =>
    notificationsController.markRead(req)
  );
  router.post(`${prefix}/notifications/mark-all-read`, async (req) =>
    notificationsController.markAllRead(req)
  );
}
