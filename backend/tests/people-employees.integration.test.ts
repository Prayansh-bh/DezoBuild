import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service.js';
import { EmployeesController } from '../src/modules/people/controllers/employees.controller.js';
import { EmployeeService } from '../src/modules/people/services/employee.service.js';
import { EmployeeRepository } from '../src/modules/people/repositories/employee.repository.js';
import { PeopleAuditRepository } from '../src/modules/people/repositories/people-audit.repository.js';
import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../src/common/errors/app-error.js';

describe('DEZOBUILD Phase 11 — Employees & Employment Lifecycle Integration Suite', () => {
  let dbService: DatabaseService;
  let employeesController: EmployeesController;
  let employeeService: EmployeeService;
  let tokenService: TokenService;
  let prisma: any;

  const tenantAId = 'ee110001-aaaa-0001-aaaa-111111111111';
  const ownerAId = 'ee110001-1111-0001-aaaa-111111111111';
  const hrAId = 'ee110001-2222-0001-aaaa-111111111111';
  const empAId = 'ee110001-3333-0001-aaaa-111111111111';

  const tenantBId = 'ee110001-bbbb-0001-bbbb-111111111111';
  const ownerBId = 'ee110001-1111-0001-bbbb-111111111111';


  let tokenOwnerA: string;
  let tokenHrA: string;
  let tokenEmpA: string;
  let tokenOwnerB: string;

  let companyAId: string;
  let branchAId: string;
  let deptAId: string;
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
    employeeService = new EmployeeService(prisma, employeeRepo, auditRepo);
    employeesController = new EmployeesController(employeeService);
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
    await prisma.department.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.branch.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });

    // Setup Tenant A
    await prisma.tenant.create({
      data: {
        id: tenantAId,
        name: 'Apex Infrastructure Corp',
        code: 'APEX_PEOPLE_A',
        status: 'ACTIVE',
      },
    });

    const companyA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        code: 'APEX_HQ',
        name: 'Apex HQ',
        legalName: 'Apex Infrastructure Ltd',
        gstin: '27AAAAA0000A1Z5',
        panNumber: 'AAAAA0000A',
        email: 'hq@apex.com',
        phone: '9999999991',
        address: '100 Apex Tower',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    });
    companyAId = companyA.id;

    const branchA = await prisma.branch.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        code: 'BR_MUM',
        name: 'Mumbai Branch',
        gstin: '27AAAAA0000A1Z5',
        city: 'Mumbai',
        state: 'Maharashtra',
      },
    });
    branchAId = branchA.id;

    const deptA = await prisma.department.create({
      data: {
        tenantId: tenantAId,
        code: 'CIVIL_ENG',
        name: 'Civil Engineering',
      },
    });
    deptAId = deptA.id;

    await prisma.user.createMany({
      data: [
        {
          id: ownerAId,
          tenantId: tenantAId,
          email: 'owner@apex.com',
          fullName: 'Apex Owner',
          passwordHash: 'dummy',
        },
        {
          id: hrAId,
          tenantId: tenantAId,
          email: 'hr@apex.com',
          fullName: 'Apex HR Manager',
          passwordHash: 'dummy',
        },
        {
          id: empAId,
          tenantId: tenantAId,
          email: 'employee@apex.com',
          fullName: 'Apex Site Worker',
          passwordHash: 'dummy',
        },
      ],
    });

    const ownerRole = await prisma.role.findFirst({ where: { name: 'COMPANY_OWNER' } });
    const hrRole = await prisma.role.findFirst({ where: { name: 'HR' } });
    const empRole = await prisma.role.findFirst({ where: { name: 'EMPLOYEE' } });

    await prisma.userRoleAssignment.createMany({
      data: [
        { tenantId: tenantAId, userId: ownerAId, roleId: ownerRole!.id },
        { tenantId: tenantAId, userId: hrAId, roleId: hrRole!.id },
        { tenantId: tenantAId, userId: empAId, roleId: empRole!.id },
      ],
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

    tokenOwnerA = tokenService.createAccessToken({
      userId: ownerAId,
      tenantId: tenantAId,
      sessionId: 'session-own-a',
      sessionVersion: 1,
    });

    tokenHrA = tokenService.createAccessToken({
      userId: hrAId,
      tenantId: tenantAId,
      sessionId: 'session-hr-a',
      sessionVersion: 1,
    });

    tokenEmpA = tokenService.createAccessToken({
      userId: empAId,
      tenantId: tenantAId,
      sessionId: 'session-emp-a',
      sessionVersion: 1,
    });

    // Setup Tenant B
    await prisma.tenant.create({
      data: {
        id: tenantBId,
        name: 'Beta Builders Ltd',
        code: 'BETA_PEOPLE_B',
        status: 'ACTIVE',
      },
    });

    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantBId,
        planId: entPlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const companyB = await prisma.company.create({
      data: {
        tenantId: tenantBId,
        code: 'BETA_HQ',
        name: 'Beta HQ',
        legalName: 'Beta Builders Ltd',
        gstin: '27BBBBB0000B1Z5',
        panNumber: 'BBBBB0000B',
        email: 'hq@beta.com',
        phone: '9999999992',
        address: '200 Beta Road',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
      },
    });
    companyBId = companyB.id;

    await prisma.user.create({
      data: {
        id: ownerBId,
        tenantId: tenantBId,
        email: 'owner@beta.com',
        fullName: 'Beta Owner',
        passwordHash: 'dummy',
      },
    });

    await prisma.userRoleAssignment.create({
      data: { tenantId: tenantBId, userId: ownerBId, roleId: ownerRole!.id },
    });

    tokenOwnerB = tokenService.createAccessToken({
      userId: ownerBId,
      tenantId: tenantBId,
      sessionId: 'session-own-b',
      sessionVersion: 1,
    });
  });

  after(async () => {
    await dbService.disconnect();
  });

  let createdEmployeeId: string;

  it('1. should onboard a new employee with valid hierarchy, company, branch, and department', async () => {
    const req = createAuthReq(tokenHrA, {
      body: {
        employeeNumber: 'EMP-001',
        fullName: 'Rajesh Sharma',
        designation: 'Senior Project Engineer',
        companyId: companyAId,
        branchId: branchAId,
        departmentId: deptAId,
        userId: empAId,
        joiningDate: '2026-01-15',
        employmentType: 'FULL_TIME',
        email: 'rajesh.sharma@apex.com',
        phone: '9876543210',
        emergencyContactName: 'Sunita Sharma',
        emergencyContactPhone: '9876543211',
      },
    });

    const res = await employeesController.createEmployee(req);
    assert.strictEqual(res.success, true);
    const emp = res.data as any;
    assert.strictEqual(emp.employeeNumber, 'EMP-001');
    assert.strictEqual(emp.fullName, 'Rajesh Sharma');
    assert.strictEqual(emp.employmentStatus, 'ACTIVE');
    assert.strictEqual(emp.userId, empAId);
    createdEmployeeId = emp.id;
  });

  it('2. should reject duplicate employeeNumber within the same tenant (409 Conflict)', async () => {
    const req = createAuthReq(tokenHrA, {
      body: {
        employeeNumber: 'EMP-001',
        fullName: 'Duplicate Employee',
        designation: 'Engineer',
        companyId: companyAId,
        joiningDate: '2026-02-01',
      },
    });

    await assert.rejects(async () => employeesController.createEmployee(req), ConflictError);
  });

  it('3. should reject linking user already mapped to another employee (409 Conflict)', async () => {
    const req = createAuthReq(tokenHrA, {
      body: {
        employeeNumber: 'EMP-002',
        fullName: 'Another Employee',
        designation: 'Site Supervisor',
        companyId: companyAId,
        userId: empAId, // already used by EMP-001
        joiningDate: '2026-02-01',
      },
    });

    await assert.rejects(async () => employeesController.createEmployee(req), ConflictError);
  });

  it('4. should reject employee creation referencing company from another tenant (404 Not Found)', async () => {
    const req = createAuthReq(tokenHrA, {
      body: {
        employeeNumber: 'EMP-003',
        fullName: 'Cross Tenant Employee',
        designation: 'Engineer',
        companyId: companyBId, // belongs to Tenant B
        joiningDate: '2026-02-01',
      },
    });

    await assert.rejects(async () => employeesController.createEmployee(req), NotFoundError);
  });

  it('5. should allow employee without user account (Site Tradesman / Unauthenticated Worker)', async () => {
    const req = createAuthReq(tokenHrA, {
      body: {
        employeeNumber: 'EMP-004',
        fullName: 'Mukesh Kumar',
        designation: 'Master Mason',
        companyId: companyAId,
        joiningDate: '2026-02-01',
        employmentType: 'DAILY_WAGE',
      },
    });

    const res = await employeesController.createEmployee(req);
    assert.strictEqual(res.success, true);
    const emp = res.data as any;
    assert.strictEqual(emp.employeeNumber, 'EMP-004');
    assert.strictEqual(emp.userId, null);
  });

  it('6. should update employee details and preserve history in PeopleAuditLog', async () => {
    const req = createAuthReq(tokenHrA, {
      params: { id: createdEmployeeId },
      body: {
        fullName: 'Rajesh K. Sharma',
        designation: 'Lead Project Engineer',
      },
    });

    const res = await employeesController.updateEmployee(req);
    assert.strictEqual(res.success, true);
    const emp = res.data as any;
    assert.strictEqual(emp.fullName, 'Rajesh K. Sharma');
    assert.strictEqual(emp.designation, 'Lead Project Engineer');

    const auditLogs = await prisma.peopleAuditLog.findMany({
      where: { tenantId: tenantAId, entityId: createdEmployeeId, action: 'UPDATED' },
    });
    assert.ok(auditLogs.length > 0);
  });

  it('7. should transition employee lifecycle from ACTIVE to ON_LEAVE to RESIGNED to TERMINATED', async () => {
    // ACTIVE -> ON_LEAVE
    const req1 = createAuthReq(tokenHrA, {
      params: { id: createdEmployeeId },
      body: { status: 'ON_LEAVE', reason: 'Medical leave approved' },
    });
    const res1 = await employeesController.updateEmployeeStatus(req1);
    assert.strictEqual((res1.data as any).employmentStatus, 'ON_LEAVE');

    // ON_LEAVE -> RESIGNED
    const req2 = createAuthReq(tokenHrA, {
      params: { id: createdEmployeeId },
      body: { status: 'RESIGNED', exitDate: '2026-12-31', reason: 'Personal reasons' },
    });
    const res2 = await employeesController.updateEmployeeStatus(req2);
    assert.strictEqual((res2.data as any).employmentStatus, 'RESIGNED');

    // RESIGNED -> TERMINATED
    const req3 = createAuthReq(tokenHrA, {
      params: { id: createdEmployeeId },
      body: { status: 'TERMINATED', exitDate: '2026-12-31', reason: 'Notice period served' },
    });
    const res3 = await employeesController.updateEmployeeStatus(req3);
    assert.strictEqual((res3.data as any).employmentStatus, 'TERMINATED');

    // Reject further transition once TERMINATED
    const req4 = createAuthReq(tokenHrA, {
      params: { id: createdEmployeeId },
      body: { status: 'ACTIVE' },
    });
    await assert.rejects(async () => employeesController.updateEmployeeStatus(req4), ConflictError);
  });

  it('8. Multi-Tenant Isolation: Tenant B cannot read or update Tenant A employee (IDOR protected)', async () => {
    const readReq = createAuthReq(tokenOwnerB, {
      params: { id: createdEmployeeId },
    });
    await assert.rejects(async () => employeesController.getEmployee(readReq), NotFoundError);

    const updateReq = createAuthReq(tokenOwnerB, {
      params: { id: createdEmployeeId },
      body: { fullName: 'Hacked Name' },
    });
    await assert.rejects(async () => employeesController.updateEmployee(updateReq), NotFoundError);
  });

  it('9. should filter employee directory by department and branch', async () => {
    const req = createAuthReq(tokenHrA, {
      query: {
        departmentId: deptAId,
        branchId: branchAId,
      },
    });

    const res = await employeesController.listEmployees(req);
    assert.strictEqual(res.success, true);
    const data = res.data as any;
    assert.ok(data.items.length >= 1);
    assert.strictEqual(data.items[0].departmentId, deptAId);
  });

  it('10. should reject employee update making employee their own reporting manager', async () => {
    const req = createAuthReq(tokenHrA, {
      params: { id: createdEmployeeId },
      body: {
        reportingManagerId: createdEmployeeId, // self reference
      },
    });

    await assert.rejects(async () => employeesController.updateEmployee(req), ValidationError);
  });

  it('11. should search employees by full name or employee number', async () => {
    const req = createAuthReq(tokenHrA, {
      query: { search: 'Rajesh' },
    });

    const res = await employeesController.listEmployees(req);
    assert.strictEqual(res.success, true);
    const data = res.data as any;
    assert.ok(data.items.length >= 1);
    assert.ok(data.items.some((e: any) => e.fullName.includes('Rajesh')));
  });

  it('12. should reject employee status transition with exitDate prior to joiningDate (Validation error)', async () => {
    const req = createAuthReq(tokenHrA, {
      params: { id: createdEmployeeId },
      body: {
        status: 'RESIGNED',
        exitDate: '2020-01-01', // prior to joining date 2026-01-15
      },
    });

    await assert.rejects(async () => employeesController.updateEmployeeStatus(req));
  });
});
