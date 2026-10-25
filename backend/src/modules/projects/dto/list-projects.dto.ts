import { z } from 'zod';
import { PROJECT_STATUSES } from '../constants/project.constants';

export const ListProjectsQuerySchema = z.object({
  companyId: z.string().uuid().optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  search: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListProjectsQuery = z.infer<typeof ListProjectsQuerySchema>;
