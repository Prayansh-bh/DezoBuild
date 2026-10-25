import type { HttpRouter } from '../../../common/http/router';
import { BoqController } from '../controllers/boq.controller';
import { appConfig } from '../../../config/app.config';

export function registerBoqRoutes(
  router: HttpRouter,
  controller = new BoqController()
): void {
  const prefix = appConfig.app.apiPrefix;

  // GET /api/v1/projects/:projectId/boq/billing-positions
  router.get(`${prefix}/projects/:projectId/boq/billing-positions`, async (req) =>
    controller.getBillingPositions(req)
  );

  // GET /api/v1/projects/:projectId/boq
  router.get(`${prefix}/projects/:projectId/boq`, async (req) =>
    controller.listBoqItems(req)
  );

  // POST /api/v1/projects/:projectId/boq/bulk
  router.post(`${prefix}/projects/:projectId/boq/bulk`, async (req) =>
    controller.createBulkBoq(req)
  );

  // POST /api/v1/projects/:projectId/boq
  router.post(`${prefix}/projects/:projectId/boq`, async (req) =>
    controller.createBoqItem(req)
  );

  // GET /api/v1/projects/:projectId/boq/:boqItemId
  router.get(`${prefix}/projects/:projectId/boq/:boqItemId`, async (req) =>
    controller.getBoqItem(req)
  );

  // PATCH /api/v1/projects/:projectId/boq/:boqItemId
  router.patch(`${prefix}/projects/:projectId/boq/:boqItemId`, async (req) =>
    controller.updateBoqItem(req)
  );

  // DELETE /api/v1/projects/:projectId/boq/:boqItemId
  router.delete(`${prefix}/projects/:projectId/boq/:boqItemId`, async (req) =>
    controller.deleteBoqItem(req)
  );
}
