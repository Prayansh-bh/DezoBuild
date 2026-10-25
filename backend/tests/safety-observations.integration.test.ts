import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service.js';
import { SafetyObservationController } from '../src/modules/quality/controllers/safety-observation.controller.js';
import { ActionController } from '../src/modules/quality/controllers/action.controller.js';
import { SafetyObservationService } from '../src/modules/quality/services/safety-observation.service.js';
import { ActionService } from '../src/modules/quality/services/action.service.js';
import { SafetyObservationRepository } from '../src/modules/quality/repositories/safety-observation.repository.js';
import { ActionRepository } from '../src/modules/quality/repositories/action.repository.js';
import { QualitySafetyAuditRepository } from '../src/modules/quality/repositories/quality-safety-audit.repository.js';
import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';
import { ObservationStatus, RiskLevel, ActionStatus } from '../src/modules/quality/constants/quality.constants.js';

describe('DEZOBUILD Phase 13 — Safety Observations & Toolbox Talk (TBT) Integration Suite', () => {
  let dbService: DatabaseService;
  let observationController: SafetyObservationController;
  let actionController: ActionController;
  let observationService: SafetyObservationService;
  let actionService: ActionService;
  let tokenService: TokenService;
  let prisma: any;

  const tenantAId = 'ee130003-aaaa-0001-aaaa-111111111111';
  const ownerAId = 'ee130003-1111-0001-aaaa-111111111111';
  const pmAId = 'ee130003-2222-0001-aaaa-111111111111';
  const siteEngAId = 'ee130003-3333-0001-aaaa-111111111111';

  let tokenOwnerA: string;
  let tokenPmA: string;
  let tokenSiteEngA: string;

  let companyAId: string;
  let branchAId: string;
  let projectAId: string;
  let employeeAId: string;

  function createAuthReq(
    token: string,
    options?: { body?: unknown; params?: Record<string, string>; query?: Record<string, string> }
  ): IncomingMessage {
    return {
      headers: {
        authorization: `Bearer ${token}`,
      },
      body: options?.body || {},
      params: options?.params || {},
      query: options?.query || {},
    } as unknown as IncomingMessage;
  }

  before(async () => {
    dbService = DatabaseService.getInstance();
    await dbService.connect();
    prisma = dbService.getClient();

    const auditRepo = new QualitySafetyAuditRepository(prisma);
    const obsRepo = new SafetyObservationRepository(prisma);
    const actionRepo = new ActionRepository(prisma);

    actionService = new ActionService(prisma, actionRepo, auditRepo);
    observationService = new SafetyObservationService(prisma, obsRepo, auditRepo);

    observationController = new SafetyObservationController(observationService);
    actionController = new ActionController(actionService);

    tokenService = TokenService.getInstance();

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Clean fixtures
    await prisma.qualitySafetyAuditLog.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.qualitySafetyAction.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.safetyObservation.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.employee.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.projectMember.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.project.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.user.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.branch.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.company.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.tenant.deleteMany({ where: { id: tenantAId } });

    // Seed Tenant A
    await prisma.tenant.create({ data: { id: tenantAId, name: 'Tenant Safety Obs A', code: 'TEN-OBS-A', status: 'ACTIVE' } });
    const compA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        code: 'COMP-OBS-A',
        name: 'Company Safety A',
        legalName: 'Company Safety Corp',
        panNumber: 'AAAAA0000A',
        gstin: '27AAAAA0000A1Z5',
        email: 'info@obs-a.com',
        phone: '9999999991',
        address: '100 Safety Tower',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        status: 'ACTIVE',
      },
    });
    companyAId = compA.id;
    const brA = await prisma.branch.create({
      data: { tenantId: tenantAId, companyId: companyAId, name: 'Main Safety Branch', code: 'BR-OBS-A', gstin: '27AAAAA0000A1Z5', city: 'Mumbai', state: 'Maharashtra', status: 'ACTIVE' },
    });
    branchAId = brA.id;

    const projA = await prisma.project.create({ data: { tenantId: tenantAId, companyId: companyAId, name: 'Project Safety Apex', code: 'PRJ-OBS-01', status: 'ACTIVE' } });
    projectAId = projA.id;

    const empA = await prisma.employee.create({ data: { tenantId: tenantAId, companyId: companyAId, branchId: branchAId, employeeNumber: 'EMP-OBS-001', fullName: 'Safety Officer', designation: 'EHS Specialist', employmentType: 'FULL_TIME', employmentStatus: 'ACTIVE', joiningDate: new Date() } });
    employeeAId = empA.id;

    // Seed Subscription Enterprise
    const enterprisePlan = await prisma.platformPlan.findFirstOrThrow({ where: { code: 'ENTERPRISE' } });
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantAId,
        planId: enterprisePlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });

    const ownerRole = await prisma.role.findFirst({ where: { name: 'COMPANY_OWNER' } });
    const pmRole = await prisma.role.findFirst({ where: { name: 'PROJECT_MANAGER' } });
    const siteEngRole = await prisma.role.findFirst({ where: { name: 'SITE_ENGINEER' } });

    await prisma.user.create({ data: { id: ownerAId, tenantId: tenantAId, email: 'owner@obs-a.com', fullName: 'Obs Owner A', passwordHash: 'hash', status: 'ACTIVE' } });
    await prisma.user.create({ data: { id: pmAId, tenantId: tenantAId, email: 'pm@obs-a.com', fullName: 'Obs PM A', passwordHash: 'hash', status: 'ACTIVE' } });
    await prisma.user.create({ data: { id: siteEngAId, tenantId: tenantAId, email: 'siteeng@obs-a.com', fullName: 'Obs SiteEng A', passwordHash: 'hash', status: 'ACTIVE' } });

    await prisma.userRoleAssignment.createMany({
      data: [
        { tenantId: tenantAId, userId: ownerAId, roleId: ownerRole!.id },
        { tenantId: tenantAId, userId: pmAId, roleId: pmRole!.id },
        { tenantId: tenantAId, userId: siteEngAId, roleId: siteEngRole!.id },
      ],
    });

    await prisma.projectMember.createMany({
      data: [
        { tenantId: tenantAId, projectId: projectAId, userId: pmAId, projectRole: 'MANAGER', isLead: true },
        { tenantId: tenantAId, projectId: projectAId, userId: siteEngAId, projectRole: 'ENGINEER', isLead: false },
      ],
    });

    tokenOwnerA = tokenService.createAccessToken({ userId: ownerAId, tenantId: tenantAId, sessionId: 's-1', sessionVersion: 1 });
    tokenPmA = tokenService.createAccessToken({ userId: pmAId, tenantId: tenantAId, sessionId: 's-2', sessionVersion: 1 });
    tokenSiteEngA = tokenService.createAccessToken({ userId: siteEngAId, tenantId: tenantAId, sessionId: 's-3', sessionVersion: 1 });
  });

  after(async () => {
    await prisma.qualitySafetyAuditLog.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.qualitySafetyAction.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.safetyObservation.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.employee.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.projectMember.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.project.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.user.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.branch.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.company.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.tenant.deleteMany({ where: { id: tenantAId } });
    await dbService.disconnect();
  });

  it('1. should calculate 5x5 continuous risk scores correctly across all bands', async () => {
    // LOW: 2 * 2 = 4 (Band 1..6)
    const lowReq = createAuthReq(tokenSiteEngA, {
      body: {
        projectId: projectAId,
        observationType: 'UNSAFE_CONDITION',
        severity: 'LOW',
        location: 'Ground Store Corridor',
        description: 'Minor water seepage near lighting switchboard',
        likelihood: 2,
        severityRating: 2,
      },
    });
    const lowRes = await observationController.create(lowReq);
    assert.equal(lowRes.data.riskScore, 4);
    assert.equal(lowRes.data.riskLevel, RiskLevel.LOW);
    assert.ok(lowRes.data.observationNumber.startsWith('OBS-'));

    // MEDIUM: 3 * 3 = 9 (Band 7..12)
    const medReq = createAuthReq(tokenSiteEngA, {
      body: {
        projectId: projectAId,
        observationType: 'UNSAFE_ACT',
        severity: 'MEDIUM',
        location: 'Level 3 Scaffolding',
        description: 'Worker unhooked safety harness while transferring materials',
        likelihood: 3,
        severityRating: 3,
      },
    });
    const medRes = await observationController.create(medReq);
    assert.equal(medRes.data.riskScore, 9);
    assert.equal(medRes.data.riskLevel, RiskLevel.MEDIUM);

    // HIGH: 4 * 4 = 16 (Band 13..19)
    const highReq = createAuthReq(tokenSiteEngA, {
      body: {
        projectId: projectAId,
        observationType: 'UNSAFE_CONDITION',
        severity: 'HIGH',
        location: 'Shaft Opening Level 5',
        description: 'Uncovered 2m x 2m lift shaft opening without edge barrier or warning light',
        likelihood: 4,
        severityRating: 4,
      },
    });
    const highRes = await observationController.create(highReq);
    assert.equal(highRes.data.riskScore, 16);
    assert.equal(highRes.data.riskLevel, RiskLevel.HIGH);

    // CRITICAL: 5 * 5 = 25 (Band 20..25)
    const critReq = createAuthReq(tokenSiteEngA, {
      body: {
        projectId: projectAId,
        observationType: 'NEAR_MISS_OBSERVATION',
        severity: 'CRITICAL',
        location: 'Tower Crane Lifting Radius',
        description: 'Overloaded rebar bundle snapped primary wire rope sling; load dropped 15 meters',
        likelihood: 5,
        severityRating: 5,
      },
    });
    const critRes = await observationController.create(critReq);
    assert.equal(critRes.data.riskScore, 25);
    assert.equal(critRes.data.riskLevel, RiskLevel.CRITICAL);
  });

  it('2. should record Toolbox Talk (TBT) fields on SafetyObservation without auxiliary tables', async () => {
    const tbtReq = createAuthReq(tokenSiteEngA, {
      body: {
        projectId: projectAId,
        observationType: 'TOOLBOX_TALK',
        severity: 'LOW',
        location: 'Site Assembly Area Zone A',
        description: 'Morning pre-shift briefing on Working at Height, 100% Tie-off and Scaffolding Tag Verification',
        tbtTopic: 'Working at Height & Double Lanyard Harness Protocols',
        tbtSupervisorId: siteEngAId,
        tbtAttendeeCount: 42,
        tbtTrade: 'Steel Fixers & Scaffolding Riggers',
        ppeCompliancePercent: 98.5,
        scaffoldingSafe: true,
        electricalSafe: true,
        housekeepingRating: 4,
        likelihood: 1,
        severityRating: 2,
      },
    });

    const res = await observationController.create(tbtReq);
    assert.equal(res.success, true);
    assert.equal(res.data.tbtTopic, 'Working at Height & Double Lanyard Harness Protocols');
    assert.equal(res.data.tbtAttendeeCount, 42);
    assert.equal(Number(res.data.ppeCompliancePercent), 98.5);
    assert.equal(res.data.housekeepingRating, 4);
    assert.equal(res.data.status, ObservationStatus.OPEN);
  });

  it('3. should enforce Observation lifecycle (OPEN -> ACTION_REQUIRED -> CLOSED) with action verification', async () => {
    // 1. Create Observation requiring action
    const obsRes = await observationController.create(createAuthReq(tokenSiteEngA, {
      body: {
        projectId: projectAId,
        observationType: 'UNSAFE_CONDITION',
        severity: 'HIGH',
        location: 'Basement Excavation Trench',
        description: 'Trench shoring struts showing signs of lateral deflection after rain',
        likelihood: 4,
        severityRating: 4,
      },
    }));
    const obsId = obsRes.data.id;

    // 2. Mark ACTION_REQUIRED
    const markReq = createAuthReq(tokenSiteEngA, {
      params: { id: obsId },
      body: {
        immediateActionTaken: 'Evacuated workers from trench zone and cordoned off 10m perimeter',
      },
    });
    const actionReqRes = await observationController.markActionRequired(markReq);
    assert.equal(actionReqRes.data.status, ObservationStatus.ACTION_REQUIRED);

    // 3. Link QualitySafetyAction to observation
    const actRes = await actionController.create(createAuthReq(tokenSiteEngA, {
      body: {
        projectId: projectAId,
        observationId: obsId,
        title: 'Install heavy hydraulic trench box bracing',
        description: 'Deploy certified trench box and install secondary hydraulic walers',
        actionType: 'CORRECTIVE',
        priority: 'URGENT',
        assignedToId: employeeAId,
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      },
    }));
    const actionId = actRes.data.id;

    // 4. Try closing observation while action is open (Must Fail)
    const closeWhileOpenReq = createAuthReq(tokenPmA, {
      params: { id: obsId },
    });
    await assert.rejects(async () => {
      await observationController.close(closeWhileOpenReq);
    }, /Cannot close safety observation: linked CAPA actions.*must be formally VERIFIED/);

    // 5. Complete and Verify action
    await actionController.start(createAuthReq(tokenSiteEngA, { params: { id: actionId } }));
    await actionController.complete(createAuthReq(tokenSiteEngA, {
      params: { id: actionId },
      body: { completionNotes: 'Hydraulic trench bracing installed and load tested' },
    }));
    await actionController.verify(createAuthReq(tokenPmA, {
      params: { id: actionId },
      body: { verificationRemarks: 'Geotechnical inspector verified trench stability.' },
    }));

    // 6. Close Observation
    const closeRes = await observationController.close(createAuthReq(tokenPmA, { params: { id: obsId } }));
    assert.equal(closeRes.data.status, ObservationStatus.CLOSED);
    assert.equal(closeRes.data.closedById, pmAId);
  });
});
