import { PrismaClient } from '@prisma/client';
import { EquipmentRepository } from '../repositories/equipment.repository.js';
import { OperatingLogRepository } from '../repositories/operating-log.repository.js';
import { EquipmentAuditRepository } from '../repositories/equipment-audit.repository.js';
import {
  CreateOperatingLogDto,
  CorrectOperatingLogDto,
  ListOperatingLogsQueryDto,
} from '../dto/operating-log.dto.js';
import { EquipmentRequestContext } from '../constants/equipment.constants.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../../common/errors/index.js';

export class OperatingLogService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly equipmentRepo: EquipmentRepository,
    private readonly operatingLogRepo: OperatingLogRepository,
    private readonly auditRepo: EquipmentAuditRepository
  ) {}

  async create(ctx: EquipmentRequestContext, equipmentId: string, dto: CreateOperatingLogDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Verify equipment
      const equipment = await this.equipmentRepo.findById(ctx.tenantId, equipmentId, tx);
      if (!equipment) {
        throw new NotFoundError('Equipment not found');
      }

      if (equipment.status === 'RETIRED' || equipment.status === 'DISPOSED') {
        throw new BadRequestError(`Cannot record operating log for equipment in ${equipment.status} status`);
      }

      // 2. Verify project
      const project = await tx.project.findFirst({
        where: { id: dto.projectId, tenantId: ctx.tenantId },
      });
      if (!project) {
        throw new BadRequestError('Invalid projectId: project not found in current tenant');
      }

      // 3. Verify operator employee if provided
      if (dto.operatorEmployeeId) {
        const employee = await tx.employee.findFirst({
          where: { id: dto.operatorEmployeeId, tenantId: ctx.tenantId },
        });
        if (!employee) {
          throw new BadRequestError('Invalid operatorEmployeeId: employee not found in current tenant');
        }
      }

      // 4. Validate meter calculation for HOURS meterType
      const meterDelta = dto.endMeter - dto.startMeter;
      if (equipment.meterType === 'HOURS') {
        // For HOURS, operatingHours must equal endMeter - startMeter
        if (Math.abs(dto.operatingHours - meterDelta) > 0.01) {
          throw new BadRequestError(
            `For meterType HOURS, operatingHours (${dto.operatingHours}) must match meter delta (${meterDelta.toFixed(2)})`
          );
        }
      }

      // 5. Verify active shift uniqueness
      const existingActiveShift = await this.operatingLogRepo.findActiveByShift(
        ctx.tenantId,
        equipmentId,
        dto.logDate,
        dto.shift ?? 'GENERAL',
        tx
      );
      if (existingActiveShift) {
        throw new ConflictError(
          `Active operating log for equipment '${equipment.equipmentCode}' on ${dto.logDate} shift '${dto.shift ?? 'GENERAL'}' already exists`
        );
      }

      // 6. Create log row
      const log = await this.operatingLogRepo.create(
        ctx.tenantId,
        equipmentId,
        ctx.user.id,
        dto,
        undefined,
        tx
      );

      // 7. Update Equipment current meter reading if endMeter advances it
      if (dto.endMeter > Number(equipment.currentMeterReading)) {
        await this.equipmentRepo.updateMeterReading(ctx.tenantId, equipmentId, dto.endMeter, tx);
      }

      // 8. Audit log
      await this.auditRepo.log(
        {
          tenantId: ctx.tenantId,
          equipmentId,
          entityType: 'OPERATING_LOG',
          entityId: log.id,
          action: 'UPDATE_METADATA',
          actorId: ctx.user.id,
          newState: log,
          reason: `Operating log recorded for date ${dto.logDate}`,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return log;
    });
  }

  async correct(ctx: EquipmentRequestContext, id: string, dto: CorrectOperatingLogDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock target operating log
      const lockedLog = await this.operatingLogRepo.lockById(ctx.tenantId, id, tx);
      if (!lockedLog) {
        throw new NotFoundError('Operating log not found');
      }

      if (lockedLog.is_corrected) {
        throw new BadRequestError('Operating log has already been corrected and cannot be modified again');
      }

      const equipmentId = lockedLog.equipment_id;
      const equipment = await this.equipmentRepo.findById(ctx.tenantId, equipmentId, tx);
      if (!equipment) {
        throw new NotFoundError('Equipment not found');
      }

      // 2. Validate meter delta if meterType is HOURS
      const meterDelta = dto.endMeter - dto.startMeter;
      if (equipment.meterType === 'HOURS') {
        if (Math.abs(dto.operatingHours - meterDelta) > 0.01) {
          throw new BadRequestError(
            `For meterType HOURS, operatingHours (${dto.operatingHours}) must match meter delta (${meterDelta.toFixed(2)})`
          );
        }
      }

      // 3. Mark original row as corrected
      await this.operatingLogRepo.markCorrected(
        ctx.tenantId,
        id,
        ctx.user.id,
        dto.correctionReason,
        tx
      );

      // 4. Create revised replacement row with supersededLogId pointing to original
      const replacementDto: CreateOperatingLogDto = {
        projectId: lockedLog.project_id,
        operatorEmployeeId: dto.operatorEmployeeId !== undefined ? dto.operatorEmployeeId : lockedLog.operator_employee_id,
        logDate: dto.logDate ?? lockedLog.log_date.toISOString().split('T')[0],
        shift: dto.shift ?? lockedLog.shift,
        startMeter: dto.startMeter,
        endMeter: dto.endMeter,
        operatingHours: dto.operatingHours,
        idleHours: dto.idleHours ?? 0,
        breakdownHours: dto.breakdownHours ?? 0,
        workDescription: dto.workDescription !== undefined ? dto.workDescription : lockedLog.work_description,
      };

      const replacementLog = await this.operatingLogRepo.create(
        ctx.tenantId,
        equipmentId,
        ctx.user.id,
        replacementDto,
        id, // supersededLogId
        tx
      );

      // 5. Recompute current equipment meter reading using highest active endMeter
      const highestMeter = await this.operatingLogRepo.findHighestMeterByEquipment(ctx.tenantId, equipmentId, tx);
      await this.equipmentRepo.updateMeterReading(ctx.tenantId, equipmentId, highestMeter, tx);

      // 6. Audit log
      await this.auditRepo.log(
        {
          tenantId: ctx.tenantId,
          equipmentId,
          entityType: 'OPERATING_LOG',
          entityId: replacementLog.id,
          action: 'METER_CORRECTION',
          actorId: ctx.user.id,
          previousState: lockedLog,
          newState: replacementLog,
          reason: dto.correctionReason,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return replacementLog;
    });
  }

  async list(ctx: EquipmentRequestContext, equipmentId: string, query: ListOperatingLogsQueryDto) {
    const equipment = await this.equipmentRepo.findById(ctx.tenantId, equipmentId);
    if (!equipment) {
      throw new NotFoundError('Equipment not found');
    }
    return this.operatingLogRepo.listByEquipmentId(ctx.tenantId, equipmentId, query);
  }
}
