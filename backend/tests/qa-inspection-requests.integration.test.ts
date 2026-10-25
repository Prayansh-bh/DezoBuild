import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service.js';
import { InspectionController } from '../src/modules/quality/controllers/inspection.controller.js';
import { InspectionService } from '../src/modules/quality/services/inspection.service.js';
import { ActionService } from '../src/modules/quality/services/action.service.js';
import { InspectionRepository } from '../src/modules/quality/repositories/inspection.repository.js';
import { ActionRepository } from '../src/modules/quality/repositories/action.repository.js';
import { QualitySafetyAuditRepository } from '../src/modules/quality/repositories/quality-safety-audit.repository.js';
import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';
import { InspectionStatus, ChecklistResult } from '../src/modules/quality/constants/quality.constants.js';

describe('DEZOBUILD Phase 13 — Inspection Requests & Checklist Evaluation Integration Suite', () => {
  let dbService: DatabaseService;
  let inspectionController: InspectionController;
  let inspectionService: InspectionService;
  let actionService: ActionService;
  let tokenService: TokenService;
  let prisma: any;

  const tenantAId = 'ee130001-aaaa-0001-aaaa-111111111111';
  const ownerAId = 'ee130001-1111-0001-aaaa-111111111111';
  const pmAId = 'ee130001-2222-0001-aaaa-111111111111';
  const siteEngAId = 'ee130001-3333-0001-aaaa-111111111111';
  const viewerAId = 'ee130001-4444-0001-aaaa-111111111111';

  const tenantBId = 'ee130001-bbbb-0001-bbbb-111111111111';
  const ownerBId = 'ee130001-1111-0001-bbbb-111111111111';

  let tokenOwnerA: string;
  let tokenPmA: string;
  let tokenSiteEngA: string;
  let tokenViewerA: string;
  let tokenOwnerB: string;

  let companyAId: string;
  let branchAId: string;
  let projectAId: string;
  let employeeAId: string;
  let vendorAId: string;
  let companyBId: string;
  let projectBId: string;

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
    const actionRepo = new ActionRepository(prisma);

    actionService = new ActionService(prisma, actionRepo, auditRepo);
    inspectionService = new InspectionService(prisma, inspectionRepo, auditRepo, actionRepo);
    inspectionController = new InspectionController(inspectionService);

    tokenService = TokenService.getInstance();

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Clean fixtures
    await prisma.qualitySafetyAuditLog.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.qualitySafetyAction.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.qualitySafetyAuditLog.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.qualitySafetyAction.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.nonConformanceReport.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.inspectionChecklistItem.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.inspectionRequest.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.employee.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.vendor.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.projectMember.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.project.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.branch.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });

    // Seed Tenant A
    await prisma.tenant.create({
      data: { id: tenantAId, name: 'Tenant QA A', code: 'TEN-QA-A', status: 'ACTIVE' },
    });
    const compA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        code: 'COMP-QA-A',
        name: 'Company QA A',
        legalName: 'Company QA A Corp',
        panNumber: 'AAAAA0000A',
        gstin: '27AAAAA0000A1Z5',
        email: 'info@qa-a.com',
        phone: '9999999991',
        address: '100 QA Tower',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        status: 'ACTIVE',
      },
    });
    companyAId = compA.id;
    const brA = await prisma.branch.create({
      data: { tenantId: tenantAId, companyId: companyAId, name: 'Main Branch QA', code: 'BR-QA-A', gstin: '27AAAAA0000A1Z5', city: 'Mumbai', state: 'Maharashtra', status: 'ACTIVE' },
    });
    branchAId = brA.id;

    const projA = await prisma.project.create({
      data: { tenantId: tenantAId, companyId: companyAId, name: 'Project Quality Hub', code: 'PRJ-QA-01', status: 'ACTIVE' },
    });
    projectAId = projA.id;

    const empA = await prisma.employee.create({
      data: { tenantId: tenantAId, companyId: companyAId, branchId: branchAId, employeeNumber: 'EMP-QA-001', fullName: 'John Inspector', designation: 'QA Lead', employmentType: 'FULL_TIME', employmentStatus: 'ACTIVE', joiningDate: new Date() },
    });
    employeeAId = empA.id;

    const vendA = await prisma.vendor.create({
      data: { tenantId: tenantAId, name: 'ReadyMix Concrete Supplies', code: 'VEND-QA-001', status: 'ACTIVE' },
    });
    vendorAId = vendA.id;

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

    // Seed Users & Roles for Tenant A
    const ownerRole = await prisma.role.findFirst({ where: { name: 'COMPANY_OWNER' } });
    const pmRole = await prisma.role.findFirst({ where: { name: 'PROJECT_MANAGER' } });
    const siteEngRole = await prisma.role.findFirst({ where: { name: 'SITE_ENGINEER' } });
    const viewerRole = await prisma.role.findFirst({ where: { name: 'VIEWER' } });

    await prisma.user.create({ data: { id: ownerAId, tenantId: tenantAId, email: 'owner@qa-a.com', fullName: 'QA Owner A', passwordHash: 'hash', status: 'ACTIVE' } });
    await prisma.user.create({ data: { id: pmAId, tenantId: tenantAId, email: 'pm@qa-a.com', fullName: 'QA PM A', passwordHash: 'hash', status: 'ACTIVE' } });
    await prisma.user.create({ data: { id: siteEngAId, tenantId: tenantAId, email: 'siteeng@qa-a.com', fullName: 'QA SiteEng A', passwordHash: 'hash', status: 'ACTIVE' } });
    await prisma.user.create({ data: { id: viewerAId, tenantId: tenantAId, email: 'viewer@qa-a.com', fullName: 'QA Viewer A', passwordHash: 'hash', status: 'ACTIVE' } });

    await prisma.userRoleAssignment.createMany({
      data: [
        { tenantId: tenantAId, userId: ownerAId, roleId: ownerRole!.id },
        { tenantId: tenantAId, userId: pmAId, roleId: pmRole!.id },
        { tenantId: tenantAId, userId: siteEngAId, roleId: siteEngRole!.id },
        { tenantId: tenantAId, userId: viewerAId, roleId: viewerRole!.id },
      ],
    });

    // Project membership
    await prisma.projectMember.createMany({
      data: [
        { tenantId: tenantAId, projectId: projectAId, userId: pmAId, projectRole: 'MANAGER', isLead: true },
        { tenantId: tenantAId, projectId: projectAId, userId: siteEngAId, projectRole: 'ENGINEER', isLead: false },
      ],
    });

    // Seed Tenant B
    await prisma.tenant.create({ data: { id: tenantBId, name: 'Tenant QA B', code: 'TEN-QA-B', status: 'ACTIVE' } });
    const compB = await prisma.company.create({
      data: {
        tenantId: tenantBId,
        name: 'Company B',
        code: 'COMP-B',
        legalName: 'Company B Inc',
        panNumber: 'BBBBB0000B',
        gstin: '27BBBBB0000B1Z5',
        email: 'info@qa-b.com',
        phone: '9999999992',
        address: '200 B Tower',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        status: 'ACTIVE',
      },
    });
    companyBId = compB.id;
    const projB = await prisma.project.create({ data: { tenantId: tenantBId, companyId: companyBId, name: 'Project B', code: 'PRJ-QA-B', status: 'ACTIVE' } });
    projectBId = projB.id;
    await prisma.user.create({ data: { id: ownerBId, tenantId: tenantBId, email: 'owner@qa-b.com', fullName: 'Owner B', passwordHash: 'hash', status: 'ACTIVE' } });
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantBId,
        planId: enterprisePlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.userRoleAssignment.create({ data: { tenantId: tenantBId, userId: ownerBId, roleId: ownerRole!.id } });

    // Tokens
    tokenOwnerA = tokenService.createAccessToken({ userId: ownerAId, tenantId: tenantAId, sessionId: 's-1', sessionVersion: 1 });
    tokenPmA = tokenService.createAccessToken({ userId: pmAId, tenantId: tenantAId, sessionId: 's-2', sessionVersion: 1 });
    tokenSiteEngA = tokenService.createAccessToken({ userId: siteEngAId, tenantId: tenantAId, sessionId: 's-3', sessionVersion: 1 });
    tokenViewerA = tokenService.createAccessToken({ userId: viewerAId, tenantId: tenantAId, sessionId: 's-4', sessionVersion: 1 });
    tokenOwnerB = tokenService.createAccessToken({ userId: ownerBId, tenantId: tenantBId, sessionId: 's-5', sessionVersion: 1 });
  });

  after(async () => {
    await prisma.qualitySafetyAuditLog.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.qualitySafetyAction.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.nonConformanceReport.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.inspectionChecklistItem.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.inspectionRequest.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.employee.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.vendor.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.projectMember.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.project.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.branch.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
    await dbService.disconnect();
  });

  it('1. should create an InspectionRequest with catalog snapshot in DRAFT status', async () => {
    const req = createAuthReq(tokenSiteEngA, {
      body: {
        projectId: projectAId,
        inspectionType: 'POUR_CARD',
        discipline: 'CIVIL',
        title: 'Level 2 Slab Pour Card Inspection',
        location: 'Building A, Grid B3-C4',
        element: 'Suspended Slab Level 2',
        gradeOrSpecification: 'M35 Reinforced Concrete',
        plannedQuantity: 45.5,
        unit: 'CUM',
        isHoldPoint: true,
        isWitnessPoint: true,
      },
    });    const res = await inspectionController.create(req);
    assert.equal(res.success, true);
    assert.equal(res.data.status, InspectionStatus.DRAFT);
    assert.ok(res.data.inspectionNumber.startsWith('INSP-'));
    assert.equal(res.data.isHoldPoint, true);
    assert.equal(res.data.checklistItems.length >= 5, true);

    const firstChecklist = res.data.checklistItems[0];
    assert.equal(firstChecklist.result, ChecklistResult.PENDING);
    assert.ok(firstChecklist.acceptanceCriteria);
  });

  it('2. should reject cross-tenant inspection creation (IDOR prevention)', async () => {
    const req = createAuthReq(tokenOwnerB, {
      body: {
        projectId: projectAId, // Project belongs to Tenant A!
        inspectionType: 'POUR_CARD',
        discipline: 'CIVIL',
        title: 'Malicious Cross Tenant Inspection',
        location: 'Cross Tenant',
        element: 'Cross Tenant Slab',
      },
    });

    await assert.rejects(async () => {
      await inspectionController.create(req);
    }, /Invalid projectId: project not found in current tenant/);
  });

  it('3. should allow custom checkpoint addition during DRAFT only', async () => {
    const createReq = createAuthReq(tokenSiteEngA, {
      body: {
        projectId: projectAId,
        inspectionType: 'REBAR',
        discipline: 'STRUCTURAL',
        title: 'Retaining Wall Rebar Inspection',
        location: 'South Basement Wall',
        element: 'Retaining Wall RW-1',
      },
    });
    const created = await inspectionController.create(createReq);
    const inspectionId = created.data.id;

    // Add custom checkpoint
    const addReq = createAuthReq(tokenSiteEngA, {
      params: { id: inspectionId },
      body: {
        checkpointCode: 'CUST-001',
        itemType: 'VISUAL_CHECK',
        checkpointCategory: 'CORROSION_PROTECTION',
        checkpointDescription: 'Zinc coating thickness verification on starter bars',
        acceptanceCriteria: 'Minimum 85 microns galvanization thickness',
        isMandatory: true,
      },
    });
    const addRes = await inspectionController.addCustomChecklistItem(addReq);
    assert.equal(addRes.success, true);
    assert.equal(addRes.data.checkpointDescription, 'Zinc coating thickness verification on starter bars');

    // Transition to SUBMITTED
    const submitReq = createAuthReq(tokenSiteEngA, { params: { id: inspectionId } });
    await inspectionController.submit(submitReq);

    // Try adding another checkpoint in SUBMITTED (MUST FAIL - structure frozen)
    const addAfterSubmitReq = createAuthReq(tokenSiteEngA, {
      params: { id: inspectionId },
      body: {
        checkpointCode: 'CUST-002',
        itemType: 'VISUAL_CHECK',
        checkpointCategory: 'POST_SUBMIT',
        checkpointDescription: 'Forbidden checkpoint',
      },
    });
    await assert.rejects(async () => {
      await inspectionController.addCustomChecklistItem(addAfterSubmitReq);
    }, /Checklist structure is frozen/);
  });

  it('4. should progress inspection from DRAFT -> SUBMITTED -> SCHEDULED -> IN_PROGRESS', async () => {
    const createReq = createAuthReq(tokenSiteEngA, {
      body: {
        projectId: projectAId,
        inspectionType: 'FORMWORK',
        discipline: 'CIVIL',
        title: 'Column Formwork Staging Inspection',
        location: 'Level 1 Column C-12',
        element: 'Formwork & Staging',
      },
    });
    const created = await inspectionController.create(createReq);
    const inspectionId = created.data.id;

    // SUBMIT
    const submitReq = createAuthReq(tokenSiteEngA, { params: { id: inspectionId } });
    const subRes = await inspectionController.submit(submitReq);
    assert.equal(subRes.data.status, InspectionStatus.SUBMITTED);

    // SCHEDULE
    const schedDate = new Date(Date.now() + 3600000).toISOString();
    const schedReq = createAuthReq(tokenPmA, {
      params: { id: inspectionId },
      body: { plannedInspectionAt: schedDate },
    });
    const schedRes = await inspectionController.schedule(schedReq);
    assert.equal(schedRes.data.status, InspectionStatus.SCHEDULED);

    // START
    const startReq = createAuthReq(tokenSiteEngA, { params: { id: inspectionId } });
    const startRes = await inspectionController.start(startReq);
    assert.equal(startRes.data.status, InspectionStatus.IN_PROGRESS);
  });

  it('5. should enforce checklist evaluation rules: pending blocks evaluation & N/A requires justification', async () => {
    const createReq = createAuthReq(tokenSiteEngA, {
      body: {
        projectId: projectAId,
        inspectionType: 'WATERPROOFING',
        discipline: 'CIVIL',
        title: 'Podium Waterproofing Membrane Check',
        location: 'Podium Deck Phase 1',
        element: 'Bituminous Membrane',
      },
    });
    const created = await inspectionController.create(createReq);
    const inspectionId = created.data.id;

    // Submit -> Schedule -> Start
    await inspectionController.submit(createAuthReq(tokenSiteEngA, { params: { id: inspectionId } }));
    await inspectionController.schedule(createAuthReq(tokenPmA, { params: { id: inspectionId }, body: { plannedInspectionAt: new Date().toISOString() } }));
    await inspectionController.start(createAuthReq(tokenSiteEngA, { params: { id: inspectionId } }));

    const inspection = await prisma.inspectionRequest.findUnique({
      where: { id: inspectionId },
      include: { checklistItems: true },
    });
    const items = inspection.checklistItems;

    // 1. Try evaluation with PENDING checkpoints (Must Fail)
    const evalPendingReq = createAuthReq(tokenSiteEngA, {
      params: { id: inspectionId },
      body: {
        remarks: 'Evaluation submitted while items pending',
      },
    });
    await assert.rejects(async () => {
      await inspectionController.submitEvaluation(evalPendingReq);
    }, /Cannot submit evaluation: all checkpoints must be evaluated/);

    // 2. Try setting NOT_APPLICABLE without >= 5 chars remarks (Must Fail)
    const evalNaNoRemarksReq = createAuthReq(tokenSiteEngA, {
      params: { id: inspectionId },
      body: {
        evaluations: [
          { checklistItemId: items[0].id, result: ChecklistResult.NOT_APPLICABLE, remarks: 'no' },
        ],
      },
    });
    await assert.rejects(async () => {
      await inspectionController.evaluateChecklistItems(evalNaNoRemarksReq);
    }, /Justification remarks \(at least 5 characters\) are mandatory/);

    // 3. Set valid evaluations
    const validEvals = items.map((item: any) => ({
      checklistItemId: item.id,
      result: ChecklistResult.PASS,
      measuredValue: item.itemType === 'LABORATORY_TEST' || item.itemType === 'FIELD_TEST' ? 24.5 : undefined,
      unit: item.itemType === 'LABORATORY_TEST' || item.itemType === 'FIELD_TEST' ? 'MPa' : undefined,
      remarks: 'Conforming per design specification',
    }));

    const evaluateReq = createAuthReq(tokenSiteEngA, {
      params: { id: inspectionId },
      body: { evaluations: validEvals },
    });
    const evalRes = await inspectionController.evaluateChecklistItems(evaluateReq);
    assert.equal(evalRes.success, true);

    // Submit evaluation -> PENDING_APPROVAL
    const submitEvalReq = createAuthReq(tokenSiteEngA, {
      params: { id: inspectionId },
      body: { remarks: 'All items conform to QA plan' },
    });
    const evalSubmitRes = await inspectionController.submitEvaluation(submitEvalReq);
    assert.equal(evalSubmitRes.data.status, InspectionStatus.PENDING_APPROVAL);
    assert.equal(evalSubmitRes.data.inspectedById, siteEngAId);
  });

  it('6. should enforce Segregation of Duties (SoD) on formal approval (approvedById !== requestedById)', async () => {
    // Site Engineer requested the inspection
    const createReq = createAuthReq(tokenSiteEngA, {
      body: {
        projectId: projectAId,
        inspectionType: 'SCAFFOLDING',
        discipline: 'SAFETY_EHS',
        title: 'Cuplok Scaffolding Pre-Use Inspection',
        location: 'Tower A External Facade',
        element: 'Facade Scaffolding Staging',
      },
    });
    const created = await inspectionController.create(createReq);
    const inspectionId = created.data.id;

    // Fast-track to PENDING_APPROVAL
    await inspectionController.submit(createAuthReq(tokenSiteEngA, { params: { id: inspectionId } }));
    await inspectionController.schedule(createAuthReq(tokenPmA, { params: { id: inspectionId }, body: { plannedInspectionAt: new Date().toISOString() } }));
    await inspectionController.start(createAuthReq(tokenSiteEngA, { params: { id: inspectionId } }));

    const inspection = await prisma.inspectionRequest.findUnique({
      where: { id: inspectionId },
      include: { checklistItems: true },
    });
    const validEvals = inspection.checklistItems.map((item: any) => ({
      checklistItemId: item.id,
      result: ChecklistResult.PASS,
      remarks: 'Verified safe',
    }));
    await inspectionController.evaluateChecklistItems(createAuthReq(tokenSiteEngA, { params: { id: inspectionId }, body: { evaluations: validEvals } }));
    await inspectionController.submitEvaluation(createAuthReq(tokenSiteEngA, { params: { id: inspectionId }, body: { remarks: 'Inspector signoff' } }));

    // Try approval with same user who requested (SiteEngA) -> Must Fail SoD
    const sameUserApproveReq = createAuthReq(tokenSiteEngA, {
      params: { id: inspectionId },
      body: { remarks: 'Self approval attempt' },
    });
    await assert.rejects(async () => {
      await inspectionController.approve(sameUserApproveReq);
    }, /Forbidden: User lacks required permission 'quality:pour:approve'|Segregation of Duties/);

    // Approve by PM (SoD satisfied)
    const pmApproveReq = createAuthReq(tokenPmA, {
      params: { id: inspectionId },
      body: { remarks: 'Scaffolding stability certified by PM' },
    });
    const approveRes = await inspectionController.approve(pmApproveReq);
    assert.equal(approveRes.data.status, InspectionStatus.PASSED);
    assert.equal(approveRes.data.approvedById, pmAId);
  });

  it('7. should enforce Conditional Pass requirements (>= 10 chars remarks + linked QualitySafetyAction)', async () => {
    const createReq = createAuthReq(tokenSiteEngA, {
      body: {
        projectId: projectAId,
        inspectionType: 'POUR_CARD',
        discipline: 'CIVIL',
        title: 'M30 Grade Slab Pour Card with Minor Slump Tolerance',
        location: 'Zone D Level 3',
        element: 'Slab Deck',
        isHoldPoint: true,
      },
    });
    const created = await inspectionController.create(createReq);
    const inspectionId = created.data.id;

    await inspectionController.submit(createAuthReq(tokenSiteEngA, { params: { id: inspectionId } }));
    await inspectionController.schedule(createAuthReq(tokenPmA, { params: { id: inspectionId }, body: { plannedInspectionAt: new Date().toISOString() } }));
    await inspectionController.start(createAuthReq(tokenSiteEngA, { params: { id: inspectionId } }));

    const inspection = await prisma.inspectionRequest.findUnique({
      where: { id: inspectionId },
      include: { checklistItems: true },
    });
    const validEvals = inspection.checklistItems.map((item: any) => ({
      checklistItemId: item.id,
      result: ChecklistResult.PASS,
      measuredValue: item.itemType === 'FIELD_TEST' || item.itemType === 'LABORATORY_TEST' || item.itemType === 'LAB_TEST' ? 120 : undefined,
      sampleReference: item.itemType === 'FIELD_TEST' || item.itemType === 'LABORATORY_TEST' || item.itemType === 'LAB_TEST' ? 'SMP-01' : undefined,
      testMethod: item.itemType === 'FIELD_TEST' || item.itemType === 'LABORATORY_TEST' || item.itemType === 'LAB_TEST' ? 'IS:1199' : undefined,
      remarks: 'Satisfactory with condition',
    }));
    await inspectionController.evaluateChecklistItems(createAuthReq(tokenSiteEngA, { params: { id: inspectionId }, body: { evaluations: validEvals } }));
    await inspectionController.submitEvaluation(createAuthReq(tokenSiteEngA, { params: { id: inspectionId }, body: { remarks: 'Evaluated' } }));

    // 1. Try conditional pass without actionTitle (Must Fail)
    const condNoActionReq = createAuthReq(tokenPmA, {
      params: { id: inspectionId },
      body: {
        conditionalRemarks: 'Slump test margin low, extra vibrator on standby required.',
      },
    });
    await assert.rejects(async () => {
      await inspectionController.conditionalPass(condNoActionReq);
    }, /ValidationError|Input validation failed/);

    // 2. Try conditional pass with short remarks (Must Fail)
    const condShortRemarksReq = createAuthReq(tokenPmA, {
      params: { id: inspectionId },
      body: {
        conditionalRemarks: 'Fix it',
        actionTitle: 'Deploy standby poker vibrators',
        actionDescription: 'Ensure 2 spare 60mm needle vibrators on site',
        assignedToId: employeeAId,
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      },
    });
    await assert.rejects(async () => {
      await inspectionController.conditionalPass(condShortRemarksReq);
    }, /ValidationError|Input validation failed/);

    // 3. Valid Conditional Pass
    const validCondReq = createAuthReq(tokenPmA, {
      params: { id: inspectionId },
      body: {
        conditionalRemarks: 'Conditional approval granted: Standby poker vibrators and generator to be stationed before batching.',
        actionTitle: 'Station standby vibrator & generator',
        actionDescription: 'Ensure 2 spare 60mm needle vibrators and backup diesel genset are verified on site before batching starts',
        assignedToId: employeeAId,
        priority: 'HIGH',
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      },
    });
    const condRes = await inspectionController.conditionalPass(validCondReq);
    assert.equal(condRes.data.status, InspectionStatus.CONDITIONALLY_PASSED);
    assert.ok(condRes.data.conditionalActionId);
  });

  it('8. should verify HoldPoint advisory service assertHoldPointReleased() behavior', async () => {
    // 1. Hold Point in DRAFT -> NOT_RELEASED
    const draftInsp = await prisma.inspectionRequest.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        inspectionNumber: 'INSP-2026-TEST01',
        inspectionType: 'POUR_CARD',
        discipline: 'CIVIL',
        title: 'Draft Hold Point',
        location: 'Loc A',
        element: 'Elem A',
        isHoldPoint: true,
        requestedById: siteEngAId,
        status: InspectionStatus.DRAFT,
      },
    });
    const ctx = { tenantId: tenantAId, user: { id: siteEngAId } };
    const draftRelease = await inspectionService.assertHoldPointReleased(ctx, draftInsp.id);
    assert.equal(draftRelease.released, false);
    assert.equal(draftRelease.releaseType, 'NOT_RELEASED');

    // 2. Non-hold-point inspection -> error / not a hold point
    const nonHoldInsp = await prisma.inspectionRequest.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        inspectionNumber: 'INSP-2026-TEST02',
        inspectionType: 'POUR_CARD',
        discipline: 'CIVIL',
        title: 'Non Hold Point',
        location: 'Loc B',
        element: 'Elem B',
        isHoldPoint: false,
        requestedById: siteEngAId,
        status: InspectionStatus.PASSED,
      },
    });
    await assert.rejects(async () => {
      await inspectionService.assertHoldPointReleased(ctx, nonHoldInsp.id);
    }, /is not a designated Hold Point/);

    // 3. PASSED Hold Point -> UNCONDITIONAL
    const passedInsp = await prisma.inspectionRequest.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        inspectionNumber: 'INSP-2026-TEST03',
        inspectionType: 'POUR_CARD',
        discipline: 'CIVIL',
        title: 'Passed Hold Point',
        location: 'Loc C',
        element: 'Elem C',
        isHoldPoint: true,
        requestedById: siteEngAId,
        status: InspectionStatus.PASSED,
      },
    });
    const passedRelease = await inspectionService.assertHoldPointReleased(ctx, passedInsp.id);
    assert.equal(passedRelease.released, true);
    assert.equal(passedRelease.releaseType, 'UNCONDITIONAL');
  });

  it('9. should handle reinspection lineage maintaining immutable provenance', async () => {
    // 1. Create and Reject an inspection
    const origReq = createAuthReq(tokenSiteEngA, {
      body: {
        projectId: projectAId,
        inspectionType: 'STRUCTURAL_STEEL',
        discipline: 'STRUCTURAL',
        title: 'Fe500D TMT Steel Consignment Inward QA',
        location: 'Central Batching Yard',
        element: '16mm & 20mm TMT Bundles',
      },
    });
    const origCreated = await inspectionController.create(origReq);
    const origId = origCreated.data.id;

    await inspectionController.submit(createAuthReq(tokenSiteEngA, { params: { id: origId } }));
    await inspectionController.schedule(createAuthReq(tokenPmA, { params: { id: origId }, body: { plannedInspectionAt: new Date().toISOString() } }));
    await inspectionController.start(createAuthReq(tokenSiteEngA, { params: { id: origId } }));

    const inspection = await prisma.inspectionRequest.findUnique({
      where: { id: origId },
      include: { checklistItems: true },
    });
    const failEvals = inspection.checklistItems.map((item: any, idx: number) => ({
      checklistItemId: item.id,
      result: idx === 0 ? ChecklistResult.FAIL : ChecklistResult.PASS,
      remarks: idx === 0 ? 'Mill test certificate heat number mismatch' : 'Acceptable',
    }));
    await inspectionController.evaluateChecklistItems(createAuthReq(tokenSiteEngA, { params: { id: origId }, body: { evaluations: failEvals } }));
    await inspectionController.submitEvaluation(createAuthReq(tokenSiteEngA, { params: { id: origId }, body: { remarks: 'Inspector rejection recommended' } }));
    const rejectedRes = await inspectionController.reject(createAuthReq(tokenPmA, { params: { id: origId }, body: { rejectionReason: 'Material heat certificate invalid.' } }));
    assert.equal(rejectedRes.data.status, InspectionStatus.REJECTED);

    // 2. Create Reinspection referencing original
    const reinspectReq = createAuthReq(tokenSiteEngA, {
      body: {
        projectId: projectAId,
        inspectionType: 'STRUCTURAL_STEEL',
        discipline: 'STRUCTURAL',
        title: 'Fe500D TMT Steel Consignment Re-Inspection',
        location: 'Central Batching Yard',
        element: '16mm & 20mm TMT Bundles (Revised MTC)',
        originalInspectionRequestId: origId,
      },
    });
    const reinspectRes = await inspectionController.create(reinspectReq);
    assert.equal(reinspectRes.success, true);
    assert.equal(reinspectRes.data.originalInspectionRequestId, origId);

    // Verify original remains REJECTED
    const origCheck = await prisma.inspectionRequest.findUnique({ where: { id: origId } });
    assert.equal(origCheck.status, InspectionStatus.REJECTED);
  });
});
