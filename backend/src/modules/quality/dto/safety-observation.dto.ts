import { z } from 'zod';
import { ObservationType, ObservationSeverity } from '../constants/quality.constants.js';

export const createSafetyObservationSchema = z.object({
  projectId: z.string().uuid(),
  equipmentId: z.string().uuid().optional().nullable(),
  observationType: z.nativeEnum(ObservationType),
  severity: z.nativeEnum(ObservationSeverity).optional().default(ObservationSeverity.MEDIUM),
  location: z.string().min(1).max(255),
  description: z.string().min(5),
  observedAt: z.string().datetime().optional(),
  tbtTopic: z.string().max(255).optional().nullable(),
  tbtSupervisorId: z.string().uuid().optional().nullable(),
  tbtAttendeeCount: z.number().int().nonnegative().optional().nullable(),
  tbtTrade: z.string().max(100).optional().nullable(),
  ppeCompliancePercent: z.number().min(0).max(100).optional().nullable(),
  scaffoldingSafe: z.boolean().optional().nullable(),
  electricalSafe: z.boolean().optional().nullable(),
  housekeepingRating: z.number().int().min(1).max(5).optional().nullable(),
  likelihood: z.number().int().min(1).max(5),
  severityRating: z.number().int().min(1).max(5),
  controls: z.string().optional().nullable(),
  immediateActionTaken: z.string().optional().nullable(),
});
export type CreateSafetyObservationDto = z.infer<typeof createSafetyObservationSchema>;

export const updateDraftSafetyObservationSchema = z.object({
  location: z.string().min(1).max(255).optional(),
  description: z.string().min(5).optional(),
  severity: z.nativeEnum(ObservationSeverity).optional(),
  tbtTopic: z.string().max(255).optional().nullable(),
  tbtSupervisorId: z.string().uuid().optional().nullable(),
  tbtAttendeeCount: z.number().int().nonnegative().optional().nullable(),
  tbtTrade: z.string().max(100).optional().nullable(),
  ppeCompliancePercent: z.number().min(0).max(100).optional().nullable(),
  scaffoldingSafe: z.boolean().optional().nullable(),
  electricalSafe: z.boolean().optional().nullable(),
  housekeepingRating: z.number().int().min(1).max(5).optional().nullable(),
  likelihood: z.number().int().min(1).max(5).optional(),
  severityRating: z.number().int().min(1).max(5).optional(),
  controls: z.string().optional().nullable(),
  immediateActionTaken: z.string().optional().nullable(),
});
export type UpdateDraftSafetyObservationDto = z.infer<typeof updateDraftSafetyObservationSchema>;

export const closeSafetyObservationSchema = z.object({
  remarks: z.string().optional().nullable(),
});
export type CloseSafetyObservationDto = z.infer<typeof closeSafetyObservationSchema>;

export const reopenSafetyObservationSchema = z.object({
  reason: z.string().min(5, 'Reopen justification is required'),
});
export type ReopenSafetyObservationDto = z.infer<typeof reopenSafetyObservationSchema>;

export const listSafetyObservationsQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.string().optional(),
  observationType: z.string().optional(),
  riskLevel: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});
export type ListSafetyObservationsQueryDto = z.infer<typeof listSafetyObservationsQuerySchema>;
