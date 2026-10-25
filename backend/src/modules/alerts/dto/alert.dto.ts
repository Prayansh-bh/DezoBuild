import { z } from 'zod';
import { AlertSeverity, AlertStatus } from '../constants/alert.constants.js';

export const createAlertSchema = z.object({
  tenantId: z.string().uuid(),
  projectId: z.string().uuid().optional().nullable(),
  branchId: z.string().uuid().optional().nullable(),
  alertType: z.string().min(1).max(100),
  severity: z.nativeEnum(AlertSeverity).optional().default(AlertSeverity.INFO),
  title: z.string().min(1).max(255),
  message: z.string().min(1),
  entityType: z.string().max(100).optional().nullable(),
  entityId: z.string().max(100).optional().nullable(),
  sourceEventId: z.string().uuid().optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
  dueAt: z.coerce.date().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export type CreateAlertDto = z.input<typeof createAlertSchema>;

export const queryAlertsSchema = z.object({
  projectId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  alertType: z.string().optional(),
  severity: z.nativeEnum(AlertSeverity).optional(),
  status: z.nativeEnum(AlertStatus).optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  assignedToId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type QueryAlertsDto = z.input<typeof queryAlertsSchema>;

export const acknowledgeAlertSchema = z.object({
  note: z.string().max(500).optional(),
});

export type AcknowledgeAlertDto = z.infer<typeof acknowledgeAlertSchema>;

export const resolveAlertSchema = z.object({
  resolutionNote: z.string().max(1000).optional(),
});

export type ResolveAlertDto = z.infer<typeof resolveAlertSchema>;

export const dismissAlertSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type DismissAlertDto = z.infer<typeof dismissAlertSchema>;
