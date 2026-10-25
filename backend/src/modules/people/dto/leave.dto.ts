import { z } from 'zod';
import { LEAVE_TYPES, LEAVE_STATUSES } from '../constants/people.constants.js';

export const createLeaveSchema = z.object({
  employeeId: z.string().uuid().optional(), // resolved from user context if omitted
  leaveType: z.enum(LEAVE_TYPES),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be YYYY-MM-DD'),
  totalDays: z.number().positive().max(365).optional(),
  reason: z.string().min(1, 'reason is required').max(1000).trim(),
}).refine(data => new Date(data.endDate) >= new Date(data.startDate), {
  message: 'endDate must be greater than or equal to startDate',
  path: ['endDate'],
});

export type CreateLeaveDto = z.infer<typeof createLeaveSchema>;

export const approveLeaveSchema = z.object({
  remarks: z.string().max(1000).optional(),
});

export type ApproveLeaveDto = z.infer<typeof approveLeaveSchema>;

export const listLeavesQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  leaveType: z.enum(LEAVE_TYPES).optional(),
  status: z.enum(LEAVE_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListLeavesQueryDto = z.infer<typeof listLeavesQuerySchema>;
