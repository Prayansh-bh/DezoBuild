import { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError, ConflictError } from '../../../common/errors/index.js';
import { PeopleRequestContext } from '../constants/people.constants.js';
import {
  CreatePunchDto,
  CreateManualAttendanceDto,
  ImportAttendanceDto,
  BiometricSyncBatchDto,
  ListAttendanceQueryDto,
} from '../dto/attendance.dto.js';
import { AttendanceRepository } from '../repositories/attendance.repository.js';
import { EmployeeRepository } from '../repositories/employee.repository.js';
import { ShiftRepository } from '../repositories/shift.repository.js';
import { HolidayRepository } from '../repositories/holiday.repository.js';
import { PeopleAuditRepository } from '../repositories/people-audit.repository.js';

export class AttendanceService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly attendanceRepo: AttendanceRepository,
    private readonly employeeRepo: EmployeeRepository,
    private readonly shiftRepo: ShiftRepository,
    private readonly holidayRepo: HolidayRepository,
    private readonly auditRepo: PeopleAuditRepository
  ) {}

  async recordPunch(context: PeopleRequestContext, dto: CreatePunchDto) {
    // 1. Resolve Employee
    let employeeId = dto.employeeId;
    if (!employeeId) {
      const selfEmployee = await this.employeeRepo.findByUserId(context.tenantId, context.user.id);
      if (!selfEmployee) {
        throw new NotFoundError('No employee profile is linked to your user account');
      }
      employeeId = selfEmployee.id;
    }

    const employee = await this.employeeRepo.findById(context.tenantId, employeeId);
    if (!employee) {
      throw new NotFoundError(`Employee '${employeeId}' not found in tenant`);
    }

    // 2. Employment lifecycle check
    if (['TERMINATED', 'RETIRED'].includes(employee.employmentStatus)) {
      throw new ConflictError(`Cannot record punch for ${employee.employmentStatus.toLowerCase()} employee`);
    }

    const punchDate = new Date(dto.punchTime);
    if (employee.exitDate && punchDate > new Date(employee.exitDate)) {
      throw new ConflictError('Cannot record punch after employee exit date');
    }

    // 3. Idempotent punch check
    const existingPunch = await this.attendanceRepo.findPunch(
      context.tenantId,
      employeeId,
      punchDate,
      dto.punchType
    );

    let punch = existingPunch;
    if (!punch) {
      try {
        punch = await this.attendanceRepo.createPunch({
          tenantId: context.tenantId,
          employeeId,
          punchTime: punchDate,
          punchType: dto.punchType,
          source: dto.source ?? 'ONLINE',
          gpsLatitude: dto.gpsLatitude,
          gpsLongitude: dto.gpsLongitude,
          accuracyMeters: dto.accuracyMeters,
          deviceId: dto.deviceId,
        });
      } catch (err: any) {
        if (err.code === 'P2002') {
          punch = await this.attendanceRepo.findPunch(
            context.tenantId,
            employeeId,
            punchDate,
            dto.punchType
          );
        } else {
          throw err;
        }
      }
    }

    // 4. Synthesize daily AttendanceRecord
    // Determine calendar date (00:00:00 UTC for attendanceDate)
    const calDateStr = punchDate.toISOString().split('T')[0];
    const attendanceDate = new Date(`${calDateStr}T00:00:00.000Z`);

    const dayStart = new Date(`${calDateStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${calDateStr}T23:59:59.999Z`);

    const dayPunches = await this.attendanceRepo.listPunchesForDay(
      context.tenantId,
      employeeId,
      dayStart,
      dayEnd
    );

    const inPunches = dayPunches.filter(p => p.punchType === 'IN');
    const outPunches = dayPunches.filter(p => p.punchType === 'OUT');

    const firstIn = inPunches.length > 0 ? inPunches[0].punchTime : null;
    const lastOut = outPunches.length > 0 ? outPunches[outPunches.length - 1].punchTime : null;

    let totalWorkMinutes = 0;
    let lateMinutes = 0;
    let earlyOutMinutes = 0;
    let overtimeMinutes = 0;
    let status = 'PRESENT';

    // Retrieve shift if provided
    let shift = null;
    if (dto.shiftId) {
      shift = await this.shiftRepo.findById(context.tenantId, dto.shiftId);
    }

    if (firstIn && lastOut && lastOut > firstIn) {
      totalWorkMinutes = Math.floor((lastOut.getTime() - firstIn.getTime()) / (1000 * 60));
    }

    if (shift) {
      if (totalWorkMinutes >= shift.fullDayThresholdMinutes) {
        status = 'PRESENT';
        overtimeMinutes = totalWorkMinutes - shift.fullDayThresholdMinutes;
      } else if (totalWorkMinutes >= shift.halfDayThresholdMinutes) {
        status = 'HALF_DAY';
      } else if (totalWorkMinutes > 0) {
        status = 'HALF_DAY';
      }
    }

    const record = await this.attendanceRepo.upsertRecord({
      tenantId: context.tenantId,
      employeeId,
      projectId: dto.projectId ?? undefined,
      shiftId: dto.shiftId ?? undefined,
      attendanceDate,
      checkInTime: firstIn,
      checkOutTime: lastOut,
      totalWorkMinutes,
      lateMinutes,
      earlyOutMinutes,
      overtimeMinutes,
      status,
      source: dto.source ?? 'ONLINE',
    });

    return { punch, record };
  }

  async createManualAttendance(context: PeopleRequestContext, dto: CreateManualAttendanceDto) {
    const employee = await this.employeeRepo.findById(context.tenantId, dto.employeeId);
    if (!employee) {
      throw new NotFoundError(`Employee '${dto.employeeId}' not found in tenant`);
    }

    const attendanceDate = new Date(`${dto.attendanceDate}T00:00:00.000Z`);
    const checkInTime = dto.checkInTime ? new Date(dto.checkInTime) : null;
    const checkOutTime = dto.checkOutTime ? new Date(dto.checkOutTime) : null;

    let totalWorkMinutes = dto.totalWorkMinutes;
    if (totalWorkMinutes === undefined) {
      if (checkInTime && checkOutTime && checkOutTime > checkInTime) {
        totalWorkMinutes = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60));
      } else {
        totalWorkMinutes = 0;
      }
    }

    const record = await this.attendanceRepo.upsertRecord({
      tenantId: context.tenantId,
      employeeId: dto.employeeId,
      projectId: dto.projectId ?? undefined,
      shiftId: dto.shiftId ?? undefined,
      attendanceDate,
      checkInTime,
      checkOutTime,
      totalWorkMinutes,
      lateMinutes: dto.lateMinutes ?? 0,
      earlyOutMinutes: dto.earlyOutMinutes ?? 0,
      overtimeMinutes: dto.overtimeMinutes ?? 0,
      status: dto.status ?? 'PRESENT',
      source: 'MANUAL',
      remarks: dto.remarks ?? undefined,
    });

    await this.auditRepo.log({
      tenantId: context.tenantId,
      entityType: 'ATTENDANCE_RECORD',
      entityId: record.id,
      action: 'MANUAL_ENTRY',
      actorId: context.user.id,
      newState: record,
      reason: dto.remarks,
      ipAddress: context.ipAddress,
    });

    return record;
  }

  async importAttendance(context: PeopleRequestContext, dto: ImportAttendanceDto) {
    const results = {
      total: dto.items.length,
      successCount: 0,
      failureCount: 0,
      errors: [] as Array<{ employeeNumber: string; date: string; error: string }>,
    };

    for (const item of dto.items) {
      try {
        const employee = await this.employeeRepo.findByEmployeeNumber(context.tenantId, item.employeeNumber);
        if (!employee) {
          results.failureCount++;
          results.errors.push({
            employeeNumber: item.employeeNumber,
            date: item.attendanceDate,
            error: `Employee '${item.employeeNumber}' not found`,
          });
          continue;
        }

        const attendanceDate = new Date(`${item.attendanceDate}T00:00:00.000Z`);
        const checkInTime = item.checkInTime ? new Date(item.checkInTime) : null;
        const checkOutTime = item.checkOutTime ? new Date(item.checkOutTime) : null;

        let totalWorkMinutes = item.totalWorkMinutes;
        if (totalWorkMinutes === undefined) {
          if (checkInTime && checkOutTime && checkOutTime > checkInTime) {
            totalWorkMinutes = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60));
          } else {
            totalWorkMinutes = 0;
          }
        }

        await this.attendanceRepo.upsertRecord({
          tenantId: context.tenantId,
          employeeId: employee.id,
          projectId: dto.projectId ?? undefined,
          shiftId: dto.shiftId ?? undefined,
          attendanceDate,
          checkInTime,
          checkOutTime,
          totalWorkMinutes,
          lateMinutes: 0,
          earlyOutMinutes: 0,
          overtimeMinutes: item.overtimeMinutes ?? 0,
          status: item.status ?? 'PRESENT',
          source: 'IMPORT',
          remarks: item.remarks ?? undefined,
        });

        results.successCount++;
      } catch (err: any) {
        results.failureCount++;
        results.errors.push({
          employeeNumber: item.employeeNumber,
          date: item.attendanceDate,
          error: err.message || 'Unknown processing error',
        });
      }
    }

    await this.auditRepo.log({
      tenantId: context.tenantId,
      entityType: 'ATTENDANCE_IMPORT',
      entityId: context.tenantId,
      action: 'BULK_IMPORT',
      actorId: context.user.id,
      newState: { success: results.successCount, failed: results.failureCount },
      ipAddress: context.ipAddress,
    });

    return results;
  }

  async biometricSync(context: PeopleRequestContext, dto: BiometricSyncBatchDto) {
    const results = {
      total: dto.items.length,
      syncedCount: 0,
      skippedDuplicates: 0,
      failureCount: 0,
      errors: [] as Array<{ employeeNumber: string; punchTime: string; error: string }>,
    };

    for (const item of dto.items) {
      try {
        const employee = await this.employeeRepo.findByEmployeeNumber(context.tenantId, item.employeeNumber);
        if (!employee) {
          results.failureCount++;
          results.errors.push({
            employeeNumber: item.employeeNumber,
            punchTime: item.punchTime,
            error: `Employee '${item.employeeNumber}' not found`,
          });
          continue;
        }

        const punchDate = new Date(item.punchTime);
        const existingPunch = await this.attendanceRepo.findPunch(
          context.tenantId,
          employee.id,
          punchDate,
          item.punchType
        );

        if (existingPunch) {
          results.skippedDuplicates++;
          continue;
        }

        await this.attendanceRepo.createPunch({
          tenantId: context.tenantId,
          employeeId: employee.id,
          punchTime: punchDate,
          punchType: item.punchType,
          source: 'BIOMETRIC',
          deviceId: item.deviceId,
        });

        // Re-synthesize daily record
        const calDateStr = punchDate.toISOString().split('T')[0];
        const attendanceDate = new Date(`${calDateStr}T00:00:00.000Z`);
        const dayStart = new Date(`${calDateStr}T00:00:00.000Z`);
        const dayEnd = new Date(`${calDateStr}T23:59:59.999Z`);

        const dayPunches = await this.attendanceRepo.listPunchesForDay(
          context.tenantId,
          employee.id,
          dayStart,
          dayEnd
        );

        const inPunches = dayPunches.filter(p => p.punchType === 'IN');
        const outPunches = dayPunches.filter(p => p.punchType === 'OUT');
        const firstIn = inPunches.length > 0 ? inPunches[0].punchTime : null;
        const lastOut = outPunches.length > 0 ? outPunches[outPunches.length - 1].punchTime : null;

        let totalWorkMinutes = 0;
        if (firstIn && lastOut && lastOut > firstIn) {
          totalWorkMinutes = Math.floor((lastOut.getTime() - firstIn.getTime()) / (1000 * 60));
        }

        await this.attendanceRepo.upsertRecord({
          tenantId: context.tenantId,
          employeeId: employee.id,
          attendanceDate,
          checkInTime: firstIn,
          checkOutTime: lastOut,
          totalWorkMinutes,
          lateMinutes: 0,
          earlyOutMinutes: 0,
          overtimeMinutes: 0,
          status: 'PRESENT',
          source: 'BIOMETRIC',
        });

        results.syncedCount++;
      } catch (err: any) {
        results.failureCount++;
        results.errors.push({
          employeeNumber: item.employeeNumber,
          punchTime: item.punchTime,
          error: err.message || 'Processing failure',
        });
      }
    }

    return results;
  }

  async listAttendance(context: PeopleRequestContext, query: ListAttendanceQueryDto) {
    return this.attendanceRepo.listRecords(context.tenantId, query);
  }
}
