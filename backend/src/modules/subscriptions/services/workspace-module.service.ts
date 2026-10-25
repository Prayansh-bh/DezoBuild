/**
 * DEZOBUILD — Workspace Module Service (Tier 2 Tenant Workspace Activation)
 *
 * Implements Single Responsibility Principle (SRP):
 * Manages tenant-level ON/OFF module activation within the platform entitlement envelope.
 * Default semantic: If platform-entitled and no workspace row exists, feature is ENABLED.
 */

import type { PrismaClient } from "@prisma/client";
import { DatabaseService } from "../../../database/database.service";
import {
  BadRequestError,
  FeatureNotEntitledError,
  NotFoundError,
} from "../../../common/errors/app-error";
import {
  CANONICAL_FEATURE_KEYS,
  FEATURE_DEFINITIONS,
  type CanonicalFeatureKey,
  type FeatureDefinition,
} from "../constants/plan.catalog";
import { EntitlementService } from "./entitlement.service";

export interface WorkspaceModuleStatus {
  featureKey: CanonicalFeatureKey;
  name: string;
  domain: string;
  description: string;
  platformEntitled: boolean;
  workspaceEnabled: boolean;
  effectiveActive: boolean;
  updatedAt?: string;
  updatedBy?: string | null;
}

export class WorkspaceModuleService {
  private static instance: WorkspaceModuleService;
  private readonly prisma: any;
  private readonly entitlementService: EntitlementService;

  constructor(prismaClient?: any, entitlementService?: EntitlementService) {
    this.prisma = prismaClient || DatabaseService.getInstance().getClient();
    this.entitlementService =
      entitlementService || new EntitlementService(this.prisma);
  }

  public static getInstance(
    prismaClient?: any,
    entitlementService?: EntitlementService
  ): WorkspaceModuleService {
    if (!WorkspaceModuleService.instance || prismaClient) {
      WorkspaceModuleService.instance = new WorkspaceModuleService(
        prismaClient,
        entitlementService
      );
    }
    return WorkspaceModuleService.instance;
  }

  /**
   * Evaluates if a feature is enabled at the workspace level for a given tenant.
   * Default Semantics: Absence of a row = ENABLED (true).
   */
  public async isWorkspaceModuleEnabled(
    tenantId: string,
    featureKey: string
  ): Promise<boolean> {
    if (!tenantId || !featureKey) return false;

    // Fail-closed on invalid/unknown feature keys
    if (!CANONICAL_FEATURE_KEYS.includes(featureKey as CanonicalFeatureKey)) {
      return false;
    }

    const row = await this.prisma.tenantWorkspaceModule.findUnique({
      where: {
        tenantId_featureKey: {
          tenantId,
          featureKey,
        },
      },
    });

    if (!row) {
      // Lazy default: enabled
      return true;
    }

    return row.isEnabled;
  }

  /**
   * Retrieves all 12 canonical features with their platform entitlement,
   * workspace activation state, and effective active resolution.
   */
  public async getWorkspaceModules(
    tenantId: string
  ): Promise<WorkspaceModuleStatus[]> {
    if (!tenantId) {
      throw new BadRequestError("Tenant ID is required.");
    }

    // Verify tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundError(`Tenant '${tenantId}' not found.`);
    }

    // Fetch existing tenant-level workspace overrides
    const rows = await this.prisma.tenantWorkspaceModule.findMany({
      where: { tenantId },
    });
    const rowMap = new Map<string, any>(
      rows.map((r: any) => [r.featureKey, r])
    );

    const results: WorkspaceModuleStatus[] = [];

    for (const def of FEATURE_DEFINITIONS) {
      const platformEntitled =
        await this.entitlementService.isFeatureEntitled(tenantId, def.key);
      const row = rowMap.get(def.key);
      const workspaceEnabled = row ? row.isEnabled : true;
      const effectiveActive = platformEntitled && workspaceEnabled;

      results.push({
        featureKey: def.key,
        name: def.name,
        domain: def.domain,
        description: def.description,
        platformEntitled,
        workspaceEnabled,
        effectiveActive,
        updatedAt: row?.updatedAt?.toISOString(),
        updatedBy: row?.updatedBy || null,
      });
    }

    return results;
  }

  /**
   * Updates workspace activation state for a canonical feature.
   * Authoritative Rule: The tenant MUST NEVER be able to activate a feature
   * outside its platform entitlement.
   */
  public async setWorkspaceModuleEnabled(params: {
    tenantId: string;
    featureKey: string;
    isEnabled: boolean;
    actorId?: string;
  }): Promise<WorkspaceModuleStatus> {
    const { tenantId, featureKey, isEnabled, actorId } = params;

    if (!tenantId) {
      throw new BadRequestError("Tenant ID is required.");
    }

    // 1. Validate canonical feature key
    if (!CANONICAL_FEATURE_KEYS.includes(featureKey as CanonicalFeatureKey)) {
      throw new BadRequestError(
        `Invalid feature key '${featureKey}'. Must be one of canonical catalog keys.`
      );
    }

    const featureDef = FEATURE_DEFINITIONS.find((f) => f.key === featureKey)!;

    // 2. Authoritative check: Platform Entitlement
    const isEntitled = await this.entitlementService.isFeatureEntitled(
      tenantId,
      featureKey
    );

    if (!isEntitled) {
      throw new FeatureNotEntitledError(
        `Forbidden: Feature '${featureKey}' is not entitled under your subscription plan. Upgrade your plan to enable this module.`
      );
    }

    // 3. Persist workspace activation state
    const upserted = await this.prisma.tenantWorkspaceModule.upsert({
      where: {
        tenantId_featureKey: {
          tenantId,
          featureKey,
        },
      },
      update: {
        isEnabled,
        updatedBy: actorId || null,
        updatedAt: new Date(),
      },
      create: {
        tenantId,
        featureKey,
        isEnabled,
        updatedBy: actorId || null,
      },
    });

    const effectiveActive = isEntitled && upserted.isEnabled;

    return {
      featureKey: featureDef.key,
      name: featureDef.name,
      domain: featureDef.domain,
      description: featureDef.description,
      platformEntitled: isEntitled,
      workspaceEnabled: upserted.isEnabled,
      effectiveActive,
      updatedAt: upserted.updatedAt.toISOString(),
      updatedBy: upserted.updatedBy,
    };
  }
}
