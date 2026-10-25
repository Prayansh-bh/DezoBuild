import type { HttpRouter } from '../../../common/http/router';
import { DprController } from '../controllers/dpr.controller';
import { appConfig } from '../../../config/app.config';

export function registerDprRoutes(
  router: HttpRouter,
  controller = new DprController()
): void {
  const prefix = appConfig.app.apiPrefix;

  // GET /api/v1/projects/:projectId/dpr
  router.get(`${prefix}/projects/:projectId/dpr`, async (req) => controller.listDprs(req));

  // GET /api/v1/projects/:projectId/dpr/:dprId
  router.get(`${prefix}/projects/:projectId/dpr/:dprId`, async (req) => controller.getDpr(req));

  // POST /api/v1/projects/:projectId/dpr
  router.post(`${prefix}/projects/:projectId/dpr`, async (req) => controller.createDpr(req));

  // PATCH /api/v1/projects/:projectId/dpr/:dprId
  router.patch(`${prefix}/projects/:projectId/dpr/:dprId`, async (req) => controller.updateDpr(req));

  // POST /api/v1/projects/:projectId/dpr/:dprId/submit
  router.post(`${prefix}/projects/:projectId/dpr/:dprId/submit`, async (req) => controller.submitDpr(req));

  // POST /api/v1/projects/:projectId/dpr/:dprId/reject
  router.post(`${prefix}/projects/:projectId/dpr/:dprId/reject`, async (req) => controller.rejectDpr(req));

  // POST /api/v1/projects/:projectId/dpr/:dprId/approve
  router.post(`${prefix}/projects/:projectId/dpr/:dprId/approve`, async (req) => controller.approveDpr(req));

  // DELETE /api/v1/projects/:projectId/dpr/:dprId
  router.delete(`${prefix}/projects/:projectId/dpr/:dprId`, async (req) => controller.deleteDpr(req));
}
