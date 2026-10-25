import type { HttpRouter } from "../../common/http/router";
import { AuthController } from "./auth.controller";
import { appConfig } from "../../config/app.config";

export function registerAuthRoutes(router: HttpRouter, controller = new AuthController()): void {
  const prefix = `${appConfig.app.apiPrefix}/auth`;

  // POST /api/v1/auth/login
  router.post(`${prefix}/login`, async (req, res) => {
    return controller.login(req, res);
  });

  // POST /api/v1/auth/refresh
  router.post(`${prefix}/refresh`, async (req, res) => {
    return controller.refresh(req, res);
  });

  // POST /api/v1/auth/logout
  router.post(`${prefix}/logout`, async (req, res) => {
    return controller.logout(req, res);
  });

  // GET /api/v1/auth/me
  router.get(`${prefix}/me`, async (req) => {
    return controller.getMe(req);
  });
}
