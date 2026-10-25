import { z } from 'zod';
import { TASK_STATUSES, TASK_PRIORITIES } from '../constants/task.constants';

export const CreateTaskSchema = z
  .object({
    id: z.string().uuid().optional(),
    wbsNodeId: z.string().uuid('wbsNodeId must be a valid UUID').optional().nullable(),
    name: z
      .string()
      .min(2, 'Task name must be at least 2 characters')
      .max(255, 'Task name cannot exceed 255 characters'),
    description: z.string().max(5000).optional().nullable(),
    status: z.enum(TASK_STATUSES).default('TODO'),
    priority: z.enum(TASK_PRIORITIES).default('MEDIUM'),
    isMilestone: z.boolean().default(false),
    progressPct: z.number().min(0).max(100, 'Progress must be between 0 and 100').default(0),
    plannedStartDate: z.coerce.date().optional().nullable(),
    plannedEndDate: z.coerce.date().optional().nullable(),
    actualStartDate: z.coerce.date().optional().nullable(),
    actualEndDate: z.coerce.date().optional().nullable(),
    assignedUserId: z.string().uuid('assignedUserId must be a valid UUID').optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.plannedStartDate && data.plannedEndDate) {
        return data.plannedStartDate <= data.plannedEndDate;
      }
      return true;
    },
    {
      message: 'plannedStartDate must be on or before plannedEndDate',
      path: ['plannedStartDate'],
    }
  )
  .refine(
    (data) => {
      if (data.actualStartDate && data.actualEndDate) {
        return data.actualStartDate <= data.actualEndDate;
      }
      return true;
    },
    {
      message: 'actualStartDate must be on or before actualEndDate',
      path: ['actualStartDate'],
    }
  );

export type CreateTaskDto = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = z
  .object({
    wbsNodeId: z.string().uuid('wbsNodeId must be a valid UUID').optional().nullable(),
    name: z
      .string()
      .min(2, 'Task name must be at least 2 characters')
      .max(255, 'Task name cannot exceed 255 characters')
      .optional(),
    description: z.string().max(5000).optional().nullable(),
    status: z.enum(TASK_STATUSES).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    isMilestone: z.boolean().optional(),
    progressPct: z.number().min(0).max(100, 'Progress must be between 0 and 100').optional(),
    plannedStartDate: z.coerce.date().optional().nullable(),
    plannedEndDate: z.coerce.date().optional().nullable(),
    actualStartDate: z.coerce.date().optional().nullable(),
    actualEndDate: z.coerce.date().optional().nullable(),
    assignedUserId: z.string().uuid('assignedUserId must be a valid UUID').optional().nullable(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.plannedStartDate && data.plannedEndDate) {
        return data.plannedStartDate <= data.plannedEndDate;
      }
      return true;
    },
    {
      message: 'plannedStartDate must be on or before plannedEndDate',
      path: ['plannedStartDate'],
    }
  )
  .refine(
    (data) => {
      if (data.actualStartDate && data.actualEndDate) {
        return data.actualStartDate <= data.actualEndDate;
      }
      return true;
    },
    {
      message: 'actualStartDate must be on or before actualEndDate',
      path: ['actualStartDate'],
    }
  );

export type UpdateTaskDto = z.infer<typeof UpdateTaskSchema>;

export const ListTasksQuerySchema = z.object({
  wbsNodeId: z.string().uuid().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  isMilestone: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  assignedUserId: z.string().uuid().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListTasksQuery = z.infer<typeof ListTasksQuerySchema>;
