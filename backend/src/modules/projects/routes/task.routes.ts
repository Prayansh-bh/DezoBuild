import type { HttpRouter } from '../../../common/http/router';
import { TaskController } from '../controllers/task.controller';
import { appConfig } from '../../../config/app.config';

export function registerTaskRoutes(
  router: HttpRouter,
  controller = new TaskController()
): void {
  const prefix = appConfig.app.apiPrefix;

  // GET /api/v1/projects/:projectId/tasks
  router.get(`${prefix}/projects/:projectId/tasks`, async (req) => controller.listTasks(req));

  // POST /api/v1/projects/:projectId/tasks
  router.post(`${prefix}/projects/:projectId/tasks`, async (req) => controller.createTask(req));

  // GET /api/v1/projects/:projectId/tasks/:taskId
  router.get(`${prefix}/projects/:projectId/tasks/:taskId`, async (req) => controller.getTask(req));

  // PATCH /api/v1/projects/:projectId/tasks/:taskId
  router.patch(`${prefix}/projects/:projectId/tasks/:taskId`, async (req) => controller.updateTask(req));

  // DELETE /api/v1/projects/:projectId/tasks/:taskId
  router.delete(`${prefix}/projects/:projectId/tasks/:taskId`, async (req) => controller.deleteTask(req));
}
