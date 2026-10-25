import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service.js';
import { RegularizationsController } from '../src/modules/people/controllers/regularizations.controller.js';
import { RegularizationService } from '../src/modules/people/services/regularization.service.js';
import { RegularizationRepository } from '../src/modules/people/repositories/regularization.repository.js';
import { AttendanceRepository } from '../src/modules/people/repositories/attendance.repository.js';
import { EmployeeRepository } from '../src/modules/people/repositories/employee.repository.js';
import { PeopleAuditRepository } from '../src/modules/people/repositories/people-audit.repository.js';
import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../src/common/errors/app-error.js';

describe('DEZOBUILD Phase 11 — Attendance Regularization & SoD Suite', () => {
  let dbService: DatabaseService;
  let regularizationsController: RegularizationsController;
  let regularizationService: RegularizationService;
  let tokenService: TokenService;
  let prisma: any;

  const tenantId = '99999999-aaaa-7777-aaaa-999999999999';
  const hrUserId = '99999999-1111-7777-aaaa-999999999999';
  const empUserId = '99999999-2222-7777-aaaa-999999999999';

  let tokenHr: string;
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
    const attendanceRepo = new AttendanceRepository(prisma);
    const regularizationRepo = new RegularizationRepository(prisma);

    regularizationService = new RegularizationService(prisma, regularizationRepo, attendanceRepo, employeeRepo, auditRepo);
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
        name: 'Regularization Corp',
        code: 'REG_CORP',
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
        code: 'REG_HQ',
        name: 'Regularization HQ',
        legalName: 'Regularization Systems Ltd',
        gstin: '27AAAAA3333A1Z5',
        panNumber: 'AAAAA3333A',
        email: 'hq@reg.com',
        phone: '9999999995',
        address: '500 Compliance Blvd',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    });
    companyId = company.id;

    await prisma.user.createMany({
      data: [
        { id: hrUserId, tenantId, email: 'hr@reg.com', fullName: 'HR Approver', passwordHash: 'hash' },
        { id: empUserId, tenantId, email: 'emp@reg.com', fullName: 'Site Engineer Submitter', passwordHash: 'hash' },
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
        employeeNumber: 'REG-EMP-001',
        companyId,
        fullName: 'Site Engineer Submitter',
        designation: 'Site Engineer',
        employmentStatus: 'ACTIVE',
        joiningDate: new Date('2026-01-01'),
      },
    });
    employeeId = employee.id;

    tokenHr = tokenService.createAccessToken({
      userId: hrUserId,
      tenantId,
      sessionId: 'session-hr-reg',
      sessionVersion: 1,
    });

    tokenEmp = tokenService.createAccessToken({
      userId: empUserId,
      tenantId,
      sessionId: 'session-emp-reg',
      sessionVersion: 1,
    });
  });

  after(async () => {
    await dbService.disconnect();
  });

  let regularizationId: string;

  it('1. should allow employee to request attendance regularization for a missed punch', async () => {
    const req = createAuthReq(tokenEmp, {
      body: {
        requestedDate: '2026-09-08',
        requestedCheckIn: '2026-09-08T09:00:00.000Z',
        requestedCheckOut: '2026-09-08T18:00:00.000Z',
        requestedStatus: 'PRESENT',
        reason: 'Client site inspection visit in morning, missed turnstile punch',
      },
    });

    const res = await regularizationsController.createRegularization(req);
    assert.strictEqual(res.success, true);
    const data = res.data as any;
    assert.strictEqual(data.status, 'SUBMITTED');
    assert.strictEqual(data.employeeId, employeeId);
    regularizationId = data.id;
  });

  it('2. Segregation of Duties: Submitter CANNOT approve their own regularization request (Forbidden)', async () => {
    const req = createAuthReq(tokenEmp, {
      params: { id: regularizationId },
    });

    await assert.rejects(async () => regularizationsController.approveRegularization(req), ForbiddenError);
  });

  it('3. should approve regularization by HR and atomically update daily AttendanceRecord with isRegularized: true', async () => {
    const req = createAuthReq(tokenHr, {
      params: { id: regularizationId },
    });

    const res = await regularizationsController.approveRegularization(req);
    assert.strictEqual(res.success, true);
    const data = res.data as any;
    assert.strictEqual(data.regularization.status, 'APPROVED');
    assert.strictEqual(data.record.isRegularized, true);
    assert.strictEqual(data.record.source, 'REGULARIZED');
    assert.strictEqual(data.record.totalWorkMinutes, 540); // 9 hours
    assert.strictEqual(data.record.status, 'PRESENT');

    const auditLogs = await prisma.peopleAuditLog.findMany({
      where: { tenantId, entityId: regularizationId, action: 'APPROVED' },
    });
    assert.ok(auditLogs.length > 0);
  });

  it('4. should reject already approved regularization request on subsequent attempt (Conflict)', async () => {
    const req = createAuthReq(tokenHr, {
      params: { id: regularizationId },
    });

    await assert.rejects(async () => regularizationsController.approveRegularization(req), ConflictError);
  });

  it('5. should submit another request and verify rejection workflow with reason', async () => {
    const createReq = createAuthReq(tokenEmp, {
      body: {
        requestedDate: '2026-09-07',
        requestedCheckIn: '2026-09-07T10:00:00.000Z',
        requestedCheckOut: '2026-09-07T18:00:00.000Z',
        reason: 'Forgot badge at home',
      },
    });
    const createRes = await regularizationsController.createRegularization(createReq);
    const reg2Id = (createRes.data as any).id;

    const rejectReq = createAuthReq(tokenHr, {
      params: { id: reg2Id },
      body: { rejectionReason: 'Prior manager approval required for off-site days' },
    });
    const rejectRes = await regularizationsController.rejectRegularization(rejectReq);
    assert.strictEqual(rejectRes.success, true);
    const data = rejectRes.data as any;
    assert.strictEqual(data.status, 'REJECTED');
    assert.strictEqual(data.rejectionReason, 'Prior manager approval required for off-site days');
  });

  it('6. should ensure rejected regularization leaves daily attendance record unregularized', async () => {
    const record = await prisma.attendanceRecord.findFirst({
      where: { tenantId, employeeId, attendanceDate: new Date('2026-09-07T00:00:00.000Z') },
    });
    // Record was either not created or remains without regularization flags
    if (record) {
      assert.strictEqual(record.isRegularized, false);
    }
  });

  it('7. should maintain complete audit log history for all regularization lifecycle events', async () => {
    const logs = await prisma.peopleAuditLog.findMany({
      where: { tenantId, entityType: 'ATTENDANCE_REGULARIZATION' },
    });
    assert.ok(logs.length >= 3); // REQUESTED, APPROVED, REJECTED
    const actions = logs.map((l: any) => l.action);
    assert.ok(actions.includes('REQUESTED'));
    assert.ok(actions.includes('APPROVED'));
    assert.ok(actions.includes('REJECTED'));
  });
});


