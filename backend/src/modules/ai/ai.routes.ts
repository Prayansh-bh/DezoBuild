import type { HttpRouter } from '../../common/http/router.js';
import { DatabaseService } from '../../database/database.service.js';
import { appConfig } from '../../config/app.config.js';

import { AIRequestRepository } from './repositories/ai-request.repository.js';
import { AIInsightRepository } from './repositories/ai-insight.repository.js';

import { AIService } from './services/ai.service.js';
import { ControlTowerService } from './services/control-tower.service.js';
import { AIInsightService } from './services/ai-insight.service.js';

import { AIController } from './controllers/ai.controller.js';
import { ControlTowerController } from './controllers/control-tower.controller.js';
import { AIInsightsController } from './controllers/ai-insights.controller.js';

export function registerAIRoutes(
  router: HttpRouter,
  customControllers?: {
    aiController?: AIController;
    controlTowerController?: ControlTowerController;
    aiInsightsController?: AIInsightsController;
  }
): void {
  const prefix = appConfig.app.apiPrefix;
  const prisma = DatabaseService.getInstance().getClient();

  // Repositories
  const aiRequestRepo = new AIRequestRepository(prisma);
  const aiInsightRepo = new AIInsightRepository(prisma);

  // Services
  const aiService = new AIService(prisma, aiRequestRepo, aiInsightRepo);
  const controlTowerService = new ControlTowerService(prisma);
  const aiInsightService = new AIInsightService(aiInsightRepo);

  // Controllers
  const aiController =
    customControllers?.aiController || new AIController(aiService);
  const controlTowerController =
    customControllers?.controlTowerController ||
    new ControlTowerController(controlTowerService);
  const aiInsightsController =
    customControllers?.aiInsightsController ||
    new AIInsightsController(aiInsightService);

  // ==========================================
  // 1. AI EXECUTION & REQUEST AUDIT ENDPOINTS
  // ==========================================
  router.post(`${prefix}/ai/requests`, async (req) =>
    aiController.executeRequest(req)
  );
  router.get(`${prefix}/ai/requests`, async (req) =>
    aiController.listRequests(req)
  );
  router.get(`${prefix}/ai/requests/:id`, async (req) =>
    aiController.getRequest(req)
  );

  // ==========================================
  // 2. CONTROL TOWER OPERATIONAL SUMMARY
  // ==========================================
  router.get(`${prefix}/ai/control-tower`, async (req) =>
    controlTowerController.getSummary(req)
  );

  // ==========================================
  // 3. AI INSIGHTS LIFECYCLE ENDPOINTS
  // ==========================================
  router.get(`${prefix}/ai/insights`, async (req) =>
    aiInsightsController.listInsights(req)
  );
  router.get(`${prefix}/ai/insights/:id`, async (req) =>
    aiInsightsController.getInsight(req)
  );
  router.patch(`${prefix}/ai/insights/:id/acknowledge`, async (req) =>
    aiInsightsController.acknowledgeInsight(req)
  );
  router.patch(`${prefix}/ai/insights/:id/dismiss`, async (req) =>
    aiInsightsController.dismissInsight(req)
  );
}
