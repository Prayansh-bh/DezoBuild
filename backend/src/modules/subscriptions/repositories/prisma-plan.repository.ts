import type { PrismaClient } from '@prisma/client';
import type {
  IPlanRepository,
  PlatformPlanEntity,
  PlanFeatureEntity,
} from './plan.repository.interface';
import { DatabaseService } from '../../../database/database.service';

export class PrismaPlanRepository implements IPlanRepository {
  private readonly prismaClient?: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prismaClient = prismaClient;
  }

  private get prisma(): any {
    return this.prismaClient || DatabaseService.getInstance().getClient();
  }

  public async findById(id: string): Promise<PlatformPlanEntity | null> {
    const record = await this.prisma.platformPlan.findUnique({
      where: { id },
    });
    return record ? this.mapPlan(record) : null;
  }

  public async findByCode(code: string): Promise<PlatformPlanEntity | null> {
    const record = await this.prisma.platformPlan.findUnique({
      where: { code },
    });
    return record ? this.mapPlan(record) : null;
  }

  public async findAllActive(): Promise<PlatformPlanEntity[]> {
    const records = await this.prisma.platformPlan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });
    return records.map((r: any) => this.mapPlan(r));
  }

  public async getPlanFeatures(planId: string): Promise<PlanFeatureEntity[]> {
    const records = await this.prisma.planFeature.findMany({
      where: { planId },
    });
    return records.map((r: any) => ({
      id: r.id,
      planId: r.planId,
      featureKey: r.featureKey,
      isEnabled: r.isEnabled,
      createdAt: r.createdAt,
    }));
  }

  private mapPlan(record: any): PlatformPlanEntity {
    return {
      id: record.id,
      code: record.code,
      name: record.name,
      description: record.description,
      priceMonthly: Number(record.priceMonthly),
      priceAnnual: Number(record.priceAnnual),
      maxProjects: record.maxProjects,
      maxSeats: record.maxSeats,
      maxStorageGb: record.maxStorageGb,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}

