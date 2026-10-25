import { z } from 'zod';

export const createHolidaySchema = z.object({
  holidayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'holidayDate must be YYYY-MM-DD'),
  name: z.string().min(1).max(100).trim(),
  isMandatory: z.boolean().optional().default(true),
  branchId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
});

export type CreateHolidayDto = z.infer<typeof createHolidaySchema>;

export const listHolidaysQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListHolidaysQueryDto = z.infer<typeof listHolidaysQuerySchema>;
