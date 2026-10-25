import type { IncomingMessage } from 'node:http';
import {
  ForbiddenError,
  FeatureNotEntitledError,
  FeatureDisabledError,
} from '../../../common/errors/app-error';
import { requireAuth, type AuthenticatedPrincipal } from '../../auth/auth.guard';
import { EntitlementService } from '../services/entitlement.service';
import { WorkspaceModuleService } from '../services/workspace-module.service';
import { DatabaseService } from '../../../database/database.service';

export class EntitlementGuard {
  private static entitlementService: EntitlementService = new EntitlementService(
    DatabaseService.getInstance().getClient()
  );
  private static workspaceModuleService: WorkspaceModuleService = new WorkspaceModuleService(
    DatabaseService.getInstance().getClient()
  );

  public static setEntitlementService(service: EntitlementService): void {
    this.entitlementService = service;
  }

  public static setWorkspaceModuleService(service: WorkspaceModuleService): void {
    this.workspaceModuleService = service;
  }

  /**
   * Enforces that the caller's tenant subscription entitles the required product feature
   * AND that the feature is enabled in the tenant's workspace settings.
   *
   * Fail-closed:
   * - Throws FeatureNotEntitledError (403, FEATURE_NOT_ENTITLED) if unentitled or subscription expired.
   * - Throws FeatureDisabledError (403, FEATURE_DISABLED) if entitled but disabled in tenant workspace.
   */
  public static async requireFeature(
    req: IncomingMessage,
    featureKey: string
  ): Promise<AuthenticatedPrincipal> {
    const principal = await requireAuth(req);

    // 1. Platform Entitlement Check (Tier 1)
    const isEntitled = await this.entitlementService.isFeatureEntitled(
      principal.tenantId,
      featureKey
    );

    if (!isEntitled) {
      throw new FeatureNotEntitledError(
        `Forbidden: Tenant subscription does not entitle feature '${featureKey}'. Upgrade subscription plan to access this capability.`
      );
    }

    // 2. Tenant Workspace Activation Check (Tier 2)
    const isWorkspaceEnabled = await this.workspaceModuleService.isWorkspaceModuleEnabled(
      principal.tenantId,
      featureKey
    );

    if (!isWorkspaceEnabled) {
      throw new FeatureDisabledError(
        `Forbidden: Feature '${featureKey}' is currently disabled in your tenant workspace settings.`
      );
    }

    return principal;
  }

  /**
   * Explicit alias for requireFeature verifying both Tier 1 Platform Entitlement and Tier 2 Workspace Activation.
   */
  public static async requireActiveFeature(
    req: IncomingMessage,
    featureKey: string
  ): Promise<AuthenticatedPrincipal> {
    return this.requireFeature(req, featureKey);
  }

  /**
   * Verifies that the tenant has an active, valid subscription before allowing mutations.
   */
  public static async requireActiveSubscription(
    req: IncomingMessage
  ): Promise<AuthenticatedPrincipal> {
    const principal = await requireAuth(req);
    const sub = await this.entitlementService.getEffectiveSubscription(principal.tenantId);

    if (sub.status === 'EXPIRED' || sub.status === 'SUSPENDED' || sub.status === 'CANCELLED') {
      throw new ForbiddenError(
        `Forbidden: Tenant subscription is ${sub.status}. Please renew subscription to perform operations.`
      );
    }

    return principal;
  }
}

export function requireFeature(featureKey: string) {
  return async (req: IncomingMessage) => EntitlementGuard.requireFeature(req, featureKey);
}

export function requireActiveFeature(featureKey: string) {
  return async (req: IncomingMessage) => EntitlementGuard.requireActiveFeature(req, featureKey);
}

export function requireActiveSubscription() {
  return async (req: IncomingMessage) => EntitlementGuard.requireActiveSubscription(req);
}
