import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service';
import { MaterialIndentsController } from '../src/modules/materials/controllers/material-indents.controller';
import { MaterialIndentService } from '../src/modules/materials/services/material-indent.service';
import { TokenService } from '../src/modules/auth/services/token.service';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ValidationError,
} from '../src/common/errors/app-error';

describe('DEZOBUILD Phase 07.3 — Material Indents / Requisitions Integration Suite', () => {
  let dbService: DatabaseService;
  let indentsController: MaterialIndentsController;
  let indentService: MaterialIndentService;
  let tokenService: TokenService;
  let prisma: any;

  // Tenant A (STARTER Plan - has materials:core)
  const tenantAId = 'aaaaaaaa-7777-9999-aaaa-aaaaaaaaaaaa';
  const ownerAId = 'aaaaaaaa-1111-9999-aaaa-aaaaaaaaaaaa';
  const pmAId = 'aaaaaaaa-2222-9999-aaaa-aaaaaaaaaaaa';
  const seAId = 'aaaaaaaa-3333-9999-aaaa-aaaaaaaaaaaa';
  const storeUserAId = 'aaaaaaaa-4444-9999-aaaa-aaaaaaaaaaaa';
  const noAccessUserAId = 'aaaaaaaa-5555-9999-aaaa-aaaaaaaaaaaa';

  let tokenOwnerA: string;
  let tokenPmA: string;
  let tokenSeA: string;
  let tokenStoreUserA: string;
  let tokenNoAccessUserA: string;

  // Tenant B (PROFESSIONAL Plan - Isolation)
  const tenantBId = 'bbbbbbbb-7777-9999-bbbb-bbbbbbbbbbbb';
  const ownerBId = 'bbbbbbbb-1111-9999-bbbb-bbbbbbbbbbbb';
  let tokenOwnerB: string;

  // Tenant C (No materials:core entitlement)
  const tenantCId = 'cccccccc-7777-9999-cccc-cccccccccccc';
  const ownerCId = 'cccccccc-1111-9999-cccc-cccccccccccc';
  let tokenOwnerC: string;

  let projectA1Id: string;
  let projectA2Id: string;
  let projectB1Id: string;
  let storeA1Id: string;
  let storeA2Id: string;
  let storeB1Id: string;
  let materialCementAId: string;
  let materialSteelAId: string;
  let materialInactiveAId: string;
  let materialCementBId: string;
  let wbsA1Id: string;
  let taskA1Id: string;
  let wbsA2Id: string;
  let taskA2Id: string;

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
    prisma = dbService.getClient() as any;

    // 1. Seed Roles & Plans
    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    tokenService = TokenService.getInstance();
    indentService = MaterialIndentService.getInstance();
    indentsController = new MaterialIndentsController(indentService);

    // 2. Clean up existing test data
    await prisma.materialIndentLine.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId, tenantCId] } },
    });
    await prisma.materialIndentSequence.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId, tenantCId] } },
    });
    await prisma.materialIndent.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId, tenantCId] } },
    });
    await prisma.stockMovement.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId, tenantCId] } },
    });
    await prisma.storeStockBalance.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId, tenantCId] } },
    });
    await prisma.storeAccessAssignment.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId, tenantCId] } },
    });
    await prisma.store.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId, tenantCId] } },
    });
    await prisma.material.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId, tenantCId] } },
    });
    await prisma.task.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId, tenantCId] } },
    });
    await prisma.wbsNode.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId, tenantCId] } },
    });
    await prisma.projectMember.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId, tenantCId] } },
    });
    await prisma.project.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId, tenantCId] } },
    });
    await prisma.company.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId, tenantCId] } },
    });
    await prisma.userRoleAssignment.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId, tenantCId] } },
    });
    await prisma.user.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId, tenantCId] } },
    });
    await prisma.tenantEntitlementOverride.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId, tenantCId] } },
    });
    await prisma.tenantSubscription.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId, tenantCId] } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantAId, tenantBId, tenantCId] } },
    });

    // 3. Create Tenants
    await prisma.tenant.createMany({
      data: [
        { id: tenantAId, code: 'TEN-IND-A99', name: 'Tenant A Indents', planTier: 'STARTER' },
        { id: tenantBId, code: 'TEN-IND-B99', name: 'Tenant B Indents', planTier: 'PROFESSIONAL' },
        { id: tenantCId, code: 'TEN-IND-C99', name: 'Tenant C No Entitlement', planTier: 'STARTER' },
      ],
    });

    const starterPlan = await prisma.platformPlan.findUnique({ where: { code: 'STARTER' } });
    const proPlan = await prisma.platformPlan.findUnique({ where: { code: 'PROFESSIONAL' } });

    // 4. Create Subscriptions
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantAId,
        planId: starterPlan.id,
        status: 'ACTIVE',
        billingCycle: 'ANNUAL',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
      },
    });

    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantBId,
        planId: proPlan.id,
        status: 'ACTIVE',
        billingCycle: 'ANNUAL',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
      },
    });

    const subC = await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantCId,
        planId: starterPlan.id,
        status: 'ACTIVE',
        billingCycle: 'ANNUAL',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
      },
    });

    // Explicitly disable materials:core on Tenant C
    await prisma.tenantEntitlementOverride.create({
      data: {
        tenantId: tenantCId,
        subscriptionId: subC.id,
        featureKey: 'materials:core',
        isEnabled: false,
      },
    });

    // 5. Create Users
    await prisma.user.createMany({
      data: [
        { id: ownerAId, tenantId: tenantAId, email: 'owner-a99@indent.com', fullName: 'Owner A', passwordHash: 'hash' },
        { id: pmAId, tenantId: tenantAId, email: 'pm-a99@indent.com', fullName: 'PM A', passwordHash: 'hash' },
        { id: seAId, tenantId: tenantAId, email: 'se-a99@indent.com', fullName: 'Site Engineer A', passwordHash: 'hash' },
        { id: storeUserAId, tenantId: tenantAId, email: 'store-a99@indent.com', fullName: 'Store User A', passwordHash: 'hash' },
        { id: noAccessUserAId, tenantId: tenantAId, email: 'noaccess-a99@indent.com', fullName: 'No Access A', passwordHash: 'hash' },
        { id: ownerBId, tenantId: tenantBId, email: 'owner-b99@indent.com', fullName: 'Owner B', passwordHash: 'hash' },
        { id: ownerCId, tenantId: tenantCId, email: 'owner-c99@indent.com', fullName: 'Owner C', passwordHash: 'hash' },
      ],
    });

    // 6. Assign Roles
    const roleOwner = await prisma.role.findFirst({ where: { name: 'COMPANY_OWNER' } });
    const rolePm = await prisma.role.findFirst({ where: { name: 'PROJECT_MANAGER' } });
    const roleSe = await prisma.role.findFirst({ where: { name: 'SITE_ENGINEER' } });
    const roleProcurement = await prisma.role.findFirst({ where: { name: 'PROCUREMENT_STORE' } });
    const roleEmployee = await prisma.role.findFirst({ where: { name: 'EMPLOYEE' } });

    await prisma.userRoleAssignment.createMany({
      data: [
        { tenantId: tenantAId, userId: ownerAId, roleId: roleOwner.id },
        { tenantId: tenantAId, userId: pmAId, roleId: rolePm.id },
        { tenantId: tenantAId, userId: seAId, roleId: roleSe.id },
        { tenantId: tenantAId, userId: storeUserAId, roleId: roleProcurement.id },
        { tenantId: tenantAId, userId: noAccessUserAId, roleId: roleEmployee.id },
        { tenantId: tenantBId, userId: ownerBId, roleId: roleOwner.id },
        { tenantId: tenantCId, userId: ownerCId, roleId: roleOwner.id },
      ],
    });

    // 7. Create Companies & Projects
    const compA = await prisma.company.create({
      data: { tenantId: tenantAId, code: 'COMP-A99', name: 'Company A Indents', legalName: 'Company A Ltd', panNumber: 'AAAAA0099A', gstin: '27AAAAA0099A1Z5', email: 'compa99@indent.com', phone: '9876543299', address: 'Mumbai', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
    });
    const compB = await prisma.company.create({
      data: { tenantId: tenantBId, code: 'COMP-B99', name: 'Company B Indents', legalName: 'Company B Ltd', panNumber: 'BBBBB0099B', gstin: '27BBBBB0099B1Z5', email: 'compb99@indent.com', phone: '9876543298', address: 'Pune', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
    });

    const projA1 = await prisma.project.create({
      data: { tenantId: tenantAId, companyId: compA.id, code: 'ORH99', name: 'Orion Heights 99' },
    });
    projectA1Id = projA1.id;

    const projA2 = await prisma.project.create({
      data: { tenantId: tenantAId, companyId: compA.id, code: 'MTR99', name: 'Metro Depot 99' },
    });
    projectA2Id = projA2.id;

    const projB1 = await prisma.project.create({
      data: { tenantId: tenantBId, companyId: compB.id, code: 'LKV99', name: 'Lakeview Towers 99' },
    });
    projectB1Id = projB1.id;

    // Project memberships: PM & SE in Project A1, PM only in A2
    await prisma.projectMember.createMany({
      data: [
        { tenantId: tenantAId, projectId: projectA1Id, userId: pmAId, projectRole: 'PROJECT_MANAGER' },
        { tenantId: tenantAId, projectId: projectA1Id, userId: seAId, projectRole: 'SITE_ENGINEER' },
        { tenantId: tenantAId, projectId: projectA2Id, userId: pmAId, projectRole: 'PROJECT_MANAGER' },
      ],
    });

    // 8. Create WBS & Tasks
    const wbs1 = await prisma.wbsNode.create({
      data: { tenantId: tenantAId, projectId: projectA1Id, code: '1.0', name: 'Civil Works' },
    });
    wbsA1Id = wbs1.id;

    const task1 = await prisma.task.create({
      data: { tenantId: tenantAId, projectId: projectA1Id, wbsNodeId: wbsA1Id, name: 'Slab Casting' },
    });
    taskA1Id = task1.id;

    const wbs2 = await prisma.wbsNode.create({
      data: { tenantId: tenantAId, projectId: projectA2Id, code: '2.0', name: 'Track Works' },
    });
    wbsA2Id = wbs2.id;

    const task2 = await prisma.task.create({
      data: { tenantId: tenantAId, projectId: projectA2Id, wbsNodeId: wbsA2Id, name: 'Ballast Laying' },
    });
    taskA2Id = task2.id;

    // 9. Create Stores
    const storeA1 = await prisma.store.create({
      data: { tenantId: tenantAId, projectId: projectA1Id, code: 'STR-ORH99', name: 'Orion Yard Store 99', storeType: 'PROJECT_SITE', status: 'ACTIVE' },
    });
    storeA1Id = storeA1.id;

    const storeA2 = await prisma.store.create({
      data: { tenantId: tenantAId, projectId: projectA2Id, code: 'STR-MTR99', name: 'Metro Store 99', storeType: 'PROJECT_SITE', status: 'ACTIVE' },
    });
    storeA2Id = storeA2.id;

    const storeB1 = await prisma.store.create({
      data: { tenantId: tenantBId, projectId: projectB1Id, code: 'STR-LKV99', name: 'Lakeview Store 99', storeType: 'PROJECT_SITE', status: 'ACTIVE' },
    });
    storeB1Id = storeB1.id;

    // 10. Create Materials
    const matCementA = await prisma.material.create({
      data: { tenantId: tenantAId, itemCode: 'MAT-CEM-99A', name: 'OPC 53 Grade Cement', category: 'Cement', primaryUom: 'BAGS', secondaryUom: 'MT', conversionFactor: 0.05, status: 'ACTIVE' },
    });
    materialCementAId = matCementA.id;

    const matSteelA = await prisma.material.create({
      data: { tenantId: tenantAId, itemCode: 'MAT-STL-99A', name: 'TMT Rebar 16mm', category: 'Steel', primaryUom: 'MT', secondaryUom: 'KG', conversionFactor: 1000, status: 'ACTIVE' },
    });
    materialSteelAId = matSteelA.id;

    const matInactiveA = await prisma.material.create({
      data: { tenantId: tenantAId, itemCode: 'MAT-OLD-99A', name: 'Obsolete Paint', category: 'Finishing', primaryUom: 'LTR', status: 'INACTIVE' },
    });
    materialInactiveAId = matInactiveA.id;

    const matCementB = await prisma.material.create({
      data: { tenantId: tenantBId, itemCode: 'MAT-CEM-99B', name: 'Tenant B Cement', category: 'Cement', primaryUom: 'BAGS', status: 'ACTIVE' },
    });
    materialCementBId = matCementB.id;

    // 11. Generate JWT Tokens
    tokenOwnerA = tokenService.createAccessToken({ userId: ownerAId, tenantId: tenantAId, sessionId: 'sess-owner-a99', sessionVersion: 1 });
    tokenPmA = tokenService.createAccessToken({ userId: pmAId, tenantId: tenantAId, sessionId: 'sess-pm-a99', sessionVersion: 1 });
    tokenSeA = tokenService.createAccessToken({ userId: seAId, tenantId: tenantAId, sessionId: 'sess-se-a99', sessionVersion: 1 });
    tokenStoreUserA = tokenService.createAccessToken({ userId: storeUserAId, tenantId: tenantAId, sessionId: 'sess-store-a99', sessionVersion: 1 });
    tokenNoAccessUserA = tokenService.createAccessToken({ userId: noAccessUserAId, tenantId: tenantAId, sessionId: 'sess-noaccess-a99', sessionVersion: 1 });
    tokenOwnerB = tokenService.createAccessToken({ userId: ownerBId, tenantId: tenantBId, sessionId: 'sess-owner-b99', sessionVersion: 1 });
    tokenOwnerC = tokenService.createAccessToken({ userId: ownerCId, tenantId: tenantCId, sessionId: 'sess-owner-c99', sessionVersion: 1 });
  });

  after(async () => {
    await dbService.disconnect();
  });

  // ============================================================
  // 1. CREATE DRAFT & MULTI-LINE INDENTS
  // ============================================================
  let indent1Id: string;
  let indent1Number: string;

  it('1. create draft: Should create single-line material indent in DRAFT status', async () => {
    const req = createAuthReq(tokenSeA, {
      body: {
        projectId: projectA1Id,
        storeId: storeA1Id,
        requiredByDate: '2026-09-20',
        priority: 'URGENT',
        remarks: 'Urgent cement requisition for 23rd floor pour',
        lines: [
          {
            materialId: materialCementAId,
            quantityRequested: 500,
            uom: 'BAGS',
            purpose: 'Floor slab concreting',
            wbsNodeId: wbsA1Id,
            taskId: taskA1Id,
          },
        ],
      },
    });

    const res = await indentsController.createIndent(req);
    assert.equal(res.success, true);
    assert.equal(res.data.status, 'DRAFT');
    assert.equal(res.data.priority, 'URGENT');
    assert.equal(res.data.createdById, seAId);
    assert.ok(res.data.indentNumber.startsWith('IND-ORH99-'));
    assert.equal(res.data.lines.length, 1);
    assert.equal(Number(res.data.lines[0].quantityRequested), 500);
    assert.equal(Number(res.data.lines[0].quantityFulfilled), 0);
    assert.equal(res.data.lines[0].uom, 'BAGS');

    indent1Id = res.data.id;
    indent1Number = res.data.indentNumber;
  });

  let indentMultiId: string;
  it('2. multi-line create: Should create multi-line indent across different materials', async () => {
    const req = createAuthReq(tokenPmA, {
      body: {
        projectId: projectA1Id,
        storeId: storeA1Id,
        requiredByDate: '2026-09-25',
        priority: 'NORMAL',
        remarks: 'Monthly bulk steel and cement requirement',
        lines: [
          {
            materialId: materialCementAId,
            quantityRequested: 1000,
            uom: 'BAGS',
            purpose: 'Columns',
          },
          {
            materialId: materialSteelAId,
            quantityRequested: 25.5,
            uom: 'MT',
            purpose: 'Beam reinforcement',
          },
        ],
      },
    });

    const res = await indentsController.createIndent(req);
    assert.equal(res.success, true);
    assert.equal(res.data.lines.length, 2);
    indentMultiId = res.data.id;
  });

  // ============================================================
  // 2. ISOLATION RULES (TENANT, PROJECT, STORE, MATERIAL, WBS, TASK)
  // ============================================================

  it('3. tenant isolation: Deny fetching or modifying Tenant A indent with Tenant B token', async () => {
    const req = createAuthReq(tokenOwnerB, {
      params: { id: indent1Id },
    });

    await assert.rejects(
      async () => indentsController.getIndent(req),
      (err: any) => err instanceof NotFoundError
    );
  });

  it('4. project isolation: Deny creating indent for another tenant project', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        projectId: projectB1Id,
        requiredByDate: '2026-09-30',
        lines: [{ materialId: materialCementAId, quantityRequested: 10, uom: 'BAGS' }],
      },
    });

    await assert.rejects(
      async () => indentsController.createIndent(req),
      (err: any) => err instanceof ForbiddenError || err instanceof NotFoundError
    );
  });

  it('5. store isolation: Deny linking store belonging to another tenant or project', async () => {
    // Foreign tenant store
    const reqForeignStore = createAuthReq(tokenOwnerA, {
      body: {
        projectId: projectA1Id,
        storeId: storeB1Id,
        requiredByDate: '2026-09-30',
        lines: [{ materialId: materialCementAId, quantityRequested: 10, uom: 'BAGS' }],
      },
    });

    await assert.rejects(
      async () => indentsController.createIndent(reqForeignStore),
      (err: any) => err instanceof NotFoundError
    );

    // Cross-project site store (Store A2 belongs to Project A2)
    const reqCrossProjectStore = createAuthReq(tokenOwnerA, {
      body: {
        projectId: projectA1Id,
        storeId: storeA2Id,
        requiredByDate: '2026-09-30',
        lines: [{ materialId: materialCementAId, quantityRequested: 10, uom: 'BAGS' }],
      },
    });

    await assert.rejects(
      async () => indentsController.createIndent(reqCrossProjectStore),
      (err: any) => err instanceof BadRequestError
    );
  });

  it('6. material isolation: Deny referencing material belonging to another tenant or inactive', async () => {
    // Foreign tenant material
    const reqForeignMat = createAuthReq(tokenOwnerA, {
      body: {
        projectId: projectA1Id,
        requiredByDate: '2026-09-30',
        lines: [{ materialId: materialCementBId, quantityRequested: 10, uom: 'BAGS' }],
      },
    });

    await assert.rejects(
      async () => indentsController.createIndent(reqForeignMat),
      (err: any) => err instanceof NotFoundError
    );

    // Inactive material
    const reqInactiveMat = createAuthReq(tokenOwnerA, {
      body: {
        projectId: projectA1Id,
        requiredByDate: '2026-09-30',
        lines: [{ materialId: materialInactiveAId, quantityRequested: 10, uom: 'LTR' }],
      },
    });

    await assert.rejects(
      async () => indentsController.createIndent(reqInactiveMat),
      (err: any) => err instanceof BadRequestError
    );
  });

  it('7. WBS isolation: Deny referencing WBS node from a different project', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        projectId: projectA1Id,
        requiredByDate: '2026-09-30',
        lines: [
          {
            materialId: materialCementAId,
            quantityRequested: 10,
            uom: 'BAGS',
            wbsNodeId: wbsA2Id, // from Project A2
          },
        ],
      },
    });

    await assert.rejects(
      async () => indentsController.createIndent(req),
      (err: any) => err instanceof BadRequestError
    );
  });

  it('8. task isolation: Deny referencing Task from a different project', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        projectId: projectA1Id,
        requiredByDate: '2026-09-30',
        lines: [
          {
            materialId: materialCementAId,
            quantityRequested: 10,
            uom: 'BAGS',
            taskId: taskA2Id, // from Project A2
          },
        ],
      },
    });

    await assert.rejects(
      async () => indentsController.createIndent(req),
      (err: any) => err instanceof BadRequestError
    );
  });

  // ============================================================
  // 3. LINE VALIDATIONS (QUANTITY, UOM, DUPLICATES)
  // ============================================================

  it('9. invalid quantity: Reject quantityRequested <= 0', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        projectId: projectA1Id,
        requiredByDate: '2026-09-30',
        lines: [{ materialId: materialCementAId, quantityRequested: 0, uom: 'BAGS' }],
      },
    });

    await assert.rejects(
      async () => indentsController.createIndent(req),
      (err: any) => err instanceof ValidationError || err instanceof BadRequestError
    );
  });

  it('10. invalid UOM: Reject UOM that does not match material master primary/secondary UOM', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        projectId: projectA1Id,
        requiredByDate: '2026-09-30',
        lines: [{ materialId: materialCementAId, quantityRequested: 50, uom: 'LTR' }],
      },
    });

    await assert.rejects(
      async () => indentsController.createIndent(req),
      (err: any) => err instanceof BadRequestError
    );
  });

  it('11. duplicate material line: Reject creating indent with duplicate material lines', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        projectId: projectA1Id,
        requiredByDate: '2026-09-30',
        lines: [
          { materialId: materialCementAId, quantityRequested: 100, uom: 'BAGS' },
          { materialId: materialCementAId, quantityRequested: 200, uom: 'BAGS' },
        ],
      },
    });

    await assert.rejects(
      async () => indentsController.createIndent(req),
      (err: any) => err instanceof BadRequestError
    );
  });

  // ============================================================
  // 4. SUBMIT, REJECT & REVISE LIFECYCLE
  // ============================================================

  it('12. submit: Valid transition from DRAFT to SUBMITTED', async () => {
    const req = createAuthReq(tokenSeA, {
      params: { id: indent1Id },
      body: { notes: 'Ready for PM approval' },
    });

    const res = await indentsController.submitIndent(req);
    assert.equal(res.success, true);
    assert.equal(res.data.status, 'SUBMITTED');
    assert.equal(res.data.submittedById, seAId);
    assert.ok(res.data.submittedAt);
  });

  it('13. empty submit denied: Re-submitting an already SUBMITTED indent should fail', async () => {
    const req = createAuthReq(tokenSeA, {
      params: { id: indent1Id },
    });

    await assert.rejects(
      async () => indentsController.submitIndent(req),
      (err: any) => err instanceof BadRequestError
    );
  });

  it('14. reject: Valid transition from SUBMITTED to REJECTED with rejectionReason', async () => {
    const req = createAuthReq(tokenPmA, {
      params: { id: indent1Id },
      body: { rejectionReason: 'Excess quantity. Please check site inventory balance before requesting 500 bags.' },
    });

    const res = await indentsController.rejectIndent(req);
    assert.equal(res.success, true);
    assert.equal(res.data.status, 'REJECTED');
    assert.equal(res.data.rejectedById, pmAId);
    assert.ok(res.data.rejectedAt);
    assert.equal(res.data.rejectionReason, 'Excess quantity. Please check site inventory balance before requesting 500 bags.');
  });

  it('15. rejection reason required: Rejecting without non-empty rejectionReason must fail', async () => {
    // First submit indentMulti
    const submitReq = createAuthReq(tokenPmA, { params: { id: indentMultiId } });
    await indentsController.submitIndent(submitReq);

    const rejectReq = createAuthReq(tokenOwnerA, {
      params: { id: indentMultiId },
      body: { rejectionReason: '   ' },
    });

    await assert.rejects(
      async () => indentsController.rejectIndent(rejectReq),
      (err: any) => err instanceof BadRequestError
    );
  });

  it('16. revise rejected: Allow updating and resubmitting a REJECTED indent back to SUBMITTED', async () => {
    // Update rejected indent1 to 300 bags
    const updateReq = createAuthReq(tokenSeA, {
      params: { id: indent1Id },
      body: {
        lines: [
          {
            materialId: materialCementAId,
            quantityRequested: 300,
            uom: 'BAGS',
            purpose: 'Revised slab pour requirement',
          },
        ],
      },
    });
    const updateRes = await indentsController.updateIndent(updateReq);
    assert.equal(updateRes.success, true);
    assert.equal(Number(updateRes.data.lines[0].quantityRequested), 300);

    // Resubmit indent1
    const resubmitReq = createAuthReq(tokenSeA, {
      params: { id: indent1Id },
    });
    const resubmitRes = await indentsController.submitIndent(resubmitReq);
    assert.equal(resubmitRes.success, true);
    assert.equal(resubmitRes.data.status, 'SUBMITTED');
    assert.equal(resubmitRes.data.rejectionReason, null);
    assert.equal(resubmitRes.data.rejectedById, null);
  });

  // ============================================================
  // 5. SEGREGATION OF DUTIES (SoD) & APPROVAL
  // ============================================================

  it('17. creator self approval denied: Strictly reject approverId === createdById', async () => {
    // indent1 was created by Site Engineer (seAId)
    // Attempt approval with seA token (even if user had approve perm, SoD must deny)
    const req = createAuthReq(tokenSeA, {
      params: { id: indent1Id },
      body: { approvalRemarks: 'Self approval attempt' },
    });

    await assert.rejects(
      async () => indentsController.approveIndent(req),
      (err: any) => err instanceof ForbiddenError
    );
  });

  it('18. submitter self approval denied: Strictly reject approverId === submittedById', async () => {
    // Create indent with Owner A, but submit with PM A
    const createReq = createAuthReq(tokenOwnerA, {
      body: {
        projectId: projectA1Id,
        requiredByDate: '2026-09-28',
        lines: [{ materialId: materialSteelAId, quantityRequested: 10, uom: 'MT' }],
      },
    });
    const created = await indentsController.createIndent(createReq);

    const submitReq = createAuthReq(tokenPmA, {
      params: { id: created.data.id },
    });
    await indentsController.submitIndent(submitReq);

    // PM A (the submitter) attempts to approve
    const approveReq = createAuthReq(tokenPmA, {
      params: { id: created.data.id },
      body: { approvalRemarks: 'Approving my own submitted indent' },
    });

    await assert.rejects(
      async () => indentsController.approveIndent(approveReq),
      (err: any) => err instanceof ForbiddenError && err.message.includes('Segregation of Duties')
    );

    // Clean up
    await prisma.materialIndentLine.deleteMany({ where: { indentId: created.data.id } });
    await prisma.materialIndent.delete({ where: { id: created.data.id } });
  });

  it('19. approve: Valid approval by distinct authorized approver (PM approving SE indent)', async () => {
    // indent1 was created & submitted by SE (seAId). PM (pmAId) approves.
    const req = createAuthReq(tokenPmA, {
      params: { id: indent1Id },
      body: { approvalRemarks: 'Approved for 300 bags. Verified against store balance.' },
    });

    const res = await indentsController.approveIndent(req);
    assert.equal(res.success, true);
    assert.equal(res.data.status, 'APPROVED');
    assert.equal(res.data.approvedById, pmAId);
    assert.ok(res.data.approvedAt);
    assert.equal(res.data.approvalRemarks, 'Approved for 300 bags. Verified against store balance.');
  });

  // ============================================================
  // 6. STATE IMMUTABILITY & INVALID TRANSITIONS
  // ============================================================

  it('20. invalid transitions: Reject illegal lifecycle mutations', async () => {
    // Create fresh DRAFT indent
    const createReq = createAuthReq(tokenSeA, {
      body: {
        projectId: projectA1Id,
        requiredByDate: '2026-10-01',
        lines: [{ materialId: materialCementAId, quantityRequested: 50, uom: 'BAGS' }],
      },
    });
    const draftIndent = await indentsController.createIndent(createReq);

    // DRAFT -> APPROVED (must be denied)
    const approveDraftReq = createAuthReq(tokenPmA, { params: { id: draftIndent.data.id } });
    await assert.rejects(
      async () => indentsController.approveIndent(approveDraftReq),
      (err: any) => err instanceof BadRequestError
    );

    // DRAFT -> REJECTED (must be denied)
    const rejectDraftReq = createAuthReq(tokenPmA, {
      params: { id: draftIndent.data.id },
      body: { rejectionReason: 'Cannot reject draft' },
    });
    await assert.rejects(
      async () => indentsController.rejectIndent(rejectDraftReq),
      (err: any) => err instanceof BadRequestError
    );

    // Clean up
    await prisma.materialIndentLine.deleteMany({ where: { indentId: draftIndent.data.id } });
    await prisma.materialIndent.delete({ where: { id: draftIndent.data.id } });
  });

  it('21. approved immutability: Reject PATCH or line modifications on APPROVED indent', async () => {
    const req = createAuthReq(tokenSeA, {
      params: { id: indent1Id },
      body: { remarks: 'Trying to change approved indent remarks' },
    });

    await assert.rejects(
      async () => indentsController.updateIndent(req),
      (err: any) => err instanceof BadRequestError && err.message.includes('permanently immutable')
    );
  });

  // ============================================================
  // 7. CANCELLATION & DELETION RULES
  // ============================================================

  it('22. cancel unfulfilled approved: Allow cancelling unfulfilled APPROVED indent', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { id: indent1Id },
      body: { cancellationReason: 'Pour schedule postponed indefinitely by client' },
    });

    const res = await indentsController.cancelIndent(req);
    assert.equal(res.success, true);
    assert.equal(res.data.status, 'CANCELLED');
    assert.equal(res.data.cancelledById, ownerAId);
    assert.ok(res.data.cancelledAt);
    assert.equal(res.data.cancellationReason, 'Pour schedule postponed indefinitely by client');
  });

  it('23. cancel after fulfillment denied: Deny cancelling an indent with quantityFulfilled > 0', async () => {
    // Create an approved indent and simulate partial fulfillment in database
    const createReq = createAuthReq(tokenSeA, {
      body: {
        projectId: projectA1Id,
        requiredByDate: '2026-10-05',
        lines: [{ materialId: materialCementAId, quantityRequested: 100, uom: 'BAGS' }],
      },
    });
    const ind = await indentsController.createIndent(createReq);
    await indentsController.submitIndent(createAuthReq(tokenSeA, { params: { id: ind.data.id } }));
    await indentsController.approveIndent(createAuthReq(tokenPmA, { params: { id: ind.data.id } }));

    // Simulate fulfillment in line
    await prisma.materialIndentLine.updateMany({
      where: { indentId: ind.data.id },
      data: { quantityFulfilled: 40 },
    });

    const cancelReq = createAuthReq(tokenOwnerA, {
      params: { id: ind.data.id },
      body: { cancellationReason: 'Attempting cancellation after partial issue' },
    });

    await assert.rejects(
      async () => indentsController.cancelIndent(cancelReq),
      (err: any) => err instanceof BadRequestError && err.message.includes('partially or fully fulfilled')
    );

    // Clean up
    await prisma.materialIndentLine.deleteMany({ where: { indentId: ind.data.id } });
    await prisma.materialIndent.delete({ where: { id: ind.data.id } });
  });

  it('24. delete draft: Allow permanent deletion of DRAFT indent and its lines', async () => {
    const createReq = createAuthReq(tokenSeA, {
      body: {
        projectId: projectA1Id,
        requiredByDate: '2026-10-10',
        lines: [{ materialId: materialCementAId, quantityRequested: 20, uom: 'BAGS' }],
      },
    });
    const draft = await indentsController.createIndent(createReq);

    const deleteReq = createAuthReq(tokenSeA, { params: { id: draft.data.id } });
    const deleteRes = await indentsController.deleteIndent(deleteReq);
    assert.equal(deleteRes.success, true);
    assert.equal(deleteRes.data.deleted, true);

    const found = await prisma.materialIndent.findUnique({ where: { id: draft.data.id } });
    assert.equal(found, null);
  });

  it('25. submitted delete denied: Deny deleting non-DRAFT indents', async () => {
    // indentMultiId is in SUBMITTED status
    const req = createAuthReq(tokenOwnerA, { params: { id: indentMultiId } });

    await assert.rejects(
      async () => indentsController.deleteIndent(req),
      (err: any) => err instanceof BadRequestError && err.message.includes('Only DRAFT indents can be deleted')
    );
  });

  // ============================================================
  // 8. SECURITY, RBAC & ENTITLEMENTS
  // ============================================================

  it('26. tenantId injection denied: Passing foreign tenantId in body has zero effect', async () => {
    const req = createAuthReq(tokenSeA, {
      body: {
        tenantId: tenantBId, // Injected foreign tenant
        createdById: ownerBId, // Injected foreign user
        status: 'APPROVED', // Injected status
        projectId: projectA1Id,
        requiredByDate: '2026-10-15',
        lines: [{ materialId: materialCementAId, quantityRequested: 10, uom: 'BAGS' }],
      },
    });

    const res = await indentsController.createIndent(req);
    assert.equal(res.success, true);
    assert.equal(res.data.tenantId, tenantAId); // Remained authenticated tenant
    assert.equal(res.data.createdById, seAId); // Remained authenticated user
    assert.equal(res.data.status, 'DRAFT'); // Ignored injected APPROVED

    // Clean up
    await prisma.materialIndentLine.deleteMany({ where: { indentId: res.data.id } });
    await prisma.materialIndent.delete({ where: { id: res.data.id } });
  });

  it('27. unauthorized permission denied: User without materials:indent:create cannot create indent', async () => {
    const req = createAuthReq(tokenNoAccessUserA, {
      body: {
        projectId: projectA1Id,
        requiredByDate: '2026-10-15',
        lines: [{ materialId: materialCementAId, quantityRequested: 10, uom: 'BAGS' }],
      },
    });

    await assert.rejects(
      async () => indentsController.createIndent(req),
      (err: any) => err instanceof ForbiddenError
    );
  });

  it('28. missing entitlement denied: Deny indent operations when materials:core is disabled', async () => {
    const req = createAuthReq(tokenOwnerC, {
      body: {
        projectId: projectA1Id,
        requiredByDate: '2026-10-15',
        lines: [{ materialId: materialCementAId, quantityRequested: 10, uom: 'BAGS' }],
      },
    });

    await assert.rejects(
      async () => indentsController.createIndent(req),
      (err: any) => err instanceof ForbiddenError && err.message.includes('materials:core')
    );
  });

  // ============================================================
  // 9. CONCURRENCY RESILIENCE
  // ============================================================

  it('29. concurrent approval: Simultaneous approvals on same indent result in exactly 1 success', async () => {
    // Create and submit a new indent
    const ind = await indentsController.createIndent(
      createAuthReq(tokenSeA, {
        body: {
          projectId: projectA1Id,
          requiredByDate: '2026-10-20',
          lines: [{ materialId: materialCementAId, quantityRequested: 50, uom: 'BAGS' }],
        },
      })
    );
    await indentsController.submitIndent(createAuthReq(tokenSeA, { params: { id: ind.data.id } }));

    // Run simultaneous approvals with PM A and Owner A
    const results = await Promise.allSettled([
      indentsController.approveIndent(createAuthReq(tokenPmA, { params: { id: ind.data.id } })),
      indentsController.approveIndent(createAuthReq(tokenOwnerA, { params: { id: ind.data.id } })),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);

    // Clean up
    await prisma.materialIndentLine.deleteMany({ where: { indentId: ind.data.id } });
    await prisma.materialIndent.delete({ where: { id: ind.data.id } });
  });

  it('30. concurrent indent-number generation: Concurrent creation generates unique sequential numbers', async () => {
    const promises = Array.from({ length: 5 }).map((_, idx) =>
      indentsController.createIndent(
        createAuthReq(tokenPmA, {
          body: {
            projectId: projectA2Id, // Metro project (MTR)
            requiredByDate: '2026-10-25',
            lines: [{ materialId: materialCementAId, quantityRequested: (idx + 1) * 10, uom: 'BAGS' }],
          },
        })
      )
    );

    const responses = await Promise.all(promises);
    const indentNumbers = responses.map((r) => r.data.indentNumber);

    // Verify all 5 numbers are distinct and formatted
    const uniqueNumbers = new Set(indentNumbers);
    assert.equal(uniqueNumbers.size, 5);
    for (const num of indentNumbers) {
      assert.ok(num.startsWith('IND-MTR99-'));
    }

    // Clean up
    for (const r of responses) {
      await prisma.materialIndentLine.deleteMany({ where: { indentId: r.data.id } });
      await prisma.materialIndent.delete({ where: { id: r.data.id } });
    }
  });

  // ============================================================
  // 10. STOCK & COMMERCIAL INVARIANCE
  // ============================================================

  it('31. stock invariance: Zero StockMovements or balance changes created during indent lifecycle', async () => {
    const initialMovementCount = await prisma.stockMovement.count({ where: { tenantId: tenantAId } });
    const initialBalanceCount = await prisma.storeStockBalance.count({ where: { tenantId: tenantAId } });

    // Full lifecycle test: Create -> Submit -> Approve -> Cancel
    const createRes = await indentsController.createIndent(
      createAuthReq(tokenSeA, {
        body: {
          projectId: projectA1Id,
          storeId: storeA1Id,
          requiredByDate: '2026-10-30',
          lines: [{ materialId: materialSteelAId, quantityRequested: 50, uom: 'MT' }],
        },
      })
    );
    await indentsController.submitIndent(createAuthReq(tokenSeA, { params: { id: createRes.data.id } }));
    await indentsController.approveIndent(createAuthReq(tokenPmA, { params: { id: createRes.data.id } }));
    await indentsController.cancelIndent(createAuthReq(tokenOwnerA, { params: { id: createRes.data.id } }));

    const finalMovementCount = await prisma.stockMovement.count({ where: { tenantId: tenantAId } });
    const finalBalanceCount = await prisma.storeStockBalance.count({ where: { tenantId: tenantAId } });

    assert.equal(finalMovementCount, initialMovementCount);
    assert.equal(finalBalanceCount, initialBalanceCount);

    // Clean up
    await prisma.materialIndentLine.deleteMany({ where: { indentId: createRes.data.id } });
    await prisma.materialIndent.delete({ where: { id: createRes.data.id } });
  });

  // ============================================================
  // 11. LIST QUERY FILTERS & PROJECT SCOPING
  // ============================================================

  it('32. list indents: Verify list scoping, status filtering, and search', async () => {
    // List with status filter
    const listReq = createAuthReq(tokenOwnerA, {
      query: { status: 'CANCELLED' },
    });
    const listRes = await indentsController.listIndents(listReq);
    assert.equal(listRes.success, true);
    assert.ok(listRes.data.items.every((i) => i.status === 'CANCELLED'));

    // Project scoped user (SE is only member of Project A1)
    const seListReq = createAuthReq(tokenSeA, {
      query: { projectId: projectA1Id },
    });
    const seListRes = await indentsController.listIndents(seListReq);
    assert.equal(seListRes.success, true);
    assert.ok(seListRes.data.items.every((i) => i.projectId === projectA1Id));
  });
});
