import { z } from "zod";

export const createBranchDtoSchema = z.object({
  id: z.string().uuid().optional(),
  companyId: z.string().uuid("Invalid company ID"),
  code: z
    .string()
    .min(2, "Branch code must be at least 2 characters")
    .max(50)
    .regex(/^[A-Z0-9_-]+$/, "Branch code must contain only uppercase alphanumeric characters, dashes or underscores"),
  name: z.string().min(2, "Branch name must be at least 2 characters").max(255),
  gstin: z.string().min(15).max(50),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  status: z.enum(["ACTIVE", "SUSPENDED"]).default("ACTIVE"),
});

export const updateBranchDtoSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  gstin: z.string().min(15).max(50).optional(),
  city: z.string().min(2).max(100).optional(),
  state: z.string().min(2).max(100).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
});

export type CreateBranchDto = z.input<typeof createBranchDtoSchema>;
export type UpdateBranchDto = z.input<typeof updateBranchDtoSchema>;
