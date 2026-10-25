import { QualitySafetyAuditRepository } from '../repositories/quality-safety-audit.repository.js';
import type { QualityRequestContext } from '../constants/quality.constants.js';
import type { QualitySafetyAuditLog } from '@prisma/client';

export class QualitySafetyAuditService {
  constructor(private readonly auditRepo: QualitySafetyAuditRepository) {}

  async listByEntity(
    ctx: QualityRequestContext,
    entityType: string,
    entityId: string
  ): Promise<QualitySafetyAuditLog[]> {
    return this.auditRepo.listByEntity(ctx.tenantId, entityType, entityId);
  }

  async listByProject(
    ctx: QualityRequestContext,
    projectId: string,
    query: { page?: number; limit?: number }
  ): Promise<{ items: QualitySafetyAuditLog[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const { items, total } = await this.auditRepo.listByProject(
      ctx.tenantId,
      projectId,
      { skip, take: limit }
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
