import { z } from 'zod';
import { TAX_TYPES } from '../constants/finance.constants.js';

export const appliedTaxLineInputSchema = z.object({
  taxType: z.enum(TAX_TYPES),
  taxRatePercent: z.number().min(0).max(100),
  taxableBaseAmount: z.number().nonnegative(),
  taxAmount: z.number().nonnegative(),
  jurisdiction: z.string().min(1).max(100).default('CENTRAL'),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const invoiceGrnAllocationInputSchema = z.object({
  grnLineId: z.string().uuid(),
  allocatedQuantity: z.number().positive(),
});

export const vendorInvoiceLineInputSchema = z.object({
  poLineId: z.string().uuid().optional(),
  materialId: z.string().uuid().optional(),
  description: z.string().min(1).max(1000).trim(),
  isDirectCharge: z.boolean().optional().default(false),
  billedQuantity: z.number().positive(),
  unitRate: z.number().positive(),
  taxRatePercent: z.number().min(0).max(100).optional().default(0),
  taxAmount: z.number().min(0).optional().default(0),
  grnAllocations: z.array(invoiceGrnAllocationInputSchema).optional().default([]),
  appliedTaxes: z.array(appliedTaxLineInputSchema).optional().default([]),
});

export const createVendorInvoiceSchema = z.object({
  projectId: z.string().uuid(),
  vendorId: z.string().uuid(),
  purchaseOrderId: z.string().uuid().optional(),
  vendorInvoiceNumber: z.string().min(1).max(100).trim(),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  discountAmount: z.number().nonnegative().optional().default(0),
  directChargesAmount: z.number().nonnegative().optional().default(0),
  advanceRecovery: z.number().nonnegative().optional().default(0),
  advanceRecordId: z.string().uuid().optional(),
  retentionWithheld: z.number().nonnegative().optional().default(0),
  tdsDeducted: z.number().nonnegative().optional().default(0),
  otherDeductions: z.number().nonnegative().optional().default(0),
  notes: z.string().max(2000).optional(),
  lines: z.array(vendorInvoiceLineInputSchema).min(1, 'At least one invoice line is required'),
});

export type CreateVendorInvoiceDto = z.infer<typeof createVendorInvoiceSchema>;

export const verifyVendorInvoiceSchema = z.object({
  verificationRemarks: z.string().max(1000).optional(),
  priceVarianceAuthorized: z.boolean().optional().default(false),
  varianceAuthorizationReason: z.string().max(1000).optional(),
});

export type VerifyVendorInvoiceDto = z.infer<typeof verifyVendorInvoiceSchema>;

export const approveVendorInvoiceSchema = z.object({
  approvalRemarks: z.string().max(1000).optional(),
});

export type ApproveVendorInvoiceDto = z.infer<typeof approveVendorInvoiceSchema>;

export const listVendorInvoicesQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListVendorInvoicesQueryDto = z.infer<typeof listVendorInvoicesQuerySchema>;
