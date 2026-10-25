import { PrismaClient } from '@prisma/client';
import { EquipmentRepository } from '../repositories/equipment.repository.js';
import { MaintenanceScheduleRepository } from '../repositories/maintenance-schedule.repository.js';
import { WorkOrderRepository } from '../repositories/work-order.repository.js';
import { EquipmentAuditRepository } from '../repositories/equipment-audit.repository.js';
import {
  CreateMaintenanceScheduleDto,
  ListMaintenanceSchedulesQueryDto,
  CreateWorkOrderDto,
  CompleteWorkOrderDto,
  ListWorkOrdersQueryDto,
} from '../dto/maintenance.dto.js';
import { EquipmentRequestContext } from '../constants/equipment.constants.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../../common/errors/index.js';

export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly equipmentRepo: EquipmentRepository,
    private readonly scheduleRepo: MaintenanceScheduleRepository,
    private readonly workOrderRepo: WorkOrderRepository,
    private readonly auditRepo: EquipmentAuditRepository
  ) {}

  // ==========================================
  // SCHEDULES
  // ==========================================

  async createSchedule(ctx: EquipmentRequestContext, equipmentId: string, dto: CreateMaintenanceScheduleDto) {
    const equipment = await this.equipmentRepo.findById(ctx.tenantId, equipmentId);
    if (!equipment) {
      throw new NotFoundError('Equipment not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const schedule = await this.scheduleRepo.create(
        ctx.tenantId,
        equipmentId,
        dto,
        Number(equipment.currentMeterReading),
        tx
      );

      await this.auditRepo.log(
        {
          tenantId: ctx.tenantId,
          equipmentId,
          entityType: 'SCHEDULE',
          entityId: schedule.id,
          action: 'CREATE',
          actorId: ctx.user.id,
          newState: schedule,
          reason: `Maintenance schedule created: ${dto.title}`,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return schedule;
    });
  }

  async listSchedules(ctx: EquipmentRequestContext, equipmentId: string, query: ListMaintenanceSchedulesQueryDto) {
    const equipment = await this.equipmentRepo.findById(ctx.tenantId, equipmentId);
    if (!equipment) {
      throw new NotFoundError('Equipment not found');
    }
    return this.scheduleRepo.listByEquipmentId(ctx.tenantId, equipmentId, query);
  }

  // ==========================================
  // WORK ORDERS
  // ==========================================

  async createWorkOrder(ctx: EquipmentRequestContext, dto: CreateWorkOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Verify equipment
      const equipment = await this.equipmentRepo.findById(ctx.tenantId, dto.equipmentId, tx);
      if (!equipment) {
        throw new NotFoundError('Equipment not found');
      }

      if (equipment.status === 'RETIRED' || equipment.status === 'DISPOSED') {
        throw new BadRequestError(`Cannot create work order for equipment in ${equipment.status} status`);
      }

      // 2. Generate or verify work order number
      let workOrderNumber = dto.workOrderNumber;
      if (!workOrderNumber) {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomHex = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0').toUpperCase();
        workOrderNumber = `WO-${dateStr}-${randomHex}`;
      } else {
        const existing = await this.workOrderRepo.findByNumber(ctx.tenantId, workOrderNumber, tx);
        if (existing) {
          throw new ConflictError(`Work order with number '${workOrderNumber}' already exists`);
        }
      }

      // 3. Verify relations if provided
      if (dto.projectId) {
        const project = await tx.project.findFirst({
          where: { id: dto.projectId, tenantId: ctx.tenantId },
        });
        if (!project) {
          throw new BadRequestError('Invalid projectId: project not found in current tenant');
        }
      }

      if (dto.scheduleId) {
        const schedule = await this.scheduleRepo.findById(ctx.tenantId, dto.scheduleId, tx);
        if (!schedule) {
          throw new BadRequestError('Invalid scheduleId: schedule not found in current tenant');
        }
      }

      if (dto.serviceVendorId) {
        const vendor = await tx.vendor.findFirst({
          where: { id: dto.serviceVendorId, tenantId: ctx.tenantId },
        });
        if (!vendor) {
          throw new BadRequestError('Invalid serviceVendorId: vendor not found in current tenant');
        }
      }

      if (dto.materialIssueId) {
        const issue = await tx.materialIssue.findFirst({
          where: { id: dto.materialIssueId, tenantId: ctx.tenantId },
        });
        if (!issue) {
          throw new BadRequestError('Invalid materialIssueId: materialIssue not found in current tenant');
        }
      }

      // 4. If category is BREAKDOWN, update equipment status to BREAKDOWN
      if (dto.category === 'BREAKDOWN' && equipment.status !== 'BREAKDOWN') {
        await this.equipmentRepo.updateStatus(ctx.tenantId, dto.equipmentId, 'BREAKDOWN', undefined, tx);
        await this.auditRepo.log(
          {
            tenantId: ctx.tenantId,
            equipmentId: dto.equipmentId,
            entityType: 'EQUIPMENT',
            entityId: dto.equipmentId,
            action: 'BREAKDOWN_REPORT',
            actorId: ctx.user.id,
            previousState: { status: equipment.status },
            newState: { status: 'BREAKDOWN' },
            reason: dto.symptoms ?? 'Breakdown reported via work order',
            ipAddress: ctx.ipAddress,
          },
          tx
        );
      }

      // 5. Create work order
      const workOrder = await this.workOrderRepo.create(
        ctx.tenantId,
        workOrderNumber,
        ctx.user.id,
        dto,
        tx
      );

      // 6. Audit work order
      await this.auditRepo.log(
        {
          tenantId: ctx.tenantId,
          equipmentId: dto.equipmentId,
          entityType: 'WORK_ORDER',
          entityId: workOrder.id,
          action: 'CREATE',
          actorId: ctx.user.id,
          newState: workOrder,
          reason: `Work order ${workOrderNumber} created (${dto.category ?? 'PREVENTIVE'})`,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return workOrder;
    });
  }

  async getWorkOrderById(ctx: EquipmentRequestContext, id: string) {
    const workOrder = await this.workOrderRepo.findById(ctx.tenantId, id);
    if (!workOrder) {
      throw new NotFoundError('Maintenance work order not found');
    }
    return workOrder;
  }

  async listWorkOrders(ctx: EquipmentRequestContext, query: ListWorkOrdersQueryDto) {
    return this.workOrderRepo.list(ctx.tenantId, query);
  }

  async completeWorkOrder(ctx: EquipmentRequestContext, id: string, dto: CompleteWorkOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock work order
      const lockedWo = await this.workOrderRepo.lockById(ctx.tenantId, id, tx);
      if (!lockedWo) {
        throw new NotFoundError('Maintenance work order not found');
      }

      if (lockedWo.status === 'COMPLETED') {
        throw new BadRequestError('Maintenance work order is already COMPLETED');
      }
      if (lockedWo.status === 'CANCELLED') {
        throw new BadRequestError('Cannot complete a CANCELLED maintenance work order');
      }

      const equipmentId = lockedWo.equipment_id;
      const lockedEquipment = await this.equipmentRepo.lockById(ctx.tenantId, equipmentId, tx);
      if (!lockedEquipment) {
        throw new NotFoundError('Equipment not found');
      }

      // 2. Complete work order
      const completedWo = await this.workOrderRepo.completeWorkOrder(
        ctx.tenantId,
        id,
        ctx.user.id,
        dto,
        tx
      );

      // 3. Update associated maintenance schedule if linked
      if (lockedWo.schedule_id) {
        const completedDate = new Date();
        const completedMeter = dto.meterReadingAtService !== undefined && dto.meterReadingAtService !== null
          ? dto.meterReadingAtService
          : Number(lockedEquipment.current_meter_reading);

        await this.scheduleRepo.updateLastCompleted(
          ctx.tenantId,
          lockedWo.schedule_id,
          completedDate,
          completedMeter,
          tx
        );
      }

      // 4. Update equipment meter if service meter is higher
      if (dto.meterReadingAtService && dto.meterReadingAtService > Number(lockedEquipment.current_meter_reading)) {
        await this.equipmentRepo.updateMeterReading(ctx.tenantId, equipmentId, dto.meterReadingAtService, tx);
      }

      // 5. Restore equipment status if it was BREAKDOWN or UNDER_MAINTENANCE
      if (lockedEquipment.status === 'BREAKDOWN' || lockedEquipment.status === 'UNDER_MAINTENANCE') {
        // Check if there is an active assignment
        const activeAssignment = await tx.equipmentAssignment.findFirst({
          where: { tenantId: ctx.tenantId, equipmentId, status: 'ACTIVE' },
        });

        const restoredStatus = activeAssignment ? 'ASSIGNED' : 'AVAILABLE';
        await this.equipmentRepo.updateStatus(ctx.tenantId, equipmentId, restoredStatus, undefined, tx);

        await this.auditRepo.log(
          {
            tenantId: ctx.tenantId,
            equipmentId,
            entityType: 'EQUIPMENT',
            entityId: equipmentId,
            action: 'UPDATE_METADATA',
            actorId: ctx.user.id,
            previousState: { status: lockedEquipment.status },
            newState: { status: restoredStatus },
            reason: `Status restored to ${restoredStatus} after maintenance work order completion`,
            ipAddress: ctx.ipAddress,
          },
          tx
        );
      }

      // 6. Audit work order completion
      await this.auditRepo.log(
        {
          tenantId: ctx.tenantId,
          equipmentId,
          entityType: 'WORK_ORDER',
          entityId: id,
          action: 'WORK_ORDER_COMPLETE',
          actorId: ctx.user.id,
          previousState: lockedWo,
          newState: completedWo,
          reason: `Work order completed: ${dto.workDone}`,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return completedWo;
    });
  }
}
