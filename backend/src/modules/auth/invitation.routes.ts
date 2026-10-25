import type { HttpRouter } from "../../common/http/router";
import { InvitationController } from "./invitation.controller";
import { appConfig } from "../../config/app.config";

export function registerInvitationRoutes(
  router: HttpRouter,
  controller = new InvitationController()
): void {
  const prefix = appConfig.app.apiPrefix;

  // GET /api/v1/tenants/users
  router.get(`${prefix}/tenants/users`, async (req, res) => {
    return controller.listUsers(req, res);
  });

  // POST /api/v1/tenants/users/invite
  router.post(`${prefix}/tenants/users/invite`, async (req, res) => {
    return controller.invite(req, res);
  });

  // POST /api/v1/auth/accept-invite
  router.post(`${prefix}/auth/accept-invite`, async (req, res) => {
    return controller.accept(req, res);
  });

  // POST /api/v1/tenants/users/invitations/:id/revoke
  router.post(`${prefix}/tenants/users/invitations/:id/revoke`, async (req, res) => {
    return controller.revoke(req, res);
  });
}
