import { z } from 'zod';

export const CreatePurchaseOrderLineSchema = z.object({
  materialId: z.string().uuid('Invalid material UUID format'),
  indentLineId: z.string().uuid('Invalid indent line UUID format').optional().nullable(),
  quantityOrdered: z
    .number()
    .positive('Quantity ordered must be greater than 0')
    .max(9999999999.9999, 'Quantity exceeds maximum allowed value'),
  uom: z.string().min(1, 'UOM is required').max(20, 'UOM must not exceed 20 characters'),
  unitRate: z
    .number()
    .min(0, 'Unit rate cannot be negative')
    .max(9999999999.99, 'Unit rate exceeds maximum allowed value'),
  taxRatePercent: z
    .number()
    .min(0, 'Tax rate cannot be negative')
    .max(100, 'Tax rate cannot exceed 100%')
    .default(0),
  discountRatePercent: z
    .number()
    .min(0, 'Discount rate cannot be negative')
    .max(100, 'Discount rate cannot exceed 100%')
    .default(0),
  expectedDeliveryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'expectedDeliveryDate must be in YYYY-MM-DD format')
    .optional()
    .nullable(),
  wbsNodeId: z.string().uuid('Invalid WBS node UUID format').optional().nullable(),
  taskId: z.string().uuid('Invalid Task UUID format').optional().nullable(),
  remarks: z.string().max(2000, 'Remarks must not exceed 2000 characters').optional().nullable(),
});

export type CreatePurchaseOrderLineDto = z.infer<typeof CreatePurchaseOrderLineSchema>;

export const CreatePurchaseOrderSchema = z.object({
  projectId: z.string().uuid('Invalid project UUID format'),
  vendorId: z.string().uuid('Invalid vendor UUID format'),
  expectedDeliveryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'expectedDeliveryDate must be in YYYY-MM-DD format'),
  deliveryAddress: z.string().max(2000, 'Delivery address must not exceed 2000 characters').optional().nullable(),
  paymentTerms: z.string().max(255, 'Payment terms must not exceed 255 characters').optional().nullable(),
  currency: z.string().max(10, 'Currency code must not exceed 10 characters').default('INR'),
  notes: z.string().max(5000, 'Notes must not exceed 5000 characters').optional().nullable(),
  termsAndConditions: z.string().max(10000, 'Terms and conditions must not exceed 10000 characters').optional().nullable(),
  lines: z
    .array(CreatePurchaseOrderLineSchema)
    .min(1, 'Purchase order must contain at least one line item'),
});

export type CreatePurchaseOrderDto = z.infer<typeof CreatePurchaseOrderSchema>;

export const UpdatePurchaseOrderSchema = z.object({
  vendorId: z.string().uuid('Invalid vendor UUID format').optional(),
  expectedDeliveryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'expectedDeliveryDate must be in YYYY-MM-DD format')
    .optional(),
  deliveryAddress: z.string().max(2000, 'Delivery address must not exceed 2000 characters').optional().nullable(),
  paymentTerms: z.string().max(255, 'Payment terms must not exceed 255 characters').optional().nullable(),
  currency: z.string().max(10, 'Currency code must not exceed 10 characters').optional(),
  notes: z.string().max(5000, 'Notes must not exceed 5000 characters').optional().nullable(),
  termsAndConditions: z.string().max(10000, 'Terms and conditions must not exceed 10000 characters').optional().nullable(),
  lines: z
    .array(CreatePurchaseOrderLineSchema)
    .min(1, 'Purchase order must contain at least one line item')
    .optional(),
});

export type UpdatePurchaseOrderDto = z.infer<typeof UpdatePurchaseOrderSchema>;

export const SubmitPurchaseOrderSchema = z.object({
  notes: z.string().max(2000, 'Notes must not exceed 2000 characters').optional().nullable(),
});

export type SubmitPurchaseOrderDto = z.infer<typeof SubmitPurchaseOrderSchema>;

export const ApprovePurchaseOrderSchema = z.object({
  approvalRemarks: z.string().max(2000, 'Approval remarks must not exceed 2000 characters').optional().nullable(),
});

export type ApprovePurchaseOrderDto = z.infer<typeof ApprovePurchaseOrderSchema>;

export const RejectPurchaseOrderSchema = z.object({
  rejectionReason: z
    .string()
    .min(1, 'rejectionReason is mandatory when rejecting a purchase order')
    .max(2000, 'Rejection reason must not exceed 2000 characters'),
});

export type RejectPurchaseOrderDto = z.infer<typeof RejectPurchaseOrderSchema>;

export const OrderPurchaseOrderSchema = z.object({
  notes: z.string().max(2000, 'Notes must not exceed 2000 characters').optional().nullable(),
});

export type OrderPurchaseOrderDto = z.infer<typeof OrderPurchaseOrderSchema>;

export const CancelPurchaseOrderSchema = z.object({
  cancellationReason: z.string().max(2000, 'Cancellation reason must not exceed 2000 characters').optional().nullable(),
});

export type CancelPurchaseOrderDto = z.infer<typeof CancelPurchaseOrderSchema>;

export const ListPurchaseOrdersQuerySchema = z.object({
  projectId: z.string().uuid('Invalid project UUID format').optional(),
  vendorId: z.string().uuid('Invalid vendor UUID format').optional(),
  status: z
    .enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'ORDERED', 'REJECTED', 'CANCELLED', 'CLOSED'])
    .optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be in YYYY-MM-DD format')
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be in YYYY-MM-DD format')
    .optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListPurchaseOrdersQueryDto = z.infer<typeof ListPurchaseOrdersQuerySchema>;
