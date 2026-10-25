import type { IntegrationSyncJobRepository } from '../repositories/integration-sync-job.repository.js';
import type { IntegrationConnectionRepository } from '../repositories/integration-connection.repository.js';
import type { ExternalReferenceRepository } from '../repositories/external-reference.repository.js';
import type { TriggerSyncJobDto } from '../dto/integration.dto.js';
import { SecretVaultService } from '../security/secret-vault.service.js';
import { IntegrationProviderRegistry } from '../providers/integration-provider.registry.js';
import { IntegrationConnectionStatus } from '../constants/integration.constants.js';
import { NotFoundError, BadRequestError } from '../../../common/errors/app-error.js';

export class SyncService {
  constructor(
    private readonly syncJobRepo: IntegrationSyncJobRepository,
    private readonly connectionRepo: IntegrationConnectionRepository,
    private readonly refRepo: ExternalReferenceRepository,
    private readonly providerRegistry: IntegrationProviderRegistry = IntegrationProviderRegistry.getInstance()
  ) {}

  public async queueSyncJob(
    tenantId: string,
    connectionId: string,
    dto: TriggerSyncJobDto
  ) {
    const connection = await this.connectionRepo.findById(tenantId, connectionId);
    if (!connection) {
      throw new NotFoundError(`IntegrationConnection ${connectionId} not found`);
    }

    if (connection.status === IntegrationConnectionStatus.DISCONNECTED) {
      throw new BadRequestError('Cannot sync on disconnected integration');
    }

    return this.syncJobRepo.create({
      tenantId,
      integrationConnectionId: connectionId,
      direction: dto.direction,
      entityType: dto.entityType,
      scopeMetadata: dto.scopeMetadata,
      idempotencyKey: dto.idempotencyKey,
    });
  }

  public async processSyncJob(jobId: string) {
    const job = await this.syncJobRepo.findById(jobId);
    if (!job) {
      throw new NotFoundError(`IntegrationSyncJob ${jobId} not found`);
    }

    const connection = await this.connectionRepo.findById(job.tenantId, job.integrationConnectionId);
    if (!connection) {
      await this.syncJobRepo.markFailedOrRetry(jobId, 'Parent connection not found', 60);
      throw new NotFoundError(`IntegrationConnection ${job.integrationConnectionId} not found`);
    }

    const provider = this.providerRegistry.get(connection.providerKey);
    if (!provider) {
      const err = `No provider adapter for ${connection.providerKey}`;
      await this.syncJobRepo.markFailedOrRetry(jobId, err, 60);
      throw new BadRequestError(err);
    }

    let plainSecret: string | undefined;
    if (connection.encryptedSecret) {
      plainSecret = SecretVaultService.decrypt(connection.encryptedSecret);
    }

    try {
      const result = await provider.syncOutbound(
        {
          tenantId: job.tenantId,
          connectionId: connection.id,
          entityType: job.entityType,
          data: (job.scopeMetadata as Record<string, any>) || {},
        },
        connection.config as Record<string, any>,
        plainSecret
      );

      if (!result.success) {
        await this.syncJobRepo.markFailedOrRetry(
          jobId,
          result.error || 'Outbound sync failed',
          60
        );
        await this.connectionRepo.updateHealth(
          job.tenantId,
          connection.id,
          IntegrationConnectionStatus.ERROR,
          result.error
        );
        return { success: false, error: result.error };
      }

      // If provider returned an external ID, map external reference
      if (result.externalEntityId && (job.scopeMetadata as any)?.entityId) {
        await this.refRepo.upsert(job.tenantId, {
          integrationConnectionId: connection.id,
          entityType: job.entityType,
          entityId: (job.scopeMetadata as any).entityId,
          externalEntityType: job.entityType,
          externalEntityId: result.externalEntityId,
          externalVersion: result.externalVersion,
          syncStatus: 'SYNCED',
        });
      }

      await this.syncJobRepo.markCompleted(jobId);
      await this.connectionRepo.updateHealth(
        job.tenantId,
        connection.id,
        IntegrationConnectionStatus.ACTIVE,
        null,
        undefined,
        new Date()
      );

      return { success: true, externalEntityId: result.externalEntityId };
    } catch (err: any) {
      const errorMsg = err?.message || 'Sync execution threw unexpected error';
      await this.syncJobRepo.markFailedOrRetry(jobId, errorMsg, 60);
      await this.connectionRepo.updateHealth(
        job.tenantId,
        connection.id,
        IntegrationConnectionStatus.ERROR,
        errorMsg
      );
      return { success: false, error: errorMsg };
    }
  }
}
