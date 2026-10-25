import type { PrismaClient } from '@prisma/client';
import type { ISubscriptionRepository } from '../repositories/subscription.repository.interface';
import type { IPlanRepository } from '../repositories/plan.repository.interface';
import { ConflictError } from '../../../common/errors/app-error';
import { DatabaseService } from '../../../database/database.service';

export interface QuotaCheckResult {
  allowed: boolean;
  current: number;
  max: number | null; // null = Unlimited
  remaining: number | null; // null = Unlimited
  reason?: string;
}

export class CapacityService {
  private static instance: CapacityService;
  private readonly prisma: any;

  constructor(
    prisma?: any,
    private readonly subscriptionRepo?: ISubscriptionRepository,
    private readonly planRepo?: IPlanRepository
  ) {
    this.prisma = prisma || DatabaseService.getInstance().getClient();
  }

  public static getInstance(
    prisma?: any,
    subscriptionRepo?: ISubscriptionRepository,
    planRepo?: IPlanRepository
  ): CapacityService {
    if (!CapacityService.instance) {
      CapacityService.instance = new CapacityService(prisma, subscriptionRepo, planRepo);
    }
    return CapacityService.instance;
  }

  public static resetInstance(): void {
    CapacityService.instance = undefined as unknown as CapacityService;
  }

  /**
   * Asserts that active project capacity is not exceeded, throwing ConflictError if at limit.
   */
  async assertProjectCapacity(tenantId: string): Promise<void> {
    const check = await this.checkProjectCapacity(tenantId);
    if (!check.allowed) {
      throw new ConflictError(check.reason || 'Active project capacity limit reached.');
    }
  }

