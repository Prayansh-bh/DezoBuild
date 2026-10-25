import type { ExternalReferenceRepository } from '../repositories/external-reference.repository.js';
import type { CreateExternalReferenceDto } from '../dto/integration.dto.js';

export class ExternalReferenceService {
  constructor(private readonly refRepo: ExternalReferenceRepository) {}

  public async mapReference(tenantId: string, dto: CreateExternalReferenceDto) {
    return this.refRepo.upsert(tenantId, dto);
  }

  public async getByInternalEntity(
    tenantId: string,
    connectionId: string,
    entityType: string,
    entityId: string
  ) {
    return this.refRepo.findByInternalEntity(
      tenantId,
      connectionId,
      entityType,
      entityId
    );
  }

  public async getByExternalEntity(
    tenantId: string,
    connectionId: string,
    externalEntityType: string,
    externalEntityId: string
  ) {
    return this.refRepo.findByExternalEntity(
      tenantId,
      connectionId,
      externalEntityType,
      externalEntityId
    );
  }
}
