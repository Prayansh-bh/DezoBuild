import { z } from 'zod';
import { WBS_STATUSES } from '../constants/wbs.constants';

export const CreateWbsNodeSchema = z.object({
  id: z.string().uuid().optional(),
  parentId: z.string().uuid('parentId must be a valid UUID').optional().nullable(),
  code: z
    .string()
    .min(1, 'WBS code must be at least 1 character')
    .max(50, 'WBS code cannot exceed 50 characters')
    .regex(/^[A-Za-z0-9._-]+$/, 'WBS code may contain alphanumeric characters, dots, underscores, and hyphens'),
  name: z
    .string()
    .min(2, 'WBS node name must be at least 2 characters')
    .max(255, 'WBS node name cannot exceed 255 characters'),
  description: z.string().max(5000).optional().nullable(),
  sequence: z.number().int().nonnegative().optional().default(0),
  weightagePct: z.number().min(0).max(100, 'Weightage cannot exceed 100%').optional().nullable(),
  plannedStartDate: z.coerce.date().optional().nullable(),
  plannedEndDate: z.coerce.date().optional().nullable(),
  actualStartDate: z.coerce.date().optional().nullable(),
  actualEndDate: z.coerce.date().optional().nullable(),
});

export type CreateWbsNodeDto = z.infer<typeof CreateWbsNodeSchema>;

export const UpdateWbsNodeSchema = z
  .object({
    name: z
      .string()
      .min(2, 'WBS node name must be at least 2 characters')
      .max(255, 'WBS node name cannot exceed 255 characters')
      .optional(),
    description: z.string().max(5000).optional().nullable(),
    parentId: z.string().uuid('parentId must be a valid UUID').optional().nullable(),
    sequence: z.number().int().nonnegative().optional(),
    status: z.enum(WBS_STATUSES).optional(),
    weightagePct: z.number().min(0).max(100).optional().nullable(),
    progressPct: z.number().min(0).max(100).optional(),
    plannedStartDate: z.coerce.date().optional().nullable(),
    plannedEndDate: z.coerce.date().optional().nullable(),
    actualStartDate: z.coerce.date().optional().nullable(),
    actualEndDate: z.coerce.date().optional().nullable(),
  })
  .strict();

export type UpdateWbsNodeDto = z.infer<typeof UpdateWbsNodeSchema>;
