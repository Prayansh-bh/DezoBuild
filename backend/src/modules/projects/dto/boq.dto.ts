import { z } from 'zod';
import { BOQ_STATUSES, BOQ_UOMS } from '../constants/boq.constants';

export const CreateBoqItemSchema = z.object({
  id: z.string().uuid().optional(),
  wbsNodeId: z.string().uuid('wbsNodeId must be a valid UUID').optional().nullable(),
  parentId: z.string().uuid('parentId must be a valid UUID').optional().nullable(),
  itemNumber: z
    .string()
    .min(1, 'Item number is required')
    .max(50, 'Item number cannot exceed 50 characters'),
  description: z
    .string()
    .min(1, 'Description is required'),
  specification: z.string().optional().nullable(),
  uom: z.enum(BOQ_UOMS, {
    errorMap: () => ({ message: 'Invalid UOM. Must be a supported construction UOM.' }),
  }),
  quantity: z
    .union([z.number().positive('Quantity must be greater than 0'), z.string()])
    .refine((v) => {
      const num = typeof v === 'number' ? v : parseFloat(v);
      return !isNaN(num) && num > 0;
    }, 'Quantity must be a positive number'),
  unitRate: z
    .union([z.number().nonnegative('Unit rate must be >= 0'), z.string()])
    .refine((v) => {
      const num = typeof v === 'number' ? v : parseFloat(v);
      return !isNaN(num) && num >= 0;
    }, 'Unit rate must be a non-negative number'),
});

export type CreateBoqItemDto = z.infer<typeof CreateBoqItemSchema>;

export const BulkCreateBoqSchema = z.object({
  items: z
    .array(CreateBoqItemSchema)
    .min(1, 'At least one BOQ item is required')
    .max(500, 'Cannot exceed 500 BOQ items in a single bulk upload'),
});

export type BulkCreateBoqDto = z.infer<typeof BulkCreateBoqSchema>;

export const UpdateBoqItemSchema = z
  .object({
    wbsNodeId: z.string().uuid('wbsNodeId must be a valid UUID').optional().nullable(),
    parentId: z.string().uuid('parentId must be a valid UUID').optional().nullable(),
    description: z.string().min(1, 'Description cannot be empty').optional(),
    specification: z.string().optional().nullable(),
    uom: z.enum(BOQ_UOMS).optional(),
    quantity: z
      .union([z.number().positive('Quantity must be greater than 0'), z.string()])
      .refine((v) => {
        const num = typeof v === 'number' ? v : parseFloat(v);
        return !isNaN(num) && num > 0;
      }, 'Quantity must be a positive number')
      .optional(),
    unitRate: z
      .union([z.number().nonnegative('Unit rate must be >= 0'), z.string()])
      .refine((v) => {
        const num = typeof v === 'number' ? v : parseFloat(v);
        return !isNaN(num) && num >= 0;
      }, 'Unit rate must be a non-negative number')
      .optional(),
    status: z.enum(BOQ_STATUSES).optional(),
  })
  .strict();

export type UpdateBoqItemDto = z.infer<typeof UpdateBoqItemSchema>;

export const ListBoqQuerySchema = z.object({
  status: z.enum(BOQ_STATUSES).optional(),
  wbsNodeId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

export type ListBoqQueryDto = z.infer<typeof ListBoqQuerySchema>;

/**
 * Phase 10 Billing Position Interface (Read-Only Contract)
 */
export interface BoqBillingPositionDto {
  boqItemId: string;
  itemCode: string;
  description: string;
  uom: string;
  contractQuantity: string;
  contractRate: string;
  contractAmount: string;
  approvedCumulativeQuantity: string;
  remainingQuantity: string;
  certifiedAmount: string;
  completionPercentage: string;
  isOverExecuted: boolean;
}
