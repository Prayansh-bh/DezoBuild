import type { PrismaClient, DocumentAuditLog } from '@prisma/client';
import type { PrismaTransactionClient } from '../constants/documents.constants.js';

export interface CreateDocumentAuditParams {
  tenantId: string;
  projectId: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  previousState?: any;
  newState?: any;
  reason?: string;
  ipAddress?: string;
}

export class DocumentAuditRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async log(
    params: CreateDocumentAuditParams,
    tx?: PrismaTransactionClient
  ): Promise<DocumentAuditLog> {
    const db = tx ?? this.prisma;
    return (db as PrismaClient).documentAuditLog.create({
      data: {
        tenantId: params.tenantId,
        projectId: params.projectId,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        actorId: params.actorId,
        previousState: params.previousState ?? undefined,
        newState: params.newState ?? undefined,
        reason: params.reason,
        ipAddress: params.ipAddress,
      },
    });
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
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      ...(filters.projectId && { projectId: filters.projectId }),
      ...(filters.entityType && { entityType: filters.entityType }),
      ...(filters.entityId && { entityId: filters.entityId }),
    };

    const [items, total] = await Promise.all([
      this.prisma.documentAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.documentAuditLog.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}
