import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service.js';
import { LeavesController } from '../src/modules/people/controllers/leaves.controller.js';
import { HolidaysController } from '../src/modules/people/controllers/holidays.controller.js';
import { LeaveService } from '../src/modules/people/services/leave.service.js';
import { HolidayService } from '../src/modules/people/services/holiday.service.js';
import { LeaveRepository } from '../src/modules/people/repositories/leave.repository.js';
import { HolidayRepository } from '../src/modules/people/repositories/holiday.repository.js';
import { EmployeeRepository } from '../src/modules/people/repositories/employee.repository.js';
import { AttendanceRepository } from '../src/modules/people/repositories/attendance.repository.js';
import { PeopleAuditRepository } from '../src/modules/people/repositories/people-audit.repository.js';
import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';
import { ConflictError, NotFoundError } from '../src/common/errors/app-error.js';

describe('DEZOBUILD Phase 11 — Leaves & Scoped Holiday Calendars Suite', () => {
  let dbService: DatabaseService;
  let leavesController: LeavesController;
  let holidaysController: HolidaysController;
  let tokenService: TokenService;
  let prisma: any;

  const tenantId = '99999999-aaaa-9999-aaaa-999999999999';
  const hrUserId = '99999999-1111-9999-aaaa-999999999999';
  const empUserId = '99999999-2222-9999-aaaa-999999999999';

  let tokenHr: string;
  let tokenEmp: string;
  let employeeId: string;
  let companyId: string;
  let branchId: string;
  let projectId: string;

  function createAuthReq(
    token: string,
    options?: { body?: unknown; params?: Record<string, string>; query?: Record<string, string> }
  ): IncomingMessage {
    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
      body: options?.body || {},
      params: options?.params || {},
      query: options?.query || {},
    } as unknown as IncomingMessage;
    return req;
  }

  before(async () => {
    dbService = DatabaseService.getInstance();
    await dbService.connect();
    prisma = dbService.getClient();

    const auditRepo = new PeopleAuditRepository(prisma);
    const employeeRepo = new EmployeeRepository(prisma);
    const leaveRepo = new LeaveRepository(prisma);
    const holidayRepo = new HolidayRepository(prisma);
    const attendanceRepo = new AttendanceRepository(prisma);

    const leaveService = new LeaveService(prisma, leaveRepo, employeeRepo, attendanceRepo, auditRepo);
    leavesController = new LeavesController(leaveService);

    const holidayService = new HolidayService(prisma, holidayRepo, auditRepo);
    holidaysController = new HolidaysController(holidayService);

    tokenService = TokenService.getInstance();

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Clean fixtures
    await prisma.peopleAuditLog.deleteMany({ where: { tenantId } });
    await prisma.leaveRecord.deleteMany({ where: { tenantId } });
    await prisma.holidayCalendar.deleteMany({ where: { tenantId } });
    await prisma.attendanceRecord.deleteMany({ where: { tenantId } });
    await prisma.projectMember.deleteMany({ where: { tenantId } });
    await prisma.project.deleteMany({ where: { tenantId } });
    await prisma.employee.deleteMany({ where: { tenantId } });
    await prisma.branch.deleteMany({ where: { tenantId } });
    await prisma.company.deleteMany({ where: { tenantId } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });

    // Setup Tenant
    await prisma.tenant.create({
      data: {
        id: tenantId,
        name: 'Leave Holiday Corp',
        code: 'LV_HOL_CORP',
        status: 'ACTIVE',
      },
    });

    const entPlan = await prisma.platformPlan.findFirstOrThrow({ where: { code: 'ENTERPRISE' } });
    await prisma.tenantSubscription.create({
      data: {
        tenantId,
        planId: entPlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const company = await prisma.company.create({
      data: {
        tenantId,
        code: 'LV_HQ',
        name: 'Leave HQ',
        legalName: 'Leave Systems Ltd',
        gstin: '27AAAAA5555A1Z5',
        panNumber: 'AAAAA5555A',
        email: 'hq@leave.com',
        phone: '9999999997',
        address: '700 Leave Way',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    });
    companyId = company.id;

    const branch = await prisma.branch.create({
      data: {
        tenantId,
        companyId,
        code: 'BR_PUNE',
        name: 'Pune Site Office',
        gstin: '27AAAAA5555A1Z5',
        city: 'Pune',
        state: 'Maharashtra',
      },
    });
    branchId = branch.id;

    const project = await prisma.project.create({
      data: {
        tenantId,
        companyId,
        code: 'PRJ_HIGHWAY',
        name: 'Pune Outer Ring Road Package 1',
        status: 'ACTIVE',
      },
    });
    projectId = project.id;

    await prisma.user.createMany({
      data: [
        { id: hrUserId, tenantId, email: 'hr@leave.com', fullName: 'HR Leader', passwordHash: 'hash' },
        { id: empUserId, tenantId, email: 'emp@leave.com', fullName: 'Civil Supervisor', passwordHash: 'hash' },
      ],
    });

    const hrRole = await prisma.role.findFirstOrThrow({ where: { name: 'HR' } });
    const empRole = await prisma.role.findFirstOrThrow({ where: { name: 'EMPLOYEE' } });

    await prisma.userRoleAssignment.createMany({
      data: [
        { tenantId, userId: hrUserId, roleId: hrRole.id },
        { tenantId, userId: empUserId, roleId: empRole.id },
      ],
    });

    const employee = await prisma.employee.create({
      data: {
        tenantId,
        userId: empUserId,
        employeeNumber: 'LV-EMP-001',
        companyId,
        branchId,
        fullName: 'Civil Supervisor',
        designation: 'Supervisor',
        employmentStatus: 'ACTIVE',
        joiningDate: new Date('2026-01-01'),
      },
    });
    employeeId = employee.id;

    tokenHr = tokenService.createAccessToken({
      userId: hrUserId,
      tenantId,
      sessionId: 'session-hr-lv',
      sessionVersion: 1,
    });

    tokenEmp = tokenService.createAccessToken({
      userId: empUserId,
      tenantId,
      sessionId: 'session-emp-lv',
      sessionVersion: 1,
    });
  });

  after(async () => {
    await dbService.disconnect();
  });

  let createdLeaveId: string;

  it('1. should submit a leave application for an employee', async () => {
    const req = createAuthReq(tokenEmp, {
      body: {
        leaveType: 'CASUAL',
        startDate: '2026-10-05',
        endDate: '2026-10-07',
        reason: 'Family wedding attendance in hometown',
      },
    });

    const res = await leavesController.createLeave(req);
    assert.strictEqual(res.success, true);
    const leave = res.data as any;
    assert.strictEqual(leave.leaveType, 'CASUAL');
    assert.strictEqual(leave.status, 'SUBMITTED');
    assert.strictEqual(Number(leave.totalDays), 3);
    createdLeaveId = leave.id;
  });

  it('2. should reject overlapping leave request for same employee (409 Conflict)', async () => {
    const req = createAuthReq(tokenEmp, {
      body: {
        leaveType: 'SICK',
        startDate: '2026-10-06',
        endDate: '2026-10-08',
        reason: 'Overlapping request',
      },
    });

    await assert.rejects(async () => leavesController.createLeave(req), ConflictError);
  });

  it('3. should approve leave by HR and automatically update AttendanceRecord status to ON_LEAVE across dates', async () => {
    const req = createAuthReq(tokenHr, {
      params: { id: createdLeaveId },
      body: { remarks: 'Approved casual leave' },
    });

    const res = await leavesController.approveLeave(req);
    assert.strictEqual(res.success, true);
    const leave = res.data as any;
    assert.strictEqual(leave.status, 'APPROVED');

    const attRecords = await prisma.attendanceRecord.findMany({
      where: {
        tenantId,
        employeeId,
        attendanceDate: {
          gte: new Date('2026-10-05T00:00:00.000Z'),
          lte: new Date('2026-10-07T00:00:00.000Z'),
        },
      },
    });
    assert.strictEqual(attRecords.length, 3);
    for (const r of attRecords) {
      assert.strictEqual(r.status, 'ON_LEAVE');
      assert.strictEqual(r.totalWorkMinutes, 0);
    }
  });

  it('4. should create tenant-global, branch-specific, and project-specific holidays in HolidayCalendar', async () => {
    // Tenant Global Holiday: Republic Day
    const reqGlobal = createAuthReq(tokenHr, {
      body: {
        holidayDate: '2026-01-26',
        name: 'Republic Day',
        isMandatory: true,
      },
    });
    const resGlobal = await holidaysController.createHoliday(reqGlobal);
    assert.strictEqual(resGlobal.success, true);
    assert.strictEqual((resGlobal.data as any).name, 'Republic Day');

    // Branch-Specific Holiday: Maharashtra Day
    const reqBranch = createAuthReq(tokenHr, {
      body: {
        holidayDate: '2026-05-01',
        name: 'Maharashtra Day',
        branchId,
        isMandatory: true,
      },
    });
    const resBranch = await holidaysController.createHoliday(reqBranch);
    assert.strictEqual(resBranch.success, true);
    assert.strictEqual((resBranch.data as any).branchId, branchId);

    // Project-Specific Holiday: Site Safety Day
    const reqProject = createAuthReq(tokenHr, {
      body: {
        holidayDate: '2026-03-04',
        name: 'National Safety Day Project Stand-down',
        projectId,
        isMandatory: false,
      },
    });
    const resProject = await holidaysController.createHoliday(reqProject);
    assert.strictEqual(resProject.success, true);
    assert.strictEqual((resProject.data as any).projectId, projectId);
  });

  it('5. should reject duplicate holiday for the exact same date and scope (409 Conflict)', async () => {
    const req = createAuthReq(tokenHr, {
      body: {
        holidayDate: '2026-01-26',
        name: 'Duplicate Republic Day',
      },
    });

    await assert.rejects(async () => holidaysController.createHoliday(req), ConflictError);
  });

  it('6. should idempotently handle re-approving an already approved leave request', async () => {
    const req = createAuthReq(tokenHr, {
      params: { id: createdLeaveId },
      body: { remarks: 'Second attempt idempotent verification' },
    });

    const res = await leavesController.approveLeave(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual((res.data as any).status, 'APPROVED');
  });

  it('7. should list leaves filtered by employeeId and status', async () => {
    const req = createAuthReq(tokenHr, {
      query: {
        employeeId,
        status: 'APPROVED',
      },
    });

    const res = await leavesController.listLeaves(req);
    assert.strictEqual(res.success, true);
    const data = res.data as any;
    assert.ok(data.items.length >= 1);
    assert.strictEqual(data.items[0].status, 'APPROVED');
  });

  it('8. should list holidays filtered by year', async () => {
    const req = createAuthReq(tokenHr, {
      query: { year: '2026' },
    });

    const res = await holidaysController.listHolidays(req);
    assert.strictEqual(res.success, true);
    const data = res.data as any;
    assert.ok(data.items.length >= 3);
  });
});


