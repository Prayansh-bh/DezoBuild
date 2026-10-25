import { PrismaClient } from '@prisma/client';
import { NotFoundError, ForbiddenError, ConflictError } from '../../../common/errors/index.js';
import { PeopleRequestContext } from '../constants/people.constants.js';
import { CreateRegularizationDto, RejectRegularizationDto } from '../dto/attendance.dto.js';
import { RegularizationRepository } from '../repositories/regularization.repository.js';
import { AttendanceRepository } from '../repositories/attendance.repository.js';
import { EmployeeRepository } from '../repositories/employee.repository.js';
import { PeopleAuditRepository } from '../repositories/people-audit.repository.js';
import { ActiveApprovalGuard } from '../../approvals/helpers/active-approval.guard.js';


export class RegularizationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly regularizationRepo: RegularizationRepository,
    private readonly attendanceRepo: AttendanceRepository,
    private readonly employeeRepo: EmployeeRepository,
    private readonly auditRepo: PeopleAuditRepository
  ) {}

  async requestRegularization(context: PeopleRequestContext, dto: CreateRegularizationDto) {
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

    const requestedDate = new Date(`${dto.requestedDate}T00:00:00.000Z`);
    const existingRecord = await this.attendanceRepo.findRecordByDate(
      context.tenantId,
      employeeId,
      requestedDate
    );

    const regularization = await this.regularizationRepo.create(
      context.tenantId,
      employeeId,
      context.user.id,
      existingRecord ? existingRecord.id : null,
      dto
    );

    await this.auditRepo.log({
      tenantId: context.tenantId,
      entityType: 'ATTENDANCE_REGULARIZATION',
      entityId: regularization.id,
      action: 'REQUESTED',
      actorId: context.user.id,
      newState: regularization,
      reason: dto.reason,
      ipAddress: context.ipAddress,
    });

    return regularization;
  }

  async approveRegularization(context: PeopleRequestContext, id: string) {
    const regularization = await this.regularizationRepo.findById(context.tenantId, id);
    if (!regularization) {
      throw new NotFoundError(`Regularization request '${id}' not found`);
    }

    await ActiveApprovalGuard.assertNoActiveCentralApproval(
      this.prisma,
      context.tenantId,
      'ATTENDANCE_REGULARIZATION',
      id
    );

    if (regularization.status !== 'SUBMITTED') {

      throw new ConflictError(`Cannot approve regularization request in status '${regularization.status}'`);
    }

    // Segregation of Duties: Creator cannot approve their own regularization
    if (regularization.requestedById === context.user.id) {
      throw new ForbiddenError('Segregation of Duties violation: Submitter cannot approve their own regularization request');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update regularization status with atomic conditional check
      const updatedRegularization = await this.regularizationRepo.updateStatus(
        context.tenantId,
        id,
        'APPROVED',
        context.user.id,
        undefined,
        'SUBMITTED',
        tx
      );

      // 2. Update daily attendance record
      const reqCheckIn = regularization.requestedCheckIn ? new Date(regularization.requestedCheckIn) : null;
      const reqCheckOut = regularization.requestedCheckOut ? new Date(regularization.requestedCheckOut) : null;
      let totalWorkMinutes = 0;
      if (reqCheckIn && reqCheckOut && reqCheckOut > reqCheckIn) {
        totalWorkMinutes = Math.floor((reqCheckOut.getTime() - reqCheckIn.getTime()) / (1000 * 60));
      }

      const updatedRecord = await this.attendanceRepo.upsertRecord(
        {
          tenantId: context.tenantId,
          employeeId: regularization.employeeId,
          attendanceDate: new Date(regularization.requestedDate),
          checkInTime: reqCheckIn,
          checkOutTime: reqCheckOut,
          totalWorkMinutes,
          lateMinutes: 0,
          earlyOutMinutes: 0,
          overtimeMinutes: 0,
          status: regularization.requestedStatus,
          source: 'REGULARIZED',
          isRegularized: true,
          regularizationId: id,
          remarks: `Regularized: ${regularization.reason}`,
        },
        tx
      );

      // 3. Audit Log
      await this.auditRepo.log(
        {
          tenantId: context.tenantId,
          entityType: 'ATTENDANCE_REGULARIZATION',
          entityId: id,
          action: 'APPROVED',
          actorId: context.user.id,
          previousState: { status: 'SUBMITTED' },
          newState: { status: 'APPROVED', attendanceRecordId: updatedRecord.id },
          ipAddress: context.ipAddress,
        },
        tx
      );

      return { regularization: updatedRegularization, record: updatedRecord };
    });
  }

  async rejectRegularization(context: PeopleRequestContext, id: string, dto: RejectRegularizationDto) {
    const regularization = await this.regularizationRepo.findById(context.tenantId, id);
    if (!regularization) {
      throw new NotFoundError(`Regularization request '${id}' not found`);
    }

    if (regularization.status !== 'SUBMITTED') {
      throw new ConflictError(`Cannot reject regularization request in status '${regularization.status}'`);
    }

    // Segregation of Duties: Creator cannot reject their own regularization
    if (regularization.requestedById === context.user.id) {
      throw new ForbiddenError('Segregation of Duties violation: Submitter cannot act as approver for their own request');
    }

    const updated = await this.regularizationRepo.updateStatus(
      context.tenantId,
      id,
      'REJECTED',
      context.user.id,
      dto.rejectionReason,
      'SUBMITTED'
    );

    await this.auditRepo.log({
      tenantId: context.tenantId,
      entityType: 'ATTENDANCE_REGULARIZATION',
      entityId: id,
      action: 'REJECTED',
      actorId: context.user.id,
      previousState: { status: 'SUBMITTED' },
      newState: { status: 'REJECTED' },
      reason: dto.rejectionReason,
      ipAddress: context.ipAddress,
    });

    return updated;
  }
}
