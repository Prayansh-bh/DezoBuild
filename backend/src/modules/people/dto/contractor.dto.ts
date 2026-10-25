import { z } from 'zod';
import { CONTRACTOR_STATUSES, CONTRACTOR_TRADES } from '../constants/people.constants.js';

export const createContractorSchema = z.object({
  vendorId: z.string().uuid().optional().nullable(),
  code: z.string().min(1).max(50).trim(),
  name: z.string().min(1).max(255).trim(),
  trade: z.string().min(1).max(100).trim(),
  contactPerson: z.string().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  defaultDailyWageRate: z.number().nonnegative().optional().default(0),
  status: z.enum(CONTRACTOR_STATUSES).optional().default('ACTIVE'),
});

export type CreateContractorDto = z.infer<typeof createContractorSchema>;

export const listContractorsQuerySchema = z.object({
  status: z.enum(CONTRACTOR_STATUSES).optional(),
  trade: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListContractorsQueryDto = z.infer<typeof listContractorsQuerySchema>;
