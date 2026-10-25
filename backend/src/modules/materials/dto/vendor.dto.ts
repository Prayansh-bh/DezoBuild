import { z } from 'zod';

export const VendorStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export type VendorStatus = z.infer<typeof VendorStatusSchema>;

export const CreateVendorSchema = z.object({
  code: z
    .string()
    .min(1, 'Vendor code is required')
    .max(50, 'Vendor code must not exceed 50 characters')
    .transform((val) => val.trim().toUpperCase()),
  name: z
    .string()
    .min(1, 'Vendor name is required')
    .max(255, 'Vendor name must not exceed 255 characters')
    .transform((val) => val.trim()),
  gstin: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim().toUpperCase() : null)),
  pan: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim().toUpperCase() : null)),
  contactPerson: z
    .string()
    .max(255)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  email: z
    .string()
    .email('Invalid email address')
    .max(255)
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val && val.trim().length > 0 ? val.trim().toLowerCase() : null)),
  phone: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  address: z.string().max(2000).optional().nullable(),
  paymentTerms: z.string().max(255).optional().nullable(),
  status: VendorStatusSchema.default('ACTIVE'),
});

export type CreateVendorDto = z.infer<typeof CreateVendorSchema>;

export const UpdateVendorSchema = z.object({
  name: z
    .string()
    .min(1, 'Vendor name cannot be empty')
    .max(255)
    .transform((val) => val.trim())
    .optional(),
  gstin: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim().toUpperCase() : null)),
  pan: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim().toUpperCase() : null)),
  contactPerson: z
    .string()
    .max(255)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  email: z
    .string()
    .email('Invalid email address')
    .max(255)
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val && val.trim().length > 0 ? val.trim().toLowerCase() : null)),
  phone: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  address: z.string().max(2000).optional().nullable(),
  paymentTerms: z.string().max(255).optional().nullable(),
  status: VendorStatusSchema.optional(),
});

export type UpdateVendorDto = z.infer<typeof UpdateVendorSchema>;

export const ListVendorQuerySchema = z.object({
  search: z.string().optional(),
  status: VendorStatusSchema.optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 50)),
});

export type ListVendorQueryDto = z.infer<typeof ListVendorQuerySchema>;
