import { z } from 'zod';
import { PAYMENT_MODES } from '../constants/finance.constants.js';

export const createExpenseCategorySchema = z.object({
  code: z.string().min(1).max(50).trim(),
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(1000).optional(),
});

export type CreateExpenseCategoryDto = z.infer<typeof createExpenseCategorySchema>;

export const createExpenseClaimSchema = z.object({
  projectId: z.string().uuid(),
  categoryId: z.string().uuid(),
  amount: z.number().positive(),
  taxAmount: z.number().nonnegative().optional().default(0),
  claimDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'claimDate must be YYYY-MM-DD'),
  paidTo: z.string().min(1).max(255).trim(),
  paymentMode: z.enum(PAYMENT_MODES),
  invoiceNumber: z.string().max(100).optional(),
  receiptUrl: z.string().url().or(z.string().min(1)).optional(),
  description: z.string().min(1).max(2000).trim(),
});

export type CreateExpenseClaimDto = z.infer<typeof createExpenseClaimSchema>;

export const approveExpenseClaimSchema = z.object({
  remarks: z.string().max(1000).optional(),
});

export type ApproveExpenseClaimDto = z.infer<typeof approveExpenseClaimSchema>;

export const rejectExpenseClaimSchema = z.object({
  rejectionReason: z.string().min(1, 'rejectionReason is required').max(1000).trim(),
});

export type RejectExpenseClaimDto = z.infer<typeof rejectExpenseClaimSchema>;

export const listExpensesQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  status: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListExpensesQueryDto = z.infer<typeof listExpensesQuerySchema>;
