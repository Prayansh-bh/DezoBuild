import { z } from "zod";

export const createDepartmentDtoSchema = z.object({
  id: z.string().uuid().optional(),
  code: z
    .string()
    .min(2, "Department code must be at least 2 characters")
    .max(50)
    .regex(/^[A-Z0-9_-]+$/, "Department code must contain only uppercase alphanumeric characters, dashes or underscores"),
  name: z.string().min(2, "Department name must be at least 2 characters").max(100),
  description: z.string().max(255).optional(),
});

export const updateDepartmentDtoSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(255).optional(),
});

export type CreateDepartmentDto = z.input<typeof createDepartmentDtoSchema>;
export type UpdateDepartmentDto = z.input<typeof updateDepartmentDtoSchema>;
