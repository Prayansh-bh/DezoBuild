import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service.js';
import { SafetyIncidentController } from '../src/modules/quality/controllers/safety-incident.controller.js';
import { ActionController } from '../src/modules/quality/controllers/action.controller.js';
import { SafetyIncidentService } from '../src/modules/quality/services/safety-incident.service.js';
import { ActionService } from '../src/modules/quality/services/action.service.js';
import { SafetyIncidentRepository } from '../src/modules/quality/repositories/safety-incident.repository.js';
import { ActionRepository } from '../src/modules/quality/repositories/action.repository.js';
import { QualitySafetyAuditRepository } from '../src/modules/quality/repositories/quality-safety-audit.repository.js';
import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';
import { sanitizeIncident, sanitizeIncidentList } from '../src/modules/quality/helpers/pii-firewall.helper.js';
import { IncidentStatus, ActionStatus } from '../src/modules/quality/constants/quality.constants.js';

describe('DEZOBUILD Phase 13 — Safety Incidents & PII Firewall Integration Suite', () => {
  let dbService: DatabaseService;
  let incidentController: SafetyIncidentController;
  let actionController: ActionController;
  let incidentService: SafetyIncidentService;
  let actionService: ActionService;
  let tokenService: TokenService;
  let prisma: any;

  const tenantAId = 'ee130004-aaaa-0001-aaaa-111111111111';
  const ownerAId = 'ee130004-1111-0001-aaaa-111111111111';
  const pmAId = 'ee130004-2222-0001-aaaa-111111111111';
  const siteEngAId = 'ee130004-3333-0001-aaaa-111111111111';

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
    const incidentRepo = new SafetyIncidentRepository(prisma);
    const actionRepo = new ActionRepository(prisma);

    actionService = new ActionService(prisma, actionRepo, auditRepo);
    incidentService = new SafetyIncidentService(prisma, incidentRepo, auditRepo);

    incidentController = new SafetyIncidentController(incidentService);
    actionController = new ActionController(actionService);

    tokenService = TokenService.getInstance();

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Clean fixtures
    await prisma.qualitySafetyAuditLog.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.qualitySafetyAction.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.safetyIncident.deleteMany({ where: { tenantId: tenantAId } });
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
    await prisma.tenant.create({ data: { id: tenantAId, name: 'Tenant Incident A', code: 'TEN-INC-A', status: 'ACTIVE' } });
    const compA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        code: 'COMP-INC-A',
        name: 'Company Inc A',
        legalName: 'Company Inc Corp',
        panNumber: 'AAAAA0000A',
        gstin: '27AAAAA0000A1Z5',
        email: 'info@inc-a.com',
        phone: '9999999991',
        address: '100 Incident Tower',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        status: 'ACTIVE',
      },
    });
    companyAId = compA.id;
    const brA = await prisma.branch.create({
      data: { tenantId: tenantAId, companyId: companyAId, name: 'Branch Inc', code: 'BR-INC-A', gstin: '27AAAAA0000A1Z5', city: 'Mumbai', state: 'Maharashtra', status: 'ACTIVE' },
    });
    branchAId = brA.id;

    const projA = await prisma.project.create({ data: { tenantId: tenantAId, companyId: companyAId, name: 'Project Safe Harbour', code: 'PRJ-INC-01', status: 'ACTIVE' } });
    projectAId = projA.id;

    const empA = await prisma.employee.create({ data: { tenantId: tenantAId, companyId: companyAId, branchId: branchAId, employeeNumber: 'EMP-INC-001', fullName: 'Robert Mason', designation: 'Mason Lead', employmentType: 'FULL_TIME', employmentStatus: 'ACTIVE', joiningDate: new Date() } });
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

    await prisma.user.create({ data: { id: ownerAId, tenantId: tenantAId, email: 'owner@inc-a.com', fullName: 'Inc Owner A', passwordHash: 'hash', status: 'ACTIVE' } });
    await prisma.user.create({ data: { id: pmAId, tenantId: tenantAId, email: 'pm@inc-a.com', fullName: 'Inc PM A', passwordHash: 'hash', status: 'ACTIVE' } });
    await prisma.user.create({ data: { id: siteEngAId, tenantId: tenantAId, email: 'siteeng@inc-a.com', fullName: 'Inc SiteEng A', passwordHash: 'hash', status: 'ACTIVE' } });

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
    await prisma.safetyIncident.deleteMany({ where: { tenantId: tenantAId } });
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

  it('1. should create a SafetyIncident with non-clinical fields and numbering', async () => {
    const occurredAt = new Date(Date.now() - 3600000).toISOString();
    const req = createAuthReq(tokenPmA, {
      body: {
        projectId: projectAId,
        incidentType: 'LOST_TIME_INJURY',
        severity: 'SEVERE',
        occurredAt,
        location: 'Level 2 Formwork Deck',
        description: 'Carpenter slipped on wet ply and sustained ankle sprain during formwork dismantling.',
        injuredEmployeeId: employeeAId,
        injuredPersonName: 'Robert Mason',
        injuredPersonTrade: 'Carpentry',
        lostWorkDays: 3,
        likelihood: 3,
        severityRating: 4,
        immediateActionTaken: 'First aid administered on site, worker escorted to clinic for X-ray.',
      },
    });

    const res = await incidentController.create(req);
    assert.equal(res.success, true);
    assert.equal(res.data.status, IncidentStatus.REPORTED);
    assert.ok(res.data.incidentNumber.startsWith('INC-'));
    assert.equal(res.data.lostWorkDays, 3);
    assert.equal(res.data.reportedById, pmAId);
  });

  it('2. should enforce PII Firewall response projection (masking sensitive fields for restricted roles)', () => {
    const rawIncident = {
      id: 'inc-test-123',
      tenantId: tenantAId,
      projectId: projectAId,
      incidentNumber: 'INC-2026-000099',
      incidentType: 'LOST_TIME_INJURY',
      severity: 'SEVERE',
      occurredAt: new Date(),
      reportedAt: new Date(),
      location: 'Basement 1',
      description: 'Hand laceration from rebar tie wire',
      reportedById: siteEngAId,
      injuredEmployeeId: employeeAId,
      injuredPersonName: 'Robert Mason',
      injuredPersonTrade: 'Rebar Tier',
      lostWorkDays: 5,
      likelihood: 2,
      severityRating: 3,
      riskScore: 6,
      riskLevel: 'LOW',
      status: 'REPORTED',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 1. Privileged role (COMPANY_ADMIN / PROJECT_MANAGER) -> FULL DATA
    const fullAccessPm = sanitizeIncident(rawIncident, 'PROJECT_MANAGER');
    assert.equal(fullAccessPm.injuredEmployeeId, employeeAId);
    assert.equal(fullAccessPm.injuredPersonName, 'Robert Mason');
    assert.equal(fullAccessPm.lostWorkDays, 5);

    const fullAccessOwner = sanitizeIncident(rawIncident, 'COMPANY_OWNER');
    assert.equal(fullAccessOwner.injuredPersonName, 'Robert Mason');

    // 2. Restricted role (SITE_ENGINEER / VIEWER) -> REDACTED
    const redactedSiteEng = sanitizeIncident(rawIncident, 'SITE_ENGINEER');
    assert.equal(redactedSiteEng.injuredEmployeeId, null);
    assert.equal(redactedSiteEng.injuredPersonName, 'CONFIDENTIAL');
    assert.equal(redactedSiteEng.lostWorkDays, 0);

    const redactedViewer = sanitizeIncident(rawIncident, 'VIEWER');
    assert.equal(redactedViewer.injuredEmployeeId, null);
    assert.equal(redactedViewer.injuredPersonName, 'CONFIDENTIAL');
    assert.equal(redactedViewer.lostWorkDays, 0);
  });

  it('3. should enforce full Incident lifecycle (REPORTED -> UNDER_INVESTIGATION -> CAPA_IN_PROGRESS -> CLOSED) with SoD', async () => {
    // 1. Create Incident
    const incRes = await incidentController.create(createAuthReq(tokenSiteEngA, {
      body: {
        projectId: projectAId,
        incidentType: 'MEDICAL_TREATMENT',
        severity: 'MODERATE',
        occurredAt: new Date(Date.now() - 7200000).toISOString(),
        location: 'Ground Floor Unloading Bay',
        description: 'Forklift mirror clipped stationary concrete pump hopper',
        likelihood: 2,
        severityRating: 3,
      },
    }));
    const incId = incRes.data.id;

    // 2. Start Investigation (REPORTED -> UNDER_INVESTIGATION)
    const investReq = createAuthReq(tokenPmA, {
      params: { id: incId },
    });
    const underInvestRes = await incidentController.startInvestigation(investReq);
    assert.equal(underInvestRes.data.status, IncidentStatus.UNDER_INVESTIGATION);
    assert.equal(underInvestRes.data.investigatedById, pmAId);

    // 3. Add Investigation Findings
    const findingsReq = createAuthReq(tokenPmA, {
      params: { id: incId },
      body: {
        rootCause: 'Blind spot at bay entry without designated banksman signalman present',
        investigationFindings: 'Driver had restricted visibility; no reversing alarm on forklift unit.',
      },
    });
    const findingsRes = await incidentController.addInvestigationFindings(findingsReq);
    assert.equal(findingsRes.success, true);
    assert.equal(findingsRes.data.rootCause, 'Blind spot at bay entry without designated banksman signalman present');

    // 4. Create linked QualitySafetyAction (CAPA)
    const actionRes = await actionController.create(createAuthReq(tokenPmA, {
      body: {
        projectId: projectAId,
        incidentId: incId,
        title: 'Install convex blind-spot mirrors & assign banksman',
        description: 'Fit dual 600mm outdoor convex safety mirrors at unloading entrance and issue mandatory banksman hi-vis vests',
        actionType: 'PREVENTIVE',
        priority: 'HIGH',
        assignedToId: employeeAId,
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      },
    }));
    const actionId = actionRes.data.id;

    // 5. Mark CAPA In Progress
    const capaProgRes = await incidentController.markCapaInProgress(createAuthReq(tokenPmA, { params: { id: incId } }));
    assert.equal(capaProgRes.data.status, IncidentStatus.CAPA_IN_PROGRESS);

    // 6. Complete and verify action
    await actionController.start(createAuthReq(tokenSiteEngA, { params: { id: actionId } }));
    await actionController.complete(createAuthReq(tokenSiteEngA, {
      params: { id: actionId },
      body: { completionNotes: 'Convex mirrors installed; 2 dedicated banksmen certified.' },
    }));
    await actionController.verify(createAuthReq(tokenPmA, {
      params: { id: actionId },
      body: { verificationRemarks: 'Verified physical installation and training records.' },
    }));

    // 7. Reporter/Closer SoD: siteEngA reported the incident -> cannot close it!
    const selfCloseReq = createAuthReq(tokenSiteEngA, {
      params: { id: incId },
      body: { closureRemarks: 'Self close attempt by reporter' },
    });
    await assert.rejects(async () => {
      await incidentController.close(selfCloseReq);
    }, /Segregation of Duties violation: Incident reporter cannot close their own reported incident/);

    // 8. Close by PM (SoD satisfied)
    const closeRes = await incidentController.close(createAuthReq(tokenPmA, {
      params: { id: incId },
      body: { closureRemarks: 'All CAPA corrective actions completed and verified.' },
    }));
    assert.equal(closeRes.data.status, IncidentStatus.CLOSED);
    assert.equal(closeRes.data.closedById, pmAId);
  });
});
