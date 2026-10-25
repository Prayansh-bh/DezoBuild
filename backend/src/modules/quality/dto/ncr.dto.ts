import { z } from 'zod';
import { NcrCategory, NcrSeverity } from '../constants/quality.constants.js';

export const createNcrSchema = z.object({
  projectId: z.string().uuid(),
  inspectionRequestId: z.string().uuid().optional().nullable(),
  title: z.string().min(3).max(255),
  description: z.string().min(5),
  location: z.string().min(1).max(255),
  category: z.nativeEnum(NcrCategory),
  severity: z.nativeEnum(NcrSeverity),
  responsibleVendorId: z.string().uuid().optional().nullable(),
  responsibleParty: z.string().max(255).optional().nullable(),
  targetClosureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'targetClosureDate must be YYYY-MM-DD'),
  containmentAction: z.string().optional().nullable(),
});
export type CreateNcrDto = z.infer<typeof createNcrSchema>;

export const updateDraftNcrSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().min(5).optional(),
  location: z.string().min(1).max(255).optional(),
  category: z.nativeEnum(NcrCategory).optional(),
  severity: z.nativeEnum(NcrSeverity).optional(),
  responsibleVendorId: z.string().uuid().optional().nullable(),
  responsibleParty: z.string().max(255).optional().nullable(),
  targetClosureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  containmentAction: z.string().optional().nullable(),
});
export type UpdateDraftNcrDto = z.infer<typeof updateDraftNcrSchema>;

export const transitionActionRequiredNcrSchema = z.object({
  rootCause: z.string().min(5),
  correctiveAction: z.string().min(5),
  preventiveAction: z.string().optional().nullable(),
});
export type TransitionActionRequiredNcrDto = z.infer<typeof transitionActionRequiredNcrSchema>;

export const submitVerificationNcrSchema = z.object({
  remarks: z.string().optional().nullable(),
});
export type SubmitVerificationNcrDto = z.infer<typeof submitVerificationNcrSchema>;

export const verifyAndCloseNcrSchema = z.object({
  closureRemarks: z.string().min(5, 'Closure remarks are required'),
});
export type VerifyAndCloseNcrDto = z.infer<typeof verifyAndCloseNcrSchema>;

export const rejectVerificationNcrSchema = z.object({
  rejectionReason: z.string().min(5, 'Rejection reason is required'),
});
export type RejectVerificationNcrDto = z.infer<typeof rejectVerificationNcrSchema>;

export const reopenNcrSchema = z.object({
  reason: z.string().min(5, 'Reopen justification is required'),
});
export type ReopenNcrDto = z.infer<typeof reopenNcrSchema>;

export const voidNcrSchema = z.object({
  reason: z.string().min(5, 'Void justification is required'),
});
export type VoidNcrDto = z.infer<typeof voidNcrSchema>;

export const listNcrsQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.string().optional(),
  severity: z.string().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});
export type ListNcrsQueryDto = z.infer<typeof listNcrsQuerySchema>;