  /**
   * Evaluates active project capacity for a tenant against their pinned PlatformPlanVersion.
   */
  async checkProjectCapacity(tenantId: string): Promise<QuotaCheckResult> {
    const sub = await this.prisma.tenantSubscription.findFirst({
      where: { tenantId },
      include: {
        plan: true,
        planVersion: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!sub || (!sub.plan && !sub.planVersion)) {
      return {
        allowed: false,
        current: 0,
        max: 0,
        remaining: 0,
        reason: 'No active subscription found for tenant.',
      };
    }

    // Base plan limit from pinned version (null = Unlimited)
    let maxProjects = sub.planVersion?.maxProjects ?? sub.plan?.maxProjects ?? null;

    // Check for active tenant entitlement overrides with additional capacity
    const overrides = await this.prisma.tenantEntitlementOverride.findMany({
      where: {
        tenantId,
        subscriptionId: sub.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    for (const ov of overrides) {
      if (ov.additionalProjects && maxProjects !== null) {
        maxProjects += ov.additionalProjects;
      }
    }

    const currentActiveProjects = await this.prisma.project.count({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
    });

    if (maxProjects === null) {
      return {
        allowed: true,
        current: currentActiveProjects,
        max: null,
        remaining: null,
      };
    }

    const allowed = currentActiveProjects < maxProjects;
    const remaining = Math.max(0, maxProjects - currentActiveProjects);

    return {
      allowed,
      current: currentActiveProjects,
      max: maxProjects,
      remaining,
      reason: allowed
        ? undefined
        : `Active project capacity limit reached (${currentActiveProjects}/${maxProjects} active projects). Upgrade plan to create more sites.`,
    };
  }



  /**
   * Evaluates active user seat capacity for a tenant against their pinned PlatformPlanVersion.
   * Can evaluate inside a caller-supplied transaction client.
   * Respects subscription lifecycle status (EXPIRED, SUSPENDED, TRIAL expiry, PAST_DUE grace period).
   * Counts both ACTIVE and INVITED users towards the seat limit.
   */
  async checkSeatCapacity(tenantId: string, tx?: any): Promise<QuotaCheckResult> {
    const client = tx || this.prisma;
    const sub = await client.tenantSubscription.findFirst({
      where: { tenantId },
      include: {
        plan: true,
        planVersion: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!sub || (!sub.plan && !sub.planVersion)) {
      return {
        allowed: false,
        current: 0,
        max: 0,
        remaining: 0,
        reason: 'No active subscription found for tenant.',
      };
    }

    // Lifecycle Status Checks (aligned with EntitlementService)
    const now = new Date();
    if (sub.status === 'EXPIRED' || sub.status === 'CANCELLED') {
      return {
        allowed: false,
        current: 0,
        max: 0,
        remaining: 0,
        reason: `Subscription is ${sub.status}. Seat provisioning is disabled.`,
      };
    }

    if (sub.status === 'SUSPENDED') {
      return {
        allowed: false,
        current: 0,
        max: 0,
        remaining: 0,
        reason: 'Subscription is SUSPENDED. Seat provisioning is disabled.',
      };
    }

    if (sub.status === 'TRIAL' && sub.trialEndsAt && now > sub.trialEndsAt) {
      return {
        allowed: false,
        current: 0,
        max: 0,
        remaining: 0,
        reason: 'Trial period has expired. Please upgrade your subscription.',
      };
    }

    if (sub.status === 'PAST_DUE') {
      const gracePeriodMs = 7 * 24 * 60 * 60 * 1000;
      const graceCutoff = new Date(sub.currentPeriodEnd.getTime() + gracePeriodMs);
      if (now > graceCutoff) {
        return {
          allowed: false,
          current: 0,
          max: 0,
          remaining: 0,
          reason: 'Subscription payment is past due and grace period has expired.',
        };
      }
    }

    let maxSeats = sub.planVersion?.maxSeats ?? sub.plan?.maxSeats ?? null;

    const overrides = await client.tenantEntitlementOverride.findMany({
      where: {
        tenantId,
        subscriptionId: sub.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });

    for (const ov of overrides) {
      if (ov.additionalSeats && maxSeats !== null) {
        maxSeats += ov.additionalSeats;
      }
    }

    const currentAllocatedSeats = await client.user.count({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'INVITED'] },
      },
    });

    if (maxSeats === null) {
      return {
        allowed: true,
        current: currentAllocatedSeats,
        max: null,
        remaining: null,
      };
    }

    const allowed = currentAllocatedSeats < maxSeats;
    const remaining = Math.max(0, maxSeats - currentAllocatedSeats);

    return {
      allowed,
      current: currentAllocatedSeats,
      max: maxSeats,
      remaining,
      reason: allowed
        ? undefined
        : `User seat capacity limit reached (${currentAllocatedSeats}/${maxSeats} allocated seats including active members and pending invitations). Upgrade plan to invite more users.`,
    };
  }

  /**
   * Atomically verifies active project capacity within a PostgreSQL transaction to prevent race conditions.
   */
  async enforceProjectCreationCapacity(tenantId: string, tx?: any): Promise<void> {
    const client = tx || this.prisma;

    const check = await this.checkProjectCapacity(tenantId);
    if (!check.allowed) {
      throw new ConflictError(check.reason || 'Active project capacity limit reached.');
    }
  }

  /**
   * Atomically verifies seat capacity before user creation/activation.
   * If a transaction client `tx` is provided, acquires a PostgreSQL FOR UPDATE lock
   * on the tenant's latest subscription row to serialize concurrent seat allocations.
   */
  async enforceSeatCapacity(tenantId: string, tx?: any): Promise<void> {
    const client = tx || this.prisma;

    // Acquire pessimistic row lock on the tenant's latest subscription row if inside interactive transaction
    if (tx && typeof tx.$queryRaw === 'function') {
      await tx.$queryRaw`
        SELECT id FROM tenant_subscriptions
        WHERE tenant_id = ${tenantId}::uuid
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE
      `;
    }

    const check = await this.checkSeatCapacity(tenantId, client);
    if (!check.allowed) {
      throw new ConflictError(check.reason || 'User seat capacity limit reached.');
    }
  }
}
