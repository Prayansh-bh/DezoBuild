import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service.js';
import { NcrController } from '../src/modules/quality/controllers/ncr.controller.js';
import { ActionController } from '../src/modules/quality/controllers/action.controller.js';
import { NcrService } from '../src/modules/quality/services/ncr.service.js';
import { ActionService } from '../src/modules/quality/services/action.service.js';
import { NcrRepository } from '../src/modules/quality/repositories/ncr.repository.js';
import { ActionRepository } from '../src/modules/quality/repositories/action.repository.js';
import { QualitySafetyAuditRepository } from '../src/modules/quality/repositories/quality-safety-audit.repository.js';
import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';
import { NcrStatus, ActionStatus, NcrSeverity } from '../src/modules/quality/constants/quality.constants.js';

describe('DEZOBUILD Phase 13 — NCR & Quality/Safety Action (CAPA) Integration Suite', () => {
  let dbService: DatabaseService;
  let ncrController: NcrController;
  let actionController: ActionController;
  let ncrService: NcrService;
  let actionService: ActionService;
  let tokenService: TokenService;
  let prisma: any;

  const tenantAId = 'ee130002-aaaa-0001-aaaa-111111111111';
  const ownerAId = 'ee130002-1111-0001-aaaa-111111111111';
  const pmAId = 'ee130002-2222-0001-aaaa-111111111111';
  const siteEngAId = 'ee130002-3333-0001-aaaa-111111111111';

  const tenantBId = 'ee130002-bbbb-0001-bbbb-111111111111';
  const ownerBId = 'ee130002-1111-0001-bbbb-111111111111';

  let tokenOwnerA: string;
  let tokenPmA: string;
  let tokenSiteEngA: string;
  let tokenOwnerB: string;

  let companyAId: string;
  let branchAId: string;
  let projectAId: string;
  let employeeAId: string;
  let vendorAId: string;

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
    const ncrRepo = new NcrRepository(prisma);
    const actionRepo = new ActionRepository(prisma);

    actionService = new ActionService(prisma, actionRepo, auditRepo);
    ncrService = new NcrService(prisma, ncrRepo, auditRepo);

    ncrController = new NcrController(ncrService);
    actionController = new ActionController(actionService);

    tokenService = TokenService.getInstance();

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Clean fixtures
    await prisma.qualitySafetyAuditLog.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.qualitySafetyAction.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.nonConformanceReport.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
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
    await prisma.tenant.create({ data: { id: tenantAId, name: 'Tenant NCR A', code: 'TEN-NCR-A', status: 'ACTIVE' } });
    const compA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        code: 'COMP-NCR-A',
        name: 'Company NCR A',
        legalName: 'Company NCR A Corp',
        panNumber: 'AAAAA0000A',
        gstin: '27AAAAA0000A1Z5',
        email: 'info@ncr-a.com',
        phone: '9999999991',
        address: '100 NCR Tower',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        status: 'ACTIVE',
      },
    });
    companyAId = compA.id;
    const brA = await prisma.branch.create({
      data: { tenantId: tenantAId, companyId: companyAId, name: 'Branch NCR', code: 'BR-NCR-A', gstin: '27AAAAA0000A1Z5', city: 'Mumbai', state: 'Maharashtra', status: 'ACTIVE' },
    });
    branchAId = brA.id;

    const projA = await prisma.project.create({ data: { tenantId: tenantAId, companyId: companyAId, name: 'Project NCR Hub', code: 'PRJ-NCR-01', status: 'ACTIVE' } });
    projectAId = projA.id;

    const empA = await prisma.employee.create({ data: { tenantId: tenantAId, companyId: companyAId, branchId: branchAId, employeeNumber: 'EMP-NCR-001', fullName: 'Sarah Engineer', designation: 'QA Inspector', employmentType: 'FULL_TIME', employmentStatus: 'ACTIVE', joiningDate: new Date() } });
    employeeAId = empA.id;

    const vendA = await prisma.vendor.create({ data: { tenantId: tenantAId, name: 'Mega Rebar Fabrication Ltd', code: 'VEND-NCR-001', status: 'ACTIVE' } });
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

    // Seed Users & Roles
    const ownerRole = await prisma.role.findFirst({ where: { name: 'COMPANY_OWNER' } });
    const pmRole = await prisma.role.findFirst({ where: { name: 'PROJECT_MANAGER' } });
    const siteEngRole = await prisma.role.findFirst({ where: { name: 'SITE_ENGINEER' } });

    await prisma.user.create({ data: { id: ownerAId, tenantId: tenantAId, email: 'owner@ncr-a.com', fullName: 'NCR Owner A', passwordHash: 'hash', status: 'ACTIVE' } });
    await prisma.user.create({ data: { id: pmAId, tenantId: tenantAId, email: 'pm@ncr-a.com', fullName: 'NCR PM A', passwordHash: 'hash', status: 'ACTIVE' } });
    await prisma.user.create({ data: { id: siteEngAId, tenantId: tenantAId, email: 'siteeng@ncr-a.com', fullName: 'NCR SiteEng A', passwordHash: 'hash', status: 'ACTIVE' } });

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

    // Tenant B
    await prisma.tenant.create({ data: { id: tenantBId, name: 'Tenant NCR B', code: 'TEN-NCR-B', status: 'ACTIVE' } });
    const compB = await prisma.company.create({
      data: {
        tenantId: tenantBId,
        code: 'COMP-NCR-B',
        name: 'Company B',
        legalName: 'Company B Inc',
        panNumber: 'BBBBB0000B',
        gstin: '27BBBBB0000B1Z5',
        email: 'info@ncr-b.com',
        phone: '9999999992',
        address: '200 NCR Tower',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        status: 'ACTIVE',
      },
    });
    await prisma.user.create({ data: { id: ownerBId, tenantId: tenantBId, email: 'owner@ncr-b.com', fullName: 'Owner B', passwordHash: 'hash', status: 'ACTIVE' } });
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

    tokenOwnerA = tokenService.createAccessToken({ userId: ownerAId, tenantId: tenantAId, sessionId: 's-1', sessionVersion: 1 });
    tokenPmA = tokenService.createAccessToken({ userId: pmAId, tenantId: tenantAId, sessionId: 's-2', sessionVersion: 1 });
    tokenSiteEngA = tokenService.createAccessToken({ userId: siteEngAId, tenantId: tenantAId, sessionId: 's-3', sessionVersion: 1 });
    tokenOwnerB = tokenService.createAccessToken({ userId: ownerBId, tenantId: tenantBId, sessionId: 's-4', sessionVersion: 1 });
  });

  after(async () => {
    await prisma.qualitySafetyAuditLog.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.qualitySafetyAction.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.nonConformanceReport.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
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

  it('1. should create an NCR with advisory lock numbering (NCR-YYYY-000001) and severity', async () => {
    const targetDate = new Date(Date.now() + 7 * 86400000).toISOString();
    const req = createAuthReq(tokenSiteEngA, {
      body: {
        projectId: projectAId,
        title: 'Severe Honeycombing in Shear Wall SW-04',
        description: 'Honeycombing observed extending beyond cover concrete into core rebar zone.',
        location: 'Basement 1, Grid C4-D4',
        category: 'WORKMANSHIP',
        severity: NcrSeverity.MAJOR,
        responsibleParty: 'SUBCONTRACTOR',
        responsibleVendorId: vendorAId,
        targetClosureDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      },
    });

    const res = await ncrController.create(req);
    assert.equal(res.success, true);
    assert.equal(res.data.status, NcrStatus.OPEN);
    assert.ok(res.data.ncrNumber.startsWith('NCR-'));
    assert.equal(res.data.severity, NcrSeverity.MAJOR);
    assert.equal(res.data.raisedById, siteEngAId);
  });

  it('2. should enforce QualitySafetyAction Source XOR and Assignee XOR', async () => {
    // 1. Source XOR violation (No source provided)
    const noSourceReq = createAuthReq(tokenSiteEngA, {
      body: {
        projectId: projectAId,
        title: 'Orphan Action',
        description: 'Action without source entity',
        actionType: 'CORRECTIVE',
        priority: 'MEDIUM',
        assignedToId: employeeAId,
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      },
    });
    await assert.rejects(async () => {
      await actionController.create(noSourceReq);
    }, /ValidationError|Input validation failed/);

    // 2. Assignee XOR violation (Both employee and vendor provided)
    // Create an NCR first
    const ncrRes = await ncrController.create(createAuthReq(tokenSiteEngA, {
      body: {
        projectId: projectAId,
        title: 'Rebar Spacing Discrepancy',
        description: 'Main bar spacing at 250mm c/c instead of approved 150mm c/c.',
        location: 'Ground Floor Column C-08',
        category: 'WORKMANSHIP',
        severity: NcrSeverity.MINOR,
        targetClosureDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      },
    }));
    const ncrId = ncrRes.data.id;

    const bothAssigneeReq = createAuthReq(tokenSiteEngA, {
      body: {
        projectId: projectAId,
        ncrId,
        title: 'Double assigned action',
        description: 'Action with both employee and vendor',
        actionType: 'CORRECTIVE',
        priority: 'HIGH',
        assignedToId: employeeAId,
        assignedVendorId: vendorAId,
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      },
    });
    await assert.rejects(async () => {
      await actionController.create(bothAssigneeReq);
    }, /ValidationError|Input validation failed/);

    // 3. Valid Action with Vendor assignee
    const validVendorActionReq = createAuthReq(tokenSiteEngA, {
      body: {
        projectId: projectAId,
        ncrId,
        title: 'Re-align column vertical bars to 150mm c/c',
        description: 'Subcontractor crew to untie and adjust vertical bar layout per drawing Rev 3',
        actionType: 'CORRECTIVE',
        priority: 'HIGH',
        assignedVendorId: vendorAId,
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      },
    });
    const actionRes = await actionController.create(validVendorActionReq);
    assert.equal(actionRes.success, true);
    assert.ok(actionRes.data.actionNumber.startsWith('ACT-'));
    assert.equal(actionRes.data.status, ActionStatus.OPEN);
    assert.equal(actionRes.data.assignedVendorId, vendorAId);
  });

  it('3. should enforce full Action lifecycle (OPEN -> IN_PROGRESS -> COMPLETED -> VERIFIED) with verification SoD', async () => {
    // Create NCR and Action
    const ncr = await prisma.nonConformanceReport.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        ncrNumber: 'NCR-2026-TEST-001',
        title: 'Test NCR for CAPA lifecycle',
        description: 'Test description',
        location: 'Zone A',
        category: 'FINISHES',
        severity: NcrSeverity.MINOR,
        status: NcrStatus.ACTION_REQUIRED,
        raisedById: siteEngAId,
        targetClosureDate: new Date(Date.now() + 86400000),
      },
    });

    const action = await prisma.qualitySafetyAction.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        ncrId: ncr.id,
        actionNumber: 'ACT-2026-TEST-001',
        title: 'Patch and repair surface void',
        actionType: 'CORRECTIVE',
        description: 'Use non-shrink polymer modified mortar',
        priority: 'MEDIUM',
        status: ActionStatus.OPEN,
        assignedToId: employeeAId,
        dueDate: new Date(Date.now() + 86400000),
        createdById: siteEngAId,
      },
    });

    // 1. START: OPEN -> IN_PROGRESS
    const startRes = await actionController.start(createAuthReq(tokenSiteEngA, { params: { id: action.id } }));
    assert.equal(startRes.data.status, ActionStatus.IN_PROGRESS);

    // 2. COMPLETE: IN_PROGRESS -> COMPLETED
    const completeRes = await actionController.complete(createAuthReq(tokenSiteEngA, {
      params: { id: action.id },
      body: { completionNotes: 'Micro-concrete patching completed with 3-day wet curing.' },
    }));
    assert.equal(completeRes.data.status, ActionStatus.COMPLETED);
    assert.equal(completeRes.data.completedById, siteEngAId);

    // 3. VERIFY SoD: completedById cannot verify! (siteEngA completed it)
    const selfVerifyReq = createAuthReq(tokenSiteEngA, {
      params: { id: action.id },
      body: { verificationRemarks: 'Self verification attempt' },
    });
    await assert.rejects(async () => {
      await actionController.verify(selfVerifyReq);
    }, /Forbidden: User lacks required permission 'quality:ncr:verify'|Segregation of Duties/);

    // 4. VERIFY by PM (SoD satisfied)
    const pmVerifyReq = createAuthReq(tokenPmA, {
      params: { id: action.id },
      body: { verificationRemarks: 'Inspected rebound hammer test on repaired zone. Compressive strength 32 MPa achieved.' },
    });
    const verifyRes = await actionController.verify(pmVerifyReq);
    assert.equal(verifyRes.data.status, ActionStatus.VERIFIED);
    assert.equal(verifyRes.data.verifiedById, pmAId);
  });

  it('4. should enforce CAPA reassignment restrictions (forbidden in COMPLETED/VERIFIED/CANCELLED)', async () => {
    const ncr = await prisma.nonConformanceReport.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        ncrNumber: 'NCR-2026-REASSIGN-01',
        title: 'NCR for reassignment test',
        description: 'Test description',
        location: 'Zone B',
        category: 'FINISHES',
        severity: NcrSeverity.MINOR,
        status: NcrStatus.ACTION_REQUIRED,
        raisedById: siteEngAId,
        targetClosureDate: new Date(Date.now() + 86400000),
      },
    });

    const action = await prisma.qualitySafetyAction.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        ncrId: ncr.id,
        actionNumber: 'ACT-2026-REASSIGN-01',
        title: 'Reassignment test action',
        actionType: 'PREVENTIVE',
        description: 'Test reassignment rules',
        priority: 'LOW',
        status: ActionStatus.COMPLETED,
        assignedToId: employeeAId,
        dueDate: new Date(Date.now() + 86400000),
        createdById: siteEngAId,
        completedById: siteEngAId,
        completedAt: new Date(),
      },
    });

    const reassignReq = createAuthReq(tokenPmA, {
      params: { id: action.id },
      body: {
        assignedVendorId: vendorAId,
        reason: 'Reassigning after completion attempt',
      },
    });
    await assert.rejects(async () => {
      await actionController.reassign(reassignReq);
    }, /Cannot reassign action in COMPLETED status/);
  });

  it('5. should enforce full NCR lifecycle with closure validation and verifier SoD', async () => {
    // 1. Create NCR
    const ncrRes = await ncrController.create(createAuthReq(tokenSiteEngA, {
      body: {
        projectId: projectAId,
        title: 'Cold joint in column pour',
        description: 'Unplanned delay during batching caused 90 min stoppage without retarder.',
        location: 'Grid E2 Column',
        category: 'WORKMANSHIP',
        severity: NcrSeverity.MAJOR,
        targetClosureDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      },
    }));
    const ncrId = ncrRes.data.id;

    // 2. Transition OPEN -> ACTION_REQUIRED
    const planReq = createAuthReq(tokenSiteEngA, {
      params: { id: ncrId },
      body: {
        rootCause: 'Batching plant transit mixer breakdown and lack of backup plant standby',
        containmentAction: 'Chipped loose slurry and treated cold joint interface with epoxy bonding agent',
        correctiveAction: 'Injected low-viscosity epoxy resin into hairline interface',
        preventiveAction: 'Mandatory dual batching plant supply agreement for all structural elements',
      },
    });
    const planRes = await ncrController.planActions(planReq);
    assert.equal(planRes.data.status, NcrStatus.ACTION_REQUIRED);

    // 3. Add active QualitySafetyAction to NCR
    const actionRes = await actionController.create(createAuthReq(tokenSiteEngA, {
      body: {
        projectId: projectAId,
        ncrId,
        title: 'Epoxy injection pressure test',
        description: 'Core drill sample and pressure inject structural epoxy resin',
        actionType: 'CORRECTIVE',
        priority: 'URGENT',
        assignedToId: employeeAId,
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      },
    }));
    const actionId = actionRes.data.id;

    // 4. Start and Complete the Action so it is ready for NCR verification
    await actionController.start(createAuthReq(tokenSiteEngA, { params: { id: actionId } }));
    await actionController.complete(createAuthReq(tokenSiteEngA, {
      params: { id: actionId },
      body: { completionNotes: 'Injection completed and cured for 48h' },
    }));

    // 5. Submit for verification (ACTION_REQUIRED -> UNDER_VERIFICATION)
    const submitVerReq = createAuthReq(tokenSiteEngA, { params: { id: ncrId } });
    const underVerRes = await ncrController.submitForVerification(submitVerReq);
    assert.equal(underVerRes.data.status, NcrStatus.UNDER_VERIFICATION);

    // 6. Try closing NCR while linked action is still COMPLETED but not yet VERIFIED (Must Fail)
    const closeWhileOpenReq = createAuthReq(tokenPmA, {
      params: { id: ncrId },
      body: { closureRemarks: 'Attempting closure before actions verified' },
    });
    await assert.rejects(async () => {
      await ncrController.close(closeWhileOpenReq);
    }, /Cannot close NCR: linked CAPA actions.*must be formally VERIFIED/);

    // 7. Verify the Action
    await actionController.verify(createAuthReq(tokenPmA, {
      params: { id: actionId },
      body: { verificationRemarks: 'Ultrasonic pulse velocity test confirms monolithic integrity' },
    }));

    // 8. Verify NCR SoD: siteEngA who raised the NCR cannot verify/close it!
    const selfCloseReq = createAuthReq(tokenSiteEngA, {
      params: { id: ncrId },
      body: { closureRemarks: 'Self closure attempt' },
    });
    await assert.rejects(async () => {
      await ncrController.close(selfCloseReq);
    }, /Forbidden: User lacks required permission 'quality:ncr:verify'|Segregation of Duties/);

    // 9. Close by PM (SoD satisfied)
    const pmCloseReq = createAuthReq(tokenPmA, {
      params: { id: ncrId },
      body: { closureRemarks: 'All structural remediation tests passed and verified. NCR closed.' },
    });
    const closedRes = await ncrController.close(pmCloseReq);
    assert.equal(closedRes.data.status, NcrStatus.CLOSED);
    assert.equal(closedRes.data.verifiedById, pmAId);
  });
});
