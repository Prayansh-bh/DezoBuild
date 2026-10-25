import type { PrismaClient } from '@prisma/client';
import { DatabaseService } from '../../../database/database.service';
import { NotFoundError, BadRequestError } from '../../../common/errors/app-error';
import { CapacityService } from './capacity.service';
import { CANONICAL_FEATURE_KEYS, type CanonicalFeatureKey } from '../constants/plan.catalog';

export interface EffectiveSubscriptionDetails {
  tenantId: string;
  planCode: string;
  planName: string;
  versionNumber?: number;
  versionStatus?: string;
  priceMonthly?: number;
  priceAnnual?: number;
  status: string;
  billingCycle: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt: Date | null;
  cancelAtPeriodEnd: boolean;
  quotas: {
    activeProjects: { current: number; max: number | null; remaining: number | null };
    seats: { current: number; max: number | null; remaining: number | null };
    storageGb: { current: number; max: number | null };
  };
  entitlements: Record<string, boolean>;
  warning?: string;
}

export class EntitlementService {
  private readonly prisma: any;
  private readonly capacityService: CapacityService;

  constructor(prisma?: any, capacityService?: CapacityService) {
    this.prisma = prisma || DatabaseService.getInstance().getClient();
    this.capacityService = capacityService || new CapacityService(this.prisma);
  }

