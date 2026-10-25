import { z } from 'zod';
import { FUEL_TYPES, FUEL_SOURCES } from '../constants/equipment.constants.js';

export const createFuelLogSchema = z.object({
  projectId: z.string().uuid(),
  storeId: z.string().uuid().optional().nullable(),
  materialIssueId: z.string().uuid().optional().nullable(),
  slipNumber: z.string().min(1).max(50).trim(),
  idempotencyKey: z.string().max(255).optional().nullable(),
  fuelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fuelDate must be YYYY-MM-DD'),
  fuelType: z.enum(FUEL_TYPES).optional().default('DIESEL'),
  quantityLiters: z.number().positive('quantityLiters must be strictly greater than 0'),
  unitRate: z.number().min(0).optional().default(0),
  totalCost: z.number().min(0).optional().default(0),
  meterReading: z.number().min(0, 'meterReading cannot be negative'),
  source: z.enum(FUEL_SOURCES).optional().default('INTERNAL_STORE'),
  supplierVendorId: z.string().uuid().optional().nullable(),
  invoiceNumber: z.string().max(100).optional().nullable(),
  remarks: z.string().max(2000).optional().nullable(),
}).refine(data => {
  if (data.source === 'INTERNAL_STORE') {
    return Boolean(data.materialIssueId && data.storeId);
  }
  if (data.source === 'EXTERNAL_VENDOR') {
    return Boolean(data.supplierVendorId || data.invoiceNumber);
  }
  if (data.source === 'SITE_BOWSER') {
    return Boolean(data.storeId || data.supplierVendorId);
  }
  return true;
}, {
  message: 'Invalid fuel source linkage: INTERNAL_STORE requires materialIssueId and storeId; EXTERNAL_VENDOR requires supplierVendorId or invoiceNumber; SITE_BOWSER requires storeId or supplierVendorId',
  path: ['source'],
});

export type CreateFuelLogDto = z.infer<typeof createFuelLogSchema>;

export const listFuelLogsQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  fuelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  source: z.enum(FUEL_SOURCES).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListFuelLogsQueryDto = z.infer<typeof listFuelLogsQuerySchema>;
