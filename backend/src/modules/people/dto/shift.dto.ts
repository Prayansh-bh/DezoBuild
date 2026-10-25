import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createShiftSchema = z.object({
  code: z.string().min(1).max(50).trim(),
  name: z.string().min(1).max(100).trim(),
  startTime: z.string().regex(timeRegex, 'startTime must be HH:mm (24-hour format)'),
  endTime: z.string().regex(timeRegex, 'endTime must be HH:mm (24-hour format)'),
  gracePeriodMinutes: z.number().int().min(0).max(120).optional().default(15),
  halfDayThresholdMinutes: z.number().int().min(0).max(1440).optional().default(240),
  fullDayThresholdMinutes: z.number().int().min(0).max(1440).optional().default(480),
  isNightShift: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
}).refine(data => data.fullDayThresholdMinutes >= data.halfDayThresholdMinutes, {
  message: 'fullDayThresholdMinutes must be greater than or equal to halfDayThresholdMinutes',
  path: ['fullDayThresholdMinutes'],
});

export type CreateShiftDto = z.infer<typeof createShiftSchema>;

export const listShiftsQuerySchema = z.object({
  isActive: z.preprocess(val => (val === 'true' ? true : val === 'false' ? false : val), z.boolean().optional()),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListShiftsQueryDto = z.infer<typeof listShiftsQuerySchema>;