  /**
   * Evaluates live feature entitlement for a tenant against their pinned PlatformPlanVersion.
   * Fail-closed: Denies access if subscription is missing, expired, suspended, or feature is unentitled.
   */
  async isFeatureEntitled(tenantId: string, featureKey: string): Promise<boolean> {
    if (!tenantId || !featureKey) return false;

    // Verify feature key is part of canonical catalog
    if (!CANONICAL_FEATURE_KEYS.includes(featureKey as CanonicalFeatureKey)) {
      return false;
    }

    const sub = await this.prisma.tenantSubscription.findFirst({
      where: { tenantId },
      include: {
        plan: true,
        planVersion: {
          include: {
            features: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!sub || (!sub.plan && !sub.planVersion)) {
      return false;
    }

    const now = new Date();

    // Lifecycle Status Checks
    if (sub.status === 'EXPIRED' || sub.status === 'CANCELLED') {
      return false;
    }

    if (sub.status === 'SUSPENDED') {
      return false;
    }

    if (sub.status === 'TRIAL' && sub.trialEndsAt && now > sub.trialEndsAt) {
      return false;
    }

    if (sub.status === 'PAST_DUE') {
      // 7-day grace period
      const gracePeriodMs = 7 * 24 * 60 * 60 * 1000;
      const graceCutoff = new Date(sub.currentPeriodEnd.getTime() + gracePeriodMs);
      if (now > graceCutoff) {
        return false;
      }
    }

    // 1. Check Tenant-Level Entitlement Override (highest precedence)
    const override = await this.prisma.tenantEntitlementOverride.findFirst({
      where: {
        tenantId,
        subscriptionId: sub.id,
        featureKey,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });

    if (override !== null) {
      return override.isEnabled;
    }

    // 2. Authoritative: Evaluate against Pinned Plan Version Features
    if (sub.planVersion?.features && sub.planVersion.features.length > 0) {
      const versionFeat = sub.planVersion.features.find(
        (f: any) => f.featureKey === featureKey
      );
      if (versionFeat) {
        return versionFeat.isEnabled;
      }
    }

    // 3. Fallback: Legacy Base Plan Feature Mapping
    if (sub.plan) {
      const planFeature = await this.prisma.planFeature.findUnique({
        where: {
          planId_featureKey: {
            planId: sub.plan.id,
            featureKey,
          },
        },
      });

      return planFeature?.isEnabled ?? false;
    }

    return false;
  }

  /**
   * Evaluates effective feature access combining Platform Entitlement (Tier 1)
   * and Tenant Workspace Activation (Tier 2).
   * Effective Active = Platform Entitled && Workspace Enabled
   */
  async isFeatureActive(tenantId: string, featureKey: string): Promise<boolean> {
    const isEntitled = await this.isFeatureEntitled(tenantId, featureKey);
    if (!isEntitled) return false;

    const row = await this.prisma.tenantWorkspaceModule.findUnique({
      where: {
        tenantId_featureKey: {
          tenantId,
          featureKey,
        },
      },
    });

    if (!row) {
      return true; // Default: enabled
    }

    return row.isEnabled;
  }

  /**
   * Returns complete effective subscription, quota utilization, and feature entitlements for a tenant.
   */
  async getEffectiveSubscription(tenantId: string): Promise<EffectiveSubscriptionDetails> {
    const sub = await this.prisma.tenantSubscription.findFirst({
      where: { tenantId },
      include: {
        plan: {
          include: {
            features: true,
          },
        },
        planVersion: {
          include: {
            plan: true,
            features: true,
          },
        },
        overrides: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!sub || (!sub.plan && !sub.planVersion)) {
      throw new NotFoundError(`No active subscription found for tenant ${tenantId}`);
    }

    const projectQuota = await this.capacityService.checkProjectCapacity(tenantId);
    const seatQuota = await this.capacityService.checkSeatCapacity(tenantId);

    // Compute effective entitlements map
    const entitlements: Record<string, boolean> = {};
    for (const featKey of CANONICAL_FEATURE_KEYS) {
      entitlements[featKey] = await this.isFeatureEntitled(tenantId, featKey);
    }

    let warning: string | undefined;
    if (sub.status === 'PAST_DUE') {
      warning = 'Subscription is past due. Please update billing to avoid service suspension.';
    } else if (sub.status === 'TRIAL' && sub.trialEndsAt) {
      const daysLeft = Math.ceil((sub.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 3) {
        warning = `Trial period ends in ${daysLeft} day(s).`;
      }
    }

    const activePlan = sub.planVersion?.plan || sub.plan;
    const activeVersion = sub.planVersion;

    return {
      tenantId: sub.tenantId,
      planCode: activePlan?.code || 'STARTER',
      planName: activePlan?.name || 'Starter Tier',
      versionNumber: activeVersion?.versionNumber || 1,
      versionStatus: activeVersion?.status || 'PUBLISHED',
      priceMonthly: Number(activeVersion?.priceMonthly ?? activePlan?.priceMonthly ?? 0),
      priceAnnual: Number(activeVersion?.priceAnnual ?? activePlan?.priceAnnual ?? 0),
      status: sub.status,
      billingCycle: sub.billingCycle,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      trialEndsAt: sub.trialEndsAt,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      quotas: {
        activeProjects: {
          current: projectQuota.current,
          max: projectQuota.max,
          remaining: projectQuota.remaining,
        },
        seats: {
          current: seatQuota.current,
          max: seatQuota.max,
          remaining: seatQuota.remaining,
        },
        storageGb: {
          current: 0,
          max: activeVersion?.maxStorageGb ?? activePlan?.maxStorageGb ?? null,
        },
      },
      entitlements,
      warning,
    };
  }

  /**
   * Provisions a default subscription for a newly registered tenant pinned to the published plan version.
   */
  async provisionDefaultSubscription(
    tenantId: string,
    planCode = 'STARTER',
    billingCycle = 'ANNUAL'
  ) {
    const plan = await this.prisma.platformPlan.findUnique({
      where: { code: planCode },
      include: {
        versions: {
          where: { status: 'PUBLISHED' },
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!plan) {
      throw new NotFoundError(`Plan ${planCode} not found`);
    }

    // Locate published version, or fallback to any version
    let planVersionId = plan.versions?.[0]?.id;
    if (!planVersionId) {
      const anyVersion = await this.prisma.platformPlanVersion.findFirst({
        where: { planId: plan.id },
        orderBy: { versionNumber: 'desc' },
      });
      planVersionId = anyVersion?.id;
    }

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days trial
    const periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year period

    return this.prisma.tenantSubscription.create({
      data: {
        tenantId,
        planId: plan.id,
        planVersionId: planVersionId || null,
        status: 'TRIAL',
        billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEndsAt,
        cancelAtPeriodEnd: false,
      },
      include: {
        plan: true,
        planVersion: true,
      },
    });
  }

  /**
   * Upgrades or downgrades a tenant's subscription plan, pinning to the currently PUBLISHED version.
   */
  async changePlan(tenantId: string, newPlanCode: string) {
    const plan = await this.prisma.platformPlan.findUnique({
      where: { code: newPlanCode },
      include: {
        versions: {
          where: { status: 'PUBLISHED' },
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!plan) {
      throw new BadRequestError(`Plan with code '${newPlanCode}' does not exist.`);
    }

    const publishedVersion = plan.versions?.[0];
    const planVersionId = publishedVersion?.id;

    const currentSub = await this.prisma.tenantSubscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    if (!currentSub) {
      return this.provisionDefaultSubscription(tenantId, newPlanCode);
    }

    return this.prisma.tenantSubscription.update({
      where: { id: currentSub.id },
      data: {
        planId: plan.id,
        planVersionId: planVersionId || null,
        status: 'ACTIVE',
        trialEndsAt: null,
        updatedAt: new Date(),
      },
      include: {
        plan: true,
        planVersion: true,
      },
    });
  }

  /**
   * Sets a tenant-level entitlement or capacity override.
   */
  async setOverride(params: {
    tenantId: string;
    featureKey: string;
    isEnabled: boolean;
    additionalProjects?: number | null;
    additionalSeats?: number | null;
    expiresAt?: Date | null;
  }) {
    const sub = await this.prisma.tenantSubscription.findFirst({
      where: { tenantId: params.tenantId },
      orderBy: { createdAt: 'desc' },
    });

    if (!sub) {
      throw new NotFoundError(`No active subscription found for tenant ${params.tenantId}`);
    }

    return this.prisma.tenantEntitlementOverride.upsert({
      where: {
        subscriptionId_featureKey: {
          subscriptionId: sub.id,
          featureKey: params.featureKey,
        },
      },
      update: {
        isEnabled: params.isEnabled,
        additionalProjects: params.additionalProjects ?? null,
        additionalSeats: params.additionalSeats ?? null,
        expiresAt: params.expiresAt ?? null,
        updatedAt: new Date(),
      },
      create: {
        tenantId: params.tenantId,
        subscriptionId: sub.id,
        featureKey: params.featureKey,
        isEnabled: params.isEnabled,
        additionalProjects: params.additionalProjects ?? null,
        additionalSeats: params.additionalSeats ?? null,
        expiresAt: params.expiresAt ?? null,
      },
    });
  }
}

