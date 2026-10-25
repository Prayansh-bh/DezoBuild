import type { HttpRouter } from "../../common/http/router";
import { PlatformController } from "./platform.controller";
import { appConfig } from "../../config/app.config";

export function registerPlatformRoutes(
  router: HttpRouter,
  controller = new PlatformController()
): void {
  const prefix = `${appConfig.app.apiPrefix}/platform`;

  // 1. Platform Authentication
  router.post(`${prefix}/auth/login`, async (req, res) => controller.login(req, res));
  router.post(`${prefix}/auth/logout`, async (req, res) => controller.logout(req, res));
  router.get(`${prefix}/auth/me`, async (req) => controller.getMe(req));

  // 2. Tenant Listing & Provisioning
  router.get(`${prefix}/tenants`, async (req) => controller.listTenants(req));
  router.post(`${prefix}/tenants`, async (req) => controller.provisionTenant(req));
  router.get(`${prefix}/tenants/:id`, async (req) => controller.getTenant(req));

  // 3. Entitlement & Plan Administration
  router.get(`${prefix}/tenants/:tenantId/entitlements`, async (req) => controller.getEntitlements(req));
  router.put(`${prefix}/tenants/:tenantId/entitlements`, async (req) => controller.updateEntitlements(req));
  router.put(`${prefix}/tenants/:tenantId/plan`, async (req) => controller.changePlan(req));

  // 4. Governance Audit Logs
  router.get(`${prefix}/audit-logs`, async (req) => controller.listAuditLogs(req));

  // 5. Global Plan Catalog & Tier Governance
  router.get(`${prefix}/plans`, async (req) => controller.listPlans(req));
  router.get(`${prefix}/plans/:id`, async (req) => controller.getPlan(req));
  router.put(`${prefix}/plans/:id/draft`, async (req) => controller.savePlanDraft(req));
  router.post(`${prefix}/plans/:id/publish`, async (req) => controller.publishPlan(req));
  router.get(`${prefix}/plans/:id/versions`, async (req) => controller.getPlanVersions(req));
}

