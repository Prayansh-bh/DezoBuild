import type { HttpRouter } from '../../common/http/router';
import { ProjectsController } from './projects.controller';
import { appConfig } from '../../config/app.config';

export function registerProjectRoutes(
  router: HttpRouter,
  controller = new ProjectsController()
): void {
  const prefix = appConfig.app.apiPrefix;

  // ==========================================
  // PROJECTS CORE
  // ==========================================

  // GET /api/v1/projects
  router.get(`${prefix}/projects`, async (req) => controller.listProjects(req));

  // POST /api/v1/projects
  router.post(`${prefix}/projects`, async (req) => controller.createProject(req));

  // GET /api/v1/projects/:id
  router.get(`${prefix}/projects/:id`, async (req) => controller.getProject(req));

  // PATCH /api/v1/projects/:id
  router.patch(`${prefix}/projects/:id`, async (req) => controller.updateProject(req));

  // POST /api/v1/projects/:id/status
  router.post(`${prefix}/projects/:id/status`, async (req) => controller.transitionStatus(req));
}
