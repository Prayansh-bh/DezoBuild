import type { IntegrationType } from '../constants/integration.constants.js';

export interface TestConnectionResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  details?: Record<string, any>;
}

export interface SyncPayload {
  tenantId: string;
  connectionId: string;
  entityType: string;
  data: Record<string, any>;
  externalReference?: string;
  metadata?: Record<string, any>;
}

export interface SyncResult {
  success: boolean;
  externalEntityId?: string;
  externalVersion?: string;
  error?: string;
  retryable?: boolean;
  details?: Record<string, any>;
}

export interface WebhookVerificationContext {
  providerKey: string;
  signature?: string;
  timestamp?: string;
  rawPayload: string;
  secret?: string;
}

export interface WebhookVerificationResult {
  valid: boolean;
  reason?: string;
  tenantId?: string;
  extractedEventId?: string;
  extractedEventType?: string;
}

export interface IntegrationProvider {
  readonly providerKey: string;
  readonly integrationType: IntegrationType;

  testConnection(config: Record<string, any>, secret?: string): Promise<TestConnectionResult>;
  syncOutbound(payload: SyncPayload, config: Record<string, any>, secret?: string): Promise<SyncResult>;
  verifyWebhook(context: WebhookVerificationContext): Promise<WebhookVerificationResult>;
}
