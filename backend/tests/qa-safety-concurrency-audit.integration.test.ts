import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service.js';
import { InspectionController } from '../src/modules/quality/controllers/inspection.controller.js';
import { NcrController } from '../src/modules/quality/controllers/ncr.controller.js';
import { ActionController } from '../src/modules/quality/controllers/action.controller.js';
import { SafetyObservationController } from '../src/modules/quality/controllers/safety-observation.controller.js';
import { SafetyIncidentController } from '../src/modules/quality/controllers/safety-incident.controller.js';
import { QualitySafetyAuditController } from '../src/modules/quality/controllers/quality-safety-audit.controller.js';

import { InspectionService } from '../src/modules/quality/services/inspection.service.js';
import { NcrService } from '../src/modules/quality/services/ncr.service.js';
import { ActionService } from '../src/modules/quality/services/action.service.js';
import { SafetyObservationService } from '../src/modules/quality/services/safety-observation.service.js';
import { SafetyIncidentService } from '../src/modules/quality/services/safety-incident.service.js';
import { QualitySafetyAuditService } from '../src/modules/quality/services/quality-safety-audit.service.js';

import { InspectionRepository } from '../src/modules/quality/repositories/inspection.repository.js';
import { NcrRepository } from '../src/modules/quality/repositories/ncr.repository.js';
import { ActionRepository } from '../src/modules/quality/repositories/action.repository.js';
import { SafetyObservationRepository } from '../src/modules/quality/repositories/safety-observation.repository.js';
import { SafetyIncidentRepository } from '../src/modules/quality/repositories/safety-incident.repository.js';
import { QualitySafetyAuditRepository } from '../src/modules/quality/repositories/quality-safety-audit.repository.js';

import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';
import { NcrSeverity } from '../src/modules/quality/constants/quality.constants.js';

