import { z } from 'zod';
import { DEDUCTION_TYPES } from '../constants/finance.constants.js';

export const raBillDeductionInputSchema = z.object({
  deductionType: z.enum(DEDUCTION_TYPES),
  description: z.string().min(1).max(255).trim(),
  calculationBase: z.number().nonnegative().optional(),
  ratePercent: z.number().min(0).max(100).optional(),
  amount: z.number().nonnegative(),
});

export const raBillMeasurementAllocationInputSchema = z.object({
  digitalMbRecordId: z.string().uuid(),
  allocatedQuantity: z.number().positive(),
});

export const raBillItemInputSchema = z.object({
  boqItemId: z.string().uuid(),
  description: z.string().min(1).max(1000).trim(),
  uom: z.string().min(1).max(50),
  contractQuantity: z.number().nonnegative(),
  unitRate: z.number().positive(),
  previousCumulativeQuantity: z.number().nonnegative().default(0),
  currentBillQuantity: z.number().positive(),
  measurementAllocations: z.array(raBillMeasurementAllocationInputSchema).min(1, 'At least one measurement allocation is required'),
});

export const createRaBillSchema = z.object({
  projectId: z.string().uuid(),
  vendorId: z.string().uuid(),
  periodStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  billDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(2000).optional(),
  advanceRecordId: z.string().uuid().optional(),
  items: z.array(raBillItemInputSchema).min(1, 'At least one bill item is required'),
  deductions: z.array(raBillDeductionInputSchema).optional().default([]),
});

export type CreateRaBillDto = z.infer<typeof createRaBillSchema>;

export const verifyRaBillSchema = z.object({
  verificationRemarks: z.string().max(1000).optional(),
});

export type VerifyRaBillDto = z.infer<typeof verifyRaBillSchema>;

export const approveRaBillSchema = z.object({
  approvalRemarks: z.string().max(1000).optional(),
});

export type ApproveRaBillDto = z.infer<typeof approveRaBillSchema>;

export const listRaBillsQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListRaBillsQueryDto = z.infer<typeof listRaBillsQuerySchema>;
