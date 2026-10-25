import { z } from 'zod';
import { PUNCH_TYPES, ATTENDANCE_SOURCES, ATTENDANCE_STATUSES, REGULARIZATION_STATUSES } from '../constants/people.constants.js';

export const createPunchSchema = z.object({
  employeeId: z.string().uuid().optional(), // If omitted, resolved from context user
  punchTime: z.string().datetime({ offset: true }).or(z.string().min(1)),
  punchType: z.enum(PUNCH_TYPES),
  source: z.enum(ATTENDANCE_SOURCES).optional().default('ONLINE'),
  gpsLatitude: z.number().min(-90).max(90).optional().nullable(),
  gpsLongitude: z.number().min(-180).max(180).optional().nullable(),
  accuracyMeters: z.number().min(0).optional().nullable(),
  deviceId: z.string().max(100).optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  shiftId: z.string().uuid().optional().nullable(),
});

export type CreatePunchDto = z.infer<typeof createPunchSchema>;

export const createManualAttendanceSchema = z.object({
  employeeId: z.string().uuid(),
  projectId: z.string().uuid().optional().nullable(),
  shiftId: z.string().uuid().optional().nullable(),
  attendanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'attendanceDate must be YYYY-MM-DD'),
  checkInTime: z.string().datetime({ offset: true }).or(z.string().min(1)).optional().nullable(),
  checkOutTime: z.string().datetime({ offset: true }).or(z.string().min(1)).optional().nullable(),
  totalWorkMinutes: z.number().int().min(0).optional(),
  lateMinutes: z.number().int().min(0).optional().default(0),
  earlyOutMinutes: z.number().int().min(0).optional().default(0),
  overtimeMinutes: z.number().int().min(0).optional().default(0),
  status: z.enum(ATTENDANCE_STATUSES).optional().default('PRESENT'),
  remarks: z.string().max(1000).optional().nullable(),
});

export type CreateManualAttendanceDto = z.infer<typeof createManualAttendanceSchema>;

export const biometricSyncItemSchema = z.object({
  employeeNumber: z.string().min(1).max(50).trim(),
  punchTime: z.string().min(1),
  punchType: z.enum(PUNCH_TYPES),
  deviceId: z.string().max(100).optional(),
  eventRecordId: z.string().max(100).optional(),
});

export const biometricSyncBatchSchema = z.object({
  items: z.array(biometricSyncItemSchema).min(1).max(1000),
});

export type BiometricSyncBatchDto = z.infer<typeof biometricSyncBatchSchema>;

export const importAttendanceItemSchema = z.object({
  employeeNumber: z.string().min(1).max(50).trim(),
  attendanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkInTime: z.string().optional().nullable(),
  checkOutTime: z.string().optional().nullable(),
  status: z.enum(ATTENDANCE_STATUSES).optional().default('PRESENT'),
  totalWorkMinutes: z.number().int().min(0).optional(),
  overtimeMinutes: z.number().int().min(0).optional().default(0),
  remarks: z.string().max(500).optional().nullable(),
});

export const importAttendanceSchema = z.object({
  items: z.array(importAttendanceItemSchema).min(1).max(5000),
  projectId: z.string().uuid().optional().nullable(),
  shiftId: z.string().uuid().optional().nullable(),
});

export type ImportAttendanceDto = z.infer<typeof importAttendanceSchema>;

export const createRegularizationSchema = z.object({
  employeeId: z.string().uuid().optional(), // resolved from context if omitted
  requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'requestedDate must be YYYY-MM-DD'),
  requestedCheckIn: z.string().datetime({ offset: true }).or(z.string().min(1)).optional().nullable(),
  requestedCheckOut: z.string().datetime({ offset: true }).or(z.string().min(1)).optional().nullable(),
  requestedStatus: z.enum(ATTENDANCE_STATUSES).optional().default('PRESENT'),
  reason: z.string().min(1, 'Reason is required').max(1000).trim(),
});

export type CreateRegularizationDto = z.infer<typeof createRegularizationSchema>;

export const rejectRegularizationSchema = z.object({
  rejectionReason: z.string().min(1, 'rejectionReason is required').max(1000).trim(),
});

export type RejectRegularizationDto = z.infer<typeof rejectRegularizationSchema>;

export const listAttendanceQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  status: z.enum(ATTENDANCE_STATUSES).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListAttendanceQueryDto = z.infer<typeof listAttendanceQuerySchema>;
