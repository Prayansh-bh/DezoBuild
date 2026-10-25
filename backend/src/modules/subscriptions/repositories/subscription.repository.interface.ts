import type { PlatformPlanEntity } from './plan.repository.interface';

export interface TenantSubscriptionEntity {
  id: string;
  tenantId: string;
  planId: string;
  status: string;
  billingCycle: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt: Date | null;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
  plan?: PlatformPlanEntity;
}

export interface TenantEntitlementOverrideEntity {
  id: string;
  tenantId: string;
  subscriptionId: string;
  featureKey: string;
  isEnabled: boolean;
  additionalProjects: number | null;
  additionalSeats: number | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubscriptionParams {
  id?: string;
  tenantId: string;
  planId: string;
  status?: string;
  billingCycle?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd: Date;
  trialEndsAt?: Date | null;
  cancelAtPeriodEnd?: boolean;
}

export interface SetOverrideParams {
  tenantId: string;
  subscriptionId: string;
  featureKey: string;
  isEnabled: boolean;
  additionalProjects?: number | null;
  additionalSeats?: number | null;
  expiresAt?: Date | null;
}

export interface ISubscriptionRepository {
  findActiveByTenantId(tenantId: string): Promise<TenantSubscriptionEntity | null>;
  findAllByTenantId(tenantId: string): Promise<TenantSubscriptionEntity[]>;
  createSubscription(params: CreateSubscriptionParams): Promise<TenantSubscriptionEntity>;
  updateStatus(id: string, status: string): Promise<TenantSubscriptionEntity>;
  updatePlan(id: string, planId: string): Promise<TenantSubscriptionEntity>;
  findOverrides(tenantId: string): Promise<TenantEntitlementOverrideEntity[]>;
  setOverride(params: SetOverrideParams): Promise<TenantEntitlementOverrideEntity>;
  removeOverride(subscriptionId: string, featureKey: string): Promise<boolean>;
}
