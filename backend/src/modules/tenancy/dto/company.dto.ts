import { z } from "zod";

export const createCompanyDtoSchema = z.object({
  id: z.string().uuid().optional(),
  code: z
    .string()
    .min(2, "Company code must be at least 2 characters")
    .max(50)
    .regex(/^[A-Z0-9_-]+$/, "Company code must contain only uppercase alphanumeric characters, dashes or underscores"),
  name: z.string().min(2, "Company name must be at least 2 characters").max(255),
  legalName: z.string().min(2, "Legal name must be at least 2 characters").max(255),
  cinNumber: z.string().max(50).optional(),
  panNumber: z.string().min(10).max(50),
  gstin: z.string().min(15).max(50),
  email: z.string().email("Invalid company email").max(255),
  phone: z.string().min(5).max(50),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  pincode: z.string().min(3).max(20),
  status: z.enum(["ACTIVE", "SUSPENDED"]).default("ACTIVE"),
});

export const updateCompanyDtoSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  legalName: z.string().min(2).max(255).optional(),
  cinNumber: z.string().max(50).optional(),
  panNumber: z.string().min(10).max(50).optional(),
  gstin: z.string().min(15).max(50).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().min(5).max(50).optional(),
  address: z.string().min(5).optional(),
  city: z.string().min(2).max(100).optional(),
  state: z.string().min(2).max(100).optional(),
  pincode: z.string().min(3).max(20).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
});

export type CreateCompanyDto = z.input<typeof createCompanyDtoSchema>;
export type UpdateCompanyDto = z.input<typeof updateCompanyDtoSchema>;
