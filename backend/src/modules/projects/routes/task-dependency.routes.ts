import type { HttpRouter } from '../../../common/http/router';
import { TaskDependencyController } from '../controllers/task-dependency.controller';
import { appConfig } from '../../../config/app.config';

export function registerTaskDependencyRoutes(
  router: HttpRouter,
  controller = new TaskDependencyController()
): void {
  const prefix = appConfig.app.apiPrefix;

  // GET /api/v1/projects/:projectId/dependencies
  router.get(`${prefix}/projects/:projectId/dependencies`, async (req) =>
    controller.listDependencies(req)
  );

  // GET /api/v1/projects/:projectId/tasks/:taskId/dependencies
  router.get(`${prefix}/projects/:projectId/tasks/:taskId/dependencies`, async (req) =>
    controller.listDependencies(req)
  );

  // POST /api/v1/projects/:projectId/tasks/:taskId/dependencies
  router.post(`${prefix}/projects/:projectId/tasks/:taskId/dependencies`, async (req) =>
    controller.createDependency(req)
  );

  // DELETE /api/v1/projects/:projectId/tasks/:taskId/dependencies/:dependencyId
  router.delete(
    `${prefix}/projects/:projectId/tasks/:taskId/dependencies/:dependencyId`,
    async (req) => controller.deleteDependency(req)
  );
}
