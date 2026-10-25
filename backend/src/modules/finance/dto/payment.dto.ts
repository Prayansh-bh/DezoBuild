import { z } from 'zod';
import { PAYMENT_MODES } from '../constants/finance.constants.js';

export const paymentAllocationInputSchema = z.object({
  invoiceId: z.string().uuid().optional(),
  raBillId: z.string().uuid().optional(),
  expenseClaimId: z.string().uuid().optional(),
  allocatedAmount: z.number().positive('allocatedAmount must be greater than 0'),
}).refine(
  (data) => {
    const targets = [data.invoiceId, data.raBillId, data.expenseClaimId].filter(Boolean);
    return targets.length === 1;
  },
  {
    message: 'Payment allocation must target exactly one: invoiceId, raBillId, or expenseClaimId',
  }
);

export const createPaymentVoucherSchema = z.object({
  projectId: z.string().uuid().optional(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentMode: z.enum(PAYMENT_MODES),
  referenceNumber: z.string().min(1).max(100).trim(),
  bankAccountRef: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  allocations: z.array(paymentAllocationInputSchema).min(1, 'At least one payment allocation is required'),
});

export type CreatePaymentVoucherDto = z.infer<typeof createPaymentVoucherSchema>;

export const approvePaymentVoucherSchema = z.object({
  approvalRemarks: z.string().max(1000).optional(),
});

export type ApprovePaymentVoucherDto = z.infer<typeof approvePaymentVoucherSchema>;

export const disbursePaymentVoucherSchema = z.object({
  disbursementRemarks: z.string().max(1000).optional(),
});

export type DisbursePaymentVoucherDto = z.infer<typeof disbursePaymentVoucherSchema>;

export const listPaymentVouchersQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.string().optional(),
  paymentMode: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListPaymentVouchersQueryDto = z.infer<typeof listPaymentVouchersQuerySchema>;
