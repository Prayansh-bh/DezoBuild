import { z } from 'zod';
import { MaterialUomSchema } from './material.dto';
import { STOCK_MOVEMENT_TYPES } from '../constants/stock-movement-type.constant';

export const StockMovementTypeSchema = z.enum(
  STOCK_MOVEMENT_TYPES as unknown as [string, ...string[]]
);

export const RecordStockAdjustmentSchema = z.object({
  materialId: z.string().uuid('Invalid material ID format').optional(),
  movementType: z.enum(['ADJUSTMENT_IN', 'ADJUSTMENT_OUT'], {
    errorMap: () => ({ message: 'Movement type must be ADJUSTMENT_IN or ADJUSTMENT_OUT' }),
  }),
  quantity: z
    .number()
    .positive('Adjustment quantity must be greater than 0'),
  uom: MaterialUomSchema.optional(),
  unitRate: z.number().min(0, 'Unit rate cannot be negative').optional().nullable(),
  referenceType: z.string().max(50).optional().nullable(),
  referenceId: z.string().uuid().optional().nullable(),
  reason: z
    .string()
    .min(3, 'Adjustment reason is required and must be at least 3 characters')
    .max(2000),
  idempotencyKey: z
    .string()
    .max(255)
    .optional()
    .nullable(),
});

export type RecordStockAdjustmentDto = z.infer<typeof RecordStockAdjustmentSchema>;

export const ListStockBalancesQuerySchema = z.object({
  search: z.string().optional(),
  materialId: z.string().uuid().optional(),
  lowStockOnly: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 50)),
});

export type ListStockBalancesQueryDto = z.infer<typeof ListStockBalancesQuerySchema>;

export const ListStockMovementsQuerySchema = z.object({
  materialId: z.string().uuid().optional(),
  movementType: StockMovementTypeSchema.optional(),
  startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 50)),
});

export type ListStockMovementsQueryDto = z.infer<typeof ListStockMovementsQuerySchema>;
