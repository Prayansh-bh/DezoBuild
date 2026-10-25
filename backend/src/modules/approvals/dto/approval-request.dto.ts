import { z } from 'zod';
import { SUPPORTED_APPROVAL_ENTITIES } from '../constants/approval.constants';

export const submitApprovalRequestSchema = z.object({
  projectId: z.string().uuid('Invalid projectId UUID').optional().nullable(),
  entityType: z.enum(SUPPORTED_APPROVAL_ENTITIES, {
    errorMap: () => ({ message: 'entityType must be one of the 15 supported approval entities' }),
  }),
  entityId: z.string().uuid('Invalid entityId UUID'),
  title: z.string().max(255).optional().nullable(),
  monetaryAmount: z.number().nonnegative('monetaryAmount must be non-negative').optional().nullable(),
  currency: z.string().length(3).optional().default('INR'),
  submissionRemarks: z.string().optional().nullable(),
  previousRequestId: z.string().uuid('Invalid previousRequestId UUID').optional().nullable(),
});

export type SubmitApprovalRequestDto = z.input<typeof submitApprovalRequestSchema>;

export const approveStepSchema = z.object({
  stepOrder: z.number().int().min(1).optional(),
  decisionReason: z.string().max(1000).optional().nullable(),
});

export type ApproveStepDto = z.infer<typeof approveStepSchema>;

export const rejectRequestSchema = z.object({
  stepOrder: z.number().int().min(1).optional(),
  decisionReason: z.string().min(3, 'Rejection reason must be at least 3 characters').max(1000),
});

export type RejectRequestDto = z.infer<typeof rejectRequestSchema>;

export const returnRequestSchema = z.object({
  stepOrder: z.number().int().min(1).optional(),
  decisionReason: z.string().min(3, 'Return reason must be at least 3 characters').max(1000),
});

export type ReturnRequestDto = z.infer<typeof returnRequestSchema>;

export const cancelRequestSchema = z.object({
  decisionReason: z.string().max(1000).optional().nullable(),
});

export type CancelRequestDto = z.infer<typeof cancelRequestSchema>;

export const listApprovalRequestsQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  entityType: z.enum(SUPPORTED_APPROVAL_ENTITIES).optional(),
  status: z.enum(['SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED']).optional(),
  submittedById: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListApprovalRequestsQueryDto = z.infer<typeof listApprovalRequestsQuerySchema>;

export const listPendingApprovalsQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  entityType: z.enum(SUPPORTED_APPROVAL_ENTITIES).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListPendingApprovalsQueryDto = z.infer<typeof listPendingApprovalsQuerySchema>;