describe('DEZOBUILD Phase 13 — Concurrency, Audit Trail & Security Boundary Integration Suite', () => {
  let dbService: DatabaseService;
  let inspectionController: InspectionController;
  let ncrController: NcrController;
  let actionController: ActionController;
  let obsController: SafetyObservationController;
  let incController: SafetyIncidentController;
  let auditController: QualitySafetyAuditController;
  let tokenService: TokenService;
  let prisma: any;

  const tenantAId = 'ee130005-aaaa-0001-aaaa-111111111111';
  const ownerAId = 'ee130005-1111-0001-aaaa-111111111111';
  const pmAId = 'ee130005-2222-0001-aaaa-111111111111';
  const siteEngAId = 'ee130005-3333-0001-aaaa-111111111111';
  const viewerAId = 'ee130005-4444-0001-aaaa-111111111111';

  let tokenOwnerA: string;
  let tokenPmA: string;
  let tokenSiteEngA: string;
  let tokenViewerA: string;

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
    const inspectionRepo = new InspectionRepository(prisma);
    const ncrRepo = new NcrRepository(prisma);
    const actionRepo = new ActionRepository(prisma);
    const obsRepo = new SafetyObservationRepository(prisma);
    const incRepo = new SafetyIncidentRepository(prisma);

    const auditService = new QualitySafetyAuditService(auditRepo);
    const actionService = new ActionService(prisma, actionRepo, auditRepo);
    const inspectionService = new InspectionService(prisma, inspectionRepo, auditRepo, actionRepo);
    const ncrService = new NcrService(prisma, ncrRepo, auditRepo);
    const observationService = new SafetyObservationService(prisma, obsRepo, auditRepo);
    const incidentService = new SafetyIncidentService(prisma, incRepo, auditRepo);

    inspectionController = new InspectionController(inspectionService);
    ncrController = new NcrController(ncrService);
    actionController = new ActionController(actionService);
    obsController = new SafetyObservationController(observationService);
    incController = new SafetyIncidentController(incidentService);
    auditController = new QualitySafetyAuditController(auditService);

    tokenService = TokenService.getInstance();

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Clean fixtures
    await prisma.qualitySafetyAuditLog.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.qualitySafetyAction.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.safetyIncident.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.safetyObservation.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.nonConformanceReport.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.inspectionChecklistItem.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.inspectionRequest.deleteMany({ where: { tenantId: tenantAId } });
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
    await prisma.tenant.create({ data: { id: tenantAId, name: 'Tenant Concurrency A', code: 'TEN-CNC-A', status: 'ACTIVE' } });
    const compA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        code: 'COMP-CNC-A',
        name: 'Company Conc A',
        legalName: 'Company Conc Corp',
        panNumber: 'AAAAA0000A',
        gstin: '27AAAAA0000A1Z5',
        email: 'info@cnc-a.com',
        phone: '9999999991',
        address: '100 Conc Tower',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        status: 'ACTIVE',
      },
    });
    companyAId = compA.id;
    const brA = await prisma.branch.create({
      data: { tenantId: tenantAId, companyId: companyAId, name: 'Branch Conc', code: 'BR-CNC-A', gstin: '27AAAAA0000A1Z5', city: 'Mumbai', state: 'Maharashtra', status: 'ACTIVE' },
    });
    branchAId = brA.id;

    const projA = await prisma.project.create({ data: { tenantId: tenantAId, companyId: companyAId, name: 'Project Concurrency Base', code: 'PRJ-CNC-01', status: 'ACTIVE' } });
    projectAId = projA.id;

    const empA = await prisma.employee.create({ data: { tenantId: tenantAId, companyId: companyAId, branchId: branchAId, employeeNumber: 'EMP-CNC-001', fullName: 'Jack Audit', designation: 'Auditor', employmentType: 'FULL_TIME', employmentStatus: 'ACTIVE', joiningDate: new Date() } });
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
    const viewerRole = await prisma.role.findFirst({ where: { name: 'VIEWER' } });

    await prisma.user.create({ data: { id: ownerAId, tenantId: tenantAId, email: 'owner@cnc-a.com', fullName: 'Conc Owner A', passwordHash: 'hash', status: 'ACTIVE' } });
    await prisma.user.create({ data: { id: pmAId, tenantId: tenantAId, email: 'pm@cnc-a.com', fullName: 'Conc PM A', passwordHash: 'hash', status: 'ACTIVE' } });
    await prisma.user.create({ data: { id: siteEngAId, tenantId: tenantAId, email: 'siteeng@cnc-a.com', fullName: 'Conc SiteEng A', passwordHash: 'hash', status: 'ACTIVE' } });
    await prisma.user.create({ data: { id: viewerAId, tenantId: tenantAId, email: 'viewer@cnc-a.com', fullName: 'Conc Viewer A', passwordHash: 'hash', status: 'ACTIVE' } });

    await prisma.userRoleAssignment.createMany({
      data: [
        { tenantId: tenantAId, userId: ownerAId, roleId: ownerRole!.id },
        { tenantId: tenantAId, userId: pmAId, roleId: pmRole!.id },
        { tenantId: tenantAId, userId: siteEngAId, roleId: siteEngRole!.id },
        { tenantId: tenantAId, userId: viewerAId, roleId: viewerRole!.id },
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
    tokenViewerA = tokenService.createAccessToken({ userId: viewerAId, tenantId: tenantAId, sessionId: 's-4', sessionVersion: 1 });
  });

  after(async () => {
    await prisma.qualitySafetyAuditLog.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.qualitySafetyAction.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.safetyIncident.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.safetyObservation.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.nonConformanceReport.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.inspectionChecklistItem.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.inspectionRequest.deleteMany({ where: { tenantId: tenantAId } });
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

  it('1. should allocate unique sequential numbers under concurrent load without duplicates', async () => {
    const totalConcurrent = 10;
    const promises = Array.from({ length: totalConcurrent }, (_, i) => {
      const req = createAuthReq(tokenSiteEngA, {
        body: {
          projectId: projectAId,
          title: `Concurrent NCR Batch Item ${i + 1}`,
          description: `Concurrent defect description ${i + 1}`,
          location: `Zone ${i + 1}`,
          category: 'WORKMANSHIP',
          severity: NcrSeverity.MINOR,
          targetClosureDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        },
      });
      return ncrController.create(req);
    });

    const results = await Promise.all(promises);
    assert.equal(results.length, totalConcurrent);

    const allocatedNumbers = results.map((r) => r.data.ncrNumber);
    const uniqueNumbers = new Set(allocatedNumbers);
    assert.equal(uniqueNumbers.size, totalConcurrent, 'All allocated NCR numbers must be strictly unique');
  });

  it('2. should verify append-only QualitySafetyAuditLog records created for state changes', async () => {
    // Check audit records created by previous operations
    const auditReq = createAuthReq(tokenOwnerA, {
      query: { projectId: projectAId },
    });
    const auditRes = await auditController.list(auditReq);
    assert.equal(auditRes.success, true);
    assert.ok(auditRes.data.items.length >= 10, 'Audit entries should have been recorded for all creations');

    const firstLog = auditRes.data.items[0];
    assert.equal(firstLog.tenantId, tenantAId);
    assert.equal(firstLog.projectId, projectAId);
    assert.ok(firstLog.entityType);
    assert.ok(firstLog.entityId);
    assert.ok(firstLog.action);
    assert.ok(firstLog.actorId);
  });

  it('3. should verify VIEWER role cannot mutate any Phase 13 resource', async () => {
    // 1. Viewer cannot create inspection
    const inspReq = createAuthReq(tokenViewerA, {
      body: {
        projectId: projectAId,
        inspectionType: 'POUR_CARD',
        discipline: 'CIVIL',
        title: 'Viewer inspection attempt',
        location: 'Zone V',
        element: 'Slab V',
      },
    });
    await assert.rejects(async () => {
      await inspectionController.create(inspReq);
    }, /Forbidden: User lacks required permission 'quality:pour:create'/);

    // 2. Viewer cannot create NCR
    const ncrReq = createAuthReq(tokenViewerA, {
      body: {
        projectId: projectAId,
        title: 'Viewer NCR attempt',
        description: 'Viewer defect description',
        location: 'Zone V',
        category: 'FINISHES',
        severity: NcrSeverity.MINOR,
        targetClosureDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      },
    });
    await assert.rejects(async () => {
      await ncrController.create(ncrReq);
    }, /Forbidden: User lacks required permission 'quality:ncr:create'/);

    // 3. Viewer cannot create Observation
    const obsReq = createAuthReq(tokenViewerA, {
      body: {
        projectId: projectAId,
        observationType: 'UNSAFE_CONDITION',
        severity: 'LOW',
        location: 'Zone V',
        description: 'Viewer obs description',
        likelihood: 1,
        severityRating: 1,
      },
    });
    await assert.rejects(async () => {
      await obsController.create(obsReq);
    }, /Forbidden: User lacks required permission 'safety:audit:create'/);

    // 4. Viewer cannot create Incident
    const incReq = createAuthReq(tokenViewerA, {
      body: {
        projectId: projectAId,
        incidentType: 'NEAR_MISS',
        severity: 'LOW',
        occurredAt: new Date(Date.now() - 3600000).toISOString(),
        location: 'Zone V',
        description: 'Viewer inc description',
        likelihood: 1,
        severityRating: 1,
      },
    });
    await assert.rejects(async () => {
      await incController.create(incReq);
    }, /Forbidden: User lacks required permission 'safety:incident:create'/);
  });
});
