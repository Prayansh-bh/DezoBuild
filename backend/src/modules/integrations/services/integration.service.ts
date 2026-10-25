import type { IntegrationConnectionRepository } from '../repositories/integration-connection.repository.js';
import type {
  CreateIntegrationConnectionDto,
  UpdateIntegrationConnectionDto,
  QueryIntegrationConnectionsDto,
} from '../dto/integration.dto.js';
import { SecretVaultService } from '../security/secret-vault.service.js';
import { IntegrationProviderRegistry } from '../providers/integration-provider.registry.js';
import { IntegrationConnectionStatus } from '../constants/integration.constants.js';
import { NotFoundError, BadRequestError } from '../../../common/errors/app-error.js';

export class IntegrationService {
  constructor(
    private readonly connectionRepo: IntegrationConnectionRepository,
    private readonly providerRegistry: IntegrationProviderRegistry = IntegrationProviderRegistry.getInstance()
  ) {}

  public async createConnection(
    tenantId: string,
    userId: string,
    dto: CreateIntegrationConnectionDto
  ) {
    let encryptedSecret: string | undefined;
    if (dto.secret) {
      encryptedSecret = SecretVaultService.encrypt(dto.secret);
    }

    const connection = await this.connectionRepo.create(
      tenantId,
      userId,
      dto,
      encryptedSecret
    );

    return SecretVaultService.redactConnection(connection);
  }

  public async getConnectionById(tenantId: string, id: string) {
    const connection = await this.connectionRepo.findById(tenantId, id);
    if (!connection) {
      throw new NotFoundError(`IntegrationConnection ${id} not found in tenant`);
    }

    return SecretVaultService.redactConnection(connection);
  }

  public async listConnections(tenantId: string, query: QueryIntegrationConnectionsDto) {
    const { items, total } = await this.connectionRepo.findMany(tenantId, query);
    return {
      items: items.map((item) => SecretVaultService.redactConnection(item)),
      total,
    };
  }

  public async updateConnection(
    tenantId: string,
    id: string,
    dto: UpdateIntegrationConnectionDto
  ) {
    await this.getConnectionById(tenantId, id);

    let encryptedSecret: string | undefined;
    if (dto.secret) {
      encryptedSecret = SecretVaultService.encrypt(dto.secret);
    }

    const updated = await this.connectionRepo.update(
      tenantId,
      id,
      dto,
      encryptedSecret
    );

    return SecretVaultService.redactConnection(updated);
  }

  public async testConnection(tenantId: string, id: string) {
    const rawConnection = await this.connectionRepo.findById(tenantId, id);
    if (!rawConnection) {
      throw new NotFoundError(`IntegrationConnection ${id} not found in tenant`);
    }

    const provider = this.providerRegistry.get(rawConnection.providerKey);
    if (!provider) {
      throw new BadRequestError(`No provider adapter registered for ${rawConnection.providerKey}`);
    }

    let plainSecret: string | undefined;
    if (rawConnection.encryptedSecret) {
      plainSecret = SecretVaultService.decrypt(rawConnection.encryptedSecret);
    }

    const result = await provider.testConnection(rawConnection.config as Record<string, any>, plainSecret);

    await this.connectionRepo.updateHealth(
      tenantId,
      id,
      result.success ? IntegrationConnectionStatus.ACTIVE : IntegrationConnectionStatus.ERROR,
      result.success ? null : result.message,
      result.success ? new Date() : undefined
    );

    return result;
  }
}
