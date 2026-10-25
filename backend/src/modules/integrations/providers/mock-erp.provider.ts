import {
  type IntegrationProvider,
  type TestConnectionResult,
  type SyncPayload,
  type SyncResult,
  type WebhookVerificationContext,
  type WebhookVerificationResult,
} from './integration-provider.interface.js';
import { IntegrationType } from '../constants/integration.constants.js';
import { WebhookVerifier } from './webhook-verifier.js';

export class MockErpProvider implements IntegrationProvider {
  public readonly integrationType = IntegrationType.ERP;

  constructor(public readonly providerKey: string = 'mock_erp') {}

  public async testConnection(
    config: Record<string, any>,
    secret?: string
  ): Promise<TestConnectionResult> {
    if (!config || Object.keys(config).length === 0) {
      return {
        success: false,
        message: 'Missing ERP gateway connection configuration',
      };
    }

    if (config['failTest']) {
      return {
        success: false,
        message: 'ERP Gateway endpoint returned 503 Service Unavailable',
      };
    }

    return {
      success: true,
      message: 'Successfully established mutual TLS session with ERP gateway',
      latencyMs: 42,
      details: {
        gatewayVersion: '4.1.0',
        companyName: config['companyName'] || 'Tally Default Company',
      },
    };
  }

  public async syncOutbound(
    payload: SyncPayload,
    config: Record<string, any>,
    secret?: string
  ): Promise<SyncResult> {
    if (config['failSync']) {
      const isTransient = Boolean(config['transientError']);
      return {
        success: false,
        error: isTransient
          ? 'Gateway connection reset by peer (transient)'
          : 'Entity validation failed: Chart of accounts ledger mapping missing',
        retryable: isTransient,
      };
    }

    const generatedExternalId = `ERP-${payload.entityType}-${Date.now()}`;
    return {
      success: true,
      externalEntityId: generatedExternalId,
      externalVersion: 'v1.0',
      details: {
        syncedRecordsCount: 1,
        remoteTimestamp: new Date().toISOString(),
      },
    };
  }

  public async verifyWebhook(
    context: WebhookVerificationContext
  ): Promise<WebhookVerificationResult> {
    const signingSecret = context.secret || 'default-webhook-secret-key-for-tests';
    return WebhookVerifier.verifyHmacSha256(context, signingSecret);
  }
}
