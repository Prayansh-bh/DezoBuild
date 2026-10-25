import { z } from 'zod';
import { IncidentType, IncidentSeverity } from '../constants/quality.constants.js';

export const createSafetyIncidentSchema = z.object({
  projectId: z.string().uuid(),
  incidentType: z.nativeEnum(IncidentType),
  severity: z.nativeEnum(IncidentSeverity),
  occurredAt: z.string().datetime(),
  location: z.string().min(1).max(255),
  description: z.string().min(5),
  injuredEmployeeId: z.string().uuid().optional().nullable(),
  injuredPersonName: z.string().max(255).optional().nullable(),
  injuredPersonTrade: z.string().max(100).optional().nullable(),
  lostWorkDays: z.number().int().nonnegative().optional().default(0),
  likelihood: z.number().int().min(1).max(5),
  severityRating: z.number().int().min(1).max(5),
  immediateActionTaken: z.string().optional().nullable(),
});
export type CreateSafetyIncidentDto = z.infer<typeof createSafetyIncidentSchema>;

export const startIncidentInvestigationSchema = z.object({
  rootCause: z.string().min(5).optional().nullable(),
  investigationFindings: z.string().min(5).optional().nullable(),
});
export type StartIncidentInvestigationDto = z.infer<typeof startIncidentInvestigationSchema>;

export const addIncidentFindingsSchema = z.object({
  rootCause: z.string().min(5).optional(),
  investigationFindings: z.string().min(5).optional(),
});
export type AddIncidentFindingsDto = z.infer<typeof addIncidentFindingsSchema>;

export const closeSafetyIncidentSchema = z.object({
  closureRemarks: z.string().min(5, 'Closure remarks are required and must be at least 5 characters'),
});
export type CloseSafetyIncidentDto = z.infer<typeof closeSafetyIncidentSchema>;

export const reopenSafetyIncidentSchema = z.object({
  reason: z.string().min(5, 'Reopen justification is required'),
});
export type ReopenSafetyIncidentDto = z.infer<typeof reopenSafetyIncidentSchema>;

export const listSafetyIncidentsQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.string().optional(),
  incidentType: z.string().optional(),
  severity: z.string().optional(),
  riskLevel: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});
export type ListSafetyIncidentsQueryDto = z.infer<typeof listSafetyIncidentsQuerySchema>;
