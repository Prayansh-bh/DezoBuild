import { ownerApiClient } from "./client";
import { platformAuthApi } from "./auth";

export interface EffectiveSubscriptionDetails {
  tenantId: string;
  planCode: string;
  planName: string;
  status: string;
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  quotas: {
    activeProjects: { current: number; max: number | null; remaining: number | null };
    seats: { current: number; max: number | null; remaining: number | null };
    storageGb: { current: number; max: number | null };
  };
  entitlements: Record<string, boolean>;
  warning?: string;
}

export interface UpdateEntitlementOverrideDto {
  featureKey: string;
  isEnabled: boolean;
  additionalProjects?: number | null;
  additionalSeats?: number | null;
  expiresAt?: string | null;
}

export const platformEntitlementsApi = {
  async getTenantEntitlements(tenantId: string): Promise<EffectiveSubscriptionDetails> {
    await platformAuthApi.ensureAuthenticated();
    return ownerApiClient.get<EffectiveSubscriptionDetails>(`/platform/tenants/${tenantId}/entitlements`);
  },

  async updateOverride(
    tenantId: string,
    dto: UpdateEntitlementOverrideDto
  ): Promise<EffectiveSubscriptionDetails> {
    await platformAuthApi.ensureAuthenticated();
    return ownerApiClient.put<EffectiveSubscriptionDetails>(`/platform/tenants/${tenantId}/entitlements`, dto);
  },

  async changePlan(
    tenantId: string,
    planCode: "STARTER" | "PROFESSIONAL" | "ENTERPRISE"
  ): Promise<EffectiveSubscriptionDetails> {
    await platformAuthApi.ensureAuthenticated();
    return ownerApiClient.put<EffectiveSubscriptionDetails>(`/platform/tenants/${tenantId}/plan`, { planCode });
  },
};
