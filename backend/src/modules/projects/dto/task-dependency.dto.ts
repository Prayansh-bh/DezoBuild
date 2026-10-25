import { z } from 'zod';
import { DEPENDENCY_TYPES } from '../constants/task-dependency.constants';

export const CreateTaskDependencySchema = z.object({
  id: z.string().uuid().optional(),
  predecessorTaskId: z.string().uuid('predecessorTaskId must be a valid UUID').optional(),
  successorTaskId: z.string().uuid('successorTaskId must be a valid UUID').optional(),
  dependencyType: z.enum(DEPENDENCY_TYPES).default('FS'),
  lagDays: z.number().int().default(0),
});

export type CreateTaskDependencyDto = z.infer<typeof CreateTaskDependencySchema>;
