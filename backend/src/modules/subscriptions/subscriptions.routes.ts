import type { HttpRouter } from '../../common/http/router';
import { SubscriptionsController } from './subscriptions.controller';
import { appConfig } from '../../config/app.config';

export function registerSubscriptionRoutes(
  router: HttpRouter,
  controller = new SubscriptionsController()
): void {
  const prefix = appConfig.app.apiPrefix;

  // 1. Tenant Subscription & Effective Entitlements
  // GET /api/v1/tenants/subscription
  router.get(`${prefix}/tenants/subscription`, async (req) =>
    controller.getTenantSubscription(req)
  );

  // 2. Tenant Workspace Module Activation (Tier 2)
  // GET /api/v1/tenants/workspace-modules
  router.get(`${prefix}/tenants/workspace-modules`, async (req) =>
    controller.getWorkspaceModules(req)
  );

  // PUT /api/v1/tenants/workspace-modules
  router.put(`${prefix}/tenants/workspace-modules`, async (req) =>
    controller.updateWorkspaceModule(req)
  );
}
