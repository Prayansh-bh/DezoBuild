import { z } from "zod";

export const createTenantDtoSchema = z.object({
  id: z.string().uuid().optional(),
  code: z
    .string()
    .min(2, "Tenant code must be at least 2 characters")
    .max(50, "Tenant code cannot exceed 50 characters")
    .regex(/^[A-Z0-9_-]+$/, "Tenant code must contain only uppercase alphanumeric characters, dashes or underscores"),
  name: z.string().min(2, "Tenant name must be at least 2 characters").max(255),
  domain: z.string().max(255).optional(),
  planTier: z.enum(["STARTER", "PROFESSIONAL", "ENTERPRISE"]).default("ENTERPRISE"),
  currency: z.string().max(10).default("INR"),
  currencySymbol: z.string().max(10).default("₹"),
  timezone: z.string().max(100).default("Asia/Kolkata"),
});

export const updateTenantDtoSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  domain: z.string().max(255).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "DELINQUENT"]).optional(),
  currency: z.string().max(10).optional(),
  currencySymbol: z.string().max(10).optional(),
  timezone: z.string().max(100).optional(),
});

export type CreateTenantDto = z.input<typeof createTenantDtoSchema>;
export type UpdateTenantDto = z.input<typeof updateTenantDtoSchema>;
