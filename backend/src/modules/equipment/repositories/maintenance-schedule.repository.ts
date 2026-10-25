import { PrismaClient, Prisma } from '@prisma/client';
import { CreateMaintenanceScheduleDto, ListMaintenanceSchedulesQueryDto } from '../dto/maintenance.dto.js';

export class MaintenanceScheduleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    tenantId: string,
    equipmentId: string,
    dto: CreateMaintenanceScheduleDto,
    initialMeterReading?: number,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma;
    
    // Calculate initial next due dates/meters if interval specified
    let nextDueMeter: Prisma.Decimal | undefined = undefined;
    let nextDueDate: Date | undefined = undefined;

    if (dto.intervalMeterHours && initialMeterReading !== undefined) {
      nextDueMeter = new Prisma.Decimal(initialMeterReading + dto.intervalMeterHours);
    }
    if (dto.intervalDays) {
      const due = new Date();
      due.setDate(due.getDate() + dto.intervalDays);
      nextDueDate = due;
    }

    return client.maintenanceSchedule.create({
      data: {
        tenantId,
        equipmentId,
        title: dto.title,
        maintenanceType: dto.maintenanceType ?? 'PREVENTIVE',
        intervalMeterHours: dto.intervalMeterHours ? new Prisma.Decimal(dto.intervalMeterHours) : undefined,
        intervalDays: dto.intervalDays ?? undefined,
        nextDueMeter,
        nextDueDate,
        description: dto.description ?? undefined,
        isActive: dto.isActive ?? true,
      },
      include: {
        equipment: { select: { id: true, equipmentCode: true, name: true } },
      },
    });
  }

  async findById(tenantId: string, id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.maintenanceSchedule.findFirst({
      where: { id, tenantId },
      include: {
        equipment: { select: { id: true, equipmentCode: true, name: true, currentMeterReading: true } },
      },
    });
  }

  async updateLastCompleted(
    tenantId: string,
    id: string,
    completedDate: Date,
    completedMeter?: number | null,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma;
    const schedule = await this.findById(tenantId, id, tx);
    if (!schedule) return null;

    let nextDueDate: Date | undefined = undefined;
    let nextDueMeter: Prisma.Decimal | undefined = undefined;

    if (schedule.intervalDays) {
      const nextDate = new Date(completedDate);
      nextDate.setDate(nextDate.getDate() + schedule.intervalDays);
      nextDueDate = nextDate;
    }

    if (schedule.intervalMeterHours && completedMeter !== undefined && completedMeter !== null) {
      nextDueMeter = new Prisma.Decimal(completedMeter + Number(schedule.intervalMeterHours));
    }

    return client.maintenanceSchedule.update({
      where: { id },
      data: {
        lastCompletedDate: completedDate,
        lastCompletedMeter: completedMeter !== undefined && completedMeter !== null ? new Prisma.Decimal(completedMeter) : undefined,
        nextDueDate,
        nextDueMeter,
      },
    });
  }

  async listByEquipmentId(tenantId: string, equipmentId: string, query: ListMaintenanceSchedulesQueryDto) {
    const where: Prisma.MaintenanceScheduleWhereInput = {
      tenantId,
      equipmentId,
      ...(query.isActive !== undefined && { isActive: query.isActive }),
    };

    const [items, total] = await Promise.all([
      this.prisma.maintenanceSchedule.findMany({
        where,
        take: query.limit,
        skip: query.offset,
        orderBy: { createdAt: 'desc' },
        include: {
          equipment: { select: { id: true, equipmentCode: true, name: true } },
        },
      }),
      this.prisma.maintenanceSchedule.count({ where }),
    ]);

    return { items, total, limit: query.limit, offset: query.offset };
  }
}
