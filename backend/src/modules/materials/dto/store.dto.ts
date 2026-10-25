import { z } from 'zod';

export const StoreStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export type StoreStatus = z.infer<typeof StoreStatusSchema>;

export const StoreTypeSchema = z.enum(['CENTRAL', 'PROJECT_SITE']);
export type StoreType = z.infer<typeof StoreTypeSchema>;

export const CreateStoreSchema = z
  .object({
    code: z
      .string()
      .min(1, 'Store code is required')
      .max(50, 'Store code must not exceed 50 characters')
      .transform((val) => val.trim().toUpperCase()),
    name: z
      .string()
      .min(1, 'Store name is required')
      .max(255, 'Store name must not exceed 255 characters')
      .transform((val) => val.trim()),
    description: z.string().max(2000).optional().nullable(),
    address: z.string().max(2000).optional().nullable(),
    location: z.string().max(255).optional().nullable(),
    storeType: StoreTypeSchema.default('PROJECT_SITE'),
    isCentralWarehouse: z.boolean().default(false),
    projectId: z
      .string()
      .uuid('Invalid project ID format')
      .optional()
      .nullable(),
    branchId: z
      .string()
      .uuid('Invalid branch ID format')
      .optional()
      .nullable(),
    status: StoreStatusSchema.default('ACTIVE'),
  })
  .refine(
    (data) => {
      // If marked as Central Warehouse or storeType = CENTRAL, projectId should generally be null
      if (data.isCentralWarehouse || data.storeType === 'CENTRAL') {
        return true;
      }
      // For PROJECT_SITE, projectId is expected
      if (data.storeType === 'PROJECT_SITE' && !data.projectId) {
        return false;
      }
      return true;
    },
    {
      message: 'projectId is required for PROJECT_SITE store type',
      path: ['projectId'],
    }
  );

export type CreateStoreDto = z.infer<typeof CreateStoreSchema>;

export const UpdateStoreSchema = z.object({
  name: z
    .string()
    .min(1, 'Store name cannot be empty')
    .max(255)
    .transform((val) => val.trim())
    .optional(),
  description: z.string().max(2000).optional().nullable(),
  address: z.string().max(2000).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  status: StoreStatusSchema.optional(),
});

export type UpdateStoreDto = z.infer<typeof UpdateStoreSchema>;

export const ListStoreQuerySchema = z.object({
  search: z.string().optional(),
  projectId: z.string().uuid().optional(),
  storeType: StoreTypeSchema.optional(),
  isCentralWarehouse: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  status: StoreStatusSchema.optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 50)),
});

export type ListStoreQueryDto = z.infer<typeof ListStoreQuerySchema>;
