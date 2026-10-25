import type { HttpRouter } from '../../../common/http/router';
import { DigitalMbController } from '../controllers/digital-mb.controller';
import { appConfig } from '../../../config/app.config';

export function registerDigitalMbRoutes(
  router: HttpRouter,
  controller = new DigitalMbController()
): void {
  const prefix = appConfig.app.apiPrefix;

  // GET /api/v1/projects/:projectId/measurements
  router.get(`${prefix}/projects/:projectId/measurements`, async (req) =>
    controller.listMeasurements(req)
  );

  // POST /api/v1/projects/:projectId/measurements
  router.post(`${prefix}/projects/:projectId/measurements`, async (req) =>
    controller.createMeasurement(req)
  );

  // GET /api/v1/projects/:projectId/measurements/:measurementId
  router.get(`${prefix}/projects/:projectId/measurements/:measurementId`, async (req) =>
    controller.getMeasurement(req)
  );

  // PATCH /api/v1/projects/:projectId/measurements/:measurementId
  router.patch(`${prefix}/projects/:projectId/measurements/:measurementId`, async (req) =>
    controller.updateMeasurement(req)
  );

  // DELETE /api/v1/projects/:projectId/measurements/:measurementId
  router.delete(`${prefix}/projects/:projectId/measurements/:measurementId`, async (req) =>
    controller.deleteMeasurement(req)
  );

  // POST /api/v1/projects/:projectId/measurements/:measurementId/submit
  router.post(`${prefix}/projects/:projectId/measurements/:measurementId/submit`, async (req) =>
    controller.submitMeasurement(req)
  );

  // POST /api/v1/projects/:projectId/measurements/:measurementId/verify
  router.post(`${prefix}/projects/:projectId/measurements/:measurementId/verify`, async (req) =>
    controller.verifyMeasurement(req)
  );

  // POST /api/v1/projects/:projectId/measurements/:measurementId/approve
  router.post(`${prefix}/projects/:projectId/measurements/:measurementId/approve`, async (req) =>
    controller.approveMeasurement(req)
  );

  // POST /api/v1/projects/:projectId/measurements/:measurementId/reject
  router.post(`${prefix}/projects/:projectId/measurements/:measurementId/reject`, async (req) =>
    controller.rejectMeasurement(req)
  );

  // POST /api/v1/projects/:projectId/measurements/:measurementId/reopen
  router.post(`${prefix}/projects/:projectId/measurements/:measurementId/reopen`, async (req) =>
    controller.reopenMeasurement(req)
  );
}
