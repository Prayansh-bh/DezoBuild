export const IntegrationType = {
  ERP: 'ERP',
  ACCOUNTING: 'ACCOUNTING',
  DOCUMENT_STORAGE: 'DOCUMENT_STORAGE',
  EMAIL: 'EMAIL',
  SMS: 'SMS',
  WHATSAPP: 'WHATSAPP',
  PAYMENTS: 'PAYMENTS',
  BIOMETRIC: 'BIOMETRIC',
  TELEMATICS: 'TELEMATICS',
  WEBHOOK: 'WEBHOOK',
  CUSTOM_API: 'CUSTOM_API',
} as const;

export type IntegrationType = (typeof IntegrationType)[keyof typeof IntegrationType];

export const IntegrationConnectionStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ERROR: 'ERROR',
  DISCONNECTED: 'DISCONNECTED',
} as const;

export type IntegrationConnectionStatus =
  (typeof IntegrationConnectionStatus)[keyof typeof IntegrationConnectionStatus];

export const IntegrationSyncDirection = {
  INBOUND: 'INBOUND',
  OUTBOUND: 'OUTBOUND',
} as const;

export type IntegrationSyncDirection =
  (typeof IntegrationSyncDirection)[keyof typeof IntegrationSyncDirection];

export const IntegrationSyncJobStatus = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type IntegrationSyncJobStatus =
  (typeof IntegrationSyncJobStatus)[keyof typeof IntegrationSyncJobStatus];

export const WebhookEventStatus = {
  RECEIVED: 'RECEIVED',
  VERIFIED: 'VERIFIED',
  PROCESSING: 'PROCESSING',
  PROCESSED: 'PROCESSED',
  FAILED: 'FAILED',
  QUARANTINED: 'QUARANTINED',
} as const;

export type WebhookEventStatus =
  (typeof WebhookEventStatus)[keyof typeof WebhookEventStatus];

export const INTEGRATION_HEADERS = {
  SIGNATURE: 'x-dezobuild-signature',
  TIMESTAMP: 'x-dezobuild-timestamp',
  EVENT_ID: 'x-dezobuild-event-id',
  PROVIDER: 'x-dezobuild-provider',
} as const;
