import { ownerApiClient } from "./client";
import { platformAuthApi } from "./auth";

export type PlanVersionStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface PlanVersionDto {
  id: string;
  planId: string;
  versionNumber: number;
  status: PlanVersionStatus;
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
  isCustom: boolean;
  isActive: boolean;
  activeVersionId: string | null;
  publishedVersion: PlanVersionDto | null;
  draftVersion: PlanVersionDto | null;
  versions: PlanVersionDto[];
}

export interface SavePlanDraftDto {
  priceMonthly: number;
  priceAnnual: number;
  maxProjects?: number | null;
  maxSeats?: number | null;
  maxStorageGb?: number | null;
  description?: string | null | undefined;
  features: Record<string, boolean>;
}

export const platformPlansApi = {
  async listPlans(): Promise<PlatformPlanDetailDto[]> {
    await platformAuthApi.ensureAuthenticated();
    return ownerApiClient.get<PlatformPlanDetailDto[]>("/platform/plans");
  },

  async getPlan(id: string): Promise<PlatformPlanDetailDto> {
    await platformAuthApi.ensureAuthenticated();
    return ownerApiClient.get<PlatformPlanDetailDto>(`/platform/plans/${id}`);
  },

  async saveDraft(id: string, dto: SavePlanDraftDto): Promise<PlatformPlanDetailDto> {
    await platformAuthApi.ensureAuthenticated();
    return ownerApiClient.put<PlatformPlanDetailDto>(`/platform/plans/${id}/draft`, dto);
  },

  async publishPlan(id: string): Promise<PlatformPlanDetailDto> {
    await platformAuthApi.ensureAuthenticated();
    return ownerApiClient.post<PlatformPlanDetailDto>(`/platform/plans/${id}/publish`);
  },

  async getVersionHistory(id: string): Promise<PlanVersionDto[]> {
    await platformAuthApi.ensureAuthenticated();
    return ownerApiClient.get<PlanVersionDto[]>(`/platform/plans/${id}/versions`);
  },
};
