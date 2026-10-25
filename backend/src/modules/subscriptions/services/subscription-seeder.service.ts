import type { PrismaClient } from '@prisma/client';
import {
  PLAN_DEFINITIONS,
  PLAN_FEATURE_MATRIX,
  FEATURE_DEFINITIONS,
  type CanonicalPlanCode,
} from '../constants/plan.catalog';

export class SubscriptionSeederService {
  constructor(private readonly prisma: any) {}

  /**
   * Idempotently seeds platform plans and plan-feature entitlement mappings.
   * Non-destructive: Does NOT overwrite existing plans or published/draft versions.
   */
  async seedAll(): Promise<{ plansCount: number; featuresCount: number; mappingsCount: number }> {
    const plansCount = await this.seedPlans();
    const { featuresCount, mappingsCount } = await this.seedPlanFeatures();
    return { plansCount, featuresCount, mappingsCount };
  }

  /**
   * Seeds commercial plan tiers (STARTER, PROFESSIONAL, ENTERPRISE) with Version 1 if not present.
   */
  async seedPlans(): Promise<number> {
    let count = 0;
    for (const planDef of PLAN_DEFINITIONS) {
      const existingPlan = await this.prisma.platformPlan.findUnique({
        where: { code: planDef.code },
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' },
          },
        },
      });

      if (!existingPlan) {
        // Create initial PlatformPlan
        const createdPlan = await this.prisma.platformPlan.create({
          data: {
            code: planDef.code,
            name: planDef.name,
            description: planDef.description,
            maxProjects: planDef.maxProjects,
            maxSeats: planDef.maxSeats,
            maxStorageGb: planDef.maxStorageGb,
            priceMonthly: planDef.priceMonthly,
            priceAnnual: planDef.priceAnnual,
            isActive: true,
          },
        });

        // Create Version 1 as PUBLISHED
        const v1 = await this.prisma.platformPlanVersion.create({
          data: {
            planId: createdPlan.id,
            versionNumber: 1,
            status: 'PUBLISHED',
            priceMonthly: planDef.priceMonthly,
            priceAnnual: planDef.priceAnnual,
            maxProjects: planDef.maxProjects,
            maxSeats: planDef.maxSeats,
            maxStorageGb: planDef.maxStorageGb,
            effectiveFrom: new Date(),
          },
        });

        // Seed Version 1 features
        const allowedFeatures = new Set(PLAN_FEATURE_MATRIX[planDef.code as CanonicalPlanCode] || []);
        for (const featDef of FEATURE_DEFINITIONS) {
          const isEnabled = allowedFeatures.has(featDef.key);
          await this.prisma.planVersionFeature.create({
            data: {
              planVersionId: v1.id,
              featureKey: featDef.key,
              isEnabled,
            },
          });
        }

        // Set activeVersionId on plan
        await this.prisma.platformPlan.update({
          where: { id: createdPlan.id },
          data: { activeVersionId: v1.id },
        });

        count++;
      } else {
        // Plan exists. Verify if it has at least one version (backfill if missing)
        if (!existingPlan.versions || existingPlan.versions.length === 0) {
          const v1 = await this.prisma.platformPlanVersion.create({
            data: {
              planId: existingPlan.id,
              versionNumber: 1,
              status: 'PUBLISHED',
              priceMonthly: existingPlan.priceMonthly,
              priceAnnual: existingPlan.priceAnnual,
              maxProjects: existingPlan.maxProjects,
              maxSeats: existingPlan.maxSeats,
              maxStorageGb: existingPlan.maxStorageGb,
              effectiveFrom: new Date(),
            },
          });

          const allowedFeatures = new Set(PLAN_FEATURE_MATRIX[existingPlan.code as CanonicalPlanCode] || []);
          for (const featDef of FEATURE_DEFINITIONS) {
            const isEnabled = allowedFeatures.has(featDef.key);
            await this.prisma.planVersionFeature.create({
              data: {
                planVersionId: v1.id,
                featureKey: featDef.key,
                isEnabled,
              },
            });
          }

          await this.prisma.platformPlan.update({
            where: { id: existingPlan.id },
            data: { activeVersionId: v1.id },
          });
        }
        // Do NOT overwrite existing plan parameters or published versions!
        count++;
      }
    }
    return count;
  }

  /**
   * Seeds legacy PlanFeature mappings for backward compatibility if not present.
   */
  async seedPlanFeatures(): Promise<{ featuresCount: number; mappingsCount: number }> {
    let mappingsCount = 0;
    const plans = await this.prisma.platformPlan.findMany();

    for (const plan of plans) {
      const allowedFeatures = new Set(PLAN_FEATURE_MATRIX[plan.code as CanonicalPlanCode] || []);

      for (const featDef of FEATURE_DEFINITIONS) {
        const isEnabled = allowedFeatures.has(featDef.key);

        const existing = await this.prisma.planFeature.findUnique({
          where: {
            planId_featureKey: {
              planId: plan.id,
              featureKey: featDef.key,
            },
          },
        });

        if (!existing) {
          await this.prisma.planFeature.create({
            data: {
              planId: plan.id,
              featureKey: featDef.key,
              isEnabled,
            },
          });
        }
        mappingsCount++;
      }
    }

    return {
      featuresCount: FEATURE_DEFINITIONS.length,
      mappingsCount,
    };
  }
}

