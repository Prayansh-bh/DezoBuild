import { z } from 'zod';
import { MUSTER_STATUSES } from '../constants/people.constants.js';

export const createMusterSchema = z.object({
  projectId: z.string().uuid(),
  contractorId: z.string().uuid(),
  shiftId: z.string().uuid().optional().nullable(),
  musterDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'musterDate must be YYYY-MM-DD'),
  skilledCount: z.number().int().min(0).optional().default(0),
  semiSkilledCount: z.number().int().min(0).optional().default(0),
  unskilledCount: z.number().int().min(0).optional().default(0),
  supervisorCount: z.number().int().min(0).optional().default(0),
  regularHours: z.number().min(0).max(24).optional().default(8),
  overtimeHours: z.number().min(0).max(24).optional().default(0),
  remarks: z.string().max(1000).optional().nullable(),
  status: z.enum(MUSTER_STATUSES).optional().default('DRAFT'),
});

export type CreateMusterDto = z.infer<typeof createMusterSchema>;

export const approveMusterSchema = z.object({
  remarks: z.string().max(1000).optional(),
});

export type ApproveMusterDto = z.infer<typeof approveMusterSchema>;

export const listMustersQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  contractorId: z.string().uuid().optional(),
  status: z.enum(MUSTER_STATUSES).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListMustersQueryDto = z.infer<typeof listMustersQuerySchema>;
