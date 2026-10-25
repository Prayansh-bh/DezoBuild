import { z } from 'zod';
import { MATERIAL_UOMS } from '../constants/material-uom.constant';

export const MaterialStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export type MaterialStatus = z.infer<typeof MaterialStatusSchema>;

export const MaterialUomSchema = z.enum(MATERIAL_UOMS as unknown as [string, ...string[]]);

export const CreateMaterialSchema = z
  .object({
    itemCode: z
      .string()
      .min(1, 'Item code is required')
      .max(50, 'Item code must not exceed 50 characters')
      .transform((val) => val.trim().toUpperCase()),
    name: z
      .string()
      .min(1, 'Material name is required')
      .max(255, 'Material name must not exceed 255 characters')
      .transform((val) => val.trim()),
    description: z.string().max(2000).optional().nullable(),
    category: z
      .string()
      .min(1, 'Category is required')
      .max(100, 'Category must not exceed 100 characters')
      .transform((val) => val.trim()),
    specification: z.string().max(4000).optional().nullable(),
    primaryUom: MaterialUomSchema,
    secondaryUom: MaterialUomSchema.optional().nullable(),
    conversionFactor: z
      .number()
      .positive('Conversion factor must be greater than 0')
      .optional()
      .nullable(),
    hsnCode: z
      .string()
      .max(20, 'HSN code must not exceed 20 characters')
      .optional()
      .nullable()
      .transform((val) => (val ? val.trim().toUpperCase() : null)),
    standardRate: z
      .number()
      .min(0, 'Standard rate cannot be negative')
      .default(0),
    reorderLevel: z
      .number()
      .min(0, 'Reorder level cannot be negative')
      .default(0),
    safetyStock: z
      .number()
      .min(0, 'Safety stock cannot be negative')
      .default(0),
    isBatchTracked: z.boolean().default(false),
    status: MaterialStatusSchema.default('ACTIVE'),
  })
  .refine(
    (data) => {
      if (data.secondaryUom && (!data.conversionFactor || data.conversionFactor <= 0)) {
        return false;
      }
      return true;
    },
    {
      message: 'Conversion factor is required and must be > 0 when secondary UOM is specified',
      path: ['conversionFactor'],
    }
  );

export type CreateMaterialDto = z.infer<typeof CreateMaterialSchema>;

export const UpdateMaterialSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Material name cannot be empty')
      .max(255)
      .transform((val) => val.trim())
      .optional(),
    description: z.string().max(2000).optional().nullable(),
    category: z
      .string()
      .min(1, 'Category cannot be empty')
      .max(100)
      .transform((val) => val.trim())
      .optional(),
    specification: z.string().max(4000).optional().nullable(),
    primaryUom: MaterialUomSchema.optional(),
    secondaryUom: MaterialUomSchema.optional().nullable(),
    conversionFactor: z
      .number()
      .positive('Conversion factor must be greater than 0')
      .optional()
      .nullable(),
    hsnCode: z
      .string()
      .max(20)
      .optional()
      .nullable()
      .transform((val) => (val ? val.trim().toUpperCase() : null)),
    standardRate: z
      .number()
      .min(0, 'Standard rate cannot be negative')
      .optional(),
    reorderLevel: z
      .number()
      .min(0, 'Reorder level cannot be negative')
      .optional(),
    safetyStock: z
      .number()
      .min(0, 'Safety stock cannot be negative')
      .optional(),
    isBatchTracked: z.boolean().optional(),
    status: MaterialStatusSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.secondaryUom !== undefined && data.secondaryUom !== null) {
        if (data.conversionFactor !== undefined && (data.conversionFactor === null || data.conversionFactor <= 0)) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'Conversion factor must be > 0 when secondary UOM is updated',
      path: ['conversionFactor'],
    }
  );

export type UpdateMaterialDto = z.infer<typeof UpdateMaterialSchema>;

export const ListMaterialQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  status: MaterialStatusSchema.optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 50)),
});

export type ListMaterialQueryDto = z.infer<typeof ListMaterialQuerySchema>;
