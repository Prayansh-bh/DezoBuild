import { z } from 'zod';
import { MB_STATUSES, MEASUREMENT_TYPES } from '../constants/boq.constants';

export const MeasurementDimensionInputSchema = z.object({
  description: z.string().min(1, 'Dimension description is required').max(255),
  count: z
    .union([z.number(), z.string()])
    .optional()
    .default(1)
    .refine((v) => {
      const num = typeof v === 'number' ? v : parseFloat(v);
      return !isNaN(num) && num > 0;
    }, 'Count must be greater than 0'),
  length: z
    .union([z.number(), z.string()])
    .optional()
    .default(1)
    .refine((v) => {
      const num = typeof v === 'number' ? v : parseFloat(v);
      return !isNaN(num) && num > 0;
    }, 'Length must be greater than 0'),
  breadth: z
    .union([z.number(), z.string()])
    .optional()
    .default(1)
    .refine((v) => {
      const num = typeof v === 'number' ? v : parseFloat(v);
      return !isNaN(num) && num > 0;
    }, 'Breadth must be greater than 0'),
  depth: z
    .union([z.number(), z.string()])
    .optional()
    .default(1)
    .refine((v) => {
      const num = typeof v === 'number' ? v : parseFloat(v);
      return !isNaN(num) && num > 0;
    }, 'Depth must be greater than 0'),
  factor: z
    .number()
    .refine((v) => v === 1.0 || v === -1.0, 'Factor must be 1.00 (addition) or -1.00 (deduction)')
    .optional()
    .default(1.0),
  remarks: z.string().max(255).optional().nullable(),
  sequence: z.number().int().nonnegative().optional().default(0),
});

export type MeasurementDimensionInputDto = z.infer<typeof MeasurementDimensionInputSchema>;

export const CreateDigitalMbSchema = z.object({
  id: z.string().uuid().optional(),
  boqItemId: z.string().uuid('boqItemId must be a valid UUID'),
  dprId: z.string().uuid('dprId must be a valid UUID').optional().nullable(),
  taskId: z.string().uuid('taskId must be a valid UUID').optional().nullable(),
  contractorId: z.string().uuid('contractorId must be a valid UUID').optional().nullable(),
  measurementDate: z.coerce.date(),
  measurementType: z.enum(MEASUREMENT_TYPES).default('DIMENSIONAL'),
  location: z.string().min(1, 'Location is required').max(255),
  chainageFrom: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .refine((v) => {
      if (v === null || v === undefined) return true;
      const num = typeof v === 'number' ? v : parseFloat(v);
      return !isNaN(num) && num >= 0;
    }, 'chainageFrom must be a non-negative number'),
  chainageTo: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .refine((v) => {
      if (v === null || v === undefined) return true;
      const num = typeof v === 'number' ? v : parseFloat(v);
      return !isNaN(num) && num >= 0;
    }, 'chainageTo must be a non-negative number'),
  gpsLatitude: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .refine((v) => {
      if (v === null || v === undefined) return true;
      const num = typeof v === 'number' ? v : parseFloat(v);
      return !isNaN(num) && num >= -90 && num <= 90;
    }, 'Latitude must be between -90 and 90'),
  gpsLongitude: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .refine((v) => {
      if (v === null || v === undefined) return true;
      const num = typeof v === 'number' ? v : parseFloat(v);
      return !isNaN(num) && num >= -180 && num <= 180;
    }, 'Longitude must be between -180 and 180'),
  witnessedBy: z.string().max(255).optional().nullable(),
  remarks: z.string().optional().nullable(),
  photoUrls: z.array(z.string().url('Photo must be a valid URL')).optional().default([]),
  attachmentUrls: z.array(z.string().url('Attachment must be a valid URL')).optional().default([]),
  directQuantity: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .refine((v) => {
      if (v === null || v === undefined) return true;
      const num = typeof v === 'number' ? v : parseFloat(v);
      return !isNaN(num);
    }, 'directQuantity must be a valid number'),
  dimensions: z.array(MeasurementDimensionInputSchema).optional().default([]),
  isCorrection: z.boolean().optional().default(false),
  supersedesMbRecordId: z.string().uuid('supersedesMbRecordId must be a valid UUID').optional().nullable(),
  correctionReason: z.string().optional().nullable(),
}).refine(
  (data) => {
    if (data.chainageFrom !== null && data.chainageFrom !== undefined &&
        data.chainageTo !== null && data.chainageTo !== undefined) {
      const from = typeof data.chainageFrom === 'number' ? data.chainageFrom : parseFloat(data.chainageFrom);
      const to = typeof data.chainageTo === 'number' ? data.chainageTo : parseFloat(data.chainageTo);
      return to >= from;
    }
    return true;
  },
  {
    message: 'chainageTo must be greater than or equal to chainageFrom',
    path: ['chainageTo'],
  }
);

export type CreateDigitalMbDto = z.infer<typeof CreateDigitalMbSchema>;

export const UpdateDigitalMbSchema = z
  .object({
    dprId: z.string().uuid('dprId must be a valid UUID').optional().nullable(),
    taskId: z.string().uuid('taskId must be a valid UUID').optional().nullable(),
    contractorId: z.string().uuid('contractorId must be a valid UUID').optional().nullable(),
    measurementDate: z.coerce.date().optional(),
    measurementType: z.enum(MEASUREMENT_TYPES).optional(),
    location: z.string().min(1, 'Location cannot be empty').max(255).optional(),
    chainageFrom: z.union([z.number(), z.string()]).optional().nullable(),
    chainageTo: z.union([z.number(), z.string()]).optional().nullable(),
    gpsLatitude: z.union([z.number(), z.string()]).optional().nullable(),
    gpsLongitude: z.union([z.number(), z.string()]).optional().nullable(),
    witnessedBy: z.string().max(255).optional().nullable(),
    remarks: z.string().optional().nullable(),
    photoUrls: z.array(z.string().url()).optional(),
    attachmentUrls: z.array(z.string().url()).optional(),
    directQuantity: z.union([z.number(), z.string()]).optional().nullable(),
    dimensions: z.array(MeasurementDimensionInputSchema).optional(),
    correctionReason: z.string().optional().nullable(),
  })
  .strict();

export type UpdateDigitalMbDto = z.infer<typeof UpdateDigitalMbSchema>;

export const SubmitDigitalMbSchema = z.object({
  remarks: z.string().optional().nullable(),
});

export type SubmitDigitalMbDto = z.infer<typeof SubmitDigitalMbSchema>;

export const VerifyDigitalMbSchema = z.object({
  remarks: z.string().optional().nullable(),
});

export type VerifyDigitalMbDto = z.infer<typeof VerifyDigitalMbSchema>;

export const ApproveDigitalMbSchema = z.object({
  allowExcess: z.boolean().optional().default(false),
  excessJustification: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export type ApproveDigitalMbDto = z.infer<typeof ApproveDigitalMbSchema>;

export const RejectDigitalMbSchema = z.object({
  rejectionReason: z.string().min(3, 'Rejection reason must be at least 3 characters'),
});

export type RejectDigitalMbDto = z.infer<typeof RejectDigitalMbSchema>;

export const ListDigitalMbQuerySchema = z.object({
  boqItemId: z.string().uuid().optional(),
  status: z.enum(MB_STATUSES).optional(),
  measurementDateFrom: z.coerce.date().optional(),
  measurementDateTo: z.coerce.date().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

export type ListDigitalMbQueryDto = z.infer<typeof ListDigitalMbQuerySchema>;
