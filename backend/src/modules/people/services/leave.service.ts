import { PrismaClient } from '@prisma/client';
import { NotFoundError, ConflictError } from '../../../common/errors/index.js';
import { PeopleRequestContext } from '../constants/people.constants.js';
import { CreateLeaveDto, ApproveLeaveDto, ListLeavesQueryDto } from '../dto/leave.dto.js';
import { LeaveRepository } from '../repositories/leave.repository.js';
import { EmployeeRepository } from '../repositories/employee.repository.js';
import { AttendanceRepository } from '../repositories/attendance.repository.js';
import { PeopleAuditRepository } from '../repositories/people-audit.repository.js';
import { ActiveApprovalGuard } from '../../approvals/helpers/active-approval.guard.js';


export class LeaveService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly leaveRepo: LeaveRepository,
    private readonly employeeRepo: EmployeeRepository,
    private readonly attendanceRepo: AttendanceRepository,
    private readonly auditRepo: PeopleAuditRepository
  ) {}

  async createLeave(context: PeopleRequestContext, dto: CreateLeaveDto) {
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

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    const overlap = await this.leaveRepo.findOverlappingLeave(context.tenantId, employeeId, start, end);
    if (overlap) {
      throw new ConflictError('An active leave request already overlaps with the requested date range');
    }

    const leave = await this.leaveRepo.create(context.tenantId, employeeId, dto);

    await this.auditRepo.log({
      tenantId: context.tenantId,
      entityType: 'LEAVE_RECORD',
      entityId: leave.id,
      action: 'REQUESTED',
      actorId: context.user.id,
      newState: leave,
      ipAddress: context.ipAddress,
    });

    return leave;
  }

  async getLeaveById(context: PeopleRequestContext, id: string) {
    const leave = await this.leaveRepo.findById(context.tenantId, id);
    if (!leave) {
      throw new NotFoundError(`Leave record '${id}' not found`);
    }
    return leave;
  }

  async approveLeave(context: PeopleRequestContext, id: string, dto?: ApproveLeaveDto) {
    const leave = await this.getLeaveById(context, id);

    await ActiveApprovalGuard.assertNoActiveCentralApproval(
      this.prisma,
      context.tenantId,
      'LEAVE_RECORD',
      id
    );

    if (leave.status === 'APPROVED') {

      return leave;
    }

    const approved = await this.leaveRepo.updateStatus(
      context.tenantId,
      id,
      'APPROVED',
      context.user.id
    );

    // Apply leave classification to attendance records across date range
    const cur = new Date(leave.startDate);
    const end = new Date(leave.endDate);

    while (cur <= end) {
      const attDate = new Date(`${cur.toISOString().split('T')[0]}T00:00:00.000Z`);
      await this.attendanceRepo.upsertRecord({
        tenantId: context.tenantId,
        employeeId: leave.employeeId,
        attendanceDate: attDate,
        totalWorkMinutes: 0,
        lateMinutes: 0,
        earlyOutMinutes: 0,
        overtimeMinutes: 0,
        status: 'ON_LEAVE',
        source: 'SYSTEM',
        remarks: `Approved Leave: ${leave.leaveType}`,
      });
      cur.setDate(cur.getDate() + 1);
    }

    await this.auditRepo.log({
      tenantId: context.tenantId,
      entityType: 'LEAVE_RECORD',
      entityId: id,
      action: 'APPROVED',
      actorId: context.user.id,
      previousState: { status: leave.status },
      newState: { status: 'APPROVED' },
      reason: dto?.remarks,
      ipAddress: context.ipAddress,
    });

    return approved;
  }

  async listLeaves(context: PeopleRequestContext, query: ListLeavesQueryDto) {
    return this.leaveRepo.list(context.tenantId, query);
  }
}
