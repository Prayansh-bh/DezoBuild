import { z } from 'zod';

export const listPayablesQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
  status: z.string().optional(),
  sourceType: z.enum(['ALL', 'VENDOR_INVOICE', 'RA_BILL']).optional().default('ALL'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListPayablesQueryDto = z.infer<typeof listPayablesQuerySchema>;

export interface PayableItemDto {
  id: string;
  sourceType: 'VENDOR_INVOICE' | 'RA_BILL';
  documentNumber: string;
  vendorId: string;
  vendorName: string;
  projectId: string;
  projectName: string;
  dueDate: string;
  grossAmount: number;
  deductionsAmount: number;
  netPayable: number;
  paidAmount: number;
  outstandingBalance: number;
  status: string;
  agingBucket: 'CURRENT_0_30' | 'DAYS_31_60' | 'DAYS_61_90' | 'DAYS_90_PLUS';
  daysOverdue: number;
}
