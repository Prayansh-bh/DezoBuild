import { z } from 'zod';

export const createOperatingLogSchema = z.object({
  projectId: z.string().uuid(),
  operatorEmployeeId: z.string().uuid().optional().nullable(),
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'logDate must be YYYY-MM-DD'),
  shift: z.string().min(1).max(50).optional().default('GENERAL'),
  startMeter: z.number().min(0),
  endMeter: z.number().min(0),
  operatingHours: z.number().min(0),
  idleHours: z.number().min(0).optional().default(0),
  breakdownHours: z.number().min(0).optional().default(0),
  workDescription: z.string().max(2000).optional().nullable(),
}).refine(data => data.endMeter >= data.startMeter, {
  message: 'endMeter must be greater than or equal to startMeter',
  path: ['endMeter'],
}).refine(data => (data.operatingHours + (data.idleHours || 0) + (data.breakdownHours || 0)) <= 24, {
  message: 'Total hours (operating + idle + breakdown) cannot exceed 24 in a single shift',
  path: ['operatingHours'],
});

export type CreateOperatingLogDto = z.infer<typeof createOperatingLogSchema>;

export const correctOperatingLogSchema = z.object({
  correctionReason: z.string().min(1, 'correctionReason is mandatory').max(1000).trim(),
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'logDate must be YYYY-MM-DD').optional(),
  shift: z.string().min(1).max(50).optional(),
  startMeter: z.number().min(0),
  endMeter: z.number().min(0),
  operatingHours: z.number().min(0),
  idleHours: z.number().min(0).optional().default(0),
  breakdownHours: z.number().min(0).optional().default(0),
  workDescription: z.string().max(2000).optional().nullable(),
  operatorEmployeeId: z.string().uuid().optional().nullable(),
}).refine(data => data.endMeter >= data.startMeter, {
  message: 'endMeter must be greater than or equal to startMeter',
  path: ['endMeter'],
}).refine(data => (data.operatingHours + (data.idleHours || 0) + (data.breakdownHours || 0)) <= 24, {
  message: 'Total hours (operating + idle + breakdown) cannot exceed 24 in a single shift',
  path: ['operatingHours'],
});

export type CorrectOperatingLogDto = z.infer<typeof correctOperatingLogSchema>;

export const listOperatingLogsQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  shift: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListOperatingLogsQueryDto = z.infer<typeof listOperatingLogsQuerySchema>;
