import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service.js';
import { ContractorsController } from '../src/modules/people/controllers/contractors.controller.js';
import { MustersController } from '../src/modules/people/controllers/musters.controller.js';
import { ContractorService } from '../src/modules/people/services/contractor.service.js';
import { MusterService } from '../src/modules/people/services/muster.service.js';
import { ContractorRepository } from '../src/modules/people/repositories/contractor.repository.js';
import { MusterRepository } from '../src/modules/people/repositories/muster.repository.js';
import { PeopleAuditRepository } from '../src/modules/people/repositories/people-audit.repository.js';
import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../src/common/errors/app-error.js';

describe('DEZOBUILD Phase 11 — Labour Contractors & Daily Muster Suite', () => {
  let dbService: DatabaseService;
  let contractorsController: ContractorsController;
  let mustersController: MustersController;
  let tokenService: TokenService;
  let prisma: any;

  const tenantId = '99999999-aaaa-8888-aaaa-999999999999';
  const hrUserId = '99999999-0000-8888-aaaa-999999999999';
  const pmUserId = '99999999-1111-8888-aaaa-999999999999';
  const seUserId = '99999999-2222-8888-aaaa-999999999999';

  let tokenHr: string;
  let tokenPm: string;
  let tokenSe: string;
  let companyId: string;
  let projectId: string;
  let vendorId: string;
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
    const contractorRepo = new ContractorRepository(prisma);
    const musterRepo = new MusterRepository(prisma);

    const contractorService = new ContractorService(prisma, contractorRepo, auditRepo);
    contractorsController = new ContractorsController(contractorService);

    const musterService = new MusterService(prisma, musterRepo, contractorRepo, auditRepo);
    mustersController = new MustersController(musterService);

    tokenService = TokenService.getInstance();

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Clean fixtures
    await prisma.peopleAuditLog.deleteMany({ where: { tenantId } });
    await prisma.labourMusterRecord.deleteMany({ where: { tenantId } });
    await prisma.labourContractor.deleteMany({ where: { tenantId } });
    await prisma.projectMember.deleteMany({ where: { tenantId } });
    await prisma.project.deleteMany({ where: { tenantId } });
    await prisma.vendor.deleteMany({ where: { tenantId } });
    await prisma.company.deleteMany({ where: { tenantId } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });

    // Setup Tenant
    await prisma.tenant.create({
      data: {
        id: tenantId,
        name: 'Muster Operations Corp',
        code: 'MUSTER_CORP',
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
        code: 'MUSTER_HQ',
        name: 'Muster HQ',
        legalName: 'Muster Operations Ltd',
        gstin: '27AAAAA4444A1Z5',
        panNumber: 'AAAAA4444A',
        email: 'hq@muster.com',
        phone: '9999999996',
        address: '600 Site Road',
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
        code: 'PRJ_MUSTER',
        name: 'Metro Line 4 Pier Works',
        status: 'ACTIVE',
      },
    });
    projectId = project.id;

    const vendor = await prisma.vendor.create({
      data: {
        tenantId,
        code: 'VEND_LABOUR_01',
        name: 'Shree Ram Construction Workforce LLP',
      },
    });
    vendorId = vendor.id;

    await prisma.user.createMany({
      data: [
        { id: hrUserId, tenantId, email: 'hr@muster.com', fullName: 'HR Specialist Helen', passwordHash: 'hash' },
        { id: pmUserId, tenantId, email: 'pm@muster.com', fullName: 'Project Manager Peter', passwordHash: 'hash' },
        { id: seUserId, tenantId, email: 'se@muster.com', fullName: 'Site Engineer Sam', passwordHash: 'hash' },
      ],
    });

    const hrRole = await prisma.role.findFirstOrThrow({ where: { name: 'HR' } });
    const pmRole = await prisma.role.findFirstOrThrow({ where: { name: 'PROJECT_MANAGER' } });
    const seRole = await prisma.role.findFirstOrThrow({ where: { name: 'SITE_ENGINEER' } });

    await prisma.userRoleAssignment.createMany({
      data: [
        { tenantId, userId: hrUserId, roleId: hrRole.id },
        { tenantId, userId: pmUserId, roleId: pmRole.id },
        { tenantId, userId: seUserId, roleId: seRole.id },
      ],
    });

    await prisma.projectMember.createMany({
      data: [
        { tenantId, projectId, userId: pmUserId, projectRole: 'PROJECT_MANAGER' },
        { tenantId, projectId, userId: seUserId, projectRole: 'SITE_ENGINEER' },
      ],
    });

    tokenHr = tokenService.createAccessToken({
      userId: hrUserId,
      tenantId,
      sessionId: 'session-hr-mus',
      sessionVersion: 1,
    });

    tokenPm = tokenService.createAccessToken({
      userId: pmUserId,
      tenantId,
      sessionId: 'session-pm-mus',
      sessionVersion: 1,
    });

    tokenSe = tokenService.createAccessToken({
      userId: seUserId,
      tenantId,
      sessionId: 'session-se-mus',
      sessionVersion: 1,
    });
  });

  after(async () => {
    await dbService.disconnect();
  });

  let createdMusterId: string;

  it('1. should register a labour contractor linked optionally to a vendor', async () => {
    const req = createAuthReq(tokenHr, {
      body: {
        code: 'CONT_BARBEND',
        name: 'Shree Ram Bar Bending Gang',
        trade: 'BAR_BENDING',
        vendorId,
        contactPerson: 'Ramesh Mukadam',
        phone: '9820098200',
        defaultDailyWageRate: 850,
      },
    });

    const res = await contractorsController.createContractor(req);
    assert.strictEqual(res.success, true);
    const cont = res.data as any;
    assert.strictEqual(cont.code, 'CONT_BARBEND');
    assert.strictEqual(cont.trade, 'BAR_BENDING');
    contractorId = cont.id;
  });

  it('2. should reject duplicate contractor code within tenant (409 Conflict)', async () => {
    const req = createAuthReq(tokenHr, {
      body: {
        code: 'CONT_BARBEND',
        name: 'Duplicate Contractor',
        trade: 'BAR_BENDING',
      },
    });

    await assert.rejects(async () => contractorsController.createContractor(req), ConflictError);
  });

  it('3. should record daily labour muster with trade headcounts and calculate total headcount', async () => {
    const req = createAuthReq(tokenSe, {
      body: {
        projectId,
        contractorId,
        musterDate: '2026-09-11',
        skilledCount: 8,
        semiSkilledCount: 12,
        unskilledCount: 20,
        supervisorCount: 2,
        regularHours: 8,
        overtimeHours: 2,
        remarks: 'Pier 14 reinforcement cage fabrication',
        status: 'SUBMITTED',
      },
    });

    const res = await mustersController.createMuster(req);
    assert.strictEqual(res.success, true);
    const muster = res.data as any;
    assert.strictEqual(muster.totalHeadcount, 42); // 8 + 12 + 20 + 2
    assert.strictEqual(muster.status, 'SUBMITTED');
    assert.strictEqual(muster.recordedById, seUserId);
    createdMusterId = muster.id;
  });

  it('4. Segregation of Duties: Recorder CANNOT approve their own labour muster roll (Forbidden)', async () => {
    const req = createAuthReq(tokenSe, {
      params: { id: createdMusterId },
    });

    await assert.rejects(async () => mustersController.approveMuster(req), ForbiddenError);
  });

  it('5. should approve muster roll by Project Manager and record audit trail', async () => {
    const req = createAuthReq(tokenPm, {
      params: { id: createdMusterId },
      body: { remarks: 'Verified site headcount with safety gate log' },
    });

    const res = await mustersController.approveMuster(req);
    assert.strictEqual(res.success, true);
    const muster = res.data as any;
    assert.strictEqual(muster.status, 'APPROVED');
    assert.strictEqual(muster.approvedById, pmUserId);

    const auditLogs = await prisma.peopleAuditLog.findMany({
      where: { tenantId, entityId: createdMusterId, action: 'APPROVED' },
    });
    assert.ok(auditLogs.length > 0);
  });

  it('6. should reject duplicate muster record for same contractor, project, date and shift (409 Conflict)', async () => {
    const req = createAuthReq(tokenSe, {
      body: {
        projectId,
        contractorId,
        musterDate: '2026-09-11',
        skilledCount: 5,
        status: 'DRAFT',
      },
    });

    await assert.rejects(async () => mustersController.createMuster(req), ConflictError);
  });

  it('7. should list musters with project and date range filters', async () => {
    const req = createAuthReq(tokenPm, {
      query: {
        projectId,
        startDate: '2026-09-01',
        endDate: '2026-09-30',
      },
    });

    const res = await mustersController.listMusters(req);
    assert.strictEqual(res.success, true);
    const data = res.data as any;
    assert.ok(data.items.length >= 1);
  });

  it('8. should list contractors filtered by trade and search query', async () => {
    const req = createAuthReq(tokenHr, {
      query: {
        trade: 'BAR_BENDING',
        search: 'Bar Bending',
      },
    });

    const res = await contractorsController.listContractors(req);
    assert.strictEqual(res.success, true);
    const data = res.data as any;
    assert.ok(data.items.length >= 1);
    assert.strictEqual(data.items[0].trade, 'BAR_BENDING');
  });

  it('9. should reject muster submission with negative headcount counts', async () => {
    const req = createAuthReq(tokenSe, {
      body: {
        projectId,
        contractorId,
        musterDate: '2026-09-15',
        skilledCount: -5,
        status: 'DRAFT',
      },
    });

    await assert.rejects(async () => mustersController.createMuster(req));
  });
});


