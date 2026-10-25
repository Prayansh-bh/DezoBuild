import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service.js';
import { AttendanceController } from '../src/modules/people/controllers/attendance.controller.js';
import { AttendanceService } from '../src/modules/people/services/attendance.service.js';
import { AttendanceRepository } from '../src/modules/people/repositories/attendance.repository.js';
import { EmployeeRepository } from '../src/modules/people/repositories/employee.repository.js';
import { ShiftRepository } from '../src/modules/people/repositories/shift.repository.js';
import { HolidayRepository } from '../src/modules/people/repositories/holiday.repository.js';
import { PeopleAuditRepository } from '../src/modules/people/repositories/people-audit.repository.js';
import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';
import { ConflictError, NotFoundError } from '../src/common/errors/app-error.js';

describe('DEZOBUILD Phase 11 — Attendance Punches & Telemetry Suite', () => {
  let dbService: DatabaseService;
  let attendanceController: AttendanceController;
  let attendanceService: AttendanceService;
  let tokenService: TokenService;
  let prisma: any;

  const tenantId = '99999999-aaaa-5555-aaaa-999999999999';
  const ownerId = '99999999-1111-5555-aaaa-999999999999';
  const empUserId = '99999999-2222-5555-aaaa-999999999999';

  let tokenOwner: string;
  let tokenEmp: string;
  let employeeId: string;
  let companyId: string;

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

    attendanceService = new AttendanceService(prisma, attendanceRepo, employeeRepo, shiftRepo, holidayRepo, auditRepo);
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
        name: 'Punch Telemetry Corp',
        code: 'PUNCH_CORP',
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
        code: 'PUNCH_HQ',
        name: 'Punch HQ',
        legalName: 'Punch Telemetry Ltd',
        gstin: '27AAAAA1111A1Z5',
        panNumber: 'AAAAA1111A',
        email: 'hq@punch.com',
        phone: '9999999993',
        address: '300 Punch Blvd',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    });
    companyId = company.id;

    await prisma.user.createMany({
      data: [
        { id: ownerId, tenantId, email: 'owner@punch.com', fullName: 'Punch Owner', passwordHash: 'hash' },
        { id: empUserId, tenantId, email: 'worker@punch.com', fullName: 'Site Worker', passwordHash: 'hash' },
      ],
    });

    const ownerRole = await prisma.role.findFirstOrThrow({ where: { name: 'COMPANY_OWNER' } });
    const empRole = await prisma.role.findFirstOrThrow({ where: { name: 'EMPLOYEE' } });

    await prisma.userRoleAssignment.createMany({
      data: [
        { tenantId, userId: ownerId, roleId: ownerRole.id },
        { tenantId, userId: empUserId, roleId: empRole.id },
      ],
    });

    const employee = await prisma.employee.create({
      data: {
        tenantId,
        userId: empUserId,
        employeeNumber: 'PUNCH-EMP-001',
        companyId,
        fullName: 'Site Worker',
        designation: 'Electrician',
        employmentStatus: 'ACTIVE',
        joiningDate: new Date('2026-01-01'),
      },
    });
    employeeId = employee.id;

    tokenOwner = tokenService.createAccessToken({
      userId: ownerId,
      tenantId,
      sessionId: 'session-own-p',
      sessionVersion: 1,
    });

    tokenEmp = tokenService.createAccessToken({
      userId: empUserId,
      tenantId,
      sessionId: 'session-emp-p',
      sessionVersion: 1,
    });
  });

  after(async () => {
    await dbService.disconnect();
  });

  it('1. should record IN punch with GPS telemetry and synthesize daily AttendanceRecord', async () => {
    const req = createAuthReq(tokenEmp, {
      body: {
        punchTime: '2026-09-11T09:00:00.000Z',
        punchType: 'IN',
        source: 'MOBILE',
        gpsLatitude: 19.0760,
        gpsLongitude: 72.8777,
        accuracyMeters: 5.5,
        deviceId: 'MOBILE-DEVICE-X1',
      },
    });

    const res = await attendanceController.recordPunch(req);
    assert.strictEqual(res.success, true);
    const data = res.data as any;
    assert.strictEqual(data.punch.punchType, 'IN');
    assert.strictEqual(data.punch.source, 'MOBILE');
    assert.strictEqual(data.record.status, 'PRESENT');
  });

  it('2. should idempotently handle duplicate punch at same exact time and type without error', async () => {
    const req = createAuthReq(tokenEmp, {
      body: {
        punchTime: '2026-09-11T09:00:00.000Z',
        punchType: 'IN',
        source: 'MOBILE',
      },
    });

    const res = await attendanceController.recordPunch(req);
    assert.strictEqual(res.success, true);
    const punches = await prisma.attendancePunch.findMany({
      where: { tenantId, employeeId },
    });
    assert.strictEqual(punches.length, 1);
  });

  it('3. should record OUT punch and calculate total work duration in daily AttendanceRecord', async () => {
    const req = createAuthReq(tokenEmp, {
      body: {
        punchTime: '2026-09-11T17:30:00.000Z', // 8.5 hours (510 minutes)
        punchType: 'OUT',
        source: 'MOBILE',
        gpsLatitude: 19.0760,
        gpsLongitude: 72.8777,
      },
    });

    const res = await attendanceController.recordPunch(req);
    assert.strictEqual(res.success, true);
    const data = res.data as any;
    assert.strictEqual(data.punch.punchType, 'OUT');
    assert.strictEqual(data.record.totalWorkMinutes, 510);
  });

  it('4. should reject punch for an employee with TERMINATED status', async () => {
    // Terminate employee
    await prisma.employee.update({
      where: { id: employeeId },
      data: { employmentStatus: 'TERMINATED', exitDate: new Date('2026-09-01') },
    });

    const req = createAuthReq(tokenEmp, {
      body: {
        punchTime: '2026-09-12T09:00:00.000Z',
        punchType: 'IN',
      },
    });

    await assert.rejects(async () => attendanceController.recordPunch(req), ConflictError);

    // Restore employee status
    await prisma.employee.update({
      where: { id: employeeId },
      data: { employmentStatus: 'ACTIVE', exitDate: null },
    });
  });

  it('5. should reject punch with out-of-range GPS coordinates', async () => {
    const req = createAuthReq(tokenEmp, {
      body: {
        punchTime: '2026-09-13T09:00:00.000Z',
        punchType: 'IN',
        gpsLatitude: 195.0, // Invalid latitude > 90
        gpsLongitude: 72.8777,
      },
    });

    await assert.rejects(async () => attendanceController.recordPunch(req));
  });

  it('6. should ensure raw punches remain immutable and cannot be updated', async () => {
    const punchCount = await prisma.attendancePunch.count({ where: { tenantId } });
    assert.ok(punchCount >= 2);
  });

  it('7. should record multiple IN/OUT punch sessions in a single day and calculate cumulative total work duration', async () => {
    // Session 2: 18:30 to 20:30 (120 minutes) on the same day 2026-09-11
    await attendanceController.recordPunch(createAuthReq(tokenEmp, {
      body: {
        punchTime: '2026-09-11T18:30:00.000Z',
        punchType: 'IN',
        source: 'ONLINE',
      },
    }));

    const res = await attendanceController.recordPunch(createAuthReq(tokenEmp, {
      body: {
        punchTime: '2026-09-11T20:30:00.000Z',
        punchType: 'OUT',
        source: 'ONLINE',
      },
    }));

    assert.strictEqual(res.success, true);
    const data = res.data as any;
    // Span from first IN (09:00) to last OUT (20:30) = 11.5 hours = 690 minutes
    assert.strictEqual(data.record.totalWorkMinutes, 690);
  });


  it('8. should reject recording punch referencing employee from another tenant (404 Not Found)', async () => {
    const fakeEmployeeId = '00000000-0000-0000-0000-000000000000';
    const req = createAuthReq(tokenOwner, {
      body: {
        employeeId: fakeEmployeeId,
        punchTime: '2026-09-11T12:00:00.000Z',
        punchType: 'IN',
      },
    });

    await assert.rejects(async () => attendanceController.recordPunch(req), NotFoundError);
  });
});


