import { z } from 'zod';
import { SUPPORTED_APPROVAL_ENTITIES } from '../constants/approval.constants';
import { ALL_CANONICAL_PERMISSION_NAMES } from '../../rbac/constants/permissions.catalog';

export const createApprovalPolicyStepSchema = z.object({
  stepOrder: z.number().int().min(1, 'stepOrder must be at least 1'),
  stepName: z.string().min(1, 'stepName is required').max(100),
  requiredRoleHint: z.string().max(50).optional().nullable(),
  requiredPermission: z.string().refine(
    (perm) => ALL_CANONICAL_PERMISSION_NAMES.includes(perm),
    { message: 'requiredPermission must be a valid Phase 04 canonical permission' }
  ),
  enforceMakerChecker: z.boolean().default(true),
  enforceDistinctFromPrev: z.boolean().default(false),
  timeoutHours: z.number().int().positive().optional().nullable(),
});

export const createApprovalPolicySchema = z.object({
  projectId: z.string().uuid('Invalid projectId UUID').optional().nullable(),
  entityType: z.enum(SUPPORTED_APPROVAL_ENTITIES, {
    errorMap: () => ({ message: 'entityType must be one of the 15 supported approval entities' }),
  }),
  name: z.string().min(1, 'Policy name is required').max(255),
  description: z.string().optional().nullable(),
  minAmount: z.number().nonnegative('minAmount must be non-negative').optional().nullable(),
  maxAmount: z.number().positive('maxAmount must be positive').optional().nullable(),
  currency: z.string().length(3, 'currency must be a 3-letter code').default('INR'),
  steps: z
    .array(createApprovalPolicyStepSchema)
    .min(1, 'Policy must have at least one step')
    .refine((steps) => {
      const orders = steps.map((s) => s.stepOrder);
      const uniqueOrders = new Set(orders);
      if (uniqueOrders.size !== steps.length) return false;
      const sorted = [...orders].sort((a, b) => a - b);
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i] !== i + 1) return false;
      }
      return true;
    }, { message: 'Steps must be strictly sequential starting from 1 with no gaps or duplicates' }),
});

export type CreateApprovalPolicyDto = z.infer<typeof createApprovalPolicySchema>;
export type CreateApprovalPolicyStepDto = z.infer<typeof createApprovalPolicyStepSchema>;

export const supersedeApprovalPolicySchema = z.object({
  newDraftPolicyId: z.string().uuid('Invalid newDraftPolicyId UUID'),
});

export type SupersedeApprovalPolicyDto = z.infer<typeof supersedeApprovalPolicySchema>;

export const listApprovalPoliciesQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  entityType: z.enum(SUPPORTED_APPROVAL_ENTITIES).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'SUPERSEDED', 'INACTIVE']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListApprovalPoliciesQueryDto = z.infer<typeof listApprovalPoliciesQuerySchema>;
