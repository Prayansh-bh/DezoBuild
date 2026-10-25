import { z } from 'zod';

export const CreateGoodsReceiptLineSchema = z
  .object({
    purchaseOrderLineId: z.string().uuid('Invalid purchase order line UUID format'),
    materialId: z.string().uuid('Invalid material UUID format'),
    quantityDelivered: z
      .number()
      .positive('Delivered quantity must be greater than 0')
      .max(9999999999.9999, 'Quantity exceeds maximum allowed value'),
    quantityAccepted: z
      .number()
      .min(0, 'Accepted quantity cannot be negative')
      .max(9999999999.9999, 'Quantity exceeds maximum allowed value'),
    quantityRejected: z
      .number()
      .min(0, 'Rejected quantity cannot be negative')
      .max(9999999999.9999, 'Quantity exceeds maximum allowed value')
      .default(0),
    uom: z.string().min(1, 'UOM is required').max(20, 'UOM must not exceed 20 characters'),
    unitRate: z
      .number()
      .min(0, 'Unit rate cannot be negative')
      .max(9999999999.9999, 'Unit rate exceeds maximum allowed value')
      .optional(),
    storageLocation: z
      .string()
      .max(100, 'Storage location must not exceed 100 characters')
      .optional()
      .nullable(),
    remarks: z
      .string()
      .max(2000, 'Remarks must not exceed 2000 characters')
      .optional()
      .nullable(),
  })
  .refine(
    (line) => {
      const sum = Number((line.quantityAccepted + (line.quantityRejected ?? 0)).toFixed(4));
      const delivered = Number(line.quantityDelivered.toFixed(4));
      return Math.abs(sum - delivered) < 0.0001;
    },
    {
      message: 'Delivered quantity must strictly equal accepted quantity + rejected quantity',
      path: ['quantityDelivered'],
    }
  )
  .refine(
    (line) => line.quantityAccepted <= line.quantityDelivered,
    {
      message: 'Accepted quantity cannot exceed delivered quantity',
      path: ['quantityAccepted'],
    }
  );

export type CreateGoodsReceiptLineDto = z.infer<typeof CreateGoodsReceiptLineSchema>;

export const CreateGoodsReceiptSchema = z.object({
  purchaseOrderId: z.string().uuid('Invalid purchase order UUID format'),
  storeId: z.string().uuid('Invalid store UUID format'),
  receiptDate: z.string().optional().nullable(),
  deliveryChallanNumber: z
    .string()
    .max(100, 'Delivery challan number must not exceed 100 characters')
    .optional()
    .nullable(),
  deliveryChallanDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'deliveryChallanDate must be in YYYY-MM-DD format')
    .optional()
    .nullable(),
  vehicleNumber: z
    .string()
    .max(50, 'Vehicle number must not exceed 50 characters')
    .optional()
    .nullable(),
  remarks: z
    .string()
    .max(5000, 'Remarks must not exceed 5000 characters')
    .optional()
    .nullable(),
  lines: z
    .array(CreateGoodsReceiptLineSchema)
    .min(1, 'Goods receipt must contain at least one line item'),
});

export type CreateGoodsReceiptDto = z.infer<typeof CreateGoodsReceiptSchema>;

export const UpdateGoodsReceiptSchema = z.object({
  storeId: z.string().uuid('Invalid store UUID format').optional(),
  receiptDate: z.string().optional().nullable(),
  deliveryChallanNumber: z
    .string()
    .max(100, 'Delivery challan number must not exceed 100 characters')
    .optional()
    .nullable(),
  deliveryChallanDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'deliveryChallanDate must be in YYYY-MM-DD format')
    .optional()
    .nullable(),
  vehicleNumber: z
    .string()
    .max(50, 'Vehicle number must not exceed 50 characters')
    .optional()
    .nullable(),
  remarks: z
    .string()
    .max(5000, 'Remarks must not exceed 5000 characters')
    .optional()
    .nullable(),
  lines: z
    .array(CreateGoodsReceiptLineSchema)
    .min(1, 'Goods receipt must contain at least one line item')
    .optional(),
});

export type UpdateGoodsReceiptDto = z.infer<typeof UpdateGoodsReceiptSchema>;

export const SubmitGoodsReceiptSchema = z.object({
  remarks: z
    .string()
    .max(2000, 'Remarks must not exceed 2000 characters')
    .optional()
    .nullable(),
});

export type SubmitGoodsReceiptDto = z.infer<typeof SubmitGoodsReceiptSchema>;

export const VerifyGoodsReceiptSchema = z.object({
  verificationRemarks: z
    .string()
    .max(2000, 'Verification remarks must not exceed 2000 characters')
    .optional()
    .nullable(),
});

export type VerifyGoodsReceiptDto = z.infer<typeof VerifyGoodsReceiptSchema>;

export const RejectGoodsReceiptSchema = z.object({
  rejectionReason: z
    .string()
    .min(1, 'rejectionReason is mandatory when rejecting a goods receipt note')
    .max(2000, 'Rejection reason must not exceed 2000 characters'),
});

export type RejectGoodsReceiptDto = z.infer<typeof RejectGoodsReceiptSchema>;

export const CancelGoodsReceiptSchema = z.object({
  cancellationReason: z
    .string()
    .max(2000, 'Cancellation reason must not exceed 2000 characters')
    .optional()
    .nullable(),
});

export type CancelGoodsReceiptDto = z.infer<typeof CancelGoodsReceiptSchema>;

export const ListGoodsReceiptsQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  purchaseOrderId: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
});

export type ListGoodsReceiptsQueryDto = z.infer<typeof ListGoodsReceiptsQuerySchema>;
