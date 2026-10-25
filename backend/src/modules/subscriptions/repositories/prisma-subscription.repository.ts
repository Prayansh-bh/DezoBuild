import type { PrismaClient } from '@prisma/client';
import type {
  ISubscriptionRepository,
  TenantSubscriptionEntity,
  TenantEntitlementOverrideEntity,
  CreateSubscriptionParams,
  SetOverrideParams,
} from './subscription.repository.interface';
import { DatabaseService } from '../../../database/database.service';

export class PrismaSubscriptionRepository implements ISubscriptionRepository {
  private readonly prismaClient?: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prismaClient = prismaClient;
  }

  private get prisma(): any {
    return this.prismaClient || DatabaseService.getInstance().getClient();
  }

  public async findActiveByTenantId(tenantId: string): Promise<TenantSubscriptionEntity | null> {
    const record = await this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return record ? this.mapSubscription(record) : null;
  }

  public async findAllByTenantId(tenantId: string): Promise<TenantSubscriptionEntity[]> {
    const records = await this.prisma.tenantSubscription.findMany({
      where: { tenantId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r: any) => this.mapSubscription(r));
  }

  public async createSubscription(params: CreateSubscriptionParams): Promise<TenantSubscriptionEntity> {
    const record = await this.prisma.tenantSubscription.create({
      data: {
        id: params.id,
        tenantId: params.tenantId,
        planId: params.planId,
        status: params.status || 'ACTIVE',
        billingCycle: params.billingCycle || 'ANNUAL',
        currentPeriodStart: params.currentPeriodStart || new Date(),
        currentPeriodEnd: params.currentPeriodEnd,
        trialEndsAt: params.trialEndsAt || null,
        cancelAtPeriodEnd: params.cancelAtPeriodEnd ?? false,
      },
      include: {
        plan: true,
      },
    });
    return this.mapSubscription(record);
  }

  public async updateStatus(id: string, status: string): Promise<TenantSubscriptionEntity> {
    const record = await this.prisma.tenantSubscription.update({
      where: { id },
      data: { status, updatedAt: new Date() },
      include: { plan: true },
    });
    return this.mapSubscription(record);
  }

  public async updatePlan(id: string, planId: string): Promise<TenantSubscriptionEntity> {
    const record = await this.prisma.tenantSubscription.update({
      where: { id },
      data: { planId, updatedAt: new Date() },
      include: { plan: true },
    });
    return this.mapSubscription(record);
  }

  public async findOverrides(tenantId: string): Promise<TenantEntitlementOverrideEntity[]> {
    const records = await this.prisma.tenantEntitlementOverride.findMany({
      where: { tenantId },
    });
    return records.map((r: any) => ({
      id: r.id,
      tenantId: r.tenantId,
      subscriptionId: r.subscriptionId,
      featureKey: r.featureKey,
      isEnabled: r.isEnabled,
      additionalProjects: r.additionalProjects,
      additionalSeats: r.additionalSeats,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  public async setOverride(params: SetOverrideParams): Promise<TenantEntitlementOverrideEntity> {
    const record = await this.prisma.tenantEntitlementOverride.upsert({
      where: {
        subscriptionId_featureKey: {
          subscriptionId: params.subscriptionId,
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
        subscriptionId: params.subscriptionId,
        featureKey: params.featureKey,
        isEnabled: params.isEnabled,
        additionalProjects: params.additionalProjects ?? null,
        additionalSeats: params.additionalSeats ?? null,
        expiresAt: params.expiresAt ?? null,
      },
    });

    return {
      id: record.id,
      tenantId: record.tenantId,
      subscriptionId: record.subscriptionId,
      featureKey: record.featureKey,
      isEnabled: record.isEnabled,
      additionalProjects: record.additionalProjects,
      additionalSeats: record.additionalSeats,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  public async removeOverride(subscriptionId: string, featureKey: string): Promise<boolean> {
    const result = await this.prisma.tenantEntitlementOverride.deleteMany({
      where: { subscriptionId, featureKey },
    });
    return result.count > 0;
  }

  private mapSubscription(record: any): TenantSubscriptionEntity {
    return {
      id: record.id,
      tenantId: record.tenantId,
      planId: record.planId,
      status: record.status,
      billingCycle: record.billingCycle,
      currentPeriodStart: record.currentPeriodStart,
      currentPeriodEnd: record.currentPeriodEnd,
      trialEndsAt: record.trialEndsAt,
      cancelAtPeriodEnd: record.cancelAtPeriodEnd,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      plan: record.plan
        ? {
            id: record.plan.id,
            code: record.plan.code,
            name: record.plan.name,
            description: record.plan.description,
            maxProjects: record.plan.maxProjects,
            maxSeats: record.plan.maxSeats,
            maxStorageGb: record.plan.maxStorageGb,
            priceMonthly: Number(record.plan.priceMonthly),
            priceAnnual: Number(record.plan.priceAnnual),
            isActive: record.plan.isActive,
            createdAt: record.plan.createdAt,
            updatedAt: record.plan.updatedAt,
          }
        : undefined,
    };
  }
}
