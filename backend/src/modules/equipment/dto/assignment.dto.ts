import { z } from 'zod';
import { ASSIGNMENT_STATUSES } from '../constants/equipment.constants.js';

export const createAssignmentSchema = z.object({
  projectId: z.string().uuid(),
  assignedFrom: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T/)),
  assignedTo: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T/)).optional().nullable(),
  purpose: z.string().max(255).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
}).refine(data => {
  if (data.assignedTo && data.assignedFrom) {
    return new Date(data.assignedTo) >= new Date(data.assignedFrom);
  }
  return true;
}, {
  message: 'assignedTo must be greater than or equal to assignedFrom',
  path: ['assignedTo'],
});

export type CreateAssignmentDto = z.infer<typeof createAssignmentSchema>;

export const returnAssignmentSchema = z.object({
  actualReturnedAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T/)).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type ReturnAssignmentDto = z.infer<typeof returnAssignmentSchema>;

export const listAssignmentsQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.enum(ASSIGNMENT_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListAssignmentsQueryDto = z.infer<typeof listAssignmentsQuerySchema>;
