import type { HttpRouter } from '../../common/http/router.js';
import { DatabaseService } from '../../database/database.service.js';
import { appConfig } from '../../config/app.config.js';

import { IntegrationConnectionRepository } from './repositories/integration-connection.repository.js';
import { ExternalReferenceRepository } from './repositories/external-reference.repository.js';
import { IntegrationSyncJobRepository } from './repositories/integration-sync-job.repository.js';
import { WebhookEventRepository } from './repositories/webhook-event.repository.js';

import { IntegrationService } from './services/integration.service.js';
import { SyncService } from './services/sync.service.js';
import { WebhookService } from './services/webhook.service.js';

import { IntegrationsController } from './controllers/integrations.controller.js';
import { WebhooksController } from './controllers/webhooks.controller.js';

export function registerIntegrationsRoutes(
  router: HttpRouter,
  customControllers?: {
    integrationsController?: IntegrationsController;
    webhooksController?: WebhooksController;
  }
): void {
  const prefix = appConfig.app.apiPrefix;
  const prisma = DatabaseService.getInstance().getClient();

  // Repositories
  const connectionRepo = new IntegrationConnectionRepository(prisma);
  const refRepo = new ExternalReferenceRepository(prisma);
  const syncJobRepo = new IntegrationSyncJobRepository(prisma);
  const webhookRepo = new WebhookEventRepository(prisma);

  // Services
  const integrationService = new IntegrationService(connectionRepo);
  const syncService = new SyncService(syncJobRepo, connectionRepo, refRepo);
  const webhookService = new WebhookService(webhookRepo, connectionRepo);

  // Controllers
  const integrationsController =
    customControllers?.integrationsController ||
    new IntegrationsController(integrationService, syncService);
  const webhooksController =
    customControllers?.webhooksController || new WebhooksController(webhookService);

  // ==========================================
  // 1. INTEGRATIONS CONNECTION ENDPOINTS
  // ==========================================
  router.get(`${prefix}/integrations`, async (req) =>
    integrationsController.listConnections(req)
  );
  router.post(`${prefix}/integrations`, async (req) =>
    integrationsController.createConnection(req)
  );
  router.get(`${prefix}/integrations/:id`, async (req) =>
    integrationsController.getConnection(req)
  );
  router.patch(`${prefix}/integrations/:id`, async (req) =>
    integrationsController.updateConnection(req)
  );
  router.post(`${prefix}/integrations/:id/test`, async (req) =>
    integrationsController.testConnection(req)
  );
  router.post(`${prefix}/integrations/:id/sync`, async (req) =>
    integrationsController.triggerSync(req)
  );

  // ==========================================
  // 2. INBOUND WEBHOOK ENDPOINTS
  // ==========================================
  router.post(`${prefix}/integrations/webhooks/:providerKey`, async (req) =>
    webhooksController.handleInboundWebhook(req)
  );
}
