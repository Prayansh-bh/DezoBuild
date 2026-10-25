import { z } from 'zod';
import { MATERIAL_RETURN_CONDITIONS } from '../constants/material-return.constants';

export const MaterialReturnLineInputSchema = z.object({
  materialIssueLineId: z.string().uuid('Invalid material issue line UUID format'),
  quantityReturned: z
    .number()
    .positive('Returned quantity must be greater than 0')
    .max(9999999999.9999, 'Quantity exceeds maximum allowed value'),
  condition: z
    .enum([
      MATERIAL_RETURN_CONDITIONS.GOOD,
      MATERIAL_RETURN_CONDITIONS.DAMAGED,
      MATERIAL_RETURN_CONDITIONS.DEFECTIVE,
      MATERIAL_RETURN_CONDITIONS.UNUSABLE,
    ])
    .default(MATERIAL_RETURN_CONDITIONS.GOOD)
    .optional(),
  remarks: z.string().max(2000, 'Remarks must not exceed 2000 characters').optional().nullable(),
});

export type MaterialReturnLineInputDto = z.infer<typeof MaterialReturnLineInputSchema>;

export const CreateMaterialReturnSchema = z.object({
  projectId: z.string().uuid('Invalid project UUID format'),
  storeId: z.string().uuid('Invalid store UUID format'),
  materialIssueId: z.string().uuid('Invalid material issue UUID format'),
  returnDate: z.string().optional().nullable(),
  remarks: z.string().max(5000, 'Remarks must not exceed 5000 characters').optional().nullable(),
  lines: z
    .array(MaterialReturnLineInputSchema)
    .min(1, 'Material return must contain at least one line item'),
});

export type CreateMaterialReturnDto = z.infer<typeof CreateMaterialReturnSchema>;

export const UpdateMaterialReturnSchema = z.object({
  storeId: z.string().uuid('Invalid store UUID format').optional(),
  returnDate: z.string().optional().nullable(),
  remarks: z.string().max(5000, 'Remarks must not exceed 5000 characters').optional().nullable(),
  lines: z
    .array(MaterialReturnLineInputSchema)
    .min(1, 'Material return must contain at least one line item')
    .optional(),
});

export type UpdateMaterialReturnDto = z.infer<typeof UpdateMaterialReturnSchema>;

export const SubmitMaterialReturnSchema = z.object({
  remarks: z.string().max(2000, 'Remarks must not exceed 2000 characters').optional().nullable(),
});

export type SubmitMaterialReturnDto = z.infer<typeof SubmitMaterialReturnSchema>;

export const VerifyMaterialReturnSchema = z.object({
  verificationRemarks: z
    .string()
    .max(2000, 'Verification remarks must not exceed 2000 characters')
    .optional()
    .nullable(),
});

export type VerifyMaterialReturnDto = z.infer<typeof VerifyMaterialReturnSchema>;

export const RejectMaterialReturnSchema = z.object({
  rejectionReason: z
    .string()
    .min(1, 'Rejection reason is required')
    .max(2000, 'Rejection reason must not exceed 2000 characters'),
});

export type RejectMaterialReturnDto = z.infer<typeof RejectMaterialReturnSchema>;

export const CancelMaterialReturnSchema = z.object({
  cancellationReason: z
    .string()
    .max(2000, 'Cancellation reason must not exceed 2000 characters')
    .optional()
    .nullable(),
});

export type CancelMaterialReturnDto = z.infer<typeof CancelMaterialReturnSchema>;

export const ListMaterialReturnsQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
  materialIssueId: z.string().uuid().optional(),
  status: z.string().optional(),
  returnedById: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
});

export type ListMaterialReturnsQueryDto = z.infer<typeof ListMaterialReturnsQuerySchema>;
