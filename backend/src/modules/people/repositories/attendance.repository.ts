import { PrismaClient, Prisma } from '@prisma/client';
import { CreatePunchDto, CreateManualAttendanceDto, ListAttendanceQueryDto } from '../dto/attendance.dto.js';

export interface RawPunchData {
  tenantId: string;
  employeeId: string;
  punchTime: Date;
  punchType: string;
  source: string;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  accuracyMeters?: number | null;
  deviceId?: string | null;
}

export interface UpsertAttendanceRecordData {
  tenantId: string;
  employeeId: string;
  projectId?: string | null;
  shiftId?: string | null;
  attendanceDate: Date;
  checkInTime?: Date | null;
  checkOutTime?: Date | null;
  totalWorkMinutes: number;
  lateMinutes: number;
  earlyOutMinutes: number;
  overtimeMinutes: number;
  status: string;
  source: string;
  isRegularized?: boolean;
  regularizationId?: string | null;
  remarks?: string | null;
}

export class AttendanceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createPunch(data: RawPunchData, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.attendancePunch.create({
      data: {
        tenantId: data.tenantId,
        employeeId: data.employeeId,
        punchTime: data.punchTime,
        punchType: data.punchType,
        source: data.source,
        gpsLatitude: data.gpsLatitude !== undefined && data.gpsLatitude !== null ? new Prisma.Decimal(data.gpsLatitude) : undefined,
        gpsLongitude: data.gpsLongitude !== undefined && data.gpsLongitude !== null ? new Prisma.Decimal(data.gpsLongitude) : undefined,
        accuracyMeters: data.accuracyMeters !== undefined && data.accuracyMeters !== null ? new Prisma.Decimal(data.accuracyMeters) : undefined,
        deviceId: data.deviceId ?? undefined,
      },
    });
  }

  async findPunch(
    tenantId: string,
    employeeId: string,
    punchTime: Date,
    punchType: string,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.attendancePunch.findUnique({
      where: {
        tenantId_employeeId_punchTime_punchType: {
          tenantId,
          employeeId,
          punchTime,
          punchType,
        },
      },
    });
  }

  async listPunchesForDay(
    tenantId: string,
    employeeId: string,
    dayStart: Date,
    dayEnd: Date,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.attendancePunch.findMany({
      where: {
        tenantId,
        employeeId,
        punchTime: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      orderBy: { punchTime: 'asc' },
    });
  }

  async findRecordByDate(
    tenantId: string,
    employeeId: string,
    attendanceDate: Date,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.attendanceRecord.findUnique({
      where: {
        tenantId_employeeId_attendanceDate: {
          tenantId,
          employeeId,
          attendanceDate,
        },
      },
      include: {
        employee: { select: { id: true, fullName: true, employeeNumber: true, designation: true } },
        project: { select: { id: true, name: true, code: true } },
        shift: true,
      },
    });
  }

  async upsertRecord(data: UpsertAttendanceRecordData, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.attendanceRecord.upsert({
      where: {
        tenantId_employeeId_attendanceDate: {
          tenantId: data.tenantId,
          employeeId: data.employeeId,
          attendanceDate: data.attendanceDate,
        },
      },
      create: {
        tenantId: data.tenantId,
        employeeId: data.employeeId,
        projectId: data.projectId ?? undefined,
        shiftId: data.shiftId ?? undefined,
        attendanceDate: data.attendanceDate,
        checkInTime: data.checkInTime ?? undefined,
        checkOutTime: data.checkOutTime ?? undefined,
        totalWorkMinutes: data.totalWorkMinutes,
        lateMinutes: data.lateMinutes,
        earlyOutMinutes: data.earlyOutMinutes,
        overtimeMinutes: data.overtimeMinutes,
        status: data.status,
        source: data.source,
        isRegularized: data.isRegularized ?? false,
        regularizationId: data.regularizationId ?? undefined,
        remarks: data.remarks ?? undefined,
      },
      update: {
        projectId: data.projectId !== undefined ? (data.projectId ?? null) : undefined,
        shiftId: data.shiftId !== undefined ? (data.shiftId ?? null) : undefined,
        checkInTime: data.checkInTime !== undefined ? (data.checkInTime ?? null) : undefined,
        checkOutTime: data.checkOutTime !== undefined ? (data.checkOutTime ?? null) : undefined,
        totalWorkMinutes: data.totalWorkMinutes,
        lateMinutes: data.lateMinutes,
        earlyOutMinutes: data.earlyOutMinutes,
        overtimeMinutes: data.overtimeMinutes,
        status: data.status,
        source: data.source,
        isRegularized: data.isRegularized !== undefined ? data.isRegularized : undefined,
        regularizationId: data.regularizationId !== undefined ? (data.regularizationId ?? null) : undefined,
        remarks: data.remarks !== undefined ? (data.remarks ?? null) : undefined,
      },
      include: {
        employee: { select: { id: true, fullName: true, employeeNumber: true, designation: true } },
        project: { select: { id: true, name: true, code: true } },
        shift: true,
      },
    });
  }

  async listRecords(tenantId: string, query: ListAttendanceQueryDto) {
    const where: Prisma.AttendanceRecordWhereInput = {
      tenantId,
      ...(query.employeeId && { employeeId: query.employeeId }),
      ...(query.projectId && { projectId: query.projectId }),
      ...(query.status && { status: query.status }),
      ...(query.startDate && query.endDate && {
        attendanceDate: {
          gte: new Date(query.startDate),
          lte: new Date(query.endDate),
        },
      }),
      ...(query.startDate && !query.endDate && {
        attendanceDate: {
          gte: new Date(query.startDate),
        },
      }),
      ...(!query.startDate && query.endDate && {
        attendanceDate: {
          lte: new Date(query.endDate),
        },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where,
        take: query.limit,
        skip: query.offset,
        orderBy: [{ attendanceDate: 'desc' }, { employeeId: 'asc' }],
        include: {
          employee: { select: { id: true, fullName: true, employeeNumber: true, designation: true } },
          project: { select: { id: true, name: true, code: true } },
          shift: true,
        },
      }),
      this.prisma.attendanceRecord.count({ where }),
    ]);

    return { items, total, limit: query.limit, offset: query.offset };
  }
}
