import { z } from 'zod';
import { ActionType, ActionPriority } from '../constants/quality.constants.js';

export const createActionSchema = z
  .object({
    projectId: z.string().uuid(),
    ncrId: z.string().uuid().optional().nullable(),
    incidentId: z.string().uuid().optional().nullable(),
    observationId: z.string().uuid().optional().nullable(),
    title: z.string().min(3).max(255),
    actionType: z.nativeEnum(ActionType),
    description: z.string().min(5),
    assignedToId: z.string().uuid().optional().nullable(),
    assignedVendorId: z.string().uuid().optional().nullable(),
    priority: z.nativeEnum(ActionPriority).optional().default(ActionPriority.MEDIUM),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dueDate must be YYYY-MM-DD'),
  })
  .refine(
    (data) => {
      const sources = [data.ncrId, data.incidentId, data.observationId].filter(Boolean);
      return sources.length === 1;
    },
    {
      message: 'Exactly one source (ncrId XOR incidentId XOR observationId) must be populated',
      path: ['ncrId'],
    }
  )
  .refine(
    (data) => {
      const assignees = [data.assignedToId, data.assignedVendorId].filter(Boolean);
      return assignees.length === 1;
    },
    {
      message: 'Exactly one assignee (assignedToId XOR assignedVendorId) must be populated',
      path: ['assignedToId'],
    }
  );
export type CreateActionDto = z.infer<typeof createActionSchema>;

export const reassignActionSchema = z
  .object({
    assignedToId: z.string().uuid().optional().nullable(),
    assignedVendorId: z.string().uuid().optional().nullable(),
    reason: z.string().min(3, 'Reassignment reason is required'),
  })
  .refine(
    (data) => {
      const assignees = [data.assignedToId, data.assignedVendorId].filter(Boolean);
      return assignees.length === 1;
    },
    {
      message: 'Exactly one assignee (assignedToId XOR assignedVendorId) must be populated',
      path: ['assignedToId'],
    }
  );
export type ReassignActionDto = z.infer<typeof reassignActionSchema>;

export const completeActionSchema = z.object({
  completionNotes: z.string().min(5, 'Completion notes are required and must be at least 5 characters'),
});
export type CompleteActionDto = z.infer<typeof completeActionSchema>;

export const verifyActionSchema = z.object({
  verificationRemarks: z.string().min(5, 'Verification remarks are required and must be at least 5 characters'),
});
export type VerifyActionDto = z.infer<typeof verifyActionSchema>;

export const cancelActionSchema = z.object({
  reason: z.string().min(3, 'Cancellation reason is required'),
});
export type CancelActionDto = z.infer<typeof cancelActionSchema>;

export const reopenActionSchema = z.object({
  reason: z.string().min(5, 'Reopening reason is required'),
});
export type ReopenActionDto = z.infer<typeof reopenActionSchema>;

export const listActionsQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  actionType: z.string().optional(),
  ncrId: z.string().uuid().optional(),
  incidentId: z.string().uuid().optional(),
  observationId: z.string().uuid().optional(),
  assignedToId: z.string().uuid().optional(),
  assignedVendorId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});
export type ListActionsQueryDto = z.infer<typeof listActionsQuerySchema>;
