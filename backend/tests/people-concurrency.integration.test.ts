import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service.js';
import { AttendanceController } from '../src/modules/people/controllers/attendance.controller.js';
import { MustersController } from '../src/modules/people/controllers/musters.controller.js';
import { RegularizationsController } from '../src/modules/people/controllers/regularizations.controller.js';
import { AttendanceService } from '../src/modules/people/services/attendance.service.js';
import { MusterService } from '../src/modules/people/services/muster.service.js';
import { RegularizationService } from '../src/modules/people/services/regularization.service.js';
import { AttendanceRepository } from '../src/modules/people/repositories/attendance.repository.js';
import { EmployeeRepository } from '../src/modules/people/repositories/employee.repository.js';
import { ShiftRepository } from '../src/modules/people/repositories/shift.repository.js';
import { HolidayRepository } from '../src/modules/people/repositories/holiday.repository.js';
import { ContractorRepository } from '../src/modules/people/repositories/contractor.repository.js';
import { MusterRepository } from '../src/modules/people/repositories/muster.repository.js';
import { RegularizationRepository } from '../src/modules/people/repositories/regularization.repository.js';
import { PeopleAuditRepository } from '../src/modules/people/repositories/people-audit.repository.js';
import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';

describe('DEZOBUILD Phase 11 — Concurrency & Idempotency Suite', () => {
  let dbService: DatabaseService;
  let attendanceController: AttendanceController;
  let mustersController: MustersController;
  let regularizationsController: RegularizationsController;
  let tokenService: TokenService;
  let prisma: any;

  const tenantId = '99999999-aaaa-eeee-aaaa-999999999999';
  const hrUserId = '99999999-1111-eeee-aaaa-999999999999';
  const pmUserId = '99999999-2222-eeee-aaaa-999999999999';
  const empUserId = '99999999-3333-eeee-aaaa-999999999999';

  let tokenHr: string;
  let tokenPm: string;
  let tokenEmp: string;
  let employeeId: string;
  let companyId: string;
  let projectId: string;
  let contractorId: string;

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
    const contractorRepo = new ContractorRepository(prisma);
    const musterRepo = new MusterRepository(prisma);
    const regularizationRepo = new RegularizationRepository(prisma);

    const attendanceService = new AttendanceService(prisma, attendanceRepo, employeeRepo, shiftRepo, holidayRepo, auditRepo);
    attendanceController = new AttendanceController(attendanceService);

    const musterService = new MusterService(prisma, musterRepo, contractorRepo, auditRepo);
    mustersController = new MustersController(musterService);

    const regularizationService = new RegularizationService(prisma, regularizationRepo, attendanceRepo, employeeRepo, auditRepo);
    regularizationsController = new RegularizationsController(regularizationService);

    tokenService = TokenService.getInstance();

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Clean fixtures
    await prisma.peopleAuditLog.deleteMany({ where: { tenantId } });
    await prisma.attendanceRegularization.deleteMany({ where: { tenantId } });
    await prisma.attendanceRecord.deleteMany({ where: { tenantId } });
    await prisma.attendancePunch.deleteMany({ where: { tenantId } });
    await prisma.labourMusterRecord.deleteMany({ where: { tenantId } });
    await prisma.labourContractor.deleteMany({ where: { tenantId } });
    await prisma.projectMember.deleteMany({ where: { tenantId } });
    await prisma.project.deleteMany({ where: { tenantId } });
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
        name: 'Concurrency Operations Corp',
        code: 'CONC_CORP',
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
        code: 'CONC_HQ',
        name: 'Conc HQ',
        legalName: 'Concurrency Operations Ltd',
        gstin: '27AAAAA8888A1Z5',
        panNumber: 'AAAAA8888A',
        email: 'hq@conc.com',
        phone: '9999999991',
        address: '1100 Concurrency Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    });
    companyId = company.id;

    const project = await prisma.project.create({
      data: {
        tenantId,
        companyId,
        code: 'PRJ_CONC',
        name: 'Coastal Road Bridge',
        status: 'ACTIVE',
      },
    });
    projectId = project.id;

    const contractor = await prisma.labourContractor.create({
      data: {
        tenantId,
        code: 'CONT_CONC_01',
        name: 'Quality Shuttering Gang',
        trade: 'CARPENTRY',
      },
    });
    contractorId = contractor.id;

    await prisma.user.createMany({
      data: [
        { id: hrUserId, tenantId, email: 'hr@conc.com', fullName: 'HR Director', passwordHash: 'hash' },
        { id: pmUserId, tenantId, email: 'pm@conc.com', fullName: 'Project Manager', passwordHash: 'hash' },
        { id: empUserId, tenantId, email: 'emp@conc.com', fullName: 'Site Engineer', passwordHash: 'hash' },
      ],
    });

    const hrRole = await prisma.role.findFirstOrThrow({ where: { name: 'HR' } });
    const pmRole = await prisma.role.findFirstOrThrow({ where: { name: 'PROJECT_MANAGER' } });
    const empRole = await prisma.role.findFirstOrThrow({ where: { name: 'EMPLOYEE' } });

    await prisma.userRoleAssignment.createMany({
      data: [
        { tenantId, userId: hrUserId, roleId: hrRole.id },
        { tenantId, userId: pmUserId, roleId: pmRole.id },
        { tenantId, userId: empUserId, roleId: empRole.id },
      ],
    });

    await prisma.projectMember.createMany({
      data: [
        { tenantId, projectId, userId: pmUserId, projectRole: 'PROJECT_MANAGER' },
        { tenantId, projectId, userId: empUserId, projectRole: 'SITE_ENGINEER' },
      ],
    });

    const employee = await prisma.employee.create({
      data: {
        tenantId,
        userId: empUserId,
        employeeNumber: 'CONC-EMP-001',
        companyId,
        fullName: 'Site Engineer',
        designation: 'Engineer',
        employmentStatus: 'ACTIVE',
        joiningDate: new Date('2026-01-01'),
      },
    });
    employeeId = employee.id;

    tokenHr = tokenService.createAccessToken({ userId: hrUserId, tenantId, sessionId: 's-hr-c', sessionVersion: 1 });
    tokenPm = tokenService.createAccessToken({ userId: pmUserId, tenantId, sessionId: 's-pm-c', sessionVersion: 1 });
    tokenEmp = tokenService.createAccessToken({ userId: empUserId, tenantId, sessionId: 's-emp-c', sessionVersion: 1 });
  });

  after(async () => {
    await dbService.disconnect();
  });

  it('1. should safely handle 10 concurrent identical punches creating exactly 1 unique punch', async () => {
    const punchTime = '2026-09-11T09:00:00.000Z';
    const punchPromises = Array.from({ length: 10 }).map(() =>
      attendanceController.recordPunch(createAuthReq(tokenEmp, {
        body: {
          punchTime,
          punchType: 'IN',
          source: 'MOBILE',
        },
      }))
    );

    const results = await Promise.allSettled(punchPromises);
    const successful = results.filter(r => r.status === 'fulfilled');
    assert.ok(successful.length > 0);

    const punchesInDb = await prisma.attendancePunch.findMany({
      where: { tenantId, employeeId, punchTime: new Date(punchTime), punchType: 'IN' },
    });
    assert.strictEqual(punchesInDb.length, 1);
  });

  it('2. should race 5 concurrent identical muster creations allowing only 1 to succeed', async () => {
    const musterDate = '2026-09-11';
    const musterPromises = Array.from({ length: 5 }).map(() =>
      mustersController.createMuster(createAuthReq(tokenPm, {
        body: {
          projectId,
          contractorId,
          musterDate,
          skilledCount: 10,
          unskilledCount: 15,
        },
      }))
    );

    const results = await Promise.allSettled(musterPromises);
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    assert.strictEqual(fulfilled.length, 1);
    assert.strictEqual(rejected.length, 4);

    const countInDb = await prisma.labourMusterRecord.count({
      where: { tenantId, projectId, contractorId, musterDate: new Date(`${musterDate}T00:00:00.000Z`) },
    });
    assert.strictEqual(countInDb, 1);
  });

  it('3. should race concurrent approvals of the same regularization allowing only 1 to succeed', async () => {
    // 1. Create a regularization request
    const createRes = await regularizationsController.createRegularization(createAuthReq(tokenEmp, {
      body: {
        requestedDate: '2026-09-10',
        requestedCheckIn: '2026-09-10T09:00:00.000Z',
        requestedCheckOut: '2026-09-10T18:00:00.000Z',
        reason: 'Concurrent race test',
      },
    }));
    const regId = (createRes.data as any).id;

    // 2. Race 3 concurrent approvals
    const approvalPromises = [
      regularizationsController.approveRegularization(createAuthReq(tokenHr, { params: { id: regId } })),
      regularizationsController.approveRegularization(createAuthReq(tokenHr, { params: { id: regId } })),
      regularizationsController.approveRegularization(createAuthReq(tokenHr, { params: { id: regId } })),
    ];

    const results = await Promise.allSettled(approvalPromises);
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    assert.strictEqual(fulfilled.length, 1);
    assert.strictEqual(rejected.length, 2);

    const regInDb = await prisma.attendanceRegularization.findUnique({ where: { id: regId } });
    assert.strictEqual(regInDb.status, 'APPROVED');
  });

  it('4. should race concurrent biometric ingestion batches without punch duplication', async () => {
    const batch1 = [
      { employeeNumber: 'CONC-EMP-001', punchTime: '2026-09-12T09:00:00.000Z', punchType: 'IN' as const },
      { employeeNumber: 'CONC-EMP-001', punchTime: '2026-09-12T18:00:00.000Z', punchType: 'OUT' as const },
    ];
    const batch2 = [
      { employeeNumber: 'CONC-EMP-001', punchTime: '2026-09-12T09:00:00.000Z', punchType: 'IN' as const },
      { employeeNumber: 'CONC-EMP-001', punchTime: '2026-09-12T18:00:00.000Z', punchType: 'OUT' as const },
    ];

    const [res1, res2] = await Promise.all([
      attendanceController.biometricSync(createAuthReq(tokenHr, { body: { items: batch1 } })),
      attendanceController.biometricSync(createAuthReq(tokenHr, { body: { items: batch2 } })),
    ]);

    assert.strictEqual(res1.success, true);
    assert.strictEqual(res2.success, true);

    const totalPunches = await prisma.attendancePunch.count({
      where: {
        tenantId,
        employeeId,
        punchTime: {
          gte: new Date('2026-09-12T00:00:00.000Z'),
          lte: new Date('2026-09-12T23:59:59.999Z'),
        },
      },
    });
    assert.strictEqual(totalPunches, 2); // Exactly 1 IN and 1 OUT
  });
});
