import { z } from 'zod';
import { MATERIAL_UOMS } from '../constants/material-uom.constant';

export const IndentStatusSchema = z.enum([
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'FULFILLED',
]);
export type IndentStatus = z.infer<typeof IndentStatusSchema>;

export const IndentPrioritySchema = z.enum(['NORMAL', 'URGENT', 'CRITICAL']);
export type IndentPriority = z.infer<typeof IndentPrioritySchema>;

export const IndentUomSchema = z.enum(MATERIAL_UOMS as unknown as [string, ...string[]]);

export const CreateIndentLineSchema = z.object({
  materialId: z.string().uuid('Invalid material ID'),
  quantityRequested: z
    .number()
    .positive('Requested quantity must be greater than 0'),
  uom: IndentUomSchema,
  purpose: z.string().max(255).optional().nullable(),
  wbsNodeId: z.string().uuid('Invalid WBS Node ID').optional().nullable(),
  taskId: z.string().uuid('Invalid Task ID').optional().nullable(),
  remarks: z.string().max(2000).optional().nullable(),
});
export type CreateIndentLineDto = z.infer<typeof CreateIndentLineSchema>;

export const CreateMaterialIndentSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  storeId: z.string().uuid('Invalid store ID').optional().nullable(),
  requiredByDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'requiredByDate must be in YYYY-MM-DD format'),
  priority: IndentPrioritySchema.default('NORMAL'),
  remarks: z.string().max(4000).optional().nullable(),
  lines: z
    .array(CreateIndentLineSchema)
    .min(1, 'Material indent must contain at least one line item'),
});
export type CreateMaterialIndentDto = z.infer<typeof CreateMaterialIndentSchema>;

export const UpdateMaterialIndentSchema = z.object({
  storeId: z.string().uuid('Invalid store ID').optional().nullable(),
  requiredByDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'requiredByDate must be in YYYY-MM-DD format')
    .optional(),
  priority: IndentPrioritySchema.optional(),
  remarks: z.string().max(4000).optional().nullable(),
  lines: z
    .array(CreateIndentLineSchema)
    .min(1, 'Material indent must contain at least one line item')
    .optional(),
});
export type UpdateMaterialIndentDto = z.infer<typeof UpdateMaterialIndentSchema>;

export const SubmitMaterialIndentSchema = z.object({
  notes: z.string().max(2000).optional().nullable(),
});
export type SubmitMaterialIndentDto = z.infer<typeof SubmitMaterialIndentSchema>;

export const ApproveMaterialIndentSchema = z.object({
  approvalRemarks: z.string().max(2000).optional().nullable(),
});
export type ApproveMaterialIndentDto = z.infer<typeof ApproveMaterialIndentSchema>;

export const RejectMaterialIndentSchema = z.object({
  rejectionReason: z
    .string()
    .min(1, 'rejectionReason is mandatory when rejecting an indent')
    .max(2000, 'rejectionReason must not exceed 2000 characters'),
});
export type RejectMaterialIndentDto = z.infer<typeof RejectMaterialIndentSchema>;

export const CancelMaterialIndentSchema = z.object({
  cancellationReason: z.string().max(2000).optional().nullable(),
});
export type CancelMaterialIndentDto = z.infer<typeof CancelMaterialIndentSchema>;

export const ListMaterialIndentQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
  status: IndentStatusSchema.optional(),
  priority: IndentPrioritySchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 50)),
});
export type ListMaterialIndentQueryDto = z.infer<typeof ListMaterialIndentQuerySchema>;
