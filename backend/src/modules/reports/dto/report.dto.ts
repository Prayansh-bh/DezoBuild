import { z } from 'zod';

export const reportFilterSchema = z.object({
  projectId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
});

export type ReportFilterDto = z.infer<typeof reportFilterSchema>;
