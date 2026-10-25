import { z } from 'zod';
import { PROJECT_STATUSES } from '../constants/project.constants';

export const TransitionStatusSchema = z.object({
  status: z.enum(PROJECT_STATUSES, {
    errorMap: () => ({ message: `Status must be one of: ${PROJECT_STATUSES.join(', ')}` }),
  }),
  reason: z.string().max(500).optional(),
});

export type TransitionStatusDto = z.infer<typeof TransitionStatusSchema>;
