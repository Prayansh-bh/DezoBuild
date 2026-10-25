import type { WebhookEventRepository } from '../repositories/webhook-event.repository.js';
import type { IntegrationConnectionRepository } from '../repositories/integration-connection.repository.js';
import type { WebhookPayloadDto } from '../dto/integration.dto.js';
import { WebhookEventStatus } from '../constants/integration.constants.js';
import { SecretVaultService } from '../security/secret-vault.service.js';
import { IntegrationProviderRegistry } from '../providers/integration-provider.registry.js';
import { BadRequestError, UnauthorizedError } from '../../../common/errors/app-error.js';

export interface WebhookIngestionResult {
  accepted: boolean;
  eventId?: string;
  status: WebhookEventStatus;
  message: string;
}

export class WebhookService {
  constructor(
    private readonly webhookRepo: WebhookEventRepository,
    private readonly connectionRepo: IntegrationConnectionRepository,
    private readonly providerRegistry: IntegrationProviderRegistry = IntegrationProviderRegistry.getInstance()
  ) {}

  public async ingestWebhook(
    providerKey: string,
    dto: WebhookPayloadDto,
    rawPayload: string,
    signatureHeader?: string,
    timestampHeader?: string
  ): Promise<WebhookIngestionResult> {
    const provider = this.providerRegistry.get(providerKey);
    if (!provider) {
      // Unknown provider: Quarantine event record safely
      const quarantined = await this.webhookRepo.create({
        providerKey,
        externalEventId: dto.externalEventId,
        tenantId: dto.tenantId || null,
        eventType: dto.eventType,
        payload: dto.payload,
        signature: signatureHeader || dto.signature || null,
        correlationId: dto.correlationId || null,
        status: WebhookEventStatus.QUARANTINED,
        lastError: `Unknown provider adapter '${providerKey}'`,
      });

      return {
        accepted: false,
        eventId: quarantined.id,
        status: WebhookEventStatus.QUARANTINED,
        message: `Provider '${providerKey}' is not supported; event quarantined.`,
      };
    }

    // Check if event already received (idempotency check)
    const existing = await this.webhookRepo.findByExternalId(providerKey, dto.externalEventId);
    if (existing) {
      return {
        accepted: true,
        eventId: existing.id,
        status: existing.status as WebhookEventStatus,
        message: 'Webhook event already ingested (idempotent skip)',
      };
    }

    // Lookup connection secret if tenantId is available
    let signingSecret: string | undefined;
    if (dto.tenantId) {
      const conn = await this.connectionRepo.findByProvider(dto.tenantId, providerKey);
      if (conn?.encryptedSecret) {
        signingSecret = SecretVaultService.decrypt(conn.encryptedSecret);
      }
    }

    // Verify signature
    const verification = await provider.verifyWebhook({
      providerKey,
      signature: signatureHeader || dto.signature,
      timestamp: timestampHeader,
      rawPayload,
      secret: signingSecret,
    });

    if (!verification.valid) {
      const rejected = await this.webhookRepo.create({
        providerKey,
        externalEventId: dto.externalEventId,
        tenantId: dto.tenantId || null,
        eventType: dto.eventType,
        payload: dto.payload,
        signature: signatureHeader || dto.signature || null,
        correlationId: dto.correlationId || null,
        status: WebhookEventStatus.FAILED,
        lastError: verification.reason || 'Cryptographic signature verification failed',
      });

      return {
        accepted: false,
        eventId: rejected.id,
        status: WebhookEventStatus.FAILED,
        message: verification.reason || 'Webhook verification failed',
      };
    }

    // Persist verified event
    const event = await this.webhookRepo.create({
      providerKey,
      externalEventId: dto.externalEventId,
      tenantId: dto.tenantId || verification.tenantId || null,
      eventType: dto.eventType,
      payload: dto.payload,
      signature: signatureHeader || dto.signature || null,
      correlationId: dto.correlationId || null,
      status: WebhookEventStatus.VERIFIED,
    });

    return {
      accepted: true,
      eventId: event.id,
      status: WebhookEventStatus.VERIFIED,
      message: 'Webhook verified and queued for processing',
    };
  }
}
