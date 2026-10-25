import { z } from 'zod';
import {
  DPR_EQUIPMENT_STATUSES,
  DPR_SHIFT_TYPES,
  DPR_STATUSES,
  DPR_WEATHER_TYPES,
} from '../constants/dpr.constants';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const DprActivityProgressItemSchema = z
  .object({
    taskId: z.string().uuid().optional().nullable(),
    wbsNodeId: z.string().uuid().optional().nullable(),
    activityName: z.string().min(1).max(255),
    workDescription: z.string().max(2000).optional().nullable(),
    quantityDone: z.number().min(0).optional().nullable(),
    unit: z.string().max(50).optional().nullable(),
    progressPct: z.number().min(0).max(100),
  })
  .strict();

export const DprManpowerItemSchema = z
  .object({
    trade: z.string().min(1).max(100),
    skilledCount: z.number().int().min(0).default(0),
    unskilledCount: z.number().int().min(0).default(0),
    supervisorCount: z.number().int().min(0).default(0),
    remarks: z.string().max(255).optional().nullable(),
  })
  .strict();

export const DprEquipmentItemSchema = z
  .object({
    equipmentName: z.string().min(1).max(255),
    operatingHours: z.number().min(0).max(24),
    status: z.enum(DPR_EQUIPMENT_STATUSES).default('RUNNING'),
    remarks: z.string().max(255).optional().nullable(),
  })
  .strict();

export const DprMaterialItemSchema = z
  .object({
    materialName: z.string().min(1).max(255),
    quantityConsumed: z.number().min(0),
    unit: z.string().min(1).max(50),
  })
  .strict();

export const DprPhotoItemSchema = z
  .object({
    photoUrl: z.string().url().max(1000).or(z.string().min(1).max(1000)),
    caption: z.string().max(500).optional().nullable(),
    takenAt: z.string().datetime().optional().nullable(),
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
  })
  .strict();

export const CreateDprSchema = z
  .object({
    reportDate: z.string().regex(dateRegex, 'reportDate must be in YYYY-MM-DD format'),
    weather: z.enum(DPR_WEATHER_TYPES).optional().nullable(),
    temperature: z.string().max(50).optional().nullable(),
    shift: z.enum(DPR_SHIFT_TYPES).optional().nullable(),
    safetyRemarks: z.string().max(2000).optional().nullable(),
    delaysObstacles: z.string().max(2000).optional().nullable(),
    generalNotes: z.string().max(2000).optional().nullable(),
    activityProgress: z.array(DprActivityProgressItemSchema).optional().default([]),
    manpowerLogs: z.array(DprManpowerItemSchema).optional().default([]),
    equipmentLogs: z.array(DprEquipmentItemSchema).optional().default([]),
    materialLogs: z.array(DprMaterialItemSchema).optional().default([]),
    photos: z.array(DprPhotoItemSchema).optional().default([]),
  })
  .strict();

export type CreateDprDto = z.infer<typeof CreateDprSchema>;

export const UpdateDprSchema = z
  .object({
    weather: z.enum(DPR_WEATHER_TYPES).optional().nullable(),
    temperature: z.string().max(50).optional().nullable(),
    shift: z.enum(DPR_SHIFT_TYPES).optional().nullable(),
    safetyRemarks: z.string().max(2000).optional().nullable(),
    delaysObstacles: z.string().max(2000).optional().nullable(),
    generalNotes: z.string().max(2000).optional().nullable(),
    activityProgress: z.array(DprActivityProgressItemSchema).optional(),
    manpowerLogs: z.array(DprManpowerItemSchema).optional(),
    equipmentLogs: z.array(DprEquipmentItemSchema).optional(),
    materialLogs: z.array(DprMaterialItemSchema).optional(),
    photos: z.array(DprPhotoItemSchema).optional(),
  })
  .strict();

export type UpdateDprDto = z.infer<typeof UpdateDprSchema>;

export const SubmitDprSchema = z
  .object({
    remarks: z.string().max(2000).optional().nullable(),
  })
  .strict()
  .optional()
  .default({});

export type SubmitDprDto = z.infer<typeof SubmitDprSchema>;

export const ApproveDprSchema = z
  .object({
    approvalRemarks: z.string().max(2000).optional().nullable(),
  })
  .strict()
  .optional()
  .default({});

export type ApproveDprDto = z.infer<typeof ApproveDprSchema>;

export const RejectDprSchema = z
  .object({
    rejectionReason: z
      .string({ required_error: 'rejectionReason is mandatory when rejecting a DPR' })
      .trim()
      .min(1, 'rejectionReason cannot be empty')
      .max(2000),
  })
  .strict();

export type RejectDprDto = z.infer<typeof RejectDprSchema>;

export const ListDprQuerySchema = z
  .object({
    status: z.enum(DPR_STATUSES).optional(),
    startDate: z.string().regex(dateRegex, 'startDate must be in YYYY-MM-DD format').optional(),
    endDate: z.string().regex(dateRegex, 'endDate must be in YYYY-MM-DD format').optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

export type ListDprQueryDto = z.infer<typeof ListDprQuerySchema>;
