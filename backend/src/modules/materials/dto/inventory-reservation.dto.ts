import { z } from 'zod';
import {
  ALL_RESERVATION_PRIORITIES,
  ALL_RESERVATION_STATUSES,
} from '../constants/inventory-reservation.constants';

export const CreateInventoryReservationLineSchema = z.object({
  materialId: z.string().uuid('Invalid material UUID format'),
  quantityReserved: z
    .number()
    .positive('Reserved quantity must be strictly greater than 0')
    .max(9999999999.9999, 'Quantity exceeds maximum allowed value'),
  uom: z
    .string()
    .min(1, 'UOM is required')
    .max(20, 'UOM must not exceed 20 characters'),
  wbsNodeId: z.string().uuid('Invalid WBS node UUID format').optional().nullable(),
  taskId: z.string().uuid('Invalid Task UUID format').optional().nullable(),
  materialIndentLineId: z
    .string()
    .uuid('Invalid Material Indent Line UUID format')
    .optional()
    .nullable(),
  remarks: z
    .string()
    .max(2000, 'Remarks must not exceed 2000 characters')
    .optional()
    .nullable(),
});

export type CreateInventoryReservationLineDto = z.infer<
  typeof CreateInventoryReservationLineSchema
>;

export const CreateInventoryReservationSchema = z
  .object({
    storeId: z.string().uuid('Invalid store UUID format'),
    projectId: z.string().uuid('Invalid project UUID format').optional().nullable(),
    priority: z
      .enum(ALL_RESERVATION_PRIORITIES as [string, ...string[]])
      .default('NORMAL')
      .optional(),
    reservationDate: z.string().optional().nullable(),
    requiredDate: z.string().optional().nullable(),
    expiryDate: z.string().optional().nullable(),
    purpose: z
      .string()
      .max(255, 'Purpose must not exceed 255 characters')
      .optional()
      .nullable(),
    remarks: z
      .string()
      .max(5000, 'Remarks must not exceed 5000 characters')
      .optional()
      .nullable(),
    lines: z
      .array(CreateInventoryReservationLineSchema)
      .min(1, 'Reservation must contain at least one line item'),
  })
  .refine(
    (data) => {
      const materialIds = data.lines.map((l) => l.materialId);
      const uniqueIds = new Set(materialIds);
      return uniqueIds.size === materialIds.length;
    },
    {
      message: 'Duplicate material lines are not permitted within the same reservation',
      path: ['lines'],
    }
  );

export type CreateInventoryReservationDto = z.infer<
  typeof CreateInventoryReservationSchema
>;

export const UpdateInventoryReservationSchema = z
  .object({
    projectId: z.string().uuid('Invalid project UUID format').optional().nullable(),
    priority: z
      .enum(ALL_RESERVATION_PRIORITIES as [string, ...string[]])
      .optional(),
    reservationDate: z.string().optional().nullable(),
    requiredDate: z.string().optional().nullable(),
    expiryDate: z.string().optional().nullable(),
    purpose: z
      .string()
      .max(255, 'Purpose must not exceed 255 characters')
      .optional()
      .nullable(),
    remarks: z
      .string()
      .max(5000, 'Remarks must not exceed 5000 characters')
      .optional()
      .nullable(),
    lines: z
      .array(CreateInventoryReservationLineSchema)
      .min(1, 'Reservation must contain at least one line item')
      .optional(),
  })
  .refine(
    (data) => {
      if (!data.lines) return true;
      const materialIds = data.lines.map((l) => l.materialId);
      const uniqueIds = new Set(materialIds);
      return uniqueIds.size === materialIds.length;
    },
    {
      message: 'Duplicate material lines are not permitted within the same reservation',
      path: ['lines'],
    }
  );

export type UpdateInventoryReservationDto = z.infer<
  typeof UpdateInventoryReservationSchema
>;

export const SubmitInventoryReservationSchema = z.object({
  remarks: z
    .string()
    .max(2000, 'Remarks must not exceed 2000 characters')
    .optional()
    .nullable(),
});

export type SubmitInventoryReservationDto = z.infer<
  typeof SubmitInventoryReservationSchema
>;

export const ApproveInventoryReservationSchema = z.object({
  approvalRemarks: z
    .string()
    .max(2000, 'Approval remarks must not exceed 2000 characters')
    .optional()
    .nullable(),
});

export type ApproveInventoryReservationDto = z.infer<
  typeof ApproveInventoryReservationSchema
>;

export const RejectInventoryReservationSchema = z.object({
  rejectionReason: z
    .string()
    .min(1, 'Rejection reason is required')
    .max(2000, 'Rejection reason must not exceed 2000 characters'),
});

export type RejectInventoryReservationDto = z.infer<
  typeof RejectInventoryReservationSchema
>;

export const ReleaseInventoryReservationSchema = z.object({
  releaseRemarks: z
    .string()
    .max(2000, 'Release remarks must not exceed 2000 characters')
    .optional()
    .nullable(),
});

export type ReleaseInventoryReservationDto = z.infer<
  typeof ReleaseInventoryReservationSchema
>;

export const CancelInventoryReservationSchema = z.object({
  cancellationReason: z
    .string()
    .max(2000, 'Cancellation reason must not exceed 2000 characters')
    .optional()
    .nullable(),
});

export type CancelInventoryReservationDto = z.infer<
  typeof CancelInventoryReservationSchema
>;

export const ListInventoryReservationsQuerySchema = z.object({
  storeId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  status: z
    .enum(ALL_RESERVATION_STATUSES as [string, ...string[]])
    .optional(),
  materialId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
});

export type ListInventoryReservationsQueryDto = z.infer<
  typeof ListInventoryReservationsQuerySchema
>;
