import { z } from 'zod';

export const InitialMemberSchema = z.object({
  userId: z.string().uuid('Member userId must be a valid UUID'),
  projectRole: z.string().max(100).default('MEMBER'),
  isLead: z.boolean().default(false),
});

export const CreateProjectSchema = z.object({
  id: z.string().uuid().optional(),
  companyId: z.string().uuid('companyId must be a valid UUID'),
  code: z
    .string()
    .min(2, 'Project code must be at least 2 characters')
    .max(50, 'Project code cannot exceed 50 characters')
    .regex(/^[A-Za-z0-9_-]+$/, 'Project code may only contain alphanumeric characters, hyphens, and underscores'),
  name: z
    .string()
    .min(2, 'Project name must be at least 2 characters')
    .max(255, 'Project name cannot exceed 255 characters'),
  description: z.string().max(5000).optional().nullable(),
  projectType: z.string().max(100).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  address: z.string().max(1000).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  pincode: z.string().max(20).optional().nullable(),
  status: z.enum(['PLANNING', 'ACTIVE']).default('PLANNING'),
  plannedStartDate: z.coerce.date().optional().nullable(),
  plannedEndDate: z.coerce.date().optional().nullable(),
  actualStartDate: z.coerce.date().optional().nullable(),
  actualEndDate: z.coerce.date().optional().nullable(),
  estimatedBudget: z.number().nonnegative('Budget must be positive').optional().nullable(),
  contractValue: z.number().nonnegative('Contract value must be positive').optional().nullable(),
  currency: z.string().max(10).default('INR'),
  siteAreaSqft: z.number().nonnegative('Site area must be positive').optional().nullable(),
  builtUpAreaSqft: z.number().nonnegative('Built-up area must be positive').optional().nullable(),
  initialMembers: z.array(InitialMemberSchema).optional(),
});

export type CreateProjectDto = z.infer<typeof CreateProjectSchema>;
