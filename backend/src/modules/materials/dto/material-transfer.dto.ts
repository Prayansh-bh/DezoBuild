import { z } from 'zod';

export const MaterialTransferLineInputSchema = z.object({
  materialId: z.string().uuid('Invalid material UUID format'),
  quantityTransferred: z
    .number()
    .positive('Transferred quantity must be greater than 0')
    .max(9999999999.9999, 'Quantity exceeds maximum allowed value'),
  remarks: z.string().max(2000, 'Remarks must not exceed 2000 characters').optional().nullable(),
});

export type MaterialTransferLineInputDto = z.infer<typeof MaterialTransferLineInputSchema>;

export const CreateMaterialTransferSchema = z.object({
  sourceStoreId: z.string().uuid('Invalid source store UUID format'),
  destinationStoreId: z.string().uuid('Invalid destination store UUID format'),
  transferDate: z.string().optional().nullable(),
  deliveryChallanNumber: z.string().max(100, 'Challan number too long').optional().nullable(),
  vehicleNumber: z.string().max(50, 'Vehicle number too long').optional().nullable(),
  driverName: z.string().max(100, 'Driver name too long').optional().nullable(),
  driverPhone: z.string().max(50, 'Driver phone too long').optional().nullable(),
  remarks: z.string().max(5000, 'Remarks must not exceed 5000 characters').optional().nullable(),
  lines: z
    .array(MaterialTransferLineInputSchema)
    .min(1, 'Material transfer must contain at least one line item'),
});

export type CreateMaterialTransferDto = z.infer<typeof CreateMaterialTransferSchema>;

export const UpdateMaterialTransferSchema = z.object({
  sourceStoreId: z.string().uuid('Invalid source store UUID format').optional(),
  destinationStoreId: z.string().uuid('Invalid destination store UUID format').optional(),
  transferDate: z.string().optional().nullable(),
  deliveryChallanNumber: z.string().max(100, 'Challan number too long').optional().nullable(),
  vehicleNumber: z.string().max(50, 'Vehicle number too long').optional().nullable(),
  driverName: z.string().max(100, 'Driver name too long').optional().nullable(),
  driverPhone: z.string().max(50, 'Driver phone too long').optional().nullable(),
  remarks: z.string().max(5000, 'Remarks must not exceed 5000 characters').optional().nullable(),
  lines: z
    .array(MaterialTransferLineInputSchema)
    .min(1, 'Material transfer must contain at least one line item')
    .optional(),
});

export type UpdateMaterialTransferDto = z.infer<typeof UpdateMaterialTransferSchema>;

export const SubmitMaterialTransferSchema = z.object({
  remarks: z.string().max(2000, 'Remarks must not exceed 2000 characters').optional().nullable(),
});

export type SubmitMaterialTransferDto = z.infer<typeof SubmitMaterialTransferSchema>;

export const ApproveMaterialTransferSchema = z.object({
  approvalRemarks: z
    .string()
    .max(2000, 'Approval remarks must not exceed 2000 characters')
    .optional()
    .nullable(),
});

export type ApproveMaterialTransferDto = z.infer<typeof ApproveMaterialTransferSchema>;

export const RejectMaterialTransferSchema = z.object({
  rejectionReason: z
    .string()
    .min(1, 'Rejection reason is required')
    .max(2000, 'Rejection reason must not exceed 2000 characters'),
});

export type RejectMaterialTransferDto = z.infer<typeof RejectMaterialTransferSchema>;

export const CancelMaterialTransferSchema = z.object({
  cancellationReason: z
    .string()
    .max(2000, 'Cancellation reason must not exceed 2000 characters')
    .optional()
    .nullable(),
});

export type CancelMaterialTransferDto = z.infer<typeof CancelMaterialTransferSchema>;

export const DispatchMaterialTransferSchema = z.object({
  deliveryChallanNumber: z.string().max(100, 'Challan number too long').optional().nullable(),
  vehicleNumber: z.string().max(50, 'Vehicle number too long').optional().nullable(),
  driverName: z.string().max(100, 'Driver name too long').optional().nullable(),
  driverPhone: z.string().max(50, 'Driver phone too long').optional().nullable(),
  remarks: z.string().max(2000, 'Remarks must not exceed 2000 characters').optional().nullable(),
});

export type DispatchMaterialTransferDto = z.infer<typeof DispatchMaterialTransferSchema>;

export const ReceiveMaterialTransferSchema = z.object({
  receiptRemarks: z
    .string()
    .max(2000, 'Receipt remarks must not exceed 2000 characters')
    .optional()
    .nullable(),
});

export type ReceiveMaterialTransferDto = z.infer<typeof ReceiveMaterialTransferSchema>;

export const ListMaterialTransfersQuerySchema = z.object({
  sourceStoreId: z.string().uuid().optional(),
  destinationStoreId: z.string().uuid().optional(),
  sourceProjectId: z.string().uuid().optional(),
  destinationProjectId: z.string().uuid().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
});

export type ListMaterialTransfersQueryDto = z.infer<typeof ListMaterialTransfersQuerySchema>;
