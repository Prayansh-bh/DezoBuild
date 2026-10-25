import { z } from 'zod';

export const UpdateProjectSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Project name must be at least 2 characters')
      .max(255, 'Project name cannot exceed 255 characters')
      .optional(),
    description: z.string().max(5000).optional().nullable(),
    projectType: z.string().max(100).optional().nullable(),
    location: z.string().max(255).optional().nullable(),
    address: z.string().max(1000).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    state: z.string().max(100).optional().nullable(),
    pincode: z.string().max(20).optional().nullable(),
    plannedStartDate: z.coerce.date().optional().nullable(),
    plannedEndDate: z.coerce.date().optional().nullable(),
    actualStartDate: z.coerce.date().optional().nullable(),
    actualEndDate: z.coerce.date().optional().nullable(),
    estimatedBudget: z.number().nonnegative().optional().nullable(),
    contractValue: z.number().nonnegative().optional().nullable(),
    currency: z.string().max(10).optional(),
    siteAreaSqft: z.number().nonnegative().optional().nullable(),
    builtUpAreaSqft: z.number().nonnegative().optional().nullable(),
  })
  .strict();

export type UpdateProjectDto = z.infer<typeof UpdateProjectSchema>;
