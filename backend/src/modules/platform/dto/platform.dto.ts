import { z } from "zod";

export const platformLoginDtoSchema = z.object({
  email: z.string().email("A valid administrator email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const provisionTenantDtoSchema = z.object({
  code: z
    .string()
    .min(2, "Tenant code must be at least 2 characters")
    .max(50, "Tenant code cannot exceed 50 characters")
    .regex(/^[A-Za-z0-9_-]+$/, "Tenant code must contain only alphanumeric characters, dashes or underscores"),
  name: z.string().min(2, "Tenant name must be at least 2 characters").max(255),
  legalName: z.string().max(255).optional(),
  domain: z.string().max(255).optional(),
  planTier: z.enum(["STARTER", "PROFESSIONAL", "ENTERPRISE"]).default("ENTERPRISE"),
  currency: z.string().max(10).default("INR"),
  currencySymbol: z.string().max(10).default("₹"),
  timezone: z.string().max(100).default("Asia/Kolkata"),
  adminName: z.string().min(2).max(255).optional(),
  adminEmail: z.string().email().optional(),
  adminPassword: z.string().min(8).optional(),
});

export const updateEntitlementOverrideDtoSchema = z.object({
  featureKey: z.string().min(2, "Feature key must be at least 2 characters").max(100),
  isEnabled: z.boolean(),
  additionalProjects: z.number().int().nonnegative().nullable().optional(),
  additionalSeats: z.number().int().nonnegative().nullable().optional(),
  expiresAt: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .optional()
    .transform((val) => (val ? new Date(val) : null)),
});

export const changePlanDtoSchema = z.object({
  planCode: z.enum(["STARTER", "PROFESSIONAL", "ENTERPRISE"]),
});

export const savePlanDraftDtoSchema = z.object({
  priceMonthly: z.number().nonnegative("Monthly price must be a non-negative number"),
  priceAnnual: z.number().nonnegative("Annual price must be a non-negative number"),
  maxProjects: z.number().int().nonnegative().nullable().optional(),
  maxSeats: z.number().int().nonnegative().nullable().optional(),
  maxStorageGb: z.number().int().nonnegative().nullable().optional(),
  features: z.record(z.string(), z.boolean()).optional(),
  description: z.string().max(255).optional(),
});

export const tenantQueryDtoSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.enum(["all", "ACTIVE", "SUSPENDED", "DELINQUENT", "TRIAL"]).optional(),
});

export type PlatformLoginDto = z.input<typeof platformLoginDtoSchema>;
export type ProvisionTenantDto = z.input<typeof provisionTenantDtoSchema>;
export type UpdateEntitlementOverrideDto = z.input<typeof updateEntitlementOverrideDtoSchema>;
export type ChangePlanDto = z.input<typeof changePlanDtoSchema>;
export type SavePlanDraftDto = z.input<typeof savePlanDraftDtoSchema>;
export type TenantQueryDto = z.input<typeof tenantQueryDtoSchema>;

