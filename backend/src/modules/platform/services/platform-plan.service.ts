import { DatabaseService } from "../../../database/database.service";
import { NotFoundError, BadRequestError } from "../../../common/errors/app-error";
import { PlatformAuditService } from "./platform-audit.service";
import {
  CANONICAL_FEATURE_KEYS,
  PLAN_FEATURE_MATRIX,
  type CanonicalPlanCode,
} from "../../subscriptions/constants/plan.catalog";
import type { SavePlanDraftDto } from "../dto/platform.dto";

export interface PlanVersionDto {
  id: string;
  versionNumber: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  priceMonthly: number;
  priceAnnual: number;
  maxProjects: number | null;
  maxSeats: number | null;
  maxStorageGb: number | null;
  effectiveFrom: string | null;
  createdAt: string;
  updatedAt: string;
  features: Record<string, boolean>;
}

export interface PlatformPlanDetailDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  activeTenants: number;
  publishedVersion: PlanVersionDto | null;
  draftVersion: PlanVersionDto | null;
  versionCount: number;
  versions?: PlanVersionDto[];
}

export class PlatformPlanService {
  private static instance: PlatformPlanService;
  private readonly prisma: any;
  private readonly auditService: PlatformAuditService;

  constructor(prismaClient?: any, auditService?: PlatformAuditService) {
    this.prisma = prismaClient || DatabaseService.getInstance().getClient();
    this.auditService = auditService || PlatformAuditService.getInstance(this.prisma);
  }

  public static getInstance(prismaClient?: any, auditService?: PlatformAuditService): PlatformPlanService {
    if (!PlatformPlanService.instance || prismaClient) {
      PlatformPlanService.instance = new PlatformPlanService(prismaClient, auditService);
    }
    return PlatformPlanService.instance;
  }

  public static resetInstance(): void {
    PlatformPlanService.instance = undefined as unknown as PlatformPlanService;
  }

  /**
   * Lists all global platform plan tiers with active published versions and any pending drafts.
   */
  public async listPlans(): Promise<PlatformPlanDetailDto[]> {
    const plans = await this.prisma.platformPlan.findMany({
      include: {
        versions: {
          include: {
            features: true,
          },
          orderBy: { versionNumber: "desc" },
        },
        subscriptions: {
          select: { id: true, status: true },
        },
      },
      orderBy: { code: "asc" },
    });

    return plans.map((plan: any) => this.mapPlanDetail(plan, false));
  }

