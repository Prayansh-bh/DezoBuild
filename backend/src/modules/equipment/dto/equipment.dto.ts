import { z } from 'zod';
import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_STATUSES,
  OWNERSHIP_TYPES,
  METER_TYPES,
  FUEL_TYPES,
} from '../constants/equipment.constants.js';

export const createEquipmentSchema = z.object({
  companyId: z.string().uuid(),
  equipmentCode: z.string().min(1).max(50).trim(),
  name: z.string().min(1).max(255).trim(),
  category: z.enum(EQUIPMENT_CATEGORIES),
  equipmentType: z.string().min(1).max(100).trim(),
  manufacturer: z.string().max(100).optional().nullable(),
  modelNumber: z.string().max(100).optional().nullable(),
  serialNumber: z.string().max(100).optional().nullable(),
  yearOfManufacture: z.number().int().min(1900).max(2100).optional().nullable(),
  registrationNumber: z.string().max(50).optional().nullable(),
  ownershipType: z.enum(OWNERSHIP_TYPES).optional().default('OWNED'),
  ownerVendorId: z.string().uuid().optional().nullable(),
  meterType: z.enum(METER_TYPES).optional().default('HOURS'),
  currentMeterReading: z.number().min(0).optional().default(0),
  fuelType: z.enum(FUEL_TYPES).optional().nullable(),
  fuelEfficiencyNorm: z.number().min(0).optional().nullable(),
  defaultHourlyRate: z.number().min(0).optional().default(0),
  monthlyRentalAmount: z.number().min(0).optional().nullable(),
  currentBranchId: z.string().uuid().optional().nullable(),
  insuranceExpiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'insuranceExpiryDate must be YYYY-MM-DD').optional().nullable(),
  fitnessExpiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fitnessExpiryDate must be YYYY-MM-DD').optional().nullable(),
  pucExpiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'pucExpiryDate must be YYYY-MM-DD').optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export type CreateEquipmentDto = z.infer<typeof createEquipmentSchema>;

export const updateEquipmentSchema = z.object({
  companyId: z.string().uuid().optional(),
  name: z.string().min(1).max(255).trim().optional(),
  category: z.enum(EQUIPMENT_CATEGORIES).optional(),
  equipmentType: z.string().min(1).max(100).trim().optional(),
  manufacturer: z.string().max(100).optional().nullable(),
  modelNumber: z.string().max(100).optional().nullable(),
  serialNumber: z.string().max(100).optional().nullable(),
  yearOfManufacture: z.number().int().min(1900).max(2100).optional().nullable(),
  registrationNumber: z.string().max(50).optional().nullable(),
  ownershipType: z.enum(OWNERSHIP_TYPES).optional(),
  ownerVendorId: z.string().uuid().optional().nullable(),
  meterType: z.enum(METER_TYPES).optional(),
  fuelType: z.enum(FUEL_TYPES).optional().nullable(),
  fuelEfficiencyNorm: z.number().min(0).optional().nullable(),
  defaultHourlyRate: z.number().min(0).optional(),
  monthlyRentalAmount: z.number().min(0).optional().nullable(),
  currentBranchId: z.string().uuid().optional().nullable(),
  insuranceExpiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'insuranceExpiryDate must be YYYY-MM-DD').optional().nullable(),
  fitnessExpiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fitnessExpiryDate must be YYYY-MM-DD').optional().nullable(),
  pucExpiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'pucExpiryDate must be YYYY-MM-DD').optional().nullable(),
  isActive: z.boolean().optional(),
});

export type UpdateEquipmentDto = z.infer<typeof updateEquipmentSchema>;

export const updateEquipmentStatusSchema = z.object({
  status: z.enum(EQUIPMENT_STATUSES),
  reason: z.string().max(1000).optional(),
});

export type UpdateEquipmentStatusDto = z.infer<typeof updateEquipmentStatusSchema>;

export const listEquipmentQuerySchema = z.object({
  companyId: z.string().uuid().optional(),
  category: z.enum(EQUIPMENT_CATEGORIES).optional(),
  status: z.enum(EQUIPMENT_STATUSES).optional(),
  ownershipType: z.enum(OWNERSHIP_TYPES).optional(),
  currentProjectId: z.string().uuid().optional(),
  currentBranchId: z.string().uuid().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListEquipmentQueryDto = z.infer<typeof listEquipmentQuerySchema>;
