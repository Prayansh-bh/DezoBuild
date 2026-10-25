import type { HttpRouter } from '../../../common/http/router';
import { WbsController } from '../controllers/wbs.controller';
import { appConfig } from '../../../config/app.config';

export function registerWbsRoutes(
  router: HttpRouter,
  controller = new WbsController()
): void {
  const prefix = appConfig.app.apiPrefix;

  // GET /api/v1/projects/:projectId/wbs
  router.get(`${prefix}/projects/:projectId/wbs`, async (req) => controller.listWbsNodes(req));

  // POST /api/v1/projects/:projectId/wbs
  router.post(`${prefix}/projects/:projectId/wbs`, async (req) => controller.createWbsNode(req));

  // GET /api/v1/projects/:projectId/wbs/:nodeId
  router.get(`${prefix}/projects/:projectId/wbs/:nodeId`, async (req) => controller.getWbsNode(req));

  // PATCH /api/v1/projects/:projectId/wbs/:nodeId
  router.patch(`${prefix}/projects/:projectId/wbs/:nodeId`, async (req) => controller.updateWbsNode(req));

  // DELETE /api/v1/projects/:projectId/wbs/:nodeId
  router.delete(`${prefix}/projects/:projectId/wbs/:nodeId`, async (req) => controller.deleteWbsNode(req));
}
