export interface PlatformPlanEntity {
  id: string;
  code: string;
  name: string;
  description: string | null;
  maxProjects: number | null;
  maxSeats: number | null;
  maxStorageGb: number | null;
  priceMonthly: number;
  priceAnnual: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanFeatureEntity {
  id: string;
  planId: string;
  featureKey: string;
  isEnabled: boolean;
  createdAt: Date;
}

export interface IPlanRepository {
  findById(id: string): Promise<PlatformPlanEntity | null>;
  findByCode(code: string): Promise<PlatformPlanEntity | null>;
  findAllActive(): Promise<PlatformPlanEntity[]>;
  getPlanFeatures(planId: string): Promise<PlanFeatureEntity[]>;
}
