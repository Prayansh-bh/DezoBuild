import { z } from 'zod';
import {
  MAINTENANCE_TYPES,
  WORK_ORDER_CATEGORIES,
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
  SERVICE_PROVIDER_TYPES,
} from '../constants/equipment.constants.js';

export const createMaintenanceScheduleSchema = z.object({
  title: z.string().min(1).max(255).trim(),
  maintenanceType: z.enum(MAINTENANCE_TYPES).optional().default('PREVENTIVE'),
  intervalMeterHours: z.number().positive().optional().nullable(),
  intervalDays: z.number().int().positive().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  isActive: z.boolean().optional().default(true),
}).refine(data => Boolean(data.intervalMeterHours || data.intervalDays), {
  message: 'At least one interval (intervalMeterHours or intervalDays) must be specified',
  path: ['intervalMeterHours'],
});

export type CreateMaintenanceScheduleDto = z.infer<typeof createMaintenanceScheduleSchema>;

export const listMaintenanceSchedulesQuerySchema = z.object({
  isActive: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListMaintenanceSchedulesQueryDto = z.infer<typeof listMaintenanceSchedulesQuerySchema>;

export const createWorkOrderSchema = z.object({
  equipmentId: z.string().uuid(),
  projectId: z.string().uuid().optional().nullable(),
  scheduleId: z.string().uuid().optional().nullable(),
  workOrderNumber: z.string().min(1).max(50).trim().optional(),
  category: z.enum(WORK_ORDER_CATEGORIES).optional().default('PREVENTIVE'),
  priority: z.enum(WORK_ORDER_PRIORITIES).optional().default('MEDIUM'),
  status: z.enum(WORK_ORDER_STATUSES).optional().default('OPEN'),
  reportedAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T/)).optional(),
  breakdownStartAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T/)).optional().nullable(),
  breakdownEndAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T/)).optional().nullable(),
  downtimeHours: z.number().min(0).optional().default(0),
  symptoms: z.string().max(2000).optional().nullable(),
  rootCause: z.string().max(2000).optional().nullable(),
  workDone: z.string().max(4000).optional().nullable(),
  serviceProviderType: z.enum(SERVICE_PROVIDER_TYPES).optional().default('INTERNAL'),
  serviceVendorId: z.string().uuid().optional().nullable(),
  technicianName: z.string().max(255).optional().nullable(),
  technicianPhone: z.string().max(50).optional().nullable(),
  materialIssueId: z.string().uuid().optional().nullable(),
  partsReplacedSummary: z.string().max(2000).optional().nullable(),
  meterReadingAtService: z.number().min(0).optional().nullable(),
  labourCost: z.number().min(0).optional().default(0),
  partsCost: z.number().min(0).optional().default(0),
  vendorServiceCost: z.number().min(0).optional().default(0),
  totalCost: z.number().min(0).optional().default(0),
}).refine(data => {
  if (data.breakdownStartAt && data.breakdownEndAt) {
    return new Date(data.breakdownEndAt) >= new Date(data.breakdownStartAt);
  }
  return true;
}, {
  message: 'breakdownEndAt must be greater than or equal to breakdownStartAt',
  path: ['breakdownEndAt'],
});

export type CreateWorkOrderDto = z.infer<typeof createWorkOrderSchema>;

export const completeWorkOrderSchema = z.object({
  workDone: z.string().min(1, 'workDone description is required on completion').max(4000).trim(),
  breakdownEndAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T/)).optional().nullable(),
  downtimeHours: z.number().min(0).optional().default(0),
  meterReadingAtService: z.number().min(0).optional().nullable(),
  partsReplacedSummary: z.string().max(2000).optional().nullable(),
  labourCost: z.number().min(0).optional().default(0),
  partsCost: z.number().min(0).optional().default(0),
  vendorServiceCost: z.number().min(0).optional().default(0),
  totalCost: z.number().min(0).optional().default(0),
});

export type CompleteWorkOrderDto = z.infer<typeof completeWorkOrderSchema>;

export const listWorkOrdersQuerySchema = z.object({
  equipmentId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  category: z.enum(WORK_ORDER_CATEGORIES).optional(),
  status: z.enum(WORK_ORDER_STATUSES).optional(),
  priority: z.enum(WORK_ORDER_PRIORITIES).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListWorkOrdersQueryDto = z.infer<typeof listWorkOrdersQuerySchema>;
