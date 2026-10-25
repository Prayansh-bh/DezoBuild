import type { DocumentAuditLog } from '@prisma/client';
import {
  DocumentAuditRepository,
  type CreateDocumentAuditParams,
} from '../repositories/document-audit.repository.js';
import type { PrismaTransactionClient } from '../constants/documents.constants.js';

export class DocumentAuditService {
  constructor(private readonly auditRepo: DocumentAuditRepository) {}

  public async log(
    params: CreateDocumentAuditParams,
    tx?: PrismaTransactionClient
  ): Promise<DocumentAuditLog> {
    return this.auditRepo.log(params, tx);
  }

  public async list(
    tenantId: string,
    filters: {
      projectId?: string;
      entityType?: string;
      entityId?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ items: DocumentAuditLog[]; total: number; page: number; limit: number }> {
    return this.auditRepo.list(tenantId, filters);
  }
}
