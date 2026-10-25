import { z } from 'zod';
import { ADVANCE_TYPES } from '../constants/finance.constants.js';

export const createAdvanceRecordSchema = z.object({
  projectId: z.string().uuid(),
  advanceType: z.enum(ADVANCE_TYPES),
  vendorId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  advanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().positive('amount must be greater than 0'),
  notes: z.string().max(2000).optional(),
}).refine(
  (data) => {
    if (data.advanceType === 'EMPLOYEE_IMPREST') {
      return !!data.employeeId && !data.vendorId;
    } else {
      return !!data.vendorId && !data.employeeId;
    }
  },
  {
    message: 'For EMPLOYEE_IMPREST employeeId is required; for vendor advances vendorId is required',
  }
);

export type CreateAdvanceRecordDto = z.infer<typeof createAdvanceRecordSchema>;

export const listAdvanceRecordsQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  advanceType: z.string().optional(),
  vendorId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListAdvanceRecordsQueryDto = z.infer<typeof listAdvanceRecordsQuerySchema>;
