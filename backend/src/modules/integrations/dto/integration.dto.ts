import { z } from 'zod';
import {
  IntegrationType,
  IntegrationConnectionStatus,
  IntegrationSyncDirection,
  IntegrationSyncJobStatus,
  WebhookEventStatus,
} from '../constants/integration.constants.js';

export const createIntegrationConnectionSchema = z.object({
  integrationType: z.nativeEnum(IntegrationType),
  providerKey: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  config: z.record(z.any()).default({}),
  secret: z.string().min(1).optional(),
  secretRef: z.string().max(255).optional(),
});

export type CreateIntegrationConnectionDto = z.infer<typeof createIntegrationConnectionSchema>;

export const updateIntegrationConnectionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  status: z.nativeEnum(IntegrationConnectionStatus).optional(),
  config: z.record(z.any()).optional(),
  secret: z.string().min(1).optional(),
  secretRef: z.string().max(255).optional(),
});

export type UpdateIntegrationConnectionDto = z.infer<typeof updateIntegrationConnectionSchema>;

export const queryIntegrationConnectionsSchema = z.object({
  integrationType: z.nativeEnum(IntegrationType).optional(),
  providerKey: z.string().optional(),
  status: z.nativeEnum(IntegrationConnectionStatus).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type QueryIntegrationConnectionsDto = z.infer<typeof queryIntegrationConnectionsSchema>;

export const triggerSyncJobSchema = z.object({
  direction: z.nativeEnum(IntegrationSyncDirection).default(IntegrationSyncDirection.OUTBOUND),
  entityType: z.string().min(1).max(100),
  scopeMetadata: z.record(z.any()).optional(),
  idempotencyKey: z.string().min(1).max(255),
});

export type TriggerSyncJobDto = z.infer<typeof triggerSyncJobSchema>;

export const createExternalReferenceSchema = z.object({
  integrationConnectionId: z.string().uuid(),
  entityType: z.string().min(1).max(100),
  entityId: z.string().min(1).max(100),
  externalEntityType: z.string().min(1).max(100),
  externalEntityId: z.string().min(1).max(255),
  externalVersion: z.string().max(100).optional(),
  syncStatus: z.string().max(50).default('SYNCED'),
  metadata: z.record(z.any()).optional(),
});

export type CreateExternalReferenceDto = z.infer<typeof createExternalReferenceSchema>;

export const webhookPayloadSchema = z.object({
  externalEventId: z.string().min(1).max(255),
  eventType: z.string().min(1).max(100),
  payload: z.record(z.any()),
  tenantId: z.string().uuid().optional(),
  signature: z.string().optional(),
  correlationId: z.string().max(100).optional(),
});

export type WebhookPayloadDto = z.infer<typeof webhookPayloadSchema>;
