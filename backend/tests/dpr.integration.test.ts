import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service';
import { DprController } from '../src/modules/projects/controllers/dpr.controller';
import { TaskController } from '../src/modules/projects/controllers/task.controller';
import { WbsController } from '../src/modules/projects/controllers/wbs.controller';
import { TokenService } from '../src/modules/auth/services/token.service';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from '../src/common/errors/app-error';

describe('DEZOBUILD Phase 06.3 — Daily Progress Reports (DPR) Integration Suite', () => {
  let dbService: DatabaseService;
  let dprController: DprController;
  let taskController: TaskController;
  let wbsController: WbsController;
  let tokenService: TokenService;
  let prisma: any;

  // Tenant A: STARTER tier (has projects:core)
  const tenantAId = '88888888-aaaa-4444-aaaa-888888888888';
  const ownerAId = '88888888-1111-4444-aaaa-888888888888';
  const seAId = '88888888-2222-4444-aaaa-888888888888';
  const pmAId = '88888888-3333-4444-aaaa-888888888888';
  const empAId = '88888888-4444-4444-aaaa-888888888888';

  // Tenant B: for cross-tenant isolation testing
  const tenantBId = '88888888-bbbb-4444-bbbb-888888888888';
  const ownerBId = '88888888-1111-4444-bbbb-888888888888';

  let tokenOwnerA: string;
  let tokenSeA: string;
  let tokenPmA: string;
  let tokenEmpA: string;
  let tokenOwnerB: string;

  let projectA1Id: string;
  let projectA2Id: string;
  let projectBId: string;
  let companyAId: string;
  let companyBId: string;

  let wbsNodeId: string;
  let taskId: string;

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

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    tokenService = TokenService.getInstance();
    dprController = new DprController();
    taskController = new TaskController();
    wbsController = new WbsController();

    const starterPlan = await prisma.platformPlan.findUnique({ where: { code: 'STARTER' } });

    const roles = await prisma.role.findMany({ where: { isSystemRole: true } });
    const roleOwnerId = roles.find((r: any) => r.name === 'COMPANY_OWNER')!.id;
    const rolePmId = roles.find((r: any) => r.name === 'PROJECT_MANAGER')!.id;
    const roleSeId = roles.find((r: any) => r.name === 'SITE_ENGINEER')!.id;
    const roleEmpId = roles.find((r: any) => r.name === 'EMPLOYEE')!.id;

    // Cleanup previous test data
    const tenantIds = [tenantAId, tenantBId];
    await prisma.dprPhoto.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.dprMaterial.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.dprEquipment.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.dprManpower.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.dprActivityProgress.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.dailyProgressReport.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.taskDependency.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.task.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.wbsNode.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.projectMember.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.project.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });

    // Seed Tenant A (STARTER)
    await prisma.tenant.create({
      data: {
        id: tenantAId,
        code: 'TENANT-DPR-A',
        name: 'DPR Construction Corp',
        planTier: 'STARTER',
      },
    });
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantAId,
        planId: starterPlan!.id,
        status: 'ACTIVE',
        billingCycle: 'ANNUAL',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });

    // Seed Tenant B (STARTER)
    await prisma.tenant.create({
      data: {
        id: tenantBId,
        code: 'TENANT-DPR-B',
        name: 'Foreign DPR Corp',
        planTier: 'STARTER',
      },
    });
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantBId,
        planId: starterPlan!.id,
        status: 'ACTIVE',
        billingCycle: 'ANNUAL',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });

    // Seed Companies
    const compA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        code: 'DPR-COMP-A',
        name: 'DPR Builders Pvt Ltd',
        legalName: 'DPR Builders Private Limited',
        panNumber: 'AAACD1234A',
        gstin: '29AAACD1234A1Z5',
        email: 'info@dprbuilders.com',
        phone: '+919876543210',
        address: '100 Ring Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
      },
    });
    companyAId = compA.id;

    const compB = await prisma.company.create({
      data: {
        tenantId: tenantBId,
        code: 'DPR-COMP-B',
        name: 'Foreign Builders Ltd',
        legalName: 'Foreign Builders Limited',
        panNumber: 'AAACD5678B',
        gstin: '29AAACD5678B1Z5',
        email: 'info@foreignbuilders.com',
        phone: '+919876543211',
        address: '200 MG Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560002',
      },
    });
    companyBId = compB.id;

    // Seed Users in Tenant A
    await prisma.user.create({
      data: {
        id: ownerAId,
        tenantId: tenantAId,
        email: 'owner-dpr-a@example.com',
        fullName: 'Owner DPR A',
        passwordHash: 'hash',
        roleAssignments: {
          create: {
            tenantId: tenantAId,
            roleId: roleOwnerId,
            scopeType: 'TENANT',
          },
        },
      },
    });

    await prisma.user.create({
      data: {
        id: pmAId,
        tenantId: tenantAId,
        email: 'pm-dpr-a@example.com',
        fullName: 'Project Manager DPR A',
        passwordHash: 'hash',
        roleAssignments: {
          create: {
            tenantId: tenantAId,
            roleId: rolePmId,
            scopeType: 'TENANT',
          },
        },
      },
    });

    await prisma.user.create({
      data: {
        id: seAId,
        tenantId: tenantAId,
        email: 'se-dpr-a@example.com',
        fullName: 'Site Engineer DPR A',
        passwordHash: 'hash',
        roleAssignments: {
          create: {
            tenantId: tenantAId,
            roleId: roleSeId,
            scopeType: 'TENANT',
          },
        },
      },
    });

    await prisma.user.create({
      data: {
        id: empAId,
        tenantId: tenantAId,
        email: 'emp-dpr-a@example.com',
        fullName: 'Employee DPR A',
        passwordHash: 'hash',
        roleAssignments: {
          create: {
            tenantId: tenantAId,
            roleId: roleEmpId,
            scopeType: 'TENANT',
          },
        },
      },
    });

    // Seed User in Tenant B
    await prisma.user.create({
      data: {
        id: ownerBId,
        tenantId: tenantBId,
        email: 'owner-dpr-b@example.com',
        fullName: 'Owner DPR B',
        passwordHash: 'hash',
        roleAssignments: {
          create: {
            tenantId: tenantBId,
            roleId: roleOwnerId,
            scopeType: 'TENANT',
          },
        },
      },
    });

    // Seed Projects in Tenant A
    const pA1 = await prisma.project.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        code: 'PRJ-DPR-01',
        name: 'Skyline Towers',
        status: 'ACTIVE',
      },
    });
    projectA1Id = pA1.id;

    const pA2 = await prisma.project.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        code: 'PRJ-DPR-02',
        name: 'Orion Heights',
        status: 'ACTIVE',
      },
    });
    projectA2Id = pA2.id;

    // Seed Project in Tenant B
    const pB = await prisma.project.create({
      data: {
        tenantId: tenantBId,
        companyId: companyBId,
        code: 'PRJ-DPR-B1',
        name: 'Foreign Project B',
        status: 'ACTIVE',
      },
    });
    projectBId = pB.id;

    // Assign Project Members in Tenant A for Project A1
    await prisma.projectMember.createMany({
      data: [
        { tenantId: tenantAId, projectId: projectA1Id, userId: pmAId, projectRole: 'MANAGER', isLead: true },
        { tenantId: tenantAId, projectId: projectA1Id, userId: seAId, projectRole: 'ENGINEER', isLead: false },
      ],
    });

    // Seed a WBS Node and Task under Project A1
    const wbs = await prisma.wbsNode.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        code: '1.0',
        name: 'Substructure Works',
        progressPct: 0,
        status: 'PLANNED',
      },
    });
    wbsNodeId = wbs.id;

    const task = await prisma.task.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        wbsNodeId: wbsNodeId,
        name: 'Excavation & Piling',
        progressPct: 0,
        status: 'TODO',
      },
    });
    taskId = task.id;

    // Generate JWT Tokens
    tokenOwnerA = tokenService.createAccessToken({
      userId: ownerAId,
      tenantId: tenantAId,
      sessionId: 'sess-dpr-owner-a',
      sessionVersion: 1,
    });

    tokenPmA = tokenService.createAccessToken({
      userId: pmAId,
      tenantId: tenantAId,
      sessionId: 'sess-dpr-pm-a',
      sessionVersion: 1,
    });

    tokenSeA = tokenService.createAccessToken({
      userId: seAId,
      tenantId: tenantAId,
      sessionId: 'sess-dpr-se-a',
      sessionVersion: 1,
    });

    tokenEmpA = tokenService.createAccessToken({
      userId: empAId,
      tenantId: tenantAId,
      sessionId: 'sess-dpr-emp-a',
      sessionVersion: 1,
    });

    tokenOwnerB = tokenService.createAccessToken({
      userId: ownerBId,
      tenantId: tenantBId,
      sessionId: 'sess-dpr-owner-b',
      sessionVersion: 1,
    });
  });

  after(async () => {
    const tenantIds = [tenantAId, tenantBId];
    await prisma.dprPhoto.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.dprMaterial.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.dprEquipment.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.dprManpower.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.dprActivityProgress.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.dailyProgressReport.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.taskDependency.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.task.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.wbsNode.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.projectMember.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.project.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
    await dbService.disconnect();
  });

  // ==========================================
  // 1. CREATE DPR TESTS
  // ==========================================
  it('1. should successfully create a valid DPR in DRAFT state with all child records', async () => {
    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectA1Id },
      body: {
        reportDate: '2026-09-10',
        weather: 'SUNNY',
        temperature: '28°C',
        shift: 'GENERAL',
        safetyRemarks: 'Zero safety incidents today. Toolbox talk conducted.',
        delaysObstacles: 'None',
        generalNotes: 'Site progress on schedule.',
        activityProgress: [
          {
            taskId: taskId,
            wbsNodeId: wbsNodeId,
            activityName: 'Excavation & Piling',
            workDescription: 'Completed 100m of trench excavation',
            quantityDone: 100,
            unit: 'm',
            progressPct: 40,
          },
        ],
        manpowerLogs: [
          {
            trade: 'Masons',
            skilledCount: 10,
            unskilledCount: 15,
            supervisorCount: 2,
            remarks: 'Foundation team',
          },
        ],
        equipmentLogs: [
          {
            equipmentName: 'Excavator EX-200',
            operatingHours: 8.5,
            status: 'RUNNING',
            remarks: 'Operating smoothly',
          },
        ],
        materialLogs: [
          {
            materialName: 'OPC 53 Cement',
            quantityConsumed: 50,
            unit: 'bags',
          },
        ],
        photos: [
          {
            photoUrl: 'https://cdn.dezobuild.com/photos/site1-day1.jpg',
            caption: 'Excavator in action',
            latitude: 12.9716,
            longitude: 77.5946,
          },
        ],
      },
    });

    const res = await dprController.createDpr(req as any);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.status, 'DRAFT');
    assert.strictEqual(res.data.weather, 'SUNNY');
    assert.strictEqual(res.data.createdById, seAId);
    assert.strictEqual(res.data.activityProgress.length, 1);
    assert.strictEqual(Number(res.data.activityProgress[0].progressPct), 40);
    assert.strictEqual(res.data.manpowerLogs.length, 1);
    assert.strictEqual(res.data.equipmentLogs.length, 1);
    assert.strictEqual(res.data.materialLogs.length, 1);
    assert.strictEqual(res.data.photos.length, 1);
  });

  it('2. should reject duplicate DPR creation on the same date with 409 Conflict', async () => {
    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectA1Id },
      body: {
        reportDate: '2026-09-10',
        weather: 'CLOUDY',
      },
    });

    await assert.rejects(
      async () => dprController.createDpr(req as any),
      (err: any) => err instanceof ConflictError
    );
  });

  // ==========================================
  // 2. UPDATE DPR TESTS
  // ==========================================
  it('3. should successfully update a DRAFT DPR', async () => {
    const dpr = await prisma.dailyProgressReport.findFirst({
      where: { projectId: projectA1Id, tenantId: tenantAId },
    });

    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectA1Id, dprId: dpr.id },
      body: {
        temperature: '30°C',
        safetyRemarks: 'Updated safety remarks',
      },
    });

    const res = await dprController.updateDpr(req as any);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.temperature, '30°C');
    assert.strictEqual(res.data.safetyRemarks, 'Updated safety remarks');
  });

  // ==========================================
  // 3. SUBMISSION TESTS
  // ==========================================
  it('4. should reject submission of an empty DPR with 400 Bad Request', async () => {
    // Create an empty DPR on a new date
    const emptyDpr = await prisma.dailyProgressReport.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        dprNumber: 'DPR-EMPTY-20260911',
        reportDate: new Date('2026-09-11'),
        status: 'DRAFT',
        createdById: seAId,
      },
    });

    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectA1Id, dprId: emptyDpr.id },
      body: {},
    });

    await assert.rejects(
      async () => dprController.submitDpr(req as any),
      (err: any) => err instanceof BadRequestError
    );
  });

  it('5. should successfully submit a valid DRAFT DPR', async () => {
    const dpr = await prisma.dailyProgressReport.findFirst({
      where: { projectId: projectA1Id, reportDate: new Date('2026-09-10'), tenantId: tenantAId },
    });

    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectA1Id, dprId: dpr.id },
      body: {},
    });

    const res = await dprController.submitDpr(req as any);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.status, 'SUBMITTED');
    assert.strictEqual(res.data.submittedById, seAId);
    assert.ok(res.data.submittedAt);
  });

  it('6. should reject edits on a SUBMITTED DPR with 400 Bad Request', async () => {
    const dpr = await prisma.dailyProgressReport.findFirst({
      where: { projectId: projectA1Id, reportDate: new Date('2026-09-10'), tenantId: tenantAId },
    });

    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectA1Id, dprId: dpr.id },
      body: {
        temperature: '35°C',
      },
    });

    await assert.rejects(
      async () => dprController.updateDpr(req as any),
      (err: any) => err instanceof BadRequestError
    );
  });

  // ==========================================
  // 4. REJECTION & REVISION TESTS
  // ==========================================
  it('7. should reject a SUBMITTED DPR when manager provides rejection reason', async () => {
    const dpr = await prisma.dailyProgressReport.findFirst({
      where: { projectId: projectA1Id, reportDate: new Date('2026-09-10'), tenantId: tenantAId },
    });

    const req = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id, dprId: dpr.id },
      body: {
        rejectionReason: 'Excavation quantity mismatch with site survey.',
      },
    });

    const res = await dprController.rejectDpr(req as any);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.status, 'REJECTED');
    assert.strictEqual(res.data.rejectedById, pmAId);
    assert.strictEqual(res.data.rejectionReason, 'Excavation quantity mismatch with site survey.');
  });

  it('8. should reject REJECT action if rejectionReason is missing or empty', async () => {
    const dpr = await prisma.dailyProgressReport.findFirst({
      where: { projectId: projectA1Id, reportDate: new Date('2026-09-10'), tenantId: tenantAId },
    });

    // Reset status to SUBMITTED directly for this specific validation check
    await prisma.dailyProgressReport.update({
      where: { id: dpr.id },
      data: { status: 'SUBMITTED' },
    });

    const req = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id, dprId: dpr.id },
      body: {
        rejectionReason: '   ',
      },
    });

    await assert.rejects(
      async () => dprController.rejectDpr(req as any),
      (err: any) => err.statusCode === 400 || err.statusCode === 422
    );
  });

  it('9. should allow updating a REJECTED DPR and re-submitting it', async () => {
    const dpr = await prisma.dailyProgressReport.findFirst({
      where: { projectId: projectA1Id, reportDate: new Date('2026-09-10'), tenantId: tenantAId },
    });

    // Set to REJECTED
    await prisma.dailyProgressReport.update({
      where: { id: dpr.id },
      data: { status: 'REJECTED', rejectionReason: 'Correct quantity' },
    });

    // 1. Update rejected DPR
    const updateReq = createAuthReq(tokenSeA, {
      params: { projectId: projectA1Id, dprId: dpr.id },
      body: {
        generalNotes: 'Corrected survey quantities.',
      },
    });
    const updateRes = await dprController.updateDpr(updateReq as any);
    assert.strictEqual(updateRes.success, true);

    // 2. Re-submit
    const submitReq = createAuthReq(tokenSeA, {
      params: { projectId: projectA1Id, dprId: dpr.id },
      body: {},
    });
    const submitRes = await dprController.submitDpr(submitReq as any);
    assert.strictEqual(submitRes.success, true);
    assert.strictEqual(submitRes.data.status, 'SUBMITTED');
  });

  // ==========================================
  // 5. SEGREGATION OF DUTIES (SoD) TESTS
  // ==========================================
  it('10. STRICT SoD: Creator/Submitter cannot approve their own DPR (403 Forbidden)', async () => {
    const dpr = await prisma.dailyProgressReport.findFirst({
      where: { projectId: projectA1Id, reportDate: new Date('2026-09-10'), tenantId: tenantAId },
    });

    // Site Engineer (creator & submitter) attempts approval
    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectA1Id, dprId: dpr.id },
      body: {
        approvalRemarks: 'Self-approval attempt',
      },
    });

    await assert.rejects(
      async () => dprController.approveDpr(req as any),
      (err: any) => err instanceof ForbiddenError
    );
  });

  // ==========================================
  // 6. APPROVAL & PROGRESS COMMITMENT TESTS
  // ==========================================
  it('11. should allow Manager to approve submitted DPR and atomically commit Task/WBS progress', async () => {
    const dpr = await prisma.dailyProgressReport.findFirst({
      where: { projectId: projectA1Id, reportDate: new Date('2026-09-10'), tenantId: tenantAId },
    });

    // Check pre-condition: Task is TODO with 0% progress
    const preTask = await prisma.task.findUnique({ where: { id: taskId } });
    assert.strictEqual(Number(preTask.progressPct), 0);
    assert.strictEqual(preTask.status, 'TODO');

    const req = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id, dprId: dpr.id },
      body: {
        approvalRemarks: 'Approved by Project Manager. Excellent progress.',
      },
    });

    const res = await dprController.approveDpr(req as any);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.status, 'APPROVED');
    assert.strictEqual(res.data.approvedById, pmAId);
    assert.ok(res.data.approvedAt);

    // Verify atomic progress commitment to Task
    const postTask = await prisma.task.findUnique({ where: { id: taskId } });
    assert.strictEqual(Number(postTask.progressPct), 40);
    assert.strictEqual(postTask.status, 'IN_PROGRESS');
    assert.ok(postTask.actualStartDate);

    // Verify atomic progress commitment to WbsNode
    const postWbs = await prisma.wbsNode.findUnique({ where: { id: wbsNodeId } });
    assert.strictEqual(Number(postWbs.progressPct), 40);
    assert.strictEqual(postWbs.status, 'IN_PROGRESS');
  });

  it('12. Progress semantics: progress is absolute, not additive (100% completion marks task COMPLETED)', async () => {
    // Day 2 DPR
    const createReq = createAuthReq(tokenSeA, {
      params: { projectId: projectA1Id },
      body: {
        reportDate: '2026-09-12',
        activityProgress: [
          {
            taskId: taskId,
            wbsNodeId: wbsNodeId,
            activityName: 'Excavation & Piling Day 2',
            progressPct: 100,
          },
        ],
        manpowerLogs: [{ trade: 'Masons', skilledCount: 5, unskilledCount: 5, supervisorCount: 1 }],
      },
    });
    const dpr2 = await dprController.createDpr(createReq as any);

    // Submit Day 2
    const submitReq = createAuthReq(tokenSeA, {
      params: { projectId: projectA1Id, dprId: dpr2.data.id },
      body: {},
    });
    await dprController.submitDpr(submitReq as any);

    // Approve Day 2
    const approveReq = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id, dprId: dpr2.data.id },
      body: { approvalRemarks: 'Task completed 100%' },
    });
    await dprController.approveDpr(approveReq as any);

    // Verify Task is 100% (NOT 40 + 100 = 140) and status is COMPLETED
    const finalTask = await prisma.task.findUnique({ where: { id: taskId } });
    assert.strictEqual(Number(finalTask.progressPct), 100);
    assert.strictEqual(finalTask.status, 'COMPLETED');
    assert.ok(finalTask.actualEndDate);
  });

  // ==========================================
  // 7. IMMUTABILITY & TERMINAL STATE TESTS
  // ==========================================
  it('13. Approved DPR is permanently immutable (cannot edit, submit, reject, or re-approve)', async () => {
    const approvedDpr = await prisma.dailyProgressReport.findFirst({
      where: { projectId: projectA1Id, status: 'APPROVED', tenantId: tenantAId },
    });

    // Edit attempt
    const editReq = createAuthReq(tokenSeA, {
      params: { projectId: projectA1Id, dprId: approvedDpr.id },
      body: { temperature: '22°C' },
    });
    await assert.rejects(
      async () => dprController.updateDpr(editReq as any),
      (err: any) => err instanceof BadRequestError
    );

    // Second approval attempt
    const reApproveReq = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id, dprId: approvedDpr.id },
      body: {},
    });
    await assert.rejects(
      async () => dprController.approveDpr(reApproveReq as any),
      (err: any) => err instanceof BadRequestError
    );

    // Reject attempt on approved DPR
    const rejectReq = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id, dprId: approvedDpr.id },
      body: { rejectionReason: 'Too late' },
    });
    await assert.rejects(
      async () => dprController.rejectDpr(rejectReq as any),
      (err: any) => err instanceof BadRequestError
    );
  });

  it('14. Approved DPR cannot be deleted', async () => {
    const approvedDpr = await prisma.dailyProgressReport.findFirst({
      where: { projectId: projectA1Id, status: 'APPROVED', tenantId: tenantAId },
    });

    const req = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id, dprId: approvedDpr.id },
    });

    await assert.rejects(
      async () => dprController.deleteDpr(req as any),
      (err: any) => err instanceof BadRequestError
    );
  });

  // ==========================================
  // 8. SECURITY, CROSS-TENANT & SCOPING TESTS
  // ==========================================
  it('15. Cross-tenant access: Tenant B cannot view Tenant A DPRs (403 Forbidden)', async () => {
    const dprA = await prisma.dailyProgressReport.findFirst({
      where: { projectId: projectA1Id, tenantId: tenantAId },
    });

    const req = createAuthReq(tokenOwnerB, {
      params: { projectId: projectA1Id, dprId: dprA.id },
    });

    await assert.rejects(
      async () => dprController.getDpr(req as any),
      (err: any) => err instanceof ForbiddenError
    );
  });

  it('16. Cross-tenant mutation: Tenant B cannot mutate Tenant A DPRs (403 Forbidden)', async () => {
    const req = createAuthReq(tokenOwnerB, {
      params: { projectId: projectA1Id },
      body: {
        reportDate: '2026-09-15',
      },
    });

    await assert.rejects(
      async () => dprController.createDpr(req as any),
      (err: any) => err instanceof ForbiddenError
    );
  });

  it('17. Unassigned project access: User without membership in Project A2 is denied', async () => {
    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectA2Id },
      body: {
        reportDate: '2026-09-10',
      },
    });

    await assert.rejects(
      async () => dprController.createDpr(req as any),
      (err: any) => err instanceof ForbiddenError
    );
  });

  it('18. Foreign task reference: Referencing a Task belonging to another project is denied (400 Bad Request)', async () => {
    // Task in another project
    const foreignTask = await prisma.task.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA2Id,
        name: 'Foreign Task In Project A2',
      },
    });

    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectA1Id },
      body: {
        reportDate: '2026-09-16',
        activityProgress: [
          {
            taskId: foreignTask.id,
            activityName: 'Illegal Foreign Task Activity',
            progressPct: 50,
          },
        ],
      },
    });

    await assert.rejects(
      async () => dprController.createDpr(req as any),
      (err: any) => err instanceof BadRequestError
    );
  });

  it('19. Permissions check: EMPLOYEE without projects:dpr:create is denied', async () => {
    const req = createAuthReq(tokenEmpA, {
      params: { projectId: projectA1Id },
      body: {
        reportDate: '2026-09-17',
      },
    });

    await assert.rejects(
      async () => dprController.createDpr(req as any),
      (err: any) => err instanceof ForbiddenError
    );
  });

  it('20. Delete draft DPR succeeds and cascades child records', async () => {
    // Create a draft DPR
    const draft = await prisma.dailyProgressReport.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        dprNumber: 'DPR-DEL-20260920',
        reportDate: new Date('2026-09-20'),
        status: 'DRAFT',
        createdById: seAId,
        manpowerLogs: {
          create: [{ tenantId: tenantAId, trade: 'Helpers', skilledCount: 2, unskilledCount: 2, supervisorCount: 1 }],
        },
      },
    });

    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectA1Id, dprId: draft.id },
    });

    const res = await dprController.deleteDpr(req as any);
    assert.strictEqual(res.success, true);

    // Verify deleted from DB
    const checkDpr = await prisma.dailyProgressReport.findUnique({ where: { id: draft.id } });
    assert.strictEqual(checkDpr, null);
    const checkManpower = await prisma.dprManpower.findMany({ where: { dprId: draft.id } });
    assert.strictEqual(checkManpower.length, 0);
  });

  // ==========================================
  // 9. ADDITIONAL TRANSITION & SECURITY TESTS
  // ==========================================
  it('21. Invalid state transitions: cannot approve DRAFT directly (400 Bad Request)', async () => {
    const draft = await prisma.dailyProgressReport.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        dprNumber: 'DPR-INVALID-1',
        reportDate: new Date('2026-09-21'),
        status: 'DRAFT',
        createdById: seAId,
      },
    });

    const req = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id, dprId: draft.id },
      body: {},
    });

    await assert.rejects(
      async () => dprController.approveDpr(req as any),
      (err: any) => err instanceof BadRequestError
    );
  });

  it('22. Invalid state transitions: cannot reject DRAFT directly (400 Bad Request)', async () => {
    const draft = await prisma.dailyProgressReport.findFirst({
      where: { dprNumber: 'DPR-INVALID-1' },
    });

    const req = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id, dprId: draft.id },
      body: { rejectionReason: 'Cannot reject draft' },
    });

    await assert.rejects(
      async () => dprController.rejectDpr(req as any),
      (err: any) => err instanceof BadRequestError
    );
  });

  it('23. Invalid state transitions: cannot approve REJECTED directly (400 Bad Request)', async () => {
    const rejectedDpr = await prisma.dailyProgressReport.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        dprNumber: 'DPR-INVALID-2',
        reportDate: new Date('2026-09-22'),
        status: 'REJECTED',
        createdById: seAId,
        rejectionReason: 'Needs revision',
      },
    });

    const req = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id, dprId: rejectedDpr.id },
      body: {},
    });

    await assert.rejects(
      async () => dprController.approveDpr(req as any),
      (err: any) => err instanceof BadRequestError
    );
  });

  it('24. Foreign WBS reference: referencing a WBS node from another project is denied (400 Bad Request)', async () => {
    const foreignWbs = await prisma.wbsNode.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA2Id,
        code: '2.0',
        name: 'Foreign WBS Node in A2',
      },
    });

    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectA1Id },
      body: {
        reportDate: '2026-09-23',
        activityProgress: [
          {
            wbsNodeId: foreignWbs.id,
            activityName: 'Illegal WBS Node Reference',
            progressPct: 30,
          },
        ],
      },
    });

    await assert.rejects(
      async () => dprController.createDpr(req as any),
      (err: any) => err instanceof BadRequestError
    );
  });

  it('25. Permission denial: Site Engineer cannot approve DPR (lacks projects:dpr:approve)', async () => {
    const submitted = await prisma.dailyProgressReport.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        dprNumber: 'DPR-SUBMITTED-SE-TEST',
        reportDate: new Date('2026-09-24'),
        status: 'SUBMITTED',
        createdById: ownerAId,
      },
    });

    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectA1Id, dprId: submitted.id },
      body: {},
    });

    await assert.rejects(
      async () => dprController.approveDpr(req as any),
      (err: any) => err instanceof ForbiddenError
    );
  });

  it('26. Permission denial: Employee cannot submit DPR (lacks projects:dpr:submit)', async () => {
    const draft = await prisma.dailyProgressReport.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        dprNumber: 'DPR-EMP-SUBMIT-TEST',
        reportDate: new Date('2026-09-25'),
        status: 'DRAFT',
        createdById: ownerAId,
        manpowerLogs: {
          create: [{ tenantId: tenantAId, trade: 'Masons', skilledCount: 1 }],
        },
      },
    });

    const req = createAuthReq(tokenEmpA, {
      params: { projectId: projectA1Id, dprId: draft.id },
      body: {},
    });

    await assert.rejects(
      async () => dprController.submitDpr(req as any),
      (err: any) => err instanceof ForbiddenError
    );
  });

  it('27. Delete denial: Cannot delete SUBMITTED or REJECTED DPRs', async () => {
    const submitted = await prisma.dailyProgressReport.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        dprNumber: 'DPR-DEL-SUBMITTED',
        reportDate: new Date('2026-09-26'),
        status: 'SUBMITTED',
        createdById: seAId,
      },
    });

    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectA1Id, dprId: submitted.id },
    });

    await assert.rejects(
      async () => dprController.deleteDpr(req as any),
      (err: any) => err instanceof BadRequestError
    );
  });

  it('28. List and filter DPRs by status and date range', async () => {
    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectA1Id },
      query: {
        status: 'APPROVED',
        startDate: '2026-09-01',
        endDate: '2026-09-30',
      },
    });

    const res = await dprController.listDprs(req as any);
    assert.strictEqual(res.success, true);
    assert.ok(res.data.items.length >= 1);
    assert.ok(res.data.items.every((item) => item.status === 'APPROVED'));
  });

  it('29. Get single DPR details with child items', async () => {
    const approved = await prisma.dailyProgressReport.findFirst({
      where: { projectId: projectA1Id, status: 'APPROVED', tenantId: tenantAId },
    });

    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectA1Id, dprId: approved.id },
    });

    const res = await dprController.getDpr(req as any);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.id, approved.id);
    assert.ok(Array.isArray(res.data.activityProgress));
    assert.ok(Array.isArray(res.data.manpowerLogs));
  });

  it('30. DTO validation: rejects negative manpower counts', async () => {
    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectA1Id },
      body: {
        reportDate: '2026-09-27',
        manpowerLogs: [{ trade: 'Masons', skilledCount: -5 }],
      },
    });

    await assert.rejects(
      async () => dprController.createDpr(req as any),
      (err: any) => err.statusCode === 422 || err.statusCode === 400
    );
  });

  it('31. DTO validation: rejects invalid equipment status', async () => {
    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectA1Id },
      body: {
        reportDate: '2026-09-28',
        equipmentLogs: [{ equipmentName: 'Crane', operatingHours: 5, status: 'FLYING' }],
      },
    });

    await assert.rejects(
      async () => dprController.createDpr(req as any),
      (err: any) => err.statusCode === 422 || err.statusCode === 400
    );
  });

  it('32. DTO validation: rejects negative material quantity', async () => {
    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectA1Id },
      body: {
        reportDate: '2026-09-29',
        materialLogs: [{ materialName: 'Sand', quantityConsumed: -10, unit: 'cum' }],
      },
    });

    await assert.rejects(
      async () => dprController.createDpr(req as any),
      (err: any) => err.statusCode === 422 || err.statusCode === 400
    );
  });

  it('33. DTO validation: rejects invalid photo coordinate ranges', async () => {
    const req = createAuthReq(tokenSeA, {
      params: { projectId: projectA1Id },
      body: {
        reportDate: '2026-09-30',
        photos: [{ photoUrl: 'https://cdn.example.com/p.jpg', latitude: 999, longitude: 999 }],
      },
    });

    await assert.rejects(
      async () => dprController.createDpr(req as any),
      (err: any) => err.statusCode === 422 || err.statusCode === 400
    );
  });
});