  private buildPlanWhere(planIdOrCode: string): Record<string, unknown> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planIdOrCode);
    return isUuid ? { OR: [{ id: planIdOrCode }, { code: planIdOrCode }] } : { code: planIdOrCode };
  }

  /**
   * Retrieves single plan detail with full version history.
   */
  public async getPlan(planIdOrCode: string): Promise<PlatformPlanDetailDto> {
    const plan = await this.prisma.platformPlan.findFirst({
      where: this.buildPlanWhere(planIdOrCode),
      include: {
        versions: {
          include: {
            features: true,
          },
          orderBy: { versionNumber: "desc" },
        },
        subscriptions: {
          select: { id: true, status: true },
        },
      },
    });

    if (!plan) {
      throw new NotFoundError(`Platform plan '${planIdOrCode}' not found.`);
    }

    return this.mapPlanDetail(plan, true);
  }

  /**
   * Creates or updates a DRAFT version for a global tier.
   * Modifying a draft does NOT affect active or newly subscribed tenants until published.
   */
  public async saveDraft(
    planIdOrCode: string,
    dto: SavePlanDraftDto,
    actorId: string,
    ipAddress?: string
  ): Promise<PlatformPlanDetailDto> {
    const plan = await this.prisma.platformPlan.findFirst({
      where: this.buildPlanWhere(planIdOrCode),
      include: {
        versions: {
          include: { features: true },
          orderBy: { versionNumber: "desc" },
        },
      },
    });

    if (!plan) {
      throw new NotFoundError(`Platform plan '${planIdOrCode}' not found.`);
    }

    const existingDraft = plan.versions.find((v: any) => v.status === "DRAFT");
    const latestPublished = plan.versions.find((v: any) => v.status === "PUBLISHED");

    return this.prisma.$transaction(async (tx: any) => {
      let draftId: string;
      let versionNumber: number;
      let isNewDraft = false;

      if (existingDraft) {
        draftId = existingDraft.id;
        versionNumber = existingDraft.versionNumber;

        await tx.platformPlanVersion.update({
          where: { id: draftId },
          data: {
            priceMonthly: dto.priceMonthly,
            priceAnnual: dto.priceAnnual,
            maxProjects: dto.maxProjects !== undefined ? dto.maxProjects : existingDraft.maxProjects,
            maxSeats: dto.maxSeats !== undefined ? dto.maxSeats : existingDraft.maxSeats,
            maxStorageGb: dto.maxStorageGb !== undefined ? dto.maxStorageGb : existingDraft.maxStorageGb,
            updatedAt: new Date(),
          },
        });
      } else {
        isNewDraft = true;
        const highestVersion = plan.versions[0]?.versionNumber || 0;
        versionNumber = highestVersion + 1;

        const newDraft = await tx.platformPlanVersion.create({
          data: {
            planId: plan.id,
            versionNumber,
            status: "DRAFT",
            priceMonthly: dto.priceMonthly,
            priceAnnual: dto.priceAnnual,
            maxProjects: dto.maxProjects !== undefined ? dto.maxProjects : latestPublished?.maxProjects ?? null,
            maxSeats: dto.maxSeats !== undefined ? dto.maxSeats : latestPublished?.maxSeats ?? null,
            maxStorageGb: dto.maxStorageGb !== undefined ? dto.maxStorageGb : latestPublished?.maxStorageGb ?? null,
          },
        });
        draftId = newDraft.id;
      }

      // Sync feature flags for this draft
      if (dto.features) {
        for (const featKey of CANONICAL_FEATURE_KEYS) {
          const isEnabled = dto.features[featKey] !== undefined ? Boolean(dto.features[featKey]) : false;
          await tx.planVersionFeature.upsert({
            where: {
              planVersionId_featureKey: {
                planVersionId: draftId,
                featureKey: featKey,
              },
            },
            update: { isEnabled },
            create: {
              planVersionId: draftId,
              featureKey: featKey,
              isEnabled,
            },
          });
        }
      } else if (isNewDraft) {
        // Default features from previous published version or canonical matrix
        const baseFeatures = latestPublished
          ? new Map(latestPublished.features.map((f: any) => [f.featureKey, f.isEnabled]))
          : new Map(
              (PLAN_FEATURE_MATRIX[plan.code as CanonicalPlanCode] || []).map((k) => [k, true])
            );

        for (const featKey of CANONICAL_FEATURE_KEYS) {
          const isEnabled = baseFeatures.get(featKey) ?? false;
          await tx.planVersionFeature.create({
            data: {
              planVersionId: draftId,
              featureKey: featKey,
              isEnabled,
            },
          });
        }
      }

      // Update plan description if provided
      if (dto.description !== undefined) {
        await tx.platformPlan.update({
          where: { id: plan.id },
          data: { description: dto.description.trim() },
        });
      }

      this.auditService.record({
        actorId,
        action: isNewDraft ? "PLAN_DRAFT_CREATED" : "PLAN_DRAFT_UPDATED",
        targetPlanId: plan.id,
        targetPlanCode: plan.code,
        details: {
          versionNumber,
          priceMonthly: dto.priceMonthly,
          priceAnnual: dto.priceAnnual,
          maxProjects: dto.maxProjects,
          maxSeats: dto.maxSeats,
          maxStorageGb: dto.maxStorageGb,
        },
        ipAddress,
      });

      // 5. Fetch updated plan detail
      const updatedPlan = await tx.platformPlan.findUnique({
        where: { id: plan.id },
        include: {
          versions: {
            include: { features: true },
            orderBy: { versionNumber: "desc" },
          },
          subscriptions: {
            select: { id: true, status: true },
          },
        },
      });

      return this.mapPlanDetail(updatedPlan, true);
    });
  }

  /**
   * Atomically publishes the active DRAFT version of a plan.
   * Archives the previous published version, activates the new version for future subscribers,
   * while existing tenant subscriptions remain pinned to their historical version.
   */
  public async publishPlan(
    planIdOrCode: string,
    actorId: string,
    ipAddress?: string
  ): Promise<PlatformPlanDetailDto> {
    const plan = await this.prisma.platformPlan.findFirst({
      where: this.buildPlanWhere(planIdOrCode),
      include: {
        versions: {
          include: { features: true },
          orderBy: { versionNumber: "desc" },
        },
      },
    });

    if (!plan) {
      throw new NotFoundError(`Platform plan '${planIdOrCode}' not found.`);
    }

    const draft = plan.versions.find((v: any) => v.status === "DRAFT");
    if (!draft) {
      throw new BadRequestError(`No active draft exists for plan tier '${plan.code}' to publish.`);
    }

    const previousPublished = plan.versions.find((v: any) => v.status === "PUBLISHED");

    return this.prisma.$transaction(async (tx: any) => {
      // 1. Archive previously published versions
      await tx.platformPlanVersion.updateMany({
        where: {
          planId: plan.id,
          status: "PUBLISHED",
        },
        data: {
          status: "ARCHIVED",
          updatedAt: new Date(),
        },
      });

      // 2. Publish draft
      const published = await tx.platformPlanVersion.update({
        where: { id: draft.id },
        data: {
          status: "PUBLISHED",
          effectiveFrom: new Date(),
          updatedAt: new Date(),
        },
        include: { features: true },
      });

      // 3. Update PlatformPlan header pointers
      await tx.platformPlan.update({
        where: { id: plan.id },
        data: {
          activeVersionId: published.id,
          priceMonthly: published.priceMonthly,
          priceAnnual: published.priceAnnual,
          maxProjects: published.maxProjects,
          maxSeats: published.maxSeats,
          maxStorageGb: published.maxStorageGb,
          updatedAt: new Date(),
        },
      });

      // 4. Audit Log
      this.auditService.record({
        actorId,
        action: "PLAN_PUBLISHED",
        targetPlanId: plan.id,
        targetPlanCode: plan.code,
        ipAddress,
        details: {
          previousVersionId: previousPublished?.id,
          previousVersionNumber: previousPublished?.versionNumber,
          publishedVersionId: published.id,
          publishedVersionNumber: published.versionNumber,
          priceMonthly: Number(published.priceMonthly),
          priceAnnual: Number(published.priceAnnual),
          maxProjects: published.maxProjects,
          maxSeats: published.maxSeats,
          maxStorageGb: published.maxStorageGb,
        },
      });

      // 5. Fetch updated plan hierarchy
      const updatedPlan = await tx.platformPlan.findUnique({
        where: { id: plan.id },
        include: {
          versions: {
            include: { features: true },
            orderBy: { versionNumber: "desc" },
          },
          subscriptions: {
            select: { id: true, status: true },
          },
        },
      });

      return this.mapPlanDetail(updatedPlan, true);
    });
  }

  /**
   * Returns immutable revision history for a plan tier.
   */
  public async getVersionHistory(planIdOrCode: string): Promise<PlanVersionDto[]> {
    const plan = await this.prisma.platformPlan.findFirst({
      where: this.buildPlanWhere(planIdOrCode),
      include: {
        versions: {
          include: { features: true },
          orderBy: { versionNumber: "desc" },
        },
      },
    });

    if (!plan) {
      throw new NotFoundError(`Platform plan '${planIdOrCode}' not found.`);
    }

    return plan.versions || [];
  }

  private mapPlanDetail(plan: any, includeAllVersions = false): PlatformPlanDetailDto {
    const versions = plan.versions || [];
    const published = versions.find((v: any) => v.status === "PUBLISHED");
    const draft = versions.find((v: any) => v.status === "DRAFT");

    const activeTenants = (plan.subscriptions || []).filter(
      (s: any) => s.status === "ACTIVE" || s.status === "TRIAL" || s.status === "PAST_DUE"
    ).length;

    const mapVersion = (v: any): PlanVersionDto => ({
      id: v.id,
      versionNumber: v.versionNumber,
      status: v.status,
      priceMonthly: Number(v.priceMonthly),
      priceAnnual: Number(v.priceAnnual),
      maxProjects: v.maxProjects,
      maxSeats: v.maxSeats,
      maxStorageGb: v.maxStorageGb,
      effectiveFrom: v.effectiveFrom ? v.effectiveFrom.toISOString() : null,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
      features: (v.features || []).reduce((acc: Record<string, boolean>, f: any) => {
        acc[f.featureKey] = f.isEnabled;
        return acc;
      }, {}),
    });

    return {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description,
      activeTenants,
      publishedVersion: published ? mapVersion(published) : null,
      draftVersion: draft ? mapVersion(draft) : null,
      versionCount: versions.length,
      versions: includeAllVersions ? versions.map(mapVersion) : undefined,
    };
  }
}
