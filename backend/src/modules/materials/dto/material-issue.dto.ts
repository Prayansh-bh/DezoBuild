import { z } from 'zod';

export const CreateMaterialIssueLineSchema = z.object({
  materialId: z.string().uuid('Invalid material UUID format'),
  quantityRequested: z
    .number()
    .positive('Requested quantity must be greater than 0')
    .max(9999999999.9999, 'Quantity exceeds maximum allowed value'),
  quantityIssued: z
    .number()
    .min(0, 'Issued quantity cannot be negative')
    .max(9999999999.9999, 'Quantity exceeds maximum allowed value')
    .default(0)
    .optional(),
  uom: z.string().min(1, 'UOM is required').max(20, 'UOM must not exceed 20 characters'),
  wbsNodeId: z.string().uuid('Invalid WBS Node UUID format').optional().nullable(),
  taskId: z.string().uuid('Invalid Task UUID format').optional().nullable(),
  reservationLineId: z.string().uuid('Invalid reservation line UUID format').optional().nullable(),
  remarks: z.string().max(2000, 'Remarks must not exceed 2000 characters').optional().nullable(),
});

export type CreateMaterialIssueLineDto = z.infer<typeof CreateMaterialIssueLineSchema>;

export const CreateMaterialIssueSchema = z.object({
  projectId: z.string().uuid('Invalid project UUID format'),
  storeId: z.string().uuid('Invalid store UUID format'),
  issueDate: z.string().optional().nullable(),
  purpose: z.string().max(255, 'Purpose must not exceed 255 characters').optional().nullable(),
  remarks: z.string().max(5000, 'Remarks must not exceed 5000 characters').optional().nullable(),
  lines: z
    .array(CreateMaterialIssueLineSchema)
    .min(1, 'Material issue must contain at least one line item'),
});

export type CreateMaterialIssueDto = z.infer<typeof CreateMaterialIssueSchema>;

export const UpdateMaterialIssueSchema = z.object({
  storeId: z.string().uuid('Invalid store UUID format').optional(),
  issueDate: z.string().optional().nullable(),
  purpose: z.string().max(255, 'Purpose must not exceed 255 characters').optional().nullable(),
  remarks: z.string().max(5000, 'Remarks must not exceed 5000 characters').optional().nullable(),
  lines: z
    .array(CreateMaterialIssueLineSchema)
    .min(1, 'Material issue must contain at least one line item')
    .optional(),
});

export type UpdateMaterialIssueDto = z.infer<typeof UpdateMaterialIssueSchema>;

export const SubmitMaterialIssueSchema = z.object({
  remarks: z.string().max(2000, 'Remarks must not exceed 2000 characters').optional().nullable(),
});

export type SubmitMaterialIssueDto = z.infer<typeof SubmitMaterialIssueSchema>;

export const ApproveMaterialIssueSchema = z.object({
  approvalRemarks: z
    .string()
    .max(2000, 'Approval remarks must not exceed 2000 characters')
    .optional()
    .nullable(),
});

export type ApproveMaterialIssueDto = z.infer<typeof ApproveMaterialIssueSchema>;

export const IssueLineQuantitySchema = z.object({
  lineId: z.string().uuid('Invalid line UUID format'),
  quantityIssued: z
    .number()
    .positive('Issued quantity must be greater than 0')
    .max(9999999999.9999, 'Quantity exceeds maximum allowed value'),
});

export const IssueMaterialIssueSchema = z.object({
  issuedLines: z.array(IssueLineQuantitySchema).optional(),
  remarks: z.string().max(2000, 'Remarks must not exceed 2000 characters').optional().nullable(),
});

export type IssueMaterialIssueDto = z.infer<typeof IssueMaterialIssueSchema>;

export const CancelMaterialIssueSchema = z.object({
  cancellationReason: z
    .string()
    .max(2000, 'Cancellation reason must not exceed 2000 characters')
    .optional()
    .nullable(),
});

export type CancelMaterialIssueDto = z.infer<typeof CancelMaterialIssueSchema>;

export const ListMaterialIssuesQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
  status: z.string().optional(),
  requestedById: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
});

export type ListMaterialIssuesQueryDto = z.infer<typeof ListMaterialIssuesQuerySchema>;
