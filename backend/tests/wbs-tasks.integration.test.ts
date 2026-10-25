import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service';
import { WbsController } from '../src/modules/projects/controllers/wbs.controller';
import { TaskController } from '../src/modules/projects/controllers/task.controller';
import { TaskDependencyController } from '../src/modules/projects/controllers/task-dependency.controller';
import { TokenService } from '../src/modules/auth/services/token.service';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from '../src/common/errors/app-error';

describe('DEZOBUILD Phase 06.2 — WBS, Tasks & Task Dependencies Integration Suite', () => {
  let dbService: DatabaseService;
  let wbsController: WbsController;
  let taskController: TaskController;
  let depController: TaskDependencyController;
  let tokenService: TokenService;

  // Tenant A: STARTER (Projects:core allowed, Projects:wbs DENIED)
  const tenantAId = '99999999-aaaa-4444-aaaa-999999999999';
  const ownerAId = '99999999-1111-4444-aaaa-999999999999';
  let tokenOwnerA: string;

  // Tenant B: PROFESSIONAL (Projects:core & Projects:wbs ALLOWED)
  const tenantBId = '99999999-bbbb-4444-bbbb-999999999999';
  const ownerBId = '99999999-1111-4444-bbbb-999999999999';
  const pmBId = '99999999-2222-4444-bbbb-999999999999';
  const seBId = '99999999-3333-4444-bbbb-999999999999';
  const empBId = '99999999-4444-4444-bbbb-999999999999';

  let tokenOwnerB: string;
  let tokenPmB: string;
  let tokenSeB: string;
  let tokenEmpB: string;

  let projectAId: string;
  let projectB1Id: string;
  let projectB2Id: string;

  let companyAId: string;
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
    const prisma = dbService.getClient() as any;

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    tokenService = TokenService.getInstance();
    wbsController = new WbsController();
    taskController = new TaskController();
    depController = new TaskDependencyController();

    const starterPlan = await prisma.platformPlan.findUnique({ where: { code: 'STARTER' } });
    const proPlan = await prisma.platformPlan.findUnique({ where: { code: 'PROFESSIONAL' } });

    const roles = await prisma.role.findMany({ where: { isSystemRole: true } });
    const roleOwnerId = roles.find((r: any) => r.name === 'COMPANY_OWNER')!.id;
    const rolePmId = roles.find((r: any) => r.name === 'PROJECT_MANAGER')!.id;
    const roleSeId = roles.find((r: any) => r.name === 'SITE_ENGINEER')!.id;
    const roleEmpId = roles.find((r: any) => r.name === 'EMPLOYEE')!.id;

    // Cleanup test tenants
    const tenantIds = [tenantAId, tenantBId];
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

    // 1. Setup Tenant A (STARTER)
    await prisma.tenant.create({
      data: {
        id: tenantAId,
        code: 'TENANT-WBS-A',
        name: 'Tenant Alpha Starter Ltd',
        planTier: 'STARTER',
      },
    });
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantAId,
        planId: starterPlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    const compA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        code: 'COMP-WBS-A',
        name: 'Company Alpha',
        legalName: 'Alpha Ltd',
        panNumber: 'AAAAC9999A',
        gstin: '27AAAAC9999A1Z1',
        email: 'alpha@wbs.com',
        phone: '+919876543210',
        address: 'Alpha Tower',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400021',
      },
    });
    companyAId = compA.id;
    await prisma.user.create({
      data: {
        id: ownerAId,
        tenantId: tenantAId,
        email: 'owner@alpha-wbs.com',
        fullName: 'Alice Starter',
        passwordHash: 'hash',
      },
    });
    await prisma.userRoleAssignment.create({
      data: { tenantId: tenantAId, userId: ownerAId, roleId: roleOwnerId, scopeType: 'TENANT' },
    });
    tokenOwnerA = tokenService.createAccessToken({
      userId: ownerAId,
      tenantId: tenantAId,
      sessionId: 'sess-wbs-a',
      sessionVersion: 1,
    });

    const prjA = await prisma.project.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        code: 'PRJ-WBS-A1',
        name: 'Alpha Starter Site',
        status: 'ACTIVE',
      },
    });
    projectAId = prjA.id;

    // 2. Setup Tenant B (PROFESSIONAL)
    await prisma.tenant.create({
      data: {
        id: tenantBId,
        code: 'TENANT-WBS-B',
        name: 'Tenant Beta Pro Ltd',
        planTier: 'PROFESSIONAL',
      },
    });
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantBId,
        planId: proPlan.id,
        status: 'ACTIVE',
        billingCycle: 'ANNUAL',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    const compB = await prisma.company.create({
      data: {
        tenantId: tenantBId,
        code: 'COMP-WBS-B',
        name: 'Company Beta',
        legalName: 'Beta Pro Ltd',
        panNumber: 'BBBBC9999B',
        gstin: '27BBBBC9999B1Z2',
        email: 'beta@wbs.com',
        phone: '+919876543211',
        address: 'Beta Tower',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400051',
      },
    });
    companyBId = compB.id;

    const usersB = [
      { id: ownerBId, email: 'owner@beta-wbs.com', fullName: 'Bob Owner', roleId: roleOwnerId },
      { id: pmBId, email: 'pm@beta-wbs.com', fullName: 'Peter PM', roleId: rolePmId },
      { id: seBId, email: 'se@beta-wbs.com', fullName: 'Sam SiteEng', roleId: roleSeId },
      { id: empBId, email: 'emp@beta-wbs.com', fullName: 'Emily Emp', roleId: roleEmpId },
    ];
    for (const u of usersB) {
      await prisma.user.create({
        data: {
          id: u.id,
          tenantId: tenantBId,
          email: u.email,
          fullName: u.fullName,
          passwordHash: 'hash',
        },
      });
      await prisma.userRoleAssignment.create({
        data: { tenantId: tenantBId, userId: u.id, roleId: u.roleId, scopeType: 'TENANT' },
      });
    }

    tokenOwnerB = tokenService.createAccessToken({
      userId: ownerBId,
      tenantId: tenantBId,
      sessionId: 'sess-b-owner',
      sessionVersion: 1,
    });
    tokenPmB = tokenService.createAccessToken({
      userId: pmBId,
      tenantId: tenantBId,
      sessionId: 'sess-b-pm',
      sessionVersion: 1,
    });
    tokenSeB = tokenService.createAccessToken({
      userId: seBId,
      tenantId: tenantBId,
      sessionId: 'sess-b-se',
      sessionVersion: 1,
    });
    tokenEmpB = tokenService.createAccessToken({
      userId: empBId,
      tenantId: tenantBId,
      sessionId: 'sess-b-emp',
      sessionVersion: 1,
    });

    const prjB1 = await prisma.project.create({
      data: {
        tenantId: tenantBId,
        companyId: companyBId,
        code: 'PRJ-WBS-B1',
        name: 'Beta Highrise Tower 1',
        status: 'ACTIVE',
      },
    });
    projectB1Id = prjB1.id;

    const prjB2 = await prisma.project.create({
      data: {
        tenantId: tenantBId,
        companyId: companyBId,
        code: 'PRJ-WBS-B2',
        name: 'Beta Highrise Tower 2',
        status: 'ACTIVE',
      },
    });
    projectB2Id = prjB2.id;

    // Assign Peter PM to Project B1 only
    await prisma.projectMember.create({
      data: {
        tenantId: tenantBId,
        projectId: projectB1Id,
        userId: pmBId,
        projectRole: 'PROJECT_MANAGER',
        isLead: true,
      },
    });
  });

  after(async () => {
    const prisma = dbService.getClient() as any;
    const tenantIds = [tenantAId, tenantBId];
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

  let wbsRootId: string;
  let wbsSub1Id: string;
  let wbsSub2Id: string;

  // ==========================================
  // WBS TESTS (1 - 12)
  // ==========================================

  // 1. Professional WBS read -> ALLOW
  it('1. should allow WBS read for Professional tier tenant with valid permission', async () => {
    const req = createAuthReq(tokenOwnerB, { params: { projectId: projectB1Id } });
    const res = await wbsController.listWbsNodes(req);
    assert.equal(res.success, true);
    assert.ok(Array.isArray(res.data));
  });

  // 2. Professional WBS create -> ALLOW
  it('2. should allow WBS creation for Professional tier tenant with projects:wbs:edit', async () => {
    const req = createAuthReq(tokenOwnerB, {
      params: { projectId: projectB1Id },
      body: {
        code: '1.0',
        name: 'Substructure Works',
        description: 'Piling, excavation and foundation raft',
        weightagePct: 30,
      },
    });
    const res = await wbsController.createWbsNode(req);
    assert.equal(res.success, true);
    assert.equal(res.data.code, '1.0');
    assert.equal(res.data.level, 1);
    wbsRootId = res.data.id;
  });

  // 3. Starter WBS read -> DENY
  it('3. should DENY WBS read for Starter tier tenant (missing projects:wbs feature)', async () => {
    const req = createAuthReq(tokenOwnerA, { params: { projectId: projectAId } });
    await assert.rejects(
      async () => wbsController.listWbsNodes(req),
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.match(err.message, /does not entitle feature 'projects:wbs'/i);
        return true;
      }
    );
  });

  // 4. Starter WBS create -> DENY
  it('4. should DENY WBS create for Starter tier tenant (missing projects:wbs feature)', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { projectId: projectAId },
      body: { code: '1.0', name: 'Starter WBS' },
    });
    await assert.rejects(
      async () => wbsController.createWbsNode(req),
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.match(err.message, /does not entitle feature 'projects:wbs'/i);
        return true;
      }
    );
  });

  // 5. Missing projects:wbs:edit -> DENY
  it('5. should DENY WBS creation for roles without projects:wbs:edit permission (Site Engineer)', async () => {
    const req = createAuthReq(tokenSeB, {
      params: { projectId: projectB1Id },
      body: { code: '1.1', name: 'Unauthorized WBS' },
    });
    await assert.rejects(
      async () => wbsController.createWbsNode(req),
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.match(err.message, /lacks required permission 'projects:wbs:edit'/i);
        return true;
      }
    );
  });

  // 6. Cross-tenant WBS access -> DENY
  it('6. should strictly DENY cross-tenant WBS access (IDOR protected)', async () => {
    const req = createAuthReq(tokenOwnerB, { params: { projectId: projectAId } });
    await assert.rejects(
      async () => wbsController.listWbsNodes(req),
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.match(err.message, /Project not found in tenant|Access to project denied/i);
        return true;
      }
    );
  });

  // 7. Unassigned project WBS access -> DENY
  it('7. should DENY project-scoped user (Peter PM) from accessing unassigned project WBS', async () => {
    const req = createAuthReq(tokenPmB, { params: { projectId: projectB2Id } });
    await assert.rejects(
      async () => wbsController.listWbsNodes(req),
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.match(err.message, /not a member of this project|Access to project denied/i);
        return true;
      }
    );
  });

  // 8. Invalid parent project -> DENY
  it('8. should DENY WBS creation if parent belongs to another project (404/400)', async () => {
    // Create a node in Project B2
    const prisma = dbService.getClient() as any;
    const b2Node = await prisma.wbsNode.create({
      data: {
        tenantId: tenantBId,
        projectId: projectB2Id,
        code: '2.0',
        name: 'Project B2 Root',
        level: 1,
      },
    });

    // Try to use B2 node as parent in Project B1
    const req = createAuthReq(tokenOwnerB, {
      params: { projectId: projectB1Id },
      body: {
        parentId: b2Node.id,
        code: '1.1-CROSS',
        name: 'Cross Project Child',
      },
    });

    await assert.rejects(
      async () => wbsController.createWbsNode(req),
      (err: any) => {
        assert.ok(err instanceof NotFoundError);
        assert.match(err.message, /Parent WBS node not found in project/i);
        return true;
      }
    );
  });

  // 9. Parent from another tenant -> DENY
  it('9. should DENY WBS creation if parent belongs to another tenant', async () => {
    const req = createAuthReq(tokenOwnerB, {
      params: { projectId: projectB1Id },
      body: {
        parentId: '00000000-0000-0000-0000-000000000000',
        code: '1.1-FAKE',
        name: 'Fake Parent Child',
      },
    });
    await assert.rejects(
      async () => wbsController.createWbsNode(req),
      (err: any) => {
        assert.ok(err instanceof NotFoundError);
        return true;
      }
    );
  });

  // 10. Self-parenting -> DENY
  it('10. should reject setting a WBS node as its own parent with 400 Bad Request', async () => {
    const req = createAuthReq(tokenOwnerB, {
      params: { projectId: projectB1Id, nodeId: wbsRootId },
      body: { parentId: wbsRootId },
    });
    await assert.rejects(
      async () => wbsController.updateWbsNode(req),
      (err: any) => {
        assert.ok(err instanceof BadRequestError);
        assert.match(err.message, /cannot be its own parent/i);
        return true;
      }
    );
  });

  // 11. Circular WBS hierarchy -> DENY
  it('11. should strictly reject circular WBS tree updates (A -> B -> C -> A) with 409 Conflict', async () => {
    // 1. Create child B (1.1) under Root A
    const reqB = createAuthReq(tokenOwnerB, {
      params: { projectId: projectB1Id },
      body: { parentId: wbsRootId, code: '1.1', name: 'Excavation' },
    });
    const resB = await wbsController.createWbsNode(reqB);
    wbsSub1Id = resB.data.id;

    // 2. Create child C (1.1.1) under B
    const reqC = createAuthReq(tokenOwnerB, {
      params: { projectId: projectB1Id },
      body: { parentId: wbsSub1Id, code: '1.1.1', name: 'Soil Removal' },
    });
    const resC = await wbsController.createWbsNode(reqC);
    wbsSub2Id = resC.data.id;

    // 3. Attempt to set Root A parent = Child C (creates A -> B -> C -> A cycle)
    const reqCycle = createAuthReq(tokenOwnerB, {
      params: { projectId: projectB1Id, nodeId: wbsRootId },
      body: { parentId: wbsSub2Id },
    });
    await assert.rejects(
      async () => wbsController.updateWbsNode(reqCycle),
      (err: any) => {
        assert.ok(err instanceof ConflictError);
        assert.match(err.message, /Circular WBS hierarchy detected/i);
        return true;
      }
    );
  });

  // 12. Duplicate WBS code within project -> DENY
  it('12. should reject duplicate WBS code within same project with 409 Conflict', async () => {
    const req = createAuthReq(tokenOwnerB, {
      params: { projectId: projectB1Id },
      body: { code: '1.0', name: 'Duplicate Root Code' },
    });
    await assert.rejects(
      async () => wbsController.createWbsNode(req),
      (err: any) => {
        assert.ok(err instanceof ConflictError);
        assert.match(err.message, /already exists in this project/i);
        return true;
      }
    );
  });

  // ==========================================
  // TASK TESTS (13 - 20)
  // ==========================================

  let task1Id: string;
  let task2Id: string;
  let task3Id: string;

  // 13. Valid task create -> ALLOW
  it('13. should successfully create task linked to WBS node and assigned user', async () => {
    const req = createAuthReq(tokenOwnerB, {
      params: { projectId: projectB1Id },
      body: {
        wbsNodeId: wbsSub1Id,
        name: 'Excavate Basements Level 1',
        description: 'Heavy machinery earthwork excavation',
        status: 'TODO',
        priority: 'HIGH',
        isMilestone: false,
        progressPct: 0,
        plannedStartDate: new Date('2026-10-01'),
        plannedEndDate: new Date('2026-10-15'),
        assignedUserId: pmBId,
      },
    });

    const res = await taskController.createTask(req);
    assert.equal(res.success, true);
    assert.equal(res.data.name, 'Excavate Basements Level 1');
    assert.equal(res.data.wbsNodeId, wbsSub1Id);
    assert.equal(res.data.assignedUserId, pmBId);
    task1Id = res.data.id;
  });

  // 14. Missing projects:manage -> DENY
  it('14. should DENY task creation for roles without projects:manage permission (Site Engineer)', async () => {
    const req = createAuthReq(tokenSeB, {
      params: { projectId: projectB1Id },
      body: { name: 'Unauthorized SiteEng Task' },
    });
    await assert.rejects(
      async () => taskController.createTask(req),
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.match(err.message, /lacks required permission 'projects:manage'/i);
        return true;
      }
    );
  });

  // 15. Cross-tenant task access -> DENY
  it('15. should DENY cross-tenant task read/update attempts (IDOR protected)', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { projectId: projectB1Id, taskId: task1Id },
    });
    await assert.rejects(
      async () => taskController.getTask(req),
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.match(err.message, /Project not found in tenant|Access to project denied/i);
        return true;
      }
    );
  });

  // 16. Task from wrong project -> DENY
  it('16. should DENY querying a task with mismatching projectId (404 Not Found)', async () => {
    const req = createAuthReq(tokenOwnerB, {
      params: { projectId: projectB2Id, taskId: task1Id }, // task1 belongs to projectB1
    });
    await assert.rejects(
      async () => taskController.getTask(req),
      (err: any) => {
        assert.ok(err instanceof NotFoundError);
        return true;
      }
    );
  });

  // 17. WBS node from wrong project -> DENY
  it('17. should reject task creation with WBS node from another project (400 Bad Request)', async () => {
    const req = createAuthReq(tokenOwnerB, {
      params: { projectId: projectB2Id },
      body: {
        wbsNodeId: wbsSub1Id, // wbsSub1 belongs to projectB1
        name: 'Mismatched WBS Task',
      },
    });
    await assert.rejects(
      async () => taskController.createTask(req),
      (err: any) => {
        assert.ok(err instanceof BadRequestError);
        assert.match(err.message, /WBS node not found or does not belong to this project/i);
        return true;
      }
    );
  });

  // 18. Foreign assigned user -> DENY
  it('18. should reject task assignment to user from a foreign tenant (400 Bad Request)', async () => {
    const req = createAuthReq(tokenOwnerB, {
      params: { projectId: projectB1Id },
      body: {
        name: 'Foreign Assigned Task',
        assignedUserId: ownerAId, // belongs to Tenant A
      },
    });
    await assert.rejects(
      async () => taskController.createTask(req),
      (err: any) => {
        assert.ok(err instanceof BadRequestError);
        assert.match(err.message, /Assigned user not found or does not belong to this tenant/i);
        return true;
      }
    );
  });

  // 19. Invalid progress percentage -> DENY
  it('19. should reject task creation with invalid progress percentage (> 100%)', async () => {
    const req = createAuthReq(tokenOwnerB, {
      params: { projectId: projectB1Id },
      body: {
        name: 'Invalid Progress Task',
        progressPct: 150,
      },
    });
    await assert.rejects(
      async () => taskController.createTask(req),
      (err: any) => {
        // Zod validation throws ValidationError
        return true;
      }
    );
  });

  // 20. Invalid planned dates -> DENY
  it('20. should reject task creation where plannedStartDate > plannedEndDate', async () => {
    const req = createAuthReq(tokenOwnerB, {
      params: { projectId: projectB1Id },
      body: {
        name: 'Invalid Dates Task',
        plannedStartDate: new Date('2026-11-01'),
        plannedEndDate: new Date('2026-10-01'), // Earlier than start date
      },
    });
    await assert.rejects(
      async () => taskController.createTask(req),
      (err: any) => {
        return true;
      }
    );
  });

  // ==========================================
  // TASK DEPENDENCY TESTS (21 - 27)
  // ==========================================

  let dep1Id: string;

  // Create task 2 and task 3 for dependency testing
  it('setup tasks for dependency graph', async () => {
    const req2 = createAuthReq(tokenOwnerB, {
      params: { projectId: projectB1Id },
      body: {
        name: 'PCC Foundation Pour',
        plannedStartDate: new Date('2026-10-16'),
        plannedEndDate: new Date('2026-10-20'),
      },
    });
    const res2 = await taskController.createTask(req2);
    task2Id = res2.data.id;

    const req3 = createAuthReq(tokenOwnerB, {
      params: { projectId: projectB1Id },
      body: {
        name: 'Raft Rebar Binding',
        isMilestone: true,
        plannedStartDate: new Date('2026-10-21'),
        plannedEndDate: new Date('2026-10-25'),
      },
    });
    const res3 = await taskController.createTask(req3);
    task3Id = res3.data.id;
  });

  // 21. Valid dependency create -> ALLOW
  it('21. should successfully create Finish-to-Start (FS) task dependency (Task 1 -> Task 2)', async () => {
    const req = createAuthReq(tokenOwnerB, {
      params: { projectId: projectB1Id, taskId: task1Id },
      body: {
        successorTaskId: task2Id,
        dependencyType: 'FS',
        lagDays: 1,
      },
    });
    const res = await depController.createDependency(req);
    assert.equal(res.success, true);
    assert.equal(res.data.predecessorTaskId, task1Id);
    assert.equal(res.data.successorTaskId, task2Id);
    assert.equal(res.data.dependencyType, 'FS');
    assert.equal(res.data.lagDays, 1);
    dep1Id = res.data.id;
  });

  // 22. Invalid dependency type -> DENY
  it('22. should reject invalid dependency type with validation error', async () => {
    const req = createAuthReq(tokenOwnerB, {
      params: { projectId: projectB1Id, taskId: task2Id },
      body: {
        successorTaskId: task3Id,
        dependencyType: 'INVALID_TYPE',
      },
    });
    await assert.rejects(
      async () => depController.createDependency(req),
      (err: any) => {
        return true;
      }
    );
  });

  // 23. Self-dependency -> DENY
  it('23. should reject self-dependency (Task 2 -> Task 2) with 400 Bad Request', async () => {
    const req = createAuthReq(tokenOwnerB, {
      params: { projectId: projectB1Id, taskId: task2Id },
      body: {
        successorTaskId: task2Id,
        dependencyType: 'FS',
      },
    });
    await assert.rejects(
      async () => depController.createDependency(req),
      (err: any) => {
        assert.ok(err instanceof BadRequestError);
        assert.match(err.message, /cannot depend on itself/i);
        return true;
      }
    );
  });

  // 24. Cross-project predecessor -> DENY
  it('24. should reject dependency where predecessor belongs to another project', async () => {
    // Create task in Project B2
    const reqB2 = createAuthReq(tokenOwnerB, {
      params: { projectId: projectB2Id },
      body: { name: 'Project B2 Task' },
    });
    const resB2 = await taskController.createTask(reqB2);

    const req = createAuthReq(tokenOwnerB, {
      params: { projectId: projectB1Id },
      body: {
        predecessorTaskId: resB2.data.id, // belongs to B2
        successorTaskId: task1Id,
      },
    });
    await assert.rejects(
      async () => depController.createDependency(req),
      (err: any) => {
        assert.ok(err instanceof BadRequestError);
        assert.match(err.message, /Predecessor task not found or belongs to another project/i);
        return true;
      }
    );
  });

  // 25. Cross-project successor -> DENY
  it('25. should reject dependency where successor belongs to another project', async () => {
    const prisma = dbService.getClient() as any;
    const taskB2 = await prisma.task.findFirst({ where: { projectId: projectB2Id } });

    const req = createAuthReq(tokenOwnerB, {
      params: { projectId: projectB1Id },
      body: {
        predecessorTaskId: task1Id,
        successorTaskId: taskB2.id,
      },
    });
    await assert.rejects(
      async () => depController.createDependency(req),
      (err: any) => {
        assert.ok(err instanceof BadRequestError);
        assert.match(err.message, /Successor task not found or belongs to another project/i);
        return true;
      }
    );
  });

  // 26. Circular dependency -> DENY
  it('26. should detect and reject circular task dependencies (Task 1 -> Task 2 -> Task 3 -> Task 1) with 409 Conflict', async () => {
    // 1. Create Task 2 -> Task 3
    const req2to3 = createAuthReq(tokenOwnerB, {
      params: { projectId: projectB1Id, taskId: task2Id },
      body: {
        successorTaskId: task3Id,
        dependencyType: 'FS',
      },
    });
    await depController.createDependency(req2to3);

    // 2. Attempt to create Task 3 -> Task 1 (creates cycle 1 -> 2 -> 3 -> 1)
    const reqCycle = createAuthReq(tokenOwnerB, {
      params: { projectId: projectB1Id, taskId: task3Id },
      body: {
        successorTaskId: task1Id,
        dependencyType: 'FS',
      },
    });
    await assert.rejects(
      async () => depController.createDependency(reqCycle),
      (err: any) => {
        assert.ok(err instanceof ConflictError);
        assert.match(err.message, /Circular task dependency detected/i);
        return true;
      }
    );
  });

  // 27. Duplicate dependency -> DENY
  it('27. should reject duplicate dependency between same tasks with 409 Conflict', async () => {
    const reqDup = createAuthReq(tokenOwnerB, {
      params: { projectId: projectB1Id, taskId: task1Id },
      body: {
        successorTaskId: task2Id,
        dependencyType: 'SS',
      },
    });
    await assert.rejects(
      async () => depController.createDependency(reqDup),
      (err: any) => {
        assert.ok(err instanceof ConflictError);
        assert.match(err.message, /already exists/i);
        return true;
      }
    );
  });

  // 28. Phase 01–06.1 Regression
  it('28. should verify list and delete dependency lifecycle', async () => {
    const reqList = createAuthReq(tokenOwnerB, {
      params: { projectId: projectB1Id },
    });
    const resList = await depController.listDependencies(reqList);
    assert.equal(resList.success, true);
    assert.equal(resList.data.length, 2); // 1->2 and 2->3

    const reqDel = createAuthReq(tokenOwnerB, {
      params: { projectId: projectB1Id, dependencyId: dep1Id },
    });
    const resDel = await depController.deleteDependency(reqDel);
    assert.equal(resDel.success, true);
    assert.equal(resDel.data.deleted, true);
  });
});
