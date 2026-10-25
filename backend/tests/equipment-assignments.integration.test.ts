import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service.js';
import { AssignmentsController } from '../src/modules/equipment/controllers/assignments.controller.js';
import { AssignmentService } from '../src/modules/equipment/services/assignment.service.js';
import { EquipmentRepository } from '../src/modules/equipment/repositories/equipment.repository.js';
import { AssignmentRepository } from '../src/modules/equipment/repositories/assignment.repository.js';
import { EquipmentAuditRepository } from '../src/modules/equipment/repositories/equipment-audit.repository.js';
import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';
import { ConflictError, ForbiddenError, NotFoundError, BadRequestError } from '../src/common/errors/app-error.js';

describe('DEZOBUILD Phase 12 — Equipment Assignments Integration Suite', () => {
  let dbService: DatabaseService;
  let assignmentsController: AssignmentsController;
  let assignmentService: AssignmentService;
  let tokenService: TokenService;
  let prisma: any;

  const tenantAId = 'ee120002-aaaa-0001-aaaa-111111111111';
  const ownerAId = 'ee120002-1111-0001-aaaa-111111111111';
  const pmAId = 'ee120002-2222-0001-aaaa-111111111111';
  const viewerAId = 'ee120002-3333-0001-aaaa-111111111111';

  const tenantBId = 'ee120002-bbbb-0001-bbbb-111111111111';
  const ownerBId = 'ee120002-1111-0001-bbbb-111111111111';

  let tokenOwnerA: string;
  let tokenPmA: string;
  let tokenViewerA: string;
  let tokenOwnerB: string;

  let companyAId: string;
  let projectAId: string;
  let projectBId: string;
  let equipment1Id: string;
  let equipment2Id: string;

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

    const auditRepo = new EquipmentAuditRepository(prisma);
    const equipmentRepo = new EquipmentRepository(prisma);
    const assignmentRepo = new AssignmentRepository(prisma);
    assignmentService = new AssignmentService(prisma, equipmentRepo, assignmentRepo, auditRepo);
    assignmentsController = new AssignmentsController(assignmentService);
    tokenService = TokenService.getInstance();

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Clean fixtures
    await prisma.equipmentAuditLog.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.equipmentAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.equipment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.project.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
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
        code: 'APEX_EQ_ASG_A',
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

    const projectA = await prisma.project.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        code: 'PRJ-MUM-AIRPORT',
        name: 'Navi Mumbai International Airport Phase 1',
        status: 'ACTIVE',
      },
    });
    projectAId = projectA.id;

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
          id: pmAId,
          tenantId: tenantAId,
          email: 'pm@apex.com',
          fullName: 'Apex Project Manager',
          passwordHash: 'dummy',
        },
        {
          id: viewerAId,
          tenantId: tenantAId,
          email: 'viewer@apex.com',
          fullName: 'Apex Auditor',
          passwordHash: 'dummy',
        },
      ],
    });

    const ownerRole = await prisma.role.findFirst({ where: { name: 'COMPANY_OWNER' } });
    const pmRole = await prisma.role.findFirst({ where: { name: 'PROJECT_MANAGER' } });
    const viewerRole = await prisma.role.findFirst({ where: { name: 'VIEWER' } });

    await prisma.userRoleAssignment.createMany({
      data: [
        { tenantId: tenantAId, userId: ownerAId, roleId: ownerRole!.id },
        { tenantId: tenantAId, userId: pmAId, roleId: pmRole!.id },
        { tenantId: tenantAId, userId: viewerAId, roleId: viewerRole!.id },
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

    tokenPmA = tokenService.createAccessToken({
      userId: pmAId,
      tenantId: tenantAId,
      sessionId: 'session-pm-a',
      sessionVersion: 1,
    });

    tokenViewerA = tokenService.createAccessToken({
      userId: viewerAId,
      tenantId: tenantAId,
      sessionId: 'session-view-a',
      sessionVersion: 1,
    });

    // Equipment 1: AVAILABLE
    const eq1 = await prisma.equipment.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        equipmentCode: 'EXC-01',
        name: 'CAT 320D Excavator 1',
        category: 'EARTHMOVING',
        equipmentType: 'Excavator',
        status: 'AVAILABLE',
      },
    });
    equipment1Id = eq1.id;

    // Equipment 2: BREAKDOWN
    const eq2 = await prisma.equipment.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        equipmentCode: 'EXC-02',
        name: 'Komatsu PC210 Excavator',
        category: 'EARTHMOVING',
        equipmentType: 'Excavator',
        status: 'BREAKDOWN',
      },
    });
    equipment2Id = eq2.id;

    // Setup Tenant B
    await prisma.tenant.create({
      data: {
        id: tenantBId,
        name: 'Beta Builders Ltd',
        code: 'BETA_EQ_ASG_B',
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

    const projectB = await prisma.project.create({
      data: {
        tenantId: tenantBId,
        companyId: companyB.id,
        code: 'PRJ-PUNE-METRO',
        name: 'Pune Metro Line 3',
        status: 'ACTIVE',
      },
    });
    projectBId = projectB.id;

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

  let createdAssignmentId: string;

  it('1. should deploy AVAILABLE equipment to project, updating status and currentProjectId projection atomically', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { id: equipment1Id },
      body: {
        projectId: projectAId,
        assignedFrom: new Date().toISOString(),
        purpose: 'Foundation earth excavation',
        notes: 'Mobilized via Lowbed Trailer MH-04-1234',
      },
    });

    const res = await assignmentsController.createAssignment(req);
    assert.strictEqual(res.success, true);
    const asg = res.data as any;
    assert.strictEqual(asg.status, 'ACTIVE');
    assert.strictEqual(asg.projectId, projectAId);
    createdAssignmentId = asg.id;

    // Verify Equipment synchronized state
    const eq = await prisma.equipment.findUnique({ where: { id: equipment1Id } });
    assert.strictEqual(eq.status, 'ASSIGNED');
    assert.strictEqual(eq.currentProjectId, projectAId);

    // Verify Audit
    const audits = await prisma.equipmentAuditLog.findMany({
      where: { tenantId: tenantAId, equipmentId: equipment1Id, action: 'ASSIGN' },
    });
    assert.strictEqual(audits.length, 1);
  });

  it('2. should reject second active assignment on the already ASSIGNED equipment (400 Bad Request)', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { id: equipment1Id },
      body: {
        projectId: projectAId,
        assignedFrom: new Date().toISOString(),
      },
    });

    await assert.rejects(async () => assignmentsController.createAssignment(req), BadRequestError);
  });

  it('3. should reject assignment of equipment currently in BREAKDOWN status (400 Bad Request)', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { id: equipment2Id },
      body: {
        projectId: projectAId,
        assignedFrom: new Date().toISOString(),
      },
    });

    await assert.rejects(async () => assignmentsController.createAssignment(req), BadRequestError);
  });

  it('4. should reject assignment referencing project from another tenant (Cross-tenant IDOR)', async () => {
    // Create new available equipment
    const eq3 = await prisma.equipment.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        equipmentCode: 'EXC-03',
        name: 'CAT 336D Excavator',
        category: 'EARTHMOVING',
        equipmentType: 'Excavator',
        status: 'AVAILABLE',
      },
    });

    const req = createAuthReq(tokenOwnerA, {
      params: { id: eq3.id },
      body: {
        projectId: projectBId, // belongs to Tenant B
        assignedFrom: new Date().toISOString(),
      },
    });

    await assert.rejects(async () => assignmentsController.createAssignment(req), BadRequestError);
  });

  it('5. should list assignments for an equipment asset', async () => {
    const req = createAuthReq(tokenPmA, {
      params: { id: equipment1Id },
      query: { status: 'ACTIVE' },
    });

    const res = await assignmentsController.listAssignments(req);
    assert.strictEqual(res.success, true);
    const data = res.data as any;
    assert.strictEqual(data.items.length, 1);
    assert.strictEqual(data.items[0].id, createdAssignmentId);
  });

  it('6. should return/demobilize active assignment, resetting status to AVAILABLE and clearing currentProjectId projection', async () => {
    const returnTime = new Date().toISOString();
    const req = createAuthReq(tokenOwnerA, {
      params: { id: createdAssignmentId },
      body: {
        actualReturnedAt: returnTime,
        notes: 'Excavation completed successfully, demobilized to central yard',
      },
    });

    const res = await assignmentsController.returnAssignment(req);
    assert.strictEqual(res.success, true);
    const asg = res.data as any;
    assert.strictEqual(asg.status, 'COMPLETED');

    // Verify Equipment synchronized state
    const eq = await prisma.equipment.findUnique({ where: { id: equipment1Id } });
    assert.strictEqual(eq.status, 'AVAILABLE');
    assert.strictEqual(eq.currentProjectId, null);

    // Verify Audit
    const audits = await prisma.equipmentAuditLog.findMany({
      where: { tenantId: tenantAId, equipmentId: equipment1Id, action: 'DEMOBILIZE' },
    });
    assert.strictEqual(audits.length, 1);
  });

  it('7. should reject returning an already COMPLETED assignment (400 Bad Request)', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { id: createdAssignmentId },
      body: { notes: 'Trying to return again' },
    });

    await assert.rejects(async () => assignmentsController.returnAssignment(req), BadRequestError);
  });

  it('8. Security: VIEWER role cannot create or return assignments (403 Forbidden)', async () => {
    const req = createAuthReq(tokenViewerA, {
      params: { id: equipment1Id },
      body: {
        projectId: projectAId,
        assignedFrom: new Date().toISOString(),
      },
    });

    await assert.rejects(async () => assignmentsController.createAssignment(req), ForbiddenError);
  });

  it('9. Multi-Tenant Isolation: Tenant B cannot return Tenant A assignment', async () => {
    const req = createAuthReq(tokenOwnerB, {
      params: { id: createdAssignmentId },
      body: {},
    });

    await assert.rejects(async () => assignmentsController.returnAssignment(req), NotFoundError);
  });
});
