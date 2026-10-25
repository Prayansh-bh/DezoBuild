import { PrismaClient } from '@prisma/client';
import { EquipmentRepository } from '../repositories/equipment.repository.js';
import { FuelLogRepository } from '../repositories/fuel-log.repository.js';
import { EquipmentAuditRepository } from '../repositories/equipment-audit.repository.js';
import { CreateFuelLogDto, ListFuelLogsQueryDto } from '../dto/fuel-log.dto.js';
import { EquipmentRequestContext } from '../constants/equipment.constants.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../../common/errors/index.js';

export class FuelLogService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly equipmentRepo: EquipmentRepository,
    private readonly fuelLogRepo: FuelLogRepository,
    private readonly auditRepo: EquipmentAuditRepository
  ) {}

  async create(ctx: EquipmentRequestContext, equipmentId: string, dto: CreateFuelLogDto) {
    // Idempotency resolution before transaction if key provided
    if (dto.idempotencyKey) {
      const existingIdempotent = await this.fuelLogRepo.findByIdempotencyKey(ctx.tenantId, dto.idempotencyKey);
      if (existingIdempotent) {
        return existingIdempotent;
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Verify equipment
      const equipment = await this.equipmentRepo.findById(ctx.tenantId, equipmentId, tx);
      if (!equipment) {
        throw new NotFoundError('Equipment not found');
      }

      if (equipment.status === 'RETIRED' || equipment.status === 'DISPOSED') {
        throw new BadRequestError(`Cannot record fuel log for equipment in ${equipment.status} status`);
      }

      // 2. Verify project
      const project = await tx.project.findFirst({
        where: { id: dto.projectId, tenantId: ctx.tenantId },
      });
      if (!project) {
        throw new BadRequestError('Invalid projectId: project not found in current tenant');
      }

      // 3. Verify slipNumber uniqueness
      const existingSlip = await this.fuelLogRepo.findBySlipNumber(ctx.tenantId, dto.slipNumber, tx);
      if (existingSlip) {
        throw new ConflictError(`Fuel log with slipNumber '${dto.slipNumber}' already exists`);
      }

      // 4. Validate source-specific integrity
      if (dto.source === 'INTERNAL_STORE') {
        if (!dto.storeId || !dto.materialIssueId) {
          throw new BadRequestError('INTERNAL_STORE fuel source requires storeId and materialIssueId');
        }

        const store = await tx.store.findFirst({
          where: { id: dto.storeId, tenantId: ctx.tenantId },
        });
        if (!store) {
          throw new BadRequestError('Invalid storeId: store not found in current tenant');
        }

        const materialIssue = await tx.materialIssue.findFirst({
          where: { id: dto.materialIssueId, tenantId: ctx.tenantId },
        });
        if (!materialIssue) {
          throw new BadRequestError('Invalid materialIssueId: materialIssue not found in current tenant');
        }
      } else if (dto.source === 'EXTERNAL_VENDOR') {
        if (!dto.supplierVendorId && !dto.invoiceNumber) {
          throw new BadRequestError('EXTERNAL_VENDOR fuel source requires supplierVendorId or invoiceNumber');
        }

        if (dto.supplierVendorId) {
          const vendor = await tx.vendor.findFirst({
            where: { id: dto.supplierVendorId, tenantId: ctx.tenantId },
          });
          if (!vendor) {
            throw new BadRequestError('Invalid supplierVendorId: vendor not found in current tenant');
          }
        }
      } else if (dto.source === 'SITE_BOWSER') {
        if (!dto.storeId && !dto.supplierVendorId) {
          throw new BadRequestError('SITE_BOWSER fuel source requires storeId or supplierVendorId');
        }

        if (dto.storeId) {
          const store = await tx.store.findFirst({
            where: { id: dto.storeId, tenantId: ctx.tenantId },
          });
          if (!store) {
            throw new BadRequestError('Invalid storeId: store not found in current tenant');
          }
        }

        if (dto.supplierVendorId) {
          const vendor = await tx.vendor.findFirst({
            where: { id: dto.supplierVendorId, tenantId: ctx.tenantId },
          });
          if (!vendor) {
            throw new BadRequestError('Invalid supplierVendorId: vendor not found in current tenant');
          }
        }
      }

      // 5. Create fuel log
      const log = await this.fuelLogRepo.create(
        ctx.tenantId,
        equipmentId,
        ctx.user.id,
        dto,
        tx
      );

      // 6. Update Equipment meter reading if meterReading advances it
      if (dto.meterReading > Number(equipment.currentMeterReading)) {
        await this.equipmentRepo.updateMeterReading(ctx.tenantId, equipmentId, dto.meterReading, tx);
      }

      // 7. Audit log
      await this.auditRepo.log(
        {
          tenantId: ctx.tenantId,
          equipmentId,
          entityType: 'FUEL_LOG',
          entityId: log.id,
          action: 'FUEL_LOG',
          actorId: ctx.user.id,
          newState: log,
          reason: `Fuel dispensed: ${dto.quantityLiters}L (${dto.source})`,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return log;
    });
  }

  async list(ctx: EquipmentRequestContext, equipmentId: string, query: ListFuelLogsQueryDto) {
    const equipment = await this.equipmentRepo.findById(ctx.tenantId, equipmentId);
    if (!equipment) {
      throw new NotFoundError('Equipment not found');
    }
    return this.fuelLogRepo.listByEquipmentId(ctx.tenantId, equipmentId, query);
  }
}
