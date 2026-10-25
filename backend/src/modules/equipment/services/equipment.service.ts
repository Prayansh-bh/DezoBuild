import { PrismaClient } from '@prisma/client';
import { EquipmentRepository } from '../repositories/equipment.repository.js';
import { EquipmentAuditRepository } from '../repositories/equipment-audit.repository.js';
import {
  CreateEquipmentDto,
  UpdateEquipmentDto,
  UpdateEquipmentStatusDto,
  ListEquipmentQueryDto,
} from '../dto/equipment.dto.js';
import { EquipmentRequestContext, EquipmentAuditAction } from '../constants/equipment.constants.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../../common/errors/index.js';

export class EquipmentService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly equipmentRepo: EquipmentRepository,
    private readonly auditRepo: EquipmentAuditRepository
  ) {}

  async create(ctx: EquipmentRequestContext, dto: CreateEquipmentDto) {
    const existing = await this.equipmentRepo.findByCode(ctx.tenantId, dto.equipmentCode);
    if (existing) {
      throw new ConflictError(`Equipment with code '${dto.equipmentCode}' already exists`);
    }

    // Verify company belongs to tenant
    const company = await this.prisma.company.findFirst({
      where: { id: dto.companyId, tenantId: ctx.tenantId },
    });
    if (!company) {
      throw new BadRequestError('Invalid companyId: company not found in current tenant');
    }

    // Verify branch if provided
    if (dto.currentBranchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.currentBranchId, tenantId: ctx.tenantId },
      });
      if (!branch) {
        throw new BadRequestError('Invalid currentBranchId: branch not found in current tenant');
      }
    }

    // Verify owner vendor if provided
    if (dto.ownerVendorId) {
      const vendor = await this.prisma.vendor.findFirst({
        where: { id: dto.ownerVendorId, tenantId: ctx.tenantId },
      });
      if (!vendor) {
        throw new BadRequestError('Invalid ownerVendorId: vendor not found in current tenant');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const created = await this.equipmentRepo.create(ctx.tenantId, dto, tx);

      await this.auditRepo.log(
        {
          tenantId: ctx.tenantId,
          equipmentId: created.id,
          entityType: 'EQUIPMENT',
          entityId: created.id,
          action: 'CREATE',
          actorId: ctx.user.id,
          newState: created,
          reason: 'Initial equipment registration',
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return created;
    });
  }

  async getById(ctx: EquipmentRequestContext, id: string) {
    const equipment = await this.equipmentRepo.findById(ctx.tenantId, id);
    if (!equipment) {
      throw new NotFoundError('Equipment not found');
    }
    return equipment;
  }

  async list(ctx: EquipmentRequestContext, query: ListEquipmentQueryDto) {
    return this.equipmentRepo.list(ctx.tenantId, query);
  }

  async updateMetadata(ctx: EquipmentRequestContext, id: string, dto: UpdateEquipmentDto) {
    const existing = await this.equipmentRepo.findById(ctx.tenantId, id);
    if (!existing) {
      throw new NotFoundError('Equipment not found');
    }

    if (existing.status === 'RETIRED' || existing.status === 'DISPOSED') {
      throw new BadRequestError(`Cannot update metadata for equipment in ${existing.status} status`);
    }

    if (dto.companyId && dto.companyId !== existing.companyId) {
      const company = await this.prisma.company.findFirst({
        where: { id: dto.companyId, tenantId: ctx.tenantId },
      });
      if (!company) {
        throw new BadRequestError('Invalid companyId: company not found in current tenant');
      }
    }

    if (dto.currentBranchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.currentBranchId, tenantId: ctx.tenantId },
      });
      if (!branch) {
        throw new BadRequestError('Invalid currentBranchId: branch not found in current tenant');
      }
    }

    if (dto.ownerVendorId) {
      const vendor = await this.prisma.vendor.findFirst({
        where: { id: dto.ownerVendorId, tenantId: ctx.tenantId },
      });
      if (!vendor) {
        throw new BadRequestError('Invalid ownerVendorId: vendor not found in current tenant');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await this.equipmentRepo.updateMetadata(ctx.tenantId, id, dto, tx);

      await this.auditRepo.log(
        {
          tenantId: ctx.tenantId,
          equipmentId: id,
          entityType: 'EQUIPMENT',
          entityId: id,
          action: 'UPDATE_METADATA',
          actorId: ctx.user.id,
          previousState: existing,
          newState: updated,
          reason: 'Equipment metadata update',
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  async updateStatus(ctx: EquipmentRequestContext, id: string, dto: UpdateEquipmentStatusDto) {
    return this.prisma.$transaction(async (tx) => {
      const locked = await this.equipmentRepo.lockById(ctx.tenantId, id, tx);
      if (!locked) {
        throw new NotFoundError('Equipment not found');
      }

      const currentStatus = locked.status;
      const targetStatus = dto.status;

      if (currentStatus === targetStatus) {
        return this.equipmentRepo.findById(ctx.tenantId, id, tx);
      }

      // Terminal state protection
      if (currentStatus === 'RETIRED' || currentStatus === 'DISPOSED') {
        throw new BadRequestError(`Cannot transition equipment out of terminal status '${currentStatus}'`);
      }

      // Direct assignment through status patch is forbidden (must use assignment service)
      if (targetStatus === 'ASSIGNED') {
        throw new BadRequestError('Direct status change to ASSIGNED is prohibited. Use assignment endpoint to deploy equipment.');
      }

      // Decommissioning checks: cannot retire or dispose if actively assigned
      if ((targetStatus === 'RETIRED' || targetStatus === 'DISPOSED') && currentStatus === 'ASSIGNED') {
        throw new BadRequestError(`Cannot set status to ${targetStatus} while equipment is actively assigned. Return assignment first.`);
      }

      let action: EquipmentAuditAction = 'UPDATE_METADATA';
      if (targetStatus === 'RETIRED') action = 'RETIRE';
      else if (targetStatus === 'DISPOSED') action = 'DISPOSE';
      else if (targetStatus === 'BREAKDOWN') action = 'BREAKDOWN_REPORT';

      const updated = await this.equipmentRepo.updateStatus(ctx.tenantId, id, targetStatus, undefined, tx);

      await this.auditRepo.log(
        {
          tenantId: ctx.tenantId,
          equipmentId: id,
          entityType: 'EQUIPMENT',
          entityId: id,
          action,
          actorId: ctx.user.id,
          previousState: { status: currentStatus },
          newState: { status: targetStatus },
          reason: dto.reason ?? `Status updated from ${currentStatus} to ${targetStatus}`,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return updated;
    });
  }
}
