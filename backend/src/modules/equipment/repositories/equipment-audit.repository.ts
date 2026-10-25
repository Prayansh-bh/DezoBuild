import { PrismaClient, Prisma } from '@prisma/client';
import { EquipmentAuditAction, EquipmentEntityType } from '../constants/equipment.constants.js';

export interface CreateEquipmentAuditLogParams {
  tenantId: string;
  equipmentId: string;
  entityType: EquipmentEntityType;
  entityId: string;
  action: EquipmentAuditAction;
  actorId: string;
  previousState?: any;
  newState?: any;
  reason?: string | null;
  ipAddress?: string | null;
}

export class EquipmentAuditRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async log(params: CreateEquipmentAuditLogParams, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.equipmentAuditLog.create({
      data: {
        tenantId: params.tenantId,
        equipmentId: params.equipmentId,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        actorId: params.actorId,
        previousState: params.previousState ? JSON.parse(JSON.stringify(params.previousState)) : undefined,
        newState: params.newState ? JSON.parse(JSON.stringify(params.newState)) : undefined,
        reason: params.reason ?? undefined,
        ipAddress: params.ipAddress ?? undefined,
      },
    });
  }

  async listByEquipment(tenantId: string, equipmentId: string, limit = 50, offset = 0) {
    return this.prisma.equipmentAuditLog.findMany({
      where: { tenantId, equipmentId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }
}
