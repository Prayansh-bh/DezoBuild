import { PrismaClient, Prisma } from '@prisma/client';
import { CreateOperatingLogDto, CorrectOperatingLogDto, ListOperatingLogsQueryDto } from '../dto/operating-log.dto.js';

export class OperatingLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    tenantId: string,
    equipmentId: string,
    recordedById: string,
    dto: CreateOperatingLogDto,
    supersededLogId?: string | null,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.equipmentOperatingLog.create({
      data: {
        tenantId,
        equipmentId,
        projectId: dto.projectId,
        operatorEmployeeId: dto.operatorEmployeeId ?? undefined,
        logDate: new Date(dto.logDate),
        shift: dto.shift ?? 'GENERAL',
        startMeter: new Prisma.Decimal(dto.startMeter),
        endMeter: new Prisma.Decimal(dto.endMeter),
        operatingHours: new Prisma.Decimal(dto.operatingHours),
        idleHours: new Prisma.Decimal(dto.idleHours ?? 0),
        breakdownHours: new Prisma.Decimal(dto.breakdownHours ?? 0),
        workDescription: dto.workDescription ?? undefined,
        isCorrected: false,
        supersededLogId: supersededLogId ?? undefined,
        recordedById,
      },
      include: {
        equipment: { select: { id: true, equipmentCode: true, name: true, meterType: true } },
        project: { select: { id: true, name: true, code: true } },
        operator: { select: { id: true, fullName: true, employeeNumber: true } },
        recordedBy: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  async findById(tenantId: string, id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.equipmentOperatingLog.findFirst({
      where: { id, tenantId },
      include: {
        equipment: { select: { id: true, equipmentCode: true, name: true, meterType: true } },
        project: { select: { id: true, name: true, code: true } },
        operator: { select: { id: true, fullName: true, employeeNumber: true } },
        recordedBy: { select: { id: true, email: true, fullName: true } },
        correctedBy: { select: { id: true, email: true, fullName: true } },
        supersededLog: true,
        corrections: true,
      },
    });
  }

  async findActiveByShift(
    tenantId: string,
    equipmentId: string,
    logDate: string | Date,
    shift: string,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma;
    const dateObj = typeof logDate === 'string' ? new Date(logDate) : logDate;
    return client.equipmentOperatingLog.findFirst({
      where: {
        tenantId,
        equipmentId,
        logDate: dateObj,
        shift,
        isCorrected: false,
      },
    });
  }

  async lockById(tenantId: string, id: string, tx: Prisma.TransactionClient) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) return null;
    const rows = await tx.$queryRawUnsafe<any[]>(
      `SELECT * FROM "equipment_operating_logs" WHERE "id" = $1::uuid AND "tenant_id" = $2::uuid FOR UPDATE`,
      id,
      tenantId
    );
    return rows[0] || null;
  }

  async markCorrected(
    tenantId: string,
    id: string,
    correctedById: string,
    correctionReason: string,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.equipmentOperatingLog.update({
      where: { id },
      data: {
        isCorrected: true,
        correctedAt: new Date(),
        correctedById,
        correctionReason,
      },
    });
  }

  async findHighestMeterByEquipment(tenantId: string, equipmentId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const result = await client.equipmentOperatingLog.findFirst({
      where: { tenantId, equipmentId, isCorrected: false },
      orderBy: { endMeter: 'desc' },
      select: { endMeter: true },
    });
    return result?.endMeter ? Number(result.endMeter) : 0;
  }

  async listByEquipmentId(tenantId: string, equipmentId: string, query: ListOperatingLogsQueryDto) {
    const where: Prisma.EquipmentOperatingLogWhereInput = {
      tenantId,
      equipmentId,
      ...(query.projectId && { projectId: query.projectId }),
      ...(query.logDate && { logDate: new Date(query.logDate) }),
      ...(query.shift && { shift: query.shift }),
    };

    const [items, total] = await Promise.all([
      this.prisma.equipmentOperatingLog.findMany({
        where,
        take: query.limit,
        skip: query.offset,
        orderBy: [{ logDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          equipment: { select: { id: true, equipmentCode: true, name: true, meterType: true } },
          project: { select: { id: true, name: true, code: true } },
          operator: { select: { id: true, fullName: true, employeeNumber: true } },
          recordedBy: { select: { id: true, email: true, fullName: true } },
          correctedBy: { select: { id: true, email: true, fullName: true } },
        },
      }),
      this.prisma.equipmentOperatingLog.count({ where }),
    ]);

    return { items, total, limit: query.limit, offset: query.offset };
  }
}
