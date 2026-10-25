import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service.js';
import { AttendanceController } from '../src/modules/people/controllers/attendance.controller.js';
import { ShiftsController } from '../src/modules/people/controllers/shifts.controller.js';
import { AttendanceService } from '../src/modules/people/services/attendance.service.js';
import { ShiftService } from '../src/modules/people/services/shift.service.js';
import { AttendanceRepository } from '../src/modules/people/repositories/attendance.repository.js';
import { ShiftRepository } from '../src/modules/people/repositories/shift.repository.js';
import { EmployeeRepository } from '../src/modules/people/repositories/employee.repository.js';
import { HolidayRepository } from '../src/modules/people/repositories/holiday.repository.js';
import { PeopleAuditRepository } from '../src/modules/people/repositories/people-audit.repository.js';
import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';
import { ConflictError, NotFoundError } from '../src/common/errors/app-error.js';

describe('DEZOBUILD Phase 11 — Daily Attendance Records & Shifts Suite', () => {
  let dbService: DatabaseService;
  let attendanceController: AttendanceController;
  let shiftsController: ShiftsController;
  let tokenService: TokenService;
  let prisma: any;

  const tenantId = '99999999-aaaa-6666-aaaa-999999999999';
  const hrUserId = '99999999-1111-6666-aaaa-999999999999';
  const empUserId = '99999999-2222-6666-aaaa-999999999999';

  let tokenHr: string;
  let tokenEmp: string;
  let employeeId: string;
  let companyId: string;
  let shiftGeneralId: string;
  let shiftNightId: string;

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
    const shiftRepo = new ShiftRepository(prisma);
    const holidayRepo = new HolidayRepository(prisma);
    const attendanceRepo = new AttendanceRepository(prisma);

    const shiftService = new ShiftService(prisma, shiftRepo, auditRepo);
    shiftsController = new ShiftsController(shiftService);

    const attendanceService = new AttendanceService(prisma, attendanceRepo, employeeRepo, shiftRepo, holidayRepo, auditRepo);
    attendanceController = new AttendanceController(attendanceService);
    tokenService = TokenService.getInstance();

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Clean fixtures
    await prisma.peopleAuditLog.deleteMany({ where: { tenantId } });
    await prisma.attendanceRecord.deleteMany({ where: { tenantId } });
    await prisma.attendancePunch.deleteMany({ where: { tenantId } });
    await prisma.shiftMaster.deleteMany({ where: { tenantId } });
    await prisma.employee.deleteMany({ where: { tenantId } });
    await prisma.company.deleteMany({ where: { tenantId } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });

    // Setup Tenant
    await prisma.tenant.create({
      data: {
        id: tenantId,
        name: 'Attendance Records Corp',
        code: 'ATT_REC_CORP',
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
        code: 'ATT_HQ',
        name: 'Attendance HQ',
        legalName: 'Attendance Records Ltd',
        gstin: '27AAAAA2222A1Z5',
        panNumber: 'AAAAA2222A',
        email: 'hq@att.com',
        phone: '9999999994',
        address: '400 Attendance Way',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
      },
    });
    companyId = company.id;

    await prisma.user.createMany({
      data: [
        { id: hrUserId, tenantId, email: 'hr@att.com', fullName: 'HR Specialist', passwordHash: 'hash' },
        { id: empUserId, tenantId, email: 'emp@att.com', fullName: 'General Worker', passwordHash: 'hash' },
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
        employeeNumber: 'ATT-EMP-001',
        companyId,
        fullName: 'General Worker',
        designation: 'Site Mason',
        employmentStatus: 'ACTIVE',
        joiningDate: new Date('2026-01-01'),
      },
    });
    employeeId = employee.id;

    tokenHr = tokenService.createAccessToken({
      userId: hrUserId,
      tenantId,
      sessionId: 'session-hr-att',
      sessionVersion: 1,
    });

    tokenEmp = tokenService.createAccessToken({
      userId: empUserId,
      tenantId,
      sessionId: 'session-emp-att',
      sessionVersion: 1,
    });
  });

  after(async () => {
    await dbService.disconnect();
  });

  it('1. should create daytime and night shift masters with validated thresholds', async () => {
    // General Daytime Shift (09:00 - 18:00)
    const req1 = createAuthReq(tokenHr, {
      body: {
        code: 'SHIFT_GEN',
        name: 'General Day Shift',
        startTime: '09:00',
        endTime: '18:00',
        gracePeriodMinutes: 15,
        halfDayThresholdMinutes: 240,
        fullDayThresholdMinutes: 480,
        isNightShift: false,
      },
    });
    const res1 = await shiftsController.createShift(req1);
    assert.strictEqual(res1.success, true);
    shiftGeneralId = (res1.data as any).id;

    // Night Shift (20:00 - 05:00)
    const req2 = createAuthReq(tokenHr, {
      body: {
        code: 'SHIFT_NIGHT',
        name: 'Tunnel Night Shift',
        startTime: '20:00',
        endTime: '05:00',
        gracePeriodMinutes: 10,
        halfDayThresholdMinutes: 240,
        fullDayThresholdMinutes: 480,
        isNightShift: true,
      },
    });
    const res2 = await shiftsController.createShift(req2);
    assert.strictEqual(res2.success, true);
    shiftNightId = (res2.data as any).id;
  });

  it('2. should reject duplicate shift code within tenant (409 Conflict)', async () => {
    const req = createAuthReq(tokenHr, {
      body: {
        code: 'SHIFT_GEN',
        name: 'Duplicate General Shift',
        startTime: '09:00',
        endTime: '18:00',
      },
    });

    await assert.rejects(async () => shiftsController.createShift(req), ConflictError);
  });

  it('3. should create manual attendance record with exact hours and audit logging', async () => {
    const req = createAuthReq(tokenHr, {
      body: {
        employeeId,
        attendanceDate: '2026-09-10',
        checkInTime: '2026-09-10T09:00:00.000Z',
        checkOutTime: '2026-09-10T17:00:00.000Z',
        totalWorkMinutes: 480,
        lateMinutes: 0,
        earlyOutMinutes: 0,
        overtimeMinutes: 0,
        status: 'PRESENT',
        remarks: 'Manual muster sign-off by site supervisor',
      },
    });

    const res = await attendanceController.createManualAttendance(req);
    assert.strictEqual(res.success, true);
    const rec = res.data as any;
    assert.strictEqual(rec.status, 'PRESENT');
    assert.strictEqual(rec.source, 'MANUAL');
    assert.strictEqual(rec.totalWorkMinutes, 480);

    const auditLogs = await prisma.peopleAuditLog.findMany({
      where: { tenantId, entityId: rec.id, action: 'MANUAL_ENTRY' },
    });
    assert.ok(auditLogs.length > 0);
  });

  it('4. should correctly classify HALF_DAY when working duration is below full-day threshold', async () => {
    // Record IN punch at 09:00, OUT punch at 13:30 (4.5 hours = 270 min; full day is 480 min, half day is 240 min)
    await attendanceController.recordPunch(createAuthReq(tokenEmp, {
      body: {
        punchTime: '2026-09-11T09:00:00.000Z',
        punchType: 'IN',
        shiftId: shiftGeneralId,
      },
    }));

    const res = await attendanceController.recordPunch(createAuthReq(tokenEmp, {
      body: {
        punchTime: '2026-09-11T13:30:00.000Z',
        punchType: 'OUT',
        shiftId: shiftGeneralId,
      },
    }));

    const rec = (res.data as any).record;
    assert.strictEqual(rec.totalWorkMinutes, 270);
    assert.strictEqual(rec.status, 'HALF_DAY');
  });

  it('5. should calculate overtimeMinutes when working duration exceeds full-day threshold', async () => {
    // Record IN punch at 08:00, OUT punch at 18:00 (10 hours = 600 min; full day is 480 min -> 120 overtime min)
    await attendanceController.recordPunch(createAuthReq(tokenEmp, {
      body: {
        punchTime: '2026-09-12T08:00:00.000Z',
        punchType: 'IN',
        shiftId: shiftGeneralId,
      },
    }));

    const res = await attendanceController.recordPunch(createAuthReq(tokenEmp, {
      body: {
        punchTime: '2026-09-12T18:00:00.000Z',
        punchType: 'OUT',
        shiftId: shiftGeneralId,
      },
    }));

    const rec = (res.data as any).record;
    assert.strictEqual(rec.totalWorkMinutes, 600);
    assert.strictEqual(rec.overtimeMinutes, 120);
    assert.strictEqual(rec.status, 'PRESENT');
  });

  it('6. should list attendance records with date range filtering', async () => {
    const req = createAuthReq(tokenHr, {
      query: {
        startDate: '2026-09-10',
        endDate: '2026-09-12',
      },
    });

    const res = await attendanceController.listAttendance(req);
    assert.strictEqual(res.success, true);
    const data = res.data as any;
    assert.ok(data.items.length >= 3);
  });

  it('7. should filter attendance records specifically by employeeId and status', async () => {
    const req = createAuthReq(tokenHr, {
      query: {
        employeeId,
        status: 'HALF_DAY',
      },
    });

    const res = await attendanceController.listAttendance(req);
    assert.strictEqual(res.success, true);
    const data = res.data as any;
    assert.strictEqual(data.items.length, 1);
    assert.strictEqual(data.items[0].status, 'HALF_DAY');
  });

  it('8. should override manual attendance record with updated hours via manual entry endpoint', async () => {
    const createReq = createAuthReq(tokenHr, {
      body: {
        employeeId,
        attendanceDate: '2026-09-15',
        status: 'PRESENT',
        totalWorkMinutes: 480,
      },
    });
    const createRes = await attendanceController.createManualAttendance(createReq);
    assert.strictEqual(createRes.success, true);

    const updateReq = createAuthReq(tokenHr, {
      body: {
        employeeId,
        attendanceDate: '2026-09-15',
        status: 'HALF_DAY',
        totalWorkMinutes: 240,
        remarks: 'Left early for doctor appointment',
      },
    });
    const updateRes = await attendanceController.createManualAttendance(updateReq);
    assert.strictEqual(updateRes.success, true);
    const updated = updateRes.data as any;
    assert.strictEqual(updated.status, 'HALF_DAY');
    assert.strictEqual(updated.totalWorkMinutes, 240);
  });
});


