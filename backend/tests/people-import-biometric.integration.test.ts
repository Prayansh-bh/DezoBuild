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
import { ForbiddenError } from '../src/common/errors/app-error.js';

describe('DEZOBUILD Phase 11 — Bulk Import & Biometric Turnstile Sync Suite', () => {
  let dbService: DatabaseService;
  let attendanceController: AttendanceController;
  let attendanceService: AttendanceService;
  let tokenService: TokenService;
  let prisma: any;

  // Tenant A: ENTERPRISE (has hardware:biometric)
  const tenantAId = '99999999-aaaa-aaaa-aaaa-999999999999';
  const hrAUserId = '99999999-1111-aaaa-aaaa-999999999999';

  // Tenant B: STARTER (missing hardware:biometric)
  const tenantBId = '99999999-bbbb-aaaa-bbbb-999999999999';
  const hrBUserId = '99999999-1111-aaaa-bbbb-999999999999';

  let tokenHrA: string;
  let tokenHrB: string;
  let companyAId: string;
  let companyBId: string;

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
    await prisma.peopleAuditLog.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.attendanceRecord.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.attendancePunch.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.employee.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });

    // Setup Tenant A (ENTERPRISE)
    await prisma.tenant.create({
      data: {
        id: tenantAId,
        name: 'Enterprise Sync Corp',
        code: 'SYNC_CORP_A',
        status: 'ACTIVE',
      },
    });

    const entPlan = await prisma.platformPlan.findFirstOrThrow({ where: { code: 'ENTERPRISE' } });
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantAId,
        planId: entPlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const companyA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        code: 'SYNC_HQ_A',
        name: 'Sync HQ A',
        legalName: 'Enterprise Sync Ltd',
        gstin: '27AAAAA6666A1Z5',
        panNumber: 'AAAAA6666A',
        email: 'hq@sync.com',
        phone: '9999999998',
        address: '800 Sync Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    });
    companyAId = companyA.id;

    await prisma.user.create({
      data: {
        id: hrAUserId,
        tenantId: tenantAId,
        email: 'hra@sync.com',
        fullName: 'HR Manager A',
        passwordHash: 'hash',
      },
    });

    const hrRole = await prisma.role.findFirstOrThrow({ where: { name: 'HR' } });
    await prisma.userRoleAssignment.create({
      data: { tenantId: tenantAId, userId: hrAUserId, roleId: hrRole.id },
    });

    // Create 3 employees in Tenant A
    await prisma.employee.createMany({
      data: [
        {
          tenantId: tenantAId,
          employeeNumber: 'BIO-001',
          fullName: 'Aarav Patel',
          designation: 'Fitter',
          companyId: companyAId,
          joiningDate: new Date('2026-01-01'),
        },
        {
          tenantId: tenantAId,
          employeeNumber: 'BIO-002',
          fullName: 'Vikram Joshi',
          designation: 'Welder',
          companyId: companyAId,
          joiningDate: new Date('2026-01-01'),
        },
      ],
    });

    tokenHrA = tokenService.createAccessToken({
      userId: hrAUserId,
      tenantId: tenantAId,
      sessionId: 'session-hra-sync',
      sessionVersion: 1,
    });

    // Setup Tenant B (STARTER)
    await prisma.tenant.create({
      data: {
        id: tenantBId,
        name: 'Starter Sync Corp',
        code: 'SYNC_CORP_B',
        status: 'ACTIVE',
      },
    });

    const strPlan = await prisma.platformPlan.findFirstOrThrow({ where: { code: 'STARTER' } });
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantBId,
        planId: strPlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const companyB = await prisma.company.create({
      data: {
        tenantId: tenantBId,
        code: 'SYNC_HQ_B',
        name: 'Sync HQ B',
        legalName: 'Starter Sync Ltd',
        gstin: '27BBBBB6666B1Z5',
        panNumber: 'BBBBB6666B',
        email: 'hq@startersync.com',
        phone: '9999999999',
        address: '900 Starter Road',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
      },
    });
    companyBId = companyB.id;

    await prisma.user.create({
      data: {
        id: hrBUserId,
        tenantId: tenantBId,
        email: 'hrb@startersync.com',
        fullName: 'HR Manager B',
        passwordHash: 'hash',
      },
    });

    await prisma.userRoleAssignment.create({
      data: { tenantId: tenantBId, userId: hrBUserId, roleId: hrRole.id },
    });

    tokenHrB = tokenService.createAccessToken({
      userId: hrBUserId,
      tenantId: tenantBId,
      sessionId: 'session-hrb-sync',
      sessionVersion: 1,
    });
  });

  after(async () => {
    await dbService.disconnect();
  });

  it('1. should process bulk attendance import with partial errors for non-existent employees', async () => {
    const req = createAuthReq(tokenHrA, {
      body: {
        items: [
          {
            employeeNumber: 'BIO-001',
            attendanceDate: '2026-09-10',
            checkInTime: '2026-09-10T09:00:00.000Z',
            checkOutTime: '2026-09-10T18:00:00.000Z',
            status: 'PRESENT',
          },
          {
            employeeNumber: 'BIO-999-DOES-NOT-EXIST',
            attendanceDate: '2026-09-10',
            checkInTime: '2026-09-10T09:00:00.000Z',
            checkOutTime: '2026-09-10T18:00:00.000Z',
            status: 'PRESENT',
          },
        ],
      },
    });

    const res = await attendanceController.importAttendance(req);
    assert.strictEqual(res.success, true);
    const results = res.data as any;
    assert.strictEqual(results.total, 2);
    assert.strictEqual(results.successCount, 1);
    assert.strictEqual(results.failureCount, 1);
    assert.strictEqual(results.errors.length, 1);
    assert.strictEqual(results.errors[0].employeeNumber, 'BIO-999-DOES-NOT-EXIST');
  });

  it('2. should ingest biometric turnstile sync batch for Enterprise tenant with hardware:biometric feature', async () => {
    const req = createAuthReq(tokenHrA, {
      body: {
        items: [
          {
            employeeNumber: 'BIO-001',
            punchTime: '2026-09-11T08:55:00.000Z',
            punchType: 'IN',
            deviceId: 'ZKTECO-TURNSTILE-GATE-1',
          },
          {
            employeeNumber: 'BIO-002',
            punchTime: '2026-09-11T09:02:00.000Z',
            punchType: 'IN',
            deviceId: 'ZKTECO-TURNSTILE-GATE-2',
          },
        ],
      },
    });

    const res = await attendanceController.biometricSync(req);
    assert.strictEqual(res.success, true);
    const data = res.data as any;
    assert.strictEqual(data.syncedCount, 2);
    assert.strictEqual(data.skippedDuplicates, 0);

    const punches = await prisma.attendancePunch.findMany({
      where: { tenantId: tenantAId, source: 'BIOMETRIC' },
    });
    assert.strictEqual(punches.length, 2);
  });

  it('3. should skip duplicate biometric punches on re-ingestion idempotently', async () => {
    const req = createAuthReq(tokenHrA, {
      body: {
        items: [
          {
            employeeNumber: 'BIO-001',
            punchTime: '2026-09-11T08:55:00.000Z',
            punchType: 'IN',
            deviceId: 'ZKTECO-TURNSTILE-GATE-1',
          },
        ],
      },
    });

    const res = await attendanceController.biometricSync(req);
    assert.strictEqual(res.success, true);
    const data = res.data as any;
    assert.strictEqual(data.syncedCount, 0);
    assert.strictEqual(data.skippedDuplicates, 1);
  });

  it('4. should reject biometric-sync for Starter tier tenant lacking hardware:biometric entitlement (403 Forbidden)', async () => {
    const req = createAuthReq(tokenHrB, {
      body: {
        items: [
          {
            employeeNumber: 'BIO-B-001',
            punchTime: '2026-09-11T09:00:00.000Z',
            punchType: 'IN',
          },
        ],
      },
    });

    await assert.rejects(async () => attendanceController.biometricSync(req), ForbiddenError);
  });

  it('5. should reject biometric-sync with empty items array (Validation error)', async () => {
    const req = createAuthReq(tokenHrA, {
      body: {
        items: [],
      },
    });

    await assert.rejects(async () => attendanceController.biometricSync(req));
  });

  it('6. should reject bulk attendance import with empty items array (Validation error)', async () => {
    const req = createAuthReq(tokenHrA, {
      body: {
        items: [],
      },
    });

    await assert.rejects(async () => attendanceController.importAttendance(req));
  });
});

