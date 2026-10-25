import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service';
import { BoqController } from '../src/modules/projects/controllers/boq.controller';
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

describe('DEZOBUILD Phase 07 — Bill of Quantities (BOQ) Integration Suite', () => {
  let dbService: DatabaseService;
  let boqController: BoqController;
  let wbsController: WbsController;
  let tokenService: TokenService;
  let prisma: any;

  // Tenant A: STARTER tier
  const tenantAId = '77777777-aaaa-4444-aaaa-777777777777';
  const ownerAId = '77777777-1111-4444-aaaa-777777777777';
  const pmAId = '77777777-2222-4444-aaaa-777777777777';
  const seAId = '77777777-3333-4444-aaaa-777777777777';
  const empAId = '77777777-4444-4444-aaaa-777777777777';

  // Tenant B: for cross-tenant isolation testing
  const tenantBId = '77777777-bbbb-4444-bbbb-777777777777';
  const ownerBId = '77777777-1111-4444-bbbb-777777777777';

  let tokenOwnerA: string;
  let tokenPmA: string;
  let tokenSeA: string;
  let tokenEmpA: string;
  let tokenOwnerB: string;

  let projectA1Id: string;
  let projectA2Id: string;
  let projectBId: string;
  let companyAId: string;
  let companyBId: string;
  let wbsNodeId: string;

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

    boqController = new BoqController();
    wbsController = new WbsController();
    tokenService = new TokenService();

    // 1. Seed RBAC and Subscriptions
    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    tokenService = TokenService.getInstance();

    // 2. Clean test fixtures
    await prisma.measurementDimension.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.digitalMbRecord.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.digitalMbSequence.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.boqItem.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.taskDependency.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.task.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.wbsNode.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.projectMember.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.project.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });

    // 3. Create Tenant A & B
    await prisma.tenant.create({
      data: {
        id: tenantAId,
        name: 'BOQ Test Tenant A',
        code: 'BOQ-T-A',
        status: 'ACTIVE',
      },
    });

    await prisma.tenant.create({
      data: {
        id: tenantBId,
        name: 'BOQ Test Tenant B',
        code: 'BOQ-T-B',
        status: 'ACTIVE',
      },
    });

    // 4. Create Plans & Subscriptions
    const plan = await prisma.platformPlan.findFirst({ where: { code: 'STARTER' } });
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantAId,
        planId: plan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      },
    });

    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantBId,
        planId: plan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      },
    });

    // 5. Create Companies
    const companyA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        code: 'BCA',
        name: 'BOQ Construction Corp A',
        legalName: 'BOQ Construction Corporation A Pvt Ltd',
        panNumber: 'AAACB1234A',
        gstin: '29AAACB1234A1Z5',
        email: 'info@boqcorpa.com',
        phone: '+919876543210',
        address: '100 Construction Way',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
      },
    });
    companyAId = companyA.id;

    const companyB = await prisma.company.create({
      data: {
        tenantId: tenantBId,
        code: 'BCB',
        name: 'BOQ Construction Corp B',
        legalName: 'BOQ Construction Corporation B Pvt Ltd',
        panNumber: 'AAACB1234B',
        gstin: '29AAACB1234B1Z5',
        email: 'info@boqcorpb.com',
        phone: '+919876543211',
        address: '200 Construction Way',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    });
    companyBId = companyB.id;

    // 6. Create Users
    await prisma.user.create({
      data: {
        id: ownerAId,
        tenantId: tenantAId,
        email: 'owner-a@dezobuild-boq.com',
        fullName: 'Tenant A Owner',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });

    await prisma.user.create({
      data: {
        id: pmAId,
        tenantId: tenantAId,
        email: 'pm-a@dezobuild-boq.com',
        fullName: 'Project Manager A',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });

    await prisma.user.create({
      data: {
        id: seAId,
        tenantId: tenantAId,
        email: 'se-a@dezobuild-boq.com',
        fullName: 'Site Engineer A',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });

    await prisma.user.create({
      data: {
        id: empAId,
        tenantId: tenantAId,
        email: 'emp-a@dezobuild-boq.com',
        fullName: 'Employee A',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });

    await prisma.user.create({
      data: {
        id: ownerBId,
        tenantId: tenantBId,
        email: 'owner-b@dezobuild-boq.com',
        fullName: 'Tenant B Owner',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });

    // 7. Assign Roles
    const ownerRole = await prisma.role.findFirst({ where: { name: 'COMPANY_OWNER' } });
    const pmRole = await prisma.role.findFirst({ where: { name: 'PROJECT_MANAGER' } });
    const seRole = await prisma.role.findFirst({ where: { name: 'SITE_ENGINEER' } });
    const empRole = await prisma.role.findFirst({ where: { name: 'EMPLOYEE' } });

    await prisma.userRoleAssignment.createMany({
      data: [
        { tenantId: tenantAId, userId: ownerAId, roleId: ownerRole.id, scopeType: 'TENANT' },
        { tenantId: tenantAId, userId: pmAId, roleId: pmRole.id, scopeType: 'TENANT' },
        { tenantId: tenantAId, userId: seAId, roleId: seRole.id, scopeType: 'TENANT' },
        { tenantId: tenantAId, userId: empAId, roleId: empRole.id, scopeType: 'TENANT' },
        { tenantId: tenantBId, userId: ownerBId, roleId: ownerRole.id, scopeType: 'TENANT' },
      ],
    });

    // 8. Create Projects
    const projectA1 = await prisma.project.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        name: 'Tower Alpha Project',
        code: 'PRJ-ALPHA',
        status: 'ACTIVE',
      },
    });
    projectA1Id = projectA1.id;

    const projectA2 = await prisma.project.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        name: 'Tower Beta Project',
        code: 'PRJ-BETA',
        status: 'ACTIVE',
      },
    });
    projectA2Id = projectA2.id;

    const projectB = await prisma.project.create({
      data: {
        tenantId: tenantBId,
        companyId: companyBId,
        name: 'Delta Infrastructure',
        code: 'PRJ-DELTA',
        status: 'ACTIVE',
      },
    });
    projectBId = projectB.id;

    // Add Project Members
    await prisma.projectMember.createMany({
      data: [
        { tenantId: tenantAId, projectId: projectA1Id, userId: ownerAId, projectRole: 'OWNER', isLead: true },
        { tenantId: tenantAId, projectId: projectA1Id, userId: pmAId, projectRole: 'MANAGER', isLead: true },
        { tenantId: tenantAId, projectId: projectA1Id, userId: seAId, projectRole: 'ENGINEER', isLead: false },
        { tenantId: tenantAId, projectId: projectA1Id, userId: empAId, projectRole: 'MEMBER', isLead: false },
        { tenantId: tenantAId, projectId: projectA2Id, userId: ownerAId, projectRole: 'OWNER', isLead: true },
        { tenantId: tenantAId, projectId: projectA2Id, userId: pmAId, projectRole: 'MANAGER', isLead: true },
        { tenantId: tenantBId, projectId: projectBId, userId: ownerBId, projectRole: 'OWNER', isLead: true },
      ],
    });

    // Create WBS node in Project A1
    const wbsNode = await prisma.wbsNode.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        code: '1.0',
        name: 'Civil & Structural Works',
        level: 1,
      },
    });
    wbsNodeId = wbsNode.id;

    // 9. Generate JWT Tokens
    tokenOwnerA = tokenService.createAccessToken({
      userId: ownerAId,
      tenantId: tenantAId,
      sessionId: 'sess-boq-owner-a',
      sessionVersion: 1,
    });

    tokenPmA = tokenService.createAccessToken({
      userId: pmAId,
      tenantId: tenantAId,
      sessionId: 'sess-boq-pm-a',
      sessionVersion: 1,
    });

    tokenSeA = tokenService.createAccessToken({
      userId: seAId,
      tenantId: tenantAId,
      sessionId: 'sess-boq-se-a',
      sessionVersion: 1,
    });

    tokenEmpA = tokenService.createAccessToken({
      userId: empAId,
      tenantId: tenantAId,
      sessionId: 'sess-boq-emp-a',
      sessionVersion: 1,
    });

    tokenOwnerB = tokenService.createAccessToken({
      userId: ownerBId,
      tenantId: tenantBId,
      sessionId: 'sess-boq-owner-b',
      sessionVersion: 1,
    });
  });

  after(async () => {
    await prisma.measurementDimension.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.digitalMbRecord.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.digitalMbSequence.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.boqItem.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.taskDependency.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.task.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.wbsNode.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.projectMember.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.project.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
  });

  // ==========================================
  // 1. BOQ CREATION & VALIDATION
  // ==========================================

  it('1. should create a valid BOQ item successfully with computed amount', async () => {
    const req = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id },
      body: {
        itemNumber: '1.01',
        description: 'Earthwork excavation in ordinary soil',
        specification: 'IS 1200 Part 1',
        uom: 'CUM',
        quantity: 1250.5,
        unitRate: 450.75,
        wbsNodeId,
      },
    });

    const res = await boqController.createBoqItem(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.itemNumber, '1.01');
    assert.strictEqual(res.data.uom, 'CUM');
    assert.strictEqual(res.data.quantity.toString(), '1250.5');
    assert.strictEqual(res.data.unitRate.toString(), '450.75');
    // 1250.5 * 450.75 = 563662.875 -> 563662.88 (ROUND_HALF_UP)
    assert.strictEqual(res.data.totalAmount.toString(), '563662.88');
    assert.strictEqual(res.data.executedQuantity.toString(), '0');
    assert.strictEqual(res.data.status, 'ACTIVE');
  });

  it('2. should reject duplicate item number in same project', async () => {
    const req = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id },
      body: {
        itemNumber: '1.01',
        description: 'Duplicate item',
        uom: 'CUM',
        quantity: 100,
        unitRate: 100,
      },
    });

    await assert.rejects(async () => boqController.createBoqItem(req), ConflictError);
  });

  it('3. should allow same item number across different projects in same tenant', async () => {
    const req = createAuthReq(tokenPmA, {
      params: { projectId: projectA2Id },
      body: {
        itemNumber: '1.01',
        description: 'Earthwork excavation in Tower Beta',
        uom: 'CUM',
        quantity: 500,
        unitRate: 400,
      },
    });

    const res = await boqController.createBoqItem(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.projectId, projectA2Id);
    assert.strictEqual(res.data.itemNumber, '1.01');
  });

  it('4. should allow same item number across different tenants', async () => {
    const req = createAuthReq(tokenOwnerB, {
      params: { projectId: projectBId },
      body: {
        itemNumber: '1.01',
        description: 'Earthwork excavation in Delta project',
        uom: 'CUM',
        quantity: 800,
        unitRate: 350,
      },
    });

    const res = await boqController.createBoqItem(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.tenantId, tenantBId);
  });

  it('5. should enforce Decimal precision without floating-point JS inaccuracies', async () => {
    const req = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id },
      body: {
        itemNumber: '1.02',
        description: 'Reinforced cement concrete M25',
        uom: 'CUM',
        quantity: '0.1',
        unitRate: '0.2',
      },
    });

    const res = await boqController.createBoqItem(req);
    assert.strictEqual(res.success, true);
    // 0.1 * 0.2 = 0.02 (in JS floating point 0.1 * 0.2 = 0.020000000000000004)
    assert.strictEqual(res.data.totalAmount.toString(), '0.02');
  });

  it('6. should reject invalid UOM', async () => {
    const req = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id },
      body: {
        itemNumber: '1.03',
        description: 'Invalid UOM item',
        uom: 'INVALID_UOM',
        quantity: 10,
        unitRate: 100,
      },
    });

    await assert.rejects(async () => boqController.createBoqItem(req));
  });

  // ==========================================
  // 2. HIERARCHY & WBS LINKAGE
  // ==========================================

  it('7. should create child BOQ item under parent successfully', async () => {
    // Fetch parent item 1.01
    const parentReq = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id },
      query: { search: '1.01' },
    });
    const parentList = await boqController.listBoqItems(parentReq);
    const parent = parentList.data.items.find((i) => i.itemNumber === '1.01');
    assert.ok(parent);

    const childReq = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id },
      body: {
        itemNumber: '1.01.a',
        description: 'Excavation in soft soil up to 1.5m depth',
        uom: 'CUM',
        quantity: 500,
        unitRate: 400,
        parentId: parent.id,
      },
    });

    const res = await boqController.createBoqItem(childReq);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.parentId, parent.id);
  });

  it('8. should reject parent BOQ item from a different project', async () => {
    // Project A2 item as parent for Project A1
    const pA2Req = createAuthReq(tokenPmA, {
      params: { projectId: projectA2Id },
      query: { search: '1.01' },
    });
    const pA2List = await boqController.listBoqItems(pA2Req);
    const parentA2 = pA2List.data.items[0];
    assert.ok(parentA2);

    const req = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id },
      body: {
        itemNumber: '1.99',
        description: 'Cross-project parent test',
        uom: 'CUM',
        quantity: 10,
        unitRate: 100,
        parentId: parentA2.id,
      },
    });

    await assert.rejects(async () => boqController.createBoqItem(req), NotFoundError);
  });

  it('9. should reject WBS node from a different project or tenant', async () => {
    // Create WBS node in Project B
    const wbsB = await prisma.wbsNode.create({
      data: {
        tenantId: tenantBId,
        projectId: projectBId,
        code: '1.0',
        name: 'Project B WBS',
        level: 1,
      },
    });

    const req = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id },
      body: {
        itemNumber: '1.04',
        description: 'Cross-tenant WBS test',
        uom: 'CUM',
        quantity: 10,
        unitRate: 100,
        wbsNodeId: wbsB.id,
      },
    });

    await assert.rejects(async () => boqController.createBoqItem(req), NotFoundError);
  });

  // ==========================================
  // 3. BULK IMPORT & ATOMICITY
  // ==========================================

  it('10. should import multiple BOQ items in an atomic bulk transaction', async () => {
    const req = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id },
      body: {
        items: [
          { itemNumber: '2.01', description: 'Plain cement concrete 1:4:8', uom: 'CUM', quantity: 150, unitRate: 3500 },
          { itemNumber: '2.02', description: 'Reinforced concrete M30 columns', uom: 'CUM', quantity: 320, unitRate: 6200 },
          { itemNumber: '2.03', description: 'TMT FE500D Steel Reinforcement', uom: 'MT', quantity: 45.5, unitRate: 68000 },
        ],
      },
    });

    const res = await boqController.createBulkBoq(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.length, 3);
  });

  it('11. should roll back entire bulk import if any item has duplicate number within payload', async () => {
    const req = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id },
      body: {
        items: [
          { itemNumber: '3.01', description: 'Bulk test item A', uom: 'SQM', quantity: 10, unitRate: 100 },
          { itemNumber: '3.01', description: 'Bulk test item A duplicate', uom: 'SQM', quantity: 20, unitRate: 200 },
        ],
      },
    });

    await assert.rejects(async () => boqController.createBulkBoq(req), BadRequestError);

    // Verify 3.01 was not created
    const check = await prisma.boqItem.findFirst({ where: { projectId: projectA1Id, itemNumber: '3.01' } });
    assert.strictEqual(check, null);
  });

  it('12. should roll back entire bulk import if any item conflicts with an existing DB item', async () => {
    const req = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id },
      body: {
        items: [
          { itemNumber: '3.02', description: 'Bulk test item B', uom: 'SQM', quantity: 10, unitRate: 100 },
          { itemNumber: '1.01', description: 'Colliding with existing 1.01', uom: 'CUM', quantity: 20, unitRate: 200 },
        ],
      },
    });

    await assert.rejects(async () => boqController.createBulkBoq(req), ConflictError);

    // Verify 3.02 was rolled back
    const check = await prisma.boqItem.findFirst({ where: { projectId: projectA1Id, itemNumber: '3.02' } });
    assert.strictEqual(check, null);
  });

  // ==========================================
  // 4. BOQ UPDATE & REVISION POLICIES
  // ==========================================

  it('13. should allow updating quantity and rate before execution (executedQuantity === 0)', async () => {
    const item = await prisma.boqItem.findFirst({ where: { projectId: projectA1Id, itemNumber: '2.01' } });
    assert.ok(item);

    const req = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id, boqItemId: item.id },
      body: {
        quantity: 200,
        unitRate: 3600,
        description: 'Updated plain cement concrete 1:4:8 description',
      },
    });

    const res = await boqController.updateBoqItem(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.quantity.toString(), '200');
    assert.strictEqual(res.data.unitRate.toString(), '3600');
    // 200 * 3600 = 720000
    assert.strictEqual(res.data.totalAmount.toString(), '720000');
  });

  it('14. should reject quantity/rate revision if executedQuantity > 0', async () => {
    const item = await prisma.boqItem.findFirst({ where: { projectId: projectA1Id, itemNumber: '2.02' } });
    assert.ok(item);

    // Simulate executed quantity
    await prisma.boqItem.update({
      where: { id: item.id },
      data: { executedQuantity: 50 },
    });

    const req = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id, boqItemId: item.id },
      body: {
        quantity: 400,
      },
    });

    await assert.rejects(async () => boqController.updateBoqItem(req), BadRequestError);

    // Reset simulated execution
    await prisma.boqItem.update({
      where: { id: item.id },
      data: { executedQuantity: 0 },
    });
  });

  it('15. should prevent a BOQ item from being its own parent', async () => {
    const item = await prisma.boqItem.findFirst({ where: { projectId: projectA1Id, itemNumber: '2.01' } });
    assert.ok(item);

    const req = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id, boqItemId: item.id },
      body: {
        parentId: item.id,
      },
    });

    await assert.rejects(async () => boqController.updateBoqItem(req), BadRequestError);
  });

  // ==========================================
  // 5. BOQ DELETION & DEACTIVATION
  // ==========================================

  it('16. should allow deleting an unmeasured BOQ item without children', async () => {
    const createReq = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id },
      body: {
        itemNumber: '9.99',
        description: 'Temporary item for deletion',
        uom: 'NOS',
        quantity: 1,
        unitRate: 100,
      },
    });
    const created = await boqController.createBoqItem(createReq);

    const delReq = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id, boqItemId: created.data.id },
    });

    const delRes = await boqController.deleteBoqItem(delReq);
    assert.strictEqual(delRes.success, true);

    const check = await prisma.boqItem.findUnique({ where: { id: created.data.id } });
    assert.strictEqual(check, null);
  });

  it('17. should reject deleting a parent item that has children', async () => {
    const parent = await prisma.boqItem.findFirst({ where: { projectId: projectA1Id, itemNumber: '1.01' } });
    assert.ok(parent);

    const req = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id, boqItemId: parent.id },
    });

    await assert.rejects(async () => boqController.deleteBoqItem(req), BadRequestError);
  });

  it('18. should support deactivation (status = INACTIVE)', async () => {
    const item = await prisma.boqItem.findFirst({ where: { projectId: projectA1Id, itemNumber: '2.03' } });
    assert.ok(item);

    const req = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id, boqItemId: item.id },
      body: {
        status: 'INACTIVE',
      },
    });

    const res = await boqController.updateBoqItem(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.status, 'INACTIVE');
  });

  // ==========================================
  // 6. PHASE 10 BILLING POSITIONS INTERFACE
  // ==========================================

  it('19. should return accurate Phase 10 read-only billing positions', async () => {
    const req = createAuthReq(tokenPmA, {
      params: { projectId: projectA1Id },
    });

    const res = await boqController.getBillingPositions(req);
    assert.strictEqual(res.success, true);
    assert.ok(Array.isArray(res.data));
    assert.ok(res.data.length >= 3);

    const pos = res.data.find((p) => p.itemCode === '1.01');
    assert.ok(pos);
    assert.strictEqual(pos.contractQuantity, '1250.5');
    assert.strictEqual(pos.contractRate, '450.75');
    assert.strictEqual(pos.approvedCumulativeQuantity, '0');
    assert.strictEqual(pos.remainingQuantity, '1250.5');
    assert.strictEqual(pos.certifiedAmount, '0.00');
    assert.strictEqual(pos.completionPercentage, '0.00');
    assert.strictEqual(pos.isOverExecuted, false);
  });

  // ==========================================
  // 7. SECURITY & RBAC
  // ==========================================

  it('20. should block unprivileged user (EMPLOYEE) from creating BOQ items', async () => {
    const req = createAuthReq(tokenEmpA, {
      params: { projectId: projectA1Id },
      body: {
        itemNumber: '8.01',
        description: 'Unauthorized creation',
        uom: 'NOS',
        quantity: 1,
        unitRate: 100,
      },
    });

    await assert.rejects(async () => boqController.createBoqItem(req), ForbiddenError);
  });

  it('21. should prevent cross-tenant access to BOQ items', async () => {
    const itemA = await prisma.boqItem.findFirst({ where: { projectId: projectA1Id, itemNumber: '1.01' } });
    assert.ok(itemA);

    // Tenant B user querying Tenant A project
    const req = createAuthReq(tokenOwnerB, {
      params: { projectId: projectA1Id, boqItemId: itemA.id },
    });

    await assert.rejects(async () => boqController.getBoqItem(req), ForbiddenError);
  });
});
