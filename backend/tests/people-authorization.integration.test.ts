import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service.js';
import { EmployeesController } from '../src/modules/people/controllers/employees.controller.js';
import { AttendanceController } from '../src/modules/people/controllers/attendance.controller.js';
import { RegularizationsController } from '../src/modules/people/controllers/regularizations.controller.js';
import { EmployeeService } from '../src/modules/people/services/employee.service.js';
import { AttendanceService } from '../src/modules/people/services/attendance.service.js';
import { RegularizationService } from '../src/modules/people/services/regularization.service.js';
import { EmployeeRepository } from '../src/modules/people/repositories/employee.repository.js';
import { AttendanceRepository } from '../src/modules/people/repositories/attendance.repository.js';
import { ShiftRepository } from '../src/modules/people/repositories/shift.repository.js';
import { HolidayRepository } from '../src/modules/people/repositories/holiday.repository.js';
import { RegularizationRepository } from '../src/modules/people/repositories/regularization.repository.js';
import { PeopleAuditRepository } from '../src/modules/people/repositories/people-audit.repository.js';
import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';
import { ForbiddenError } from '../src/common/errors/app-error.js';

describe('DEZOBUILD Phase 11 — RBAC Matrix & Scoped Authorization Suite', () => {
  let dbService: DatabaseService;
  let employeesController: EmployeesController;
  let attendanceController: AttendanceController;
  let regularizationsController: RegularizationsController;
  let tokenService: TokenService;
  let prisma: any;

  const tenantId = '99999999-aaaa-cccc-aaaa-999999999999';
  const ownerId = '99999999-1111-cccc-aaaa-999999999999';
  const hrId = '99999999-2222-cccc-aaaa-999999999999';
  const acctId = '99999999-3333-cccc-aaaa-999999999999';
  const viewerId = '99999999-4444-cccc-aaaa-999999999999';
  const seId = '99999999-5555-cccc-aaaa-999999999999';

  let tokenOwner: string;
  let tokenHr: string;
  let tokenAcct: string;
  let tokenViewer: string;
  let tokenSe: string;

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
    const regularizationRepo = new RegularizationRepository(prisma);

    const employeeService = new EmployeeService(prisma, employeeRepo, auditRepo);
    employeesController = new EmployeesController(employeeService);

    const attendanceService = new AttendanceService(prisma, attendanceRepo, employeeRepo, shiftRepo, holidayRepo, auditRepo);
    attendanceController = new AttendanceController(attendanceService);

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
        name: 'RBAC Authorization Corp',
        code: 'AUTH_CORP',
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
        code: 'AUTH_HQ',
        name: 'Auth HQ',
        legalName: 'RBAC Authorization Ltd',
        gstin: '27AAAAA7777A1Z5',
        panNumber: 'AAAAA7777A',
        email: 'hq@auth.com',
        phone: '9999999990',
        address: '1000 RBAC Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    });
    companyId = company.id;

    await prisma.user.createMany({
      data: [
        { id: ownerId, tenantId, email: 'owner@auth.com', fullName: 'Company Owner', passwordHash: 'hash' },
        { id: hrId, tenantId, email: 'hr@auth.com', fullName: 'HR Director', passwordHash: 'hash' },
        { id: acctId, tenantId, email: 'accountant@auth.com', fullName: 'Lead Accountant', passwordHash: 'hash' },
        { id: viewerId, tenantId, email: 'viewer@auth.com', fullName: 'Auditor Viewer', passwordHash: 'hash' },
        { id: seId, tenantId, email: 'se@auth.com', fullName: 'Site Engineer', passwordHash: 'hash' },
      ],
    });

    const ownerRole = await prisma.role.findFirstOrThrow({ where: { name: 'COMPANY_OWNER' } });
    const hrRole = await prisma.role.findFirstOrThrow({ where: { name: 'HR' } });
    const acctRole = await prisma.role.findFirstOrThrow({ where: { name: 'ACCOUNTANT' } });
    const viewerRole = await prisma.role.findFirstOrThrow({ where: { name: 'VIEWER' } });
    const seRole = await prisma.role.findFirstOrThrow({ where: { name: 'SITE_ENGINEER' } });

    await prisma.userRoleAssignment.createMany({
      data: [
        { tenantId, userId: ownerId, roleId: ownerRole.id },
        { tenantId, userId: hrId, roleId: hrRole.id },
        { tenantId, userId: acctId, roleId: acctRole.id },
        { tenantId, userId: viewerId, roleId: viewerRole.id },
        { tenantId, userId: seId, roleId: seRole.id },
      ],
    });

    tokenOwner = tokenService.createAccessToken({ userId: ownerId, tenantId, sessionId: 's-own', sessionVersion: 1 });
    tokenHr = tokenService.createAccessToken({ userId: hrId, tenantId, sessionId: 's-hr', sessionVersion: 1 });
    tokenAcct = tokenService.createAccessToken({ userId: acctId, tenantId, sessionId: 's-acct', sessionVersion: 1 });
    tokenViewer = tokenService.createAccessToken({ userId: viewerId, tenantId, sessionId: 's-view', sessionVersion: 1 });
    tokenSe = tokenService.createAccessToken({ userId: seId, tenantId, sessionId: 's-se', sessionVersion: 1 });
  });

  after(async () => {
    await dbService.disconnect();
  });

  it('1. VIEWER can read employee directory but CANNOT create employee (403 Forbidden)', async () => {
    const listReq = createAuthReq(tokenViewer);
    const listRes = await employeesController.listEmployees(listReq);
    assert.strictEqual(listRes.success, true);

    const createReq = createAuthReq(tokenViewer, {
      body: {
        employeeNumber: 'AUTH-EMP-001',
        fullName: 'Unauthorized Worker',
        designation: 'Staff',
        companyId,
        joiningDate: '2026-01-01',
      },
    });
    await assert.rejects(async () => employeesController.createEmployee(createReq), ForbiddenError);
  });

  it('2. ACCOUNTANT has read-only people access and CANNOT onboard employees (403 Forbidden)', async () => {
    const createReq = createAuthReq(tokenAcct, {
      body: {
        employeeNumber: 'AUTH-EMP-002',
        fullName: 'Accountant Created Worker',
        designation: 'Staff',
        companyId,
        joiningDate: '2026-01-01',
      },
    });
    await assert.rejects(async () => employeesController.createEmployee(createReq), ForbiddenError);
  });

  it('3. SITE_ENGINEER CANNOT onboard company employees (403 Forbidden)', async () => {
    const createReq = createAuthReq(tokenSe, {
      body: {
        employeeNumber: 'AUTH-EMP-003',
        fullName: 'Site Created Worker',
        designation: 'Staff',
        companyId,
        joiningDate: '2026-01-01',
      },
    });
    await assert.rejects(async () => employeesController.createEmployee(createReq), ForbiddenError);
  });

  it('4. HR can onboard company employees with people:manage permission', async () => {
    const createReq = createAuthReq(tokenHr, {
      body: {
        employeeNumber: 'AUTH-EMP-004',
        fullName: 'Authorized Employee',
        designation: 'Structural Engineer',
        companyId,
        joiningDate: '2026-01-01',
      },
    });
    const res = await employeesController.createEmployee(createReq);
    assert.strictEqual(res.success, true);
    assert.strictEqual((res.data as any).employeeNumber, 'AUTH-EMP-004');
  });

  it('5. ACCOUNTANT CANNOT approve attendance regularizations (403 Forbidden)', async () => {
    const req = createAuthReq(tokenAcct, {
      params: { id: '00000000-0000-0000-0000-000000000000' },
    });
    await assert.rejects(async () => regularizationsController.approveRegularization(req), ForbiddenError);
  });

  it('6. VIEWER CANNOT approve attendance regularizations (403 Forbidden)', async () => {
    const req = createAuthReq(tokenViewer, {
      params: { id: '00000000-0000-0000-0000-000000000000' },
    });
    await assert.rejects(async () => regularizationsController.approveRegularization(req), ForbiddenError);
  });

  it('7. ACCOUNTANT CANNOT record raw attendance punches (403 Forbidden)', async () => {
    const req = createAuthReq(tokenAcct, {
      body: {
        punchTime: '2026-09-11T09:00:00.000Z',
        punchType: 'IN',
      },
    });
    await assert.rejects(async () => attendanceController.recordPunch(req), ForbiddenError);
  });
});

