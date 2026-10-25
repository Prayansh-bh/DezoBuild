import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service';
import { ProjectsController } from '../src/modules/projects/projects.controller';
import { ProjectsService } from '../src/modules/projects/services/projects.service';
import { TokenService } from '../src/modules/auth/services/token.service';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service';
import { EntitlementService } from '../src/modules/subscriptions/services/entitlement.service';
import { CapacityService } from '../src/modules/subscriptions/services/capacity.service';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  BadRequestError,
} from '../src/common/errors/app-error';

describe('DEZOBUILD Phase 06.1 — Project Core Integration Suite', () => {
  let dbService: DatabaseService;
  let projectsController: ProjectsController;
  let projectsService: ProjectsService;
  let tokenService: TokenService;
  let entitlementService: EntitlementService;
  let capacityService: CapacityService;

  // Tenant A (STARTER Plan)
  const tenantAId = '66666666-aaaa-4444-aaaa-666666666666';
  const ownerAId = '66666666-1111-4444-aaaa-666666666666';
  const pmAId = '66666666-2222-4444-aaaa-666666666666';
  const seAId = '66666666-3333-4444-aaaa-666666666666';
  const empAId = '66666666-4444-4444-aaaa-666666666666';

  let tokenOwnerA: string;
  let tokenPmA: string;
  let tokenSeA: string;
  let tokenEmpA: string;

  // Tenant B (PROFESSIONAL Plan)
  const tenantBId = '77777777-bbbb-4444-bbbb-777777777777';
  const ownerBId = '77777777-1111-4444-bbbb-777777777777';
  let tokenOwnerB: string;

  // Tenant C (ENTERPRISE Plan)
  const tenantCId = '88888888-cccc-4444-cccc-888888888888';
  const ownerCId = '88888888-1111-4444-cccc-888888888888';
  let tokenOwnerC: string;

  let companyAId: string;
  let companyBId: string;
  let companyCId: string;

  let starterPlanId: string;
  let proPlanId: string;
  let enterprisePlanId: string;

  let roleOwnerId: string;
  let roleAdminId: string;
  let rolePmId: string;
  let roleSeId: string;
  let roleEmpId: string;

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
    const prisma = dbService.getClient() as any;

    // Seed Roles & Plans
    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    tokenService = TokenService.getInstance();
    projectsService = ProjectsService.getInstance();
    projectsController = new ProjectsController(projectsService);
    entitlementService = new EntitlementService(prisma);
    capacityService = CapacityService.getInstance(prisma);

    // Fetch Plan IDs
    const starterPlan = await prisma.platformPlan.findUnique({ where: { code: 'STARTER' } });
    const proPlan = await prisma.platformPlan.findUnique({ where: { code: 'PROFESSIONAL' } });
    const enterprisePlan = await prisma.platformPlan.findUnique({ where: { code: 'ENTERPRISE' } });

    starterPlanId = starterPlan.id;
    proPlanId = proPlan.id;
    enterprisePlanId = enterprisePlan.id;

    // Fetch Role IDs
    const roles = await prisma.role.findMany({ where: { isSystemRole: true } });
    roleOwnerId = roles.find((r: any) => r.name === 'COMPANY_OWNER')!.id;
    roleAdminId = roles.find((r: any) => r.name === 'COMPANY_ADMIN')!.id;
    rolePmId = roles.find((r: any) => r.name === 'PROJECT_MANAGER')!.id;
    roleSeId = roles.find((r: any) => r.name === 'SITE_ENGINEER')!.id;
    roleEmpId = roles.find((r: any) => r.name === 'EMPLOYEE')!.id;

    // Clean up test tenants
    const tenantIds = [tenantAId, tenantBId, tenantCId];
    await prisma.projectMember.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.project.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.tenantEntitlementOverride.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });

    // 1. Create Tenant A (STARTER)
    await prisma.tenant.create({
      data: {
        id: tenantAId,
        code: 'TENANT-CORE-A',
        name: 'Tenant Alpha Core Builders Ltd',
        planTier: 'STARTER',
      },
    });
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantAId,
        planId: starterPlanId,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    const companyA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        code: 'CORP-ALPHA',
        name: 'Alpha Infra Corp',
        legalName: 'Alpha Infra Private Limited',
        panNumber: 'AAAAC1234A',
        gstin: '27AAAAC1234A1Z1',
        email: 'alpha@infra.com',
        phone: '+919876543210',
        address: 'Alpha Tower, Nariman Point',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400021',
      },
    });
    companyAId = companyA.id;

    // Users under Tenant A
    const usersA = [
      { id: ownerAId, email: 'owner@alpha.com', fullName: 'Alice Owner', roleId: roleOwnerId },
      { id: pmAId, email: 'pm@alpha.com', fullName: 'Peter PM', roleId: rolePmId },
      { id: seAId, email: 'se@alpha.com', fullName: 'Sam SiteEng', roleId: roleSeId },
      { id: empAId, email: 'emp@alpha.com', fullName: 'Emily Employee', roleId: roleEmpId },
    ];
    for (const u of usersA) {
      await prisma.user.create({
        data: {
          id: u.id,
          tenantId: tenantAId,
          email: u.email,
          fullName: u.fullName,
          passwordHash: 'argon2-hashed-pw',
        },
      });
      await prisma.userRoleAssignment.create({
        data: {
          tenantId: tenantAId,
          userId: u.id,
          roleId: u.roleId,
          scopeType: 'TENANT',
        },
      });
    }

    tokenOwnerA = tokenService.createAccessToken({
      userId: ownerAId,
      tenantId: tenantAId,
      sessionId: 'sess-owner-a',
      sessionVersion: 1,
    });
    tokenPmA = tokenService.createAccessToken({
      userId: pmAId,
      tenantId: tenantAId,
      sessionId: 'sess-pm-a',
      sessionVersion: 1,
    });
    tokenSeA = tokenService.createAccessToken({
      userId: seAId,
      tenantId: tenantAId,
      sessionId: 'sess-se-a',
      sessionVersion: 1,
    });
    tokenEmpA = tokenService.createAccessToken({
      userId: empAId,
      tenantId: tenantAId,
      sessionId: 'sess-emp-a',
      sessionVersion: 1,
    });

    // 2. Create Tenant B (PROFESSIONAL)
    await prisma.tenant.create({
      data: {
        id: tenantBId,
        code: 'TENANT-CORE-B',
        name: 'Tenant Beta Highrise Ltd',
        planTier: 'PROFESSIONAL',
      },
    });
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantBId,
        planId: proPlanId,
        status: 'ACTIVE',
        billingCycle: 'ANNUAL',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    const companyB = await prisma.company.create({
      data: {
        tenantId: tenantBId,
        code: 'CORP-BETA',
        name: 'Beta Highrise Corp',
        legalName: 'Beta Highrise Private Limited',
        panNumber: 'BBBBC1234B',
        gstin: '27BBBBC1234B1Z2',
        email: 'beta@highrise.com',
        phone: '+919876543211',
        address: 'Beta Hub, BKC',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400051',
      },
    });
    companyBId = companyB.id;

    await prisma.user.create({
      data: {
        id: ownerBId,
        tenantId: tenantBId,
        email: 'owner@beta.com',
        fullName: 'Bob Owner',
        passwordHash: 'argon2-hashed-pw',
      },
    });
    await prisma.userRoleAssignment.create({
      data: {
        tenantId: tenantBId,
        userId: ownerBId,
        roleId: roleOwnerId,
        scopeType: 'TENANT',
      },
    });
    tokenOwnerB = tokenService.createAccessToken({
      userId: ownerBId,
      tenantId: tenantBId,
      sessionId: 'sess-owner-b',
      sessionVersion: 1,
    });

    // 3. Create Tenant C (ENTERPRISE)
    await prisma.tenant.create({
      data: {
        id: tenantCId,
        code: 'TENANT-CORE-C',
        name: 'Tenant Gamma Conglomerate Ltd',
        planTier: 'ENTERPRISE',
      },
    });
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantCId,
        planId: enterprisePlanId,
        status: 'ACTIVE',
        billingCycle: 'ANNUAL',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    const companyC = await prisma.company.create({
      data: {
        tenantId: tenantCId,
        code: 'CORP-GAMMA',
        name: 'Gamma Mega Corp',
        legalName: 'Gamma Mega Construction Ltd',
        panNumber: 'CCCC1234C',
        gstin: '27CCCC1234C1Z3',
        email: 'gamma@mega.com',
        phone: '+919876543212',
        address: 'Gamma Tower',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
      },
    });
    companyCId = companyC.id;

    await prisma.user.create({
      data: {
        id: ownerCId,
        tenantId: tenantCId,
        email: 'owner@gamma.com',
        fullName: 'Charlie Owner',
        passwordHash: 'argon2-hashed-pw',
      },
    });
    await prisma.userRoleAssignment.create({
      data: {
        tenantId: tenantCId,
        userId: ownerCId,
        roleId: roleOwnerId,
        scopeType: 'TENANT',
      },
    });
    tokenOwnerC = tokenService.createAccessToken({
      userId: ownerCId,
      tenantId: tenantCId,
      sessionId: 'sess-owner-c',
      sessionVersion: 1,
    });
  });

  after(async () => {
    const prisma = dbService.getClient() as any;
    const tenantIds = [tenantAId, tenantBId, tenantCId];
    await prisma.projectMember.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.project.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.tenantEntitlementOverride.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
    await dbService.disconnect();
  });

  let project1Id: string;
  let project2Id: string;

  // 1. CREATE WITH VALID PERMISSION + ENTITLEMENT -> ALLOW
  it('1. should allow creating project in PLANNING status with valid permission and entitlement', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        companyId: companyAId,
        code: 'PRJ-ALPHA-01',
        name: 'Alpha Corporate HQ',
        description: 'Commercial high-rise construction project',
        projectType: 'Commercial Tech Park',
        location: 'BKC Plot C-12',
        city: 'Mumbai',
        state: 'Maharashtra',
        status: 'PLANNING',
        plannedStartDate: new Date('2026-10-01'),
        plannedEndDate: new Date('2028-10-01'),
        estimatedBudget: 50000000,
        contractValue: 55000000,
      },
    });

    const res = await projectsController.createProject(req);
    assert.equal(res.success, true);
    assert.equal(res.data.code, 'PRJ-ALPHA-01');
    assert.equal(res.data.status, 'PLANNING');
    assert.equal(res.data.tenantId, tenantAId);
    assert.equal(res.data.companyId, companyAId);
    project1Id = res.data.id;
  });

  // 2. MISSING projects:create -> DENY
  it('2. should DENY project creation for roles without projects:create permission (Site Engineer)', async () => {
    const req = createAuthReq(tokenSeA, {
      body: {
        companyId: companyAId,
        code: 'PRJ-SE-FAIL',
        name: 'Unauthorized Project',
      },
    });

    await assert.rejects(
      async () => projectsController.createProject(req),
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.match(err.message, /lacks required permission 'projects:create'/i);
        return true;
      }
    );
  });

  // 3. MISSING projects:core ENTITLEMENT -> DENY
  it('3. should DENY project creation if projects:core feature is unentitled or subscription missing', async () => {
    // Override projects:core to false for Tenant A
    const sub = await entitlementService.getEffectiveSubscription(tenantAId);
    await entitlementService.setOverride({
      tenantId: tenantAId,
      featureKey: 'projects:core',
      isEnabled: false,
    });

    const req = createAuthReq(tokenOwnerA, {
      body: {
        companyId: companyAId,
        code: 'PRJ-NO-CORE',
        name: 'No Core Project',
      },
    });

    await assert.rejects(
      async () => projectsController.createProject(req),
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.match(err.message, /does not entitle feature 'projects:core'/i);
        return true;
      }
    );

    // Restore entitlement override
    await entitlementService.setOverride({
      tenantId: tenantAId,
      featureKey: 'projects:core',
      isEnabled: true,
    });
  });

  // 4. UNKNOWN / MISSING TENANT -> DENY
  it('4. should DENY unauthenticated requests with 401 Unauthorized', async () => {
    const req = {
      headers: {},
      body: { companyId: companyAId, code: 'PRJ-UNAUTH', name: 'Unauth Project' },
    } as unknown as IncomingMessage;

    await assert.rejects(
      async () => projectsController.createProject(req),
      (err: any) => {
        assert.ok(err instanceof UnauthorizedError);
        return true;
      }
    );
  });

  // 5. CROSS-TENANT PROJECT CREATION ATTEMPT -> DENY
  it('5. should strictly reject creating a project under a foreign tenant company (404/400)', async () => {
    // Tenant A caller passes Tenant B's companyId
    const req = createAuthReq(tokenOwnerA, {
      body: {
        companyId: companyBId,
        code: 'PRJ-CROSS-FAIL',
        name: 'Cross Tenant Project',
      },
    });

    await assert.rejects(
      async () => projectsController.createProject(req),
      (err: any) => {
        assert.ok(err instanceof NotFoundError);
        assert.match(err.message, /Company not found in tenant/i);
        return true;
      }
    );
  });

  // 6. CROSS-TENANT PROJECT READ -> DENY (IDOR PROTECTED)
  it('6. should strictly DENY Tenant B owner from reading Tenant A project (IDOR 403/404)', async () => {
    const req = createAuthReq(tokenOwnerB, {
      params: { id: project1Id },
    });

    await assert.rejects(
      async () => projectsController.getProject(req),
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.match(err.message, /Project not found in tenant/i);
        return true;
      }
    );
  });

  // 7. CROSS-TENANT PROJECT UPDATE -> DENY (IDOR PROTECTED)
  it('7. should strictly DENY Tenant B owner from modifying Tenant A project', async () => {
    const req = createAuthReq(tokenOwnerB, {
      params: { id: project1Id },
      body: { name: 'Hacked Name' },
    });

    await assert.rejects(
      async () => projectsController.updateProject(req),
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.match(err.message, /Project not found in tenant/i);
        return true;
      }
    );
  });

  // 8. PROJECT-SCOPED USER SEES ASSIGNED PROJECT
  it('8. should return assigned project in list for project-scoped user (Site Engineer assigned)', async () => {
    // Assign Site Engineer to project1
    const prisma = dbService.getClient() as any;
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: project1Id, userId: seAId } },
      update: { projectRole: 'SITE_ENGINEER' },
      create: {
        tenantId: tenantAId,
        projectId: project1Id,
        userId: seAId,
        projectRole: 'SITE_ENGINEER',
      },
    });

    const req = createAuthReq(tokenSeA);
    const res = await projectsController.listProjects(req);
    assert.equal(res.success, true);
    assert.ok(res.data.some((p: any) => p.id === project1Id));
  });

  // 9. PROJECT-SCOPED USER CANNOT ACCESS UNASSIGNED PROJECT
  it('9. should DENY project-scoped user (Emily Employee) from accessing project where unassigned', async () => {
    const req = createAuthReq(tokenEmpA, {
      params: { id: project1Id },
    });

    await assert.rejects(
      async () => projectsController.getProject(req),
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.match(err.message, /not a member of this project/i);
        return true;
      }
    );
  });

  // 10. ORG-WIDE USER (Owner/Admin) CAN ACCESS ALL TENANT PROJECTS
  it('10. should allow COMPANY_OWNER to access all tenant projects without explicit membership row', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { id: project1Id },
    });

    const res = await projectsController.getProject(req);
    assert.equal(res.success, true);
    assert.equal(res.data.id, project1Id);
  });

  // 11. STARTER PROJECT CAPACITY ENFORCEMENT (MAX 2 ACTIVE PROJECTS)
  it('11. should enforce Starter tier active project capacity limit (max 2 active projects)', async () => {
    // Activate Project 1 (Active count = 1)
    const reqAct1 = createAuthReq(tokenOwnerA, {
      params: { id: project1Id },
      body: { status: 'ACTIVE' },
    });
    await projectsController.transitionStatus(reqAct1);

    // Create and Activate Project 2 (Active count = 2)
    const reqCreate2 = createAuthReq(tokenOwnerA, {
      body: {
        companyId: companyAId,
        code: 'PRJ-ALPHA-02',
        name: 'Alpha Residential Tower',
        status: 'ACTIVE',
      },
    });
    const res2 = await projectsController.createProject(reqCreate2);
    project2Id = res2.data.id;
    assert.equal(res2.data.status, 'ACTIVE');

    // Attempting to create Project 3 as ACTIVE must throw ConflictError (limit 2 reached)
    const reqCreate3 = createAuthReq(tokenOwnerA, {
      body: {
        companyId: companyAId,
        code: 'PRJ-ALPHA-03',
        name: 'Alpha Third Tower',
        status: 'ACTIVE',
      },
    });
    await assert.rejects(
      async () => projectsController.createProject(reqCreate3),
      (err: any) => {
        assert.ok(err instanceof ConflictError);
        assert.match(err.message, /capacity limit reached/i);
        return true;
      }
    );

    // But creating Project 3 in PLANNING status is allowed (does not consume active quota)
    const reqCreate3Planning = createAuthReq(tokenOwnerA, {
      body: {
        companyId: companyAId,
        code: 'PRJ-ALPHA-03',
        name: 'Alpha Third Tower (Planning)',
        status: 'PLANNING',
      },
    });
    const res3 = await projectsController.createProject(reqCreate3Planning);
    assert.equal(res3.data.status, 'PLANNING');

    // Trying to activate Project 3 must throw ConflictError
    const reqAct3 = createAuthReq(tokenOwnerA, {
      params: { id: res3.data.id },
      body: { status: 'ACTIVE' },
    });
    await assert.rejects(
      async () => projectsController.transitionStatus(reqAct3),
      (err: any) => {
        assert.ok(err instanceof ConflictError);
        assert.match(err.message, /capacity limit reached/i);
        return true;
      }
    );
  });

  // 12. PROFESSIONAL PROJECT CAPACITY (MAX 10 ACTIVE)
  it('12. should allow Professional tier to maintain up to 10 active projects', async () => {
    const proCap = await capacityService.checkProjectCapacity(tenantBId);
    assert.equal(proCap.max, 10);
    assert.equal(proCap.allowed, true);
  });

  // 13. ENTERPRISE UNLIMITED CAPACITY (maxProjects = null)
  it('13. should allow Enterprise tier unlimited active projects (maxProjects = null)', async () => {
    const entCap = await capacityService.checkProjectCapacity(tenantCId);
    assert.equal(entCap.max, null);
    assert.equal(entCap.allowed, true);
  });

  // 14. PROJECT REACTIVATION CAPACITY CHECK
  it('14. should enforce capacity check when reactivating a COMPLETED project to ACTIVE', async () => {
    // Complete Project 2 -> active count becomes 1
    const reqComp2 = createAuthReq(tokenOwnerA, {
      params: { id: project2Id },
      body: { status: 'COMPLETED' },
    });
    const compRes = await projectsController.transitionStatus(reqComp2);
    assert.equal(compRes.data.status, 'COMPLETED');

    // Create another active project -> active count becomes 2
    const reqCreate4 = createAuthReq(tokenOwnerA, {
      body: {
        companyId: companyAId,
        code: 'PRJ-ALPHA-04',
        name: 'Alpha Fourth Tower',
        status: 'ACTIVE',
      },
    });
    await projectsController.createProject(reqCreate4);

    // Now attempting to reopen/reactivate Project 2 must throw ConflictError (capacity full)
    const reqReopen2 = createAuthReq(tokenOwnerA, {
      params: { id: project2Id },
      body: { status: 'ACTIVE' },
    });
    await assert.rejects(
      async () => projectsController.transitionStatus(reqReopen2),
      (err: any) => {
        assert.ok(err instanceof ConflictError);
        assert.match(err.message, /capacity limit reached/i);
        return true;
      }
    );
  });

  // 15. INVALID STATE TRANSITION -> DENY
  it('15. should reject invalid state transitions with 409 Conflict', async () => {
    // Project 1 is ACTIVE -> cannot jump to ARCHIVED without going through valid flow or invalid self-transition
    const reqInvalid = createAuthReq(tokenOwnerA, {
      params: { id: project1Id },
      body: { status: 'ACTIVE' }, // Same status is invalid transition
    });
    await assert.rejects(
      async () => projectsController.transitionStatus(reqInvalid),
      (err: any) => {
        assert.ok(err instanceof ConflictError);
        assert.match(err.message, /Invalid project state transition/i);
        return true;
      }
    );
  });

  // 16. VALID LIFECYCLE TRANSITIONS -> ALLOW
  it('16. should successfully execute valid state transitions: ACTIVE -> ON_HOLD -> ACTIVE -> COMPLETED -> ARCHIVED', async () => {
    // 1. ACTIVE -> ON_HOLD
    const reqHold = createAuthReq(tokenOwnerA, {
      params: { id: project1Id },
      body: { status: 'ON_HOLD' },
    });
    const resHold = await projectsController.transitionStatus(reqHold);
    assert.equal(resHold.data.status, 'ON_HOLD');

    // 2. ON_HOLD -> ACTIVE
    const reqResume = createAuthReq(tokenOwnerA, {
      params: { id: project1Id },
      body: { status: 'ACTIVE' },
    });
    const resResume = await projectsController.transitionStatus(reqResume);
    assert.equal(resResume.data.status, 'ACTIVE');

    // 3. ACTIVE -> COMPLETED
    const reqComplete = createAuthReq(tokenOwnerA, {
      params: { id: project1Id },
      body: { status: 'COMPLETED' },
    });
    const resComplete = await projectsController.transitionStatus(reqComplete);
    assert.equal(resComplete.data.status, 'COMPLETED');
    assert.ok(resComplete.data.actualEndDate !== null);

    // 4. COMPLETED -> ARCHIVED
    const reqArchive = createAuthReq(tokenOwnerA, {
      params: { id: project1Id },
      body: { status: 'ARCHIVED' },
    });
    const resArchive = await projectsController.transitionStatus(reqArchive);
    assert.equal(resArchive.data.status, 'ARCHIVED');
  });

  // 17. PATCH CANNOT ARBITRARILY MUTATE STATUS
  it('17. should reject status updates through standard PATCH endpoint', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { id: project2Id },
      body: {
        status: 'ACTIVE', // status is not part of UpdateProjectSchema
        name: 'Legit Updated Name',
      },
    });

    await assert.rejects(
      async () => projectsController.updateProject(req),
      (err: any) => {
        // Zod strict schema rejects unknown field 'status'
        return true;
      }
    );
  });

  // 18. PROJECT CODE UNIQUE PER TENANT (DUPLICATE -> 409 CONFLICT)
  it('18. should strictly reject duplicate project code within the same tenant (409 Conflict)', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        companyId: companyAId,
        code: 'PRJ-ALPHA-01', // Already created
        name: 'Duplicate Code Project',
      },
    });

    await assert.rejects(
      async () => projectsController.createProject(req),
      (err: any) => {
        assert.ok(err instanceof ConflictError);
        assert.match(err.message, /already exists in this tenant/i);
        return true;
      }
    );
  });

  // 19. SAME PROJECT CODE IN DIFFERENT TENANTS -> ALLOWED
  it('19. should allow different tenants to use the exact same project code', async () => {
    const reqB = createAuthReq(tokenOwnerB, {
      body: {
        companyId: companyBId,
        code: 'PRJ-ALPHA-01', // Same code as Tenant A
        name: 'Beta Project with Same Code',
        status: 'ACTIVE',
      },
    });

    const resB = await projectsController.createProject(reqB);
    assert.equal(resB.success, true);
    assert.equal(resB.data.code, 'PRJ-ALPHA-01');
    assert.equal(resB.data.tenantId, tenantBId);
  });

  // 20. TENANTID CANNOT BE INJECTED FROM REQUEST
  it('20. should strictly ignore client-supplied tenantId in creation payload and bind to token context', async () => {
    const reqSpoof = createAuthReq(tokenOwnerA, {
      body: {
        tenantId: tenantBId, // Spoofed tenantId
        companyId: companyAId,
        code: 'PRJ-SPOOF-01',
        name: 'Spoof Attempt Project',
      },
    });

    const res = await projectsController.createProject(reqSpoof);
    assert.equal(res.data.tenantId, tenantAId);
    assert.notEqual(res.data.tenantId, tenantBId);
  });

  // 21. MEMBER ASSIGNMENT CANNOT CROSS TENANT
  it('21. should reject project creation with initial members from a foreign tenant (400 Bad Request)', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        companyId: companyAId,
        code: 'PRJ-CROSS-MEM',
        name: 'Cross Member Project',
        initialMembers: [
          { userId: ownerBId, projectRole: 'PROJECT_MANAGER' }, // Belongs to Tenant B
        ],
      },
    });

    await assert.rejects(
      async () => projectsController.createProject(req),
      (err: any) => {
        assert.ok(err instanceof BadRequestError);
        assert.match(err.message, /must belong to the caller tenant/i);
        return true;
      }
    );
  });
});
