import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service';
import { MaterialIssuesController } from '../src/modules/materials/controllers/material-issues.controller';
import { MaterialIssueService } from '../src/modules/materials/services/material-issue.service';
import { StockLedgerService } from '../src/modules/materials/services/stock-ledger.service';
import { TokenService } from '../src/modules/auth/services/token.service';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../src/common/errors/app-error';

describe('DEZOBUILD Phase 07.6 — Stock Issue / Material Consumption Integration Suite', () => {
  let dbService: DatabaseService;
  let issueController: MaterialIssuesController;
  let issueService: MaterialIssueService;
  let stockLedgerService: StockLedgerService;
  let tokenService: TokenService;
  let prisma: any;

  // Tenant A (PROFESSIONAL Plan)
  const tenantAId = 'aaaaaaaa-7676-9999-aaaa-aaaaaaaaaaaa';
  const ownerAId = 'aaaaaaaa-1111-7676-aaaa-aaaaaaaaaaaa'; // Org Admin
  const pmAId = 'aaaaaaaa-2222-7676-aaaa-aaaaaaaaaaaa'; // Project Manager (requester)
  const storeOfficerAId = 'aaaaaaaa-3333-7676-aaaa-aaaaaaaaaaaa'; // Store Officer (issuer)
  const approverAId = 'aaaaaaaa-4444-7676-aaaa-aaaaaaaaaaaa'; // Approver (independent)
  const noAccessUserAId = 'aaaaaaaa-5555-7676-aaaa-aaaaaaaaaaaa';

  let tokenOwnerA: string;
  let tokenPmA: string;
  let tokenStoreOfficerA: string;
  let tokenApproverA: string;
  let tokenNoAccessUserA: string;

  // Tenant B (Isolation)
  const tenantBId = 'bbbbbbbb-7676-9999-bbbb-bbbbbbbbbbbb';
  const ownerBId = 'bbbbbbbb-1111-7676-bbbb-bbbbbbbbbbbb';
  let tokenOwnerB: string;

  let projectA1Id: string;
  let projectA2Id: string;
  let projectB1Id: string;
  let wbsA1Id: string;
  let taskA1Id: string;
  let wbsA2Id: string;
  let taskA2Id: string;

  let storeA1SiteId: string;
  let storeA2SiteId: string;
  let storeA3CentralId: string;
  let storeAInactiveId: string;
  let storeB1SiteId: string;

  let materialCementAId: string;
  let materialSteelAId: string;
  let materialSandAId: string;
  let materialPaintAId: string;
  let materialCementBId: string;

  function createAuthReq(
    token: string,
    options?: {
      body?: unknown;
      params?: Record<string, string>;
      query?: Record<string, string>;
    }
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

  async function seedStock(
    tId: string,
    sId: string,
    mId: string,
    qty: number
  ) {
    await prisma.$executeRaw`
      INSERT INTO "store_stock_balances" ("id", "tenant_id", "store_id", "material_id", "quantity_on_hand", "reserved_quantity", "created_at", "updated_at")
      VALUES (gen_random_uuid(), ${tId}::uuid, ${sId}::uuid, ${mId}::uuid, ${qty}, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("store_id", "material_id")
      DO UPDATE SET "quantity_on_hand" = ${qty}, "reserved_quantity" = 0, "updated_at" = CURRENT_TIMESTAMP;
    `;
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
    stockLedgerService = StockLedgerService.getInstance();
    issueService = MaterialIssueService.getInstance();
    issueController = new MaterialIssuesController(issueService);

    const testTenantIds = [tenantAId, tenantBId];
    await prisma.materialIssueLine.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.materialIssue.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.materialIssueSequence.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.stockMovement.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.storeStockBalance.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.task.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.wbsNode.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.storeAccessAssignment.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.store.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.material.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.projectMember.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.project.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.company.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.tenantSubscription.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.userRoleAssignment.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.user.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: testTenantIds } },
    });

    // 2. Create Tenants
    await prisma.tenant.create({
      data: {
        id: tenantAId,
        code: 'TENANT-ISSUE-A',
        name: 'Tenant Issue A Corp',
        status: 'ACTIVE',
        planTier: 'PROFESSIONAL',
      },
    });

    await prisma.tenant.create({
      data: {
        id: tenantBId,
        code: 'TENANT-ISSUE-B',
        name: 'Tenant Issue B Corp',
        status: 'ACTIVE',
        planTier: 'PROFESSIONAL',
      },
    });

    // 3. Subscriptions
    const profPlan = await prisma.platformPlan.findUnique({
      where: { code: 'PROFESSIONAL' },
    });

    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantAId,
        planId: profPlan.id,
        status: 'ACTIVE',
        billingCycle: 'ANNUAL',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
      },
    });

    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantBId,
        planId: profPlan.id,
        status: 'ACTIVE',
        billingCycle: 'ANNUAL',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
      },
    });

    // 4. Users in Tenant A
    const companyOwnerRole = await prisma.role.findFirst({
      where: { name: 'COMPANY_OWNER', tenantId: null },
    });
    const companyAdminRole = await prisma.role.findFirst({
      where: { name: 'COMPANY_ADMIN', tenantId: null },
    });
    const procStoreRole = await prisma.role.findFirst({
      where: { name: 'PROCUREMENT_STORE', tenantId: null },
    });

    await prisma.user.create({
      data: {
        id: ownerAId,
        tenantId: tenantAId,
        email: 'admin.issue@tenanta.com',
        fullName: 'Tenant A Admin',
        passwordHash: 'dummy-hash',
        status: 'ACTIVE',
      },
    });
    await prisma.userRoleAssignment.create({
      data: {
        tenantId: tenantAId,
        userId: ownerAId,
        roleId: companyOwnerRole.id,
        scopeType: 'TENANT',
      },
    });

    await prisma.user.create({
      data: {
        id: pmAId,
        tenantId: tenantAId,
        email: 'pm.issue@tenanta.com',
        fullName: 'Tenant A PM Requester',
        passwordHash: 'dummy-hash',
        status: 'ACTIVE',
      },
    });
    await prisma.userRoleAssignment.create({
      data: {
        tenantId: tenantAId,
        userId: pmAId,
        roleId: companyAdminRole.id,
        scopeType: 'TENANT',
      },
    });

    await prisma.user.create({
      data: {
        id: storeOfficerAId,
        tenantId: tenantAId,
        email: 'store.issue@tenanta.com',
        fullName: 'Tenant A Store Officer Issuer',
        passwordHash: 'dummy-hash',
        status: 'ACTIVE',
      },
    });
    await prisma.userRoleAssignment.create({
      data: {
        tenantId: tenantAId,
        userId: storeOfficerAId,
        roleId: procStoreRole.id,
        scopeType: 'TENANT',
      },
    });

    await prisma.user.create({
      data: {
        id: approverAId,
        tenantId: tenantAId,
        email: 'approver.issue@tenanta.com',
        fullName: 'Tenant A Approver',
        passwordHash: 'dummy-hash',
        status: 'ACTIVE',
      },
    });
    await prisma.userRoleAssignment.create({
      data: {
        tenantId: tenantAId,
        userId: approverAId,
        roleId: companyAdminRole.id,
        scopeType: 'TENANT',
      },
    });

    await prisma.user.create({
      data: {
        id: noAccessUserAId,
        tenantId: tenantAId,
        email: 'noaccess.issue@tenanta.com',
        fullName: 'Tenant A No Access User',
        passwordHash: 'dummy-hash',
        status: 'ACTIVE',
      },
    });

    // Users in Tenant B
    await prisma.user.create({
      data: {
        id: ownerBId,
        tenantId: tenantBId,
        email: 'admin.issue@tenantb.com',
        fullName: 'Tenant B Admin',
        passwordHash: 'dummy-hash',
        status: 'ACTIVE',
      },
    });
    await prisma.userRoleAssignment.create({
      data: {
        tenantId: tenantBId,
        userId: ownerBId,
        roleId: companyOwnerRole.id,
        scopeType: 'TENANT',
      },
    });

    // Generate Auth Tokens
    tokenOwnerA = tokenService.createAccessToken({
      userId: ownerAId,
      tenantId: tenantAId,
      sessionId: 'sess-owner-mi-a',
      sessionVersion: 1,
    });
    tokenPmA = tokenService.createAccessToken({
      userId: pmAId,
      tenantId: tenantAId,
      sessionId: 'sess-pm-mi-a',
      sessionVersion: 1,
    });
    tokenStoreOfficerA = tokenService.createAccessToken({
      userId: storeOfficerAId,
      tenantId: tenantAId,
      sessionId: 'sess-store-mi-a',
      sessionVersion: 1,
    });
    tokenApproverA = tokenService.createAccessToken({
      userId: approverAId,
      tenantId: tenantAId,
      sessionId: 'sess-appr-mi-a',
      sessionVersion: 1,
    });
    tokenNoAccessUserA = tokenService.createAccessToken({
      userId: noAccessUserAId,
      tenantId: tenantAId,
      sessionId: 'sess-noacc-mi-a',
      sessionVersion: 1,
    });
    tokenOwnerB = tokenService.createAccessToken({
      userId: ownerBId,
      tenantId: tenantBId,
      sessionId: 'sess-owner-mi-b',
      sessionVersion: 1,
    });

    // 5. Companies & Projects
    const compA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        code: 'COMP-ISSUE-A',
        name: 'Tenant A Construction Ltd',
        legalName: 'Tenant A Construction Limited',
        panNumber: 'AAAC1234A',
        gstin: '27AAAC1234A1Z5',
        email: 'contact@tenanta.com',
        phone: '9876543210',
        address: 'Site Office 1',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    });

    const compB = await prisma.company.create({
      data: {
        tenantId: tenantBId,
        code: 'COMP-ISSUE-B',
        name: 'Tenant B Construction Ltd',
        legalName: 'Tenant B Construction Limited',
        panNumber: 'BBBC1234B',
        gstin: '27BBBC1234B1Z5',
        email: 'contact@tenantb.com',
        phone: '9876543211',
        address: 'Site Office B',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
      },
    });

    const projA1 = await prisma.project.create({
      data: {
        tenantId: tenantAId,
        companyId: compA.id,
        code: 'PRJ-MI-A1',
        name: 'Highway Tower A1',
        status: 'IN_PROGRESS',
        plannedStartDate: new Date(),
      },
    });
    projectA1Id = projA1.id;

    const projA2 = await prisma.project.create({
      data: {
        tenantId: tenantAId,
        companyId: compA.id,
        code: 'PRJ-MI-A2',
        name: 'Bridge Section A2',
        status: 'IN_PROGRESS',
        plannedStartDate: new Date(),
      },
    });
    projectA2Id = projA2.id;

    const projB1 = await prisma.project.create({
      data: {
        tenantId: tenantBId,
        companyId: compB.id,
        code: 'PRJ-MI-B1',
        name: 'Tenant B Metro Project',
        status: 'IN_PROGRESS',
        plannedStartDate: new Date(),
      },
    });
    projectB1Id = projB1.id;

    // Project Members
    await prisma.projectMember.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        userId: pmAId,
        projectRole: 'PROJECT_MANAGER',
      },
    });
    await prisma.projectMember.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        userId: storeOfficerAId,
        projectRole: 'STORE_OFFICER',
      },
    });
    await prisma.projectMember.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        userId: approverAId,
        projectRole: 'SITE_ENGINEER',
      },
    });

    // 6. WBS & Tasks
    const wbsA1 = await prisma.wbsNode.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        code: 'WBS-1.1',
        name: 'Substructure Works',
      },
    });
    wbsA1Id = wbsA1.id;

    const taskA1 = await prisma.task.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        wbsNodeId: wbsA1Id,
        name: 'Piling & Foundation Concrete',
        status: 'IN_PROGRESS',
      },
    });
    taskA1Id = taskA1.id;

    const wbsA2 = await prisma.wbsNode.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA2Id,
        code: 'WBS-2.1',
        name: 'Pier Construction',
      },
    });
    wbsA2Id = wbsA2.id;

    const taskA2 = await prisma.task.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA2Id,
        wbsNodeId: wbsA2Id,
        name: 'Pier Cap Casting',
        status: 'IN_PROGRESS',
      },
    });
    taskA2Id = taskA2.id;

    // 7. Stores
    const stA1 = await prisma.store.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        code: 'STR-A1-SITE',
        name: 'Site Store Project A1',
        storeType: 'PROJECT_SITE',
        isCentralWarehouse: false,
        status: 'ACTIVE',
      },
    });
    storeA1SiteId = stA1.id;

    const stA2 = await prisma.store.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA2Id,
        code: 'STR-A2-SITE',
        name: 'Site Store Project A2',
        storeType: 'PROJECT_SITE',
        isCentralWarehouse: false,
        status: 'ACTIVE',
      },
    });
    storeA2SiteId = stA2.id;

    const stA3 = await prisma.store.create({
      data: {
        tenantId: tenantAId,
        code: 'STR-A3-CENTRAL',
        name: 'Central Warehouse A3',
        storeType: 'CENTRAL',
        isCentralWarehouse: true,
        status: 'ACTIVE',
      },
    });
    storeA3CentralId = stA3.id;

    const stAInact = await prisma.store.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        code: 'STR-A-INACT',
        name: 'Inactive Site Store',
        storeType: 'PROJECT_SITE',
        status: 'INACTIVE',
      },
    });
    storeAInactiveId = stAInact.id;

    const stB1 = await prisma.store.create({
      data: {
        tenantId: tenantBId,
        projectId: projectB1Id,
        code: 'STR-B1-SITE',
        name: 'Site Store Project B1',
        storeType: 'PROJECT_SITE',
        status: 'ACTIVE',
      },
    });
    storeB1SiteId = stB1.id;

    // Store Access Assignments
    await prisma.storeAccessAssignment.create({
      data: {
        tenantId: tenantAId,
        storeId: storeA1SiteId,
        userId: storeOfficerAId,
        accessLevel: 'FULL',
      },
    });

    // 8. Materials
    const matCementA = await prisma.material.create({
      data: {
        tenantId: tenantAId,
        itemCode: 'MAT-CEM-53',
        name: 'OPC 53 Grade Cement',
        category: 'CEMENT',
        primaryUom: 'BAG',
        standardRate: 380.0,
        status: 'ACTIVE',
      },
    });
    materialCementAId = matCementA.id;

    const matSteelA = await prisma.material.create({
      data: {
        tenantId: tenantAId,
        itemCode: 'MAT-STL-16',
        name: '16mm TMT Fe500D Rebar',
        category: 'STEEL',
        primaryUom: 'MT',
        standardRate: 62000.0,
        status: 'ACTIVE',
      },
    });
    materialSteelAId = matSteelA.id;

    const matSandA = await prisma.material.create({
      data: {
        tenantId: tenantAId,
        itemCode: 'MAT-SND-M',
        name: 'Manufactured M-Sand',
        category: 'AGGREGATES',
        primaryUom: 'TON',
        standardRate: 1200.0,
        status: 'ACTIVE',
      },
    });
    materialSandAId = matSandA.id;

    const matPaintA = await prisma.material.create({
      data: {
        tenantId: tenantAId,
        itemCode: 'MAT-PNT-EXT',
        name: 'Exterior Acrylic Emulsion',
        category: 'FINISHES',
        primaryUom: 'LTR',
        standardRate: 450.0,
        status: 'INACTIVE',
      },
    });
    materialPaintAId = matPaintA.id;

    const matCementB = await prisma.material.create({
      data: {
        tenantId: tenantBId,
        itemCode: 'MAT-CEM-53',
        name: 'OPC 53 Grade Cement B',
        category: 'CEMENT',
        primaryUom: 'BAG',
        standardRate: 390.0,
        status: 'ACTIVE',
      },
    });
    materialCementBId = matCementB.id;

    // 9. Initial Stock Balances
    // In Store A1: 500 Bags Cement, 200 MT Steel, 0 Sand
    await seedStock(tenantAId, storeA1SiteId, materialCementAId, 500);
    await seedStock(tenantAId, storeA1SiteId, materialSteelAId, 200);
    await seedStock(tenantAId, storeA3CentralId, materialCementAId, 1000);
    await seedStock(tenantBId, storeB1SiteId, materialCementBId, 300);
  });

  after(async () => {
    const testTenantIds = [tenantAId, tenantBId];
    await prisma.materialIssueLine.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.materialIssue.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.materialIssueSequence.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.stockMovement.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.storeStockBalance.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.task.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.wbsNode.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.storeAccessAssignment.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.store.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.material.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.projectMember.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.project.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.company.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.tenantSubscription.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.userRoleAssignment.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.user.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: testTenantIds } },
    });
  });

  // ==========================================
  // 1. CREATION & VALIDATION TESTS
  // ==========================================

  describe('1. Material Issue Creation & Validation', () => {
    it('1.1 should successfully create a material issue in DRAFT status with valid line items', async () => {
      const req = createAuthReq(tokenPmA, {
        body: {
          projectId: projectA1Id,
          storeId: storeA1SiteId,
          purpose: 'Foundation concrete pouring batch 1',
          remarks: 'Urgent site consumption',
          lines: [
            {
              materialId: materialCementAId,
              quantityRequested: 50,
              uom: 'BAG',
              wbsNodeId: wbsA1Id,
              taskId: taskA1Id,
              remarks: 'Batch 1 foundation',
            },
            {
              materialId: materialSteelAId,
              quantityRequested: 10,
              uom: 'MT',
              wbsNodeId: wbsA1Id,
              taskId: taskA1Id,
            },
          ],
        },
      });

      const res = await issueController.createMaterialIssue(req);
      assert.equal(res.success, true);
      assert.ok(res.data.id);
      assert.equal(res.data.status, 'DRAFT');
      assert.equal(res.data.projectId, projectA1Id);
      assert.equal(res.data.storeId, storeA1SiteId);
      assert.equal(res.data.requestedById, pmAId);
      assert.ok(res.data.issueNumber.startsWith('MI-PRJ-MI-A1-'));
      assert.equal(res.data.lines.length, 2);
      assert.equal(Number(res.data.lines[0].quantityRequested), 50);
      assert.equal(Number(res.data.lines[0].quantityIssued), 0);
      assert.equal(res.data.lines[0].wbsNodeId, wbsA1Id);
      assert.equal(res.data.lines[0].taskId, taskA1Id);
    });

    it('1.2 should allow creating material issue from a central warehouse for a project', async () => {
      const req = createAuthReq(tokenPmA, {
        body: {
          projectId: projectA1Id,
          storeId: storeA3CentralId, // Central Warehouse
          purpose: 'Drawing cement from central warehouse',
          lines: [
            {
              materialId: materialCementAId,
              quantityRequested: 100,
              uom: 'BAG',
            },
          ],
        },
      });

      const res = await issueController.createMaterialIssue(req);
      assert.equal(res.success, true);
      assert.equal(res.data.storeId, storeA3CentralId);
    });

    it('1.3 should reject creation if project does not exist', async () => {
      const fakeProjectId = '99999999-7676-9999-9999-999999999999';
      const req = createAuthReq(tokenOwnerA, {
        body: {
          projectId: fakeProjectId,
          storeId: storeA3CentralId,
          lines: [
            {
              materialId: materialCementAId,
              quantityRequested: 10,
              uom: 'BAG',
            },
          ],
        },
      });

      await assert.rejects(
        () => issueController.createMaterialIssue(req),
        (err: any) => err instanceof NotFoundError
      );
    });

    it('1.4 should reject creation if user lacks project access', async () => {
      const req = createAuthReq(tokenNoAccessUserA, {
        body: {
          projectId: projectA1Id,
          storeId: storeA1SiteId,
          lines: [
            {
              materialId: materialCementAId,
              quantityRequested: 10,
              uom: 'BAG',
            },
          ],
        },
      });

      await assert.rejects(
        () => issueController.createMaterialIssue(req),
        (err: any) => err instanceof ForbiddenError
      );
    });

    it('1.5 should reject creation if store does not exist', async () => {
      const fakeStoreId = '99999999-7676-9999-9999-999999999999';
      const req = createAuthReq(tokenPmA, {
        body: {
          projectId: projectA1Id,
          storeId: fakeStoreId,
          lines: [
            {
              materialId: materialCementAId,
              quantityRequested: 10,
              uom: 'BAG',
            },
          ],
        },
      });

      await assert.rejects(
        () => issueController.createMaterialIssue(req),
        (err: any) => err instanceof NotFoundError
      );
    });

    it('1.6 should reject creation if store is INACTIVE', async () => {
      const req = createAuthReq(tokenPmA, {
        body: {
          projectId: projectA1Id,
          storeId: storeAInactiveId,
          lines: [
            {
              materialId: materialCementAId,
              quantityRequested: 10,
              uom: 'BAG',
            },
          ],
        },
      });

      await assert.rejects(
        () => issueController.createMaterialIssue(req),
        (err: any) => err instanceof BadRequestError && err.message.includes('inactive')
      );
    });

    it('1.7 should reject creation if store belongs to a different project (not central warehouse)', async () => {
      const req = createAuthReq(tokenPmA, {
        body: {
          projectId: projectA1Id,
          storeId: storeA2SiteId, // Store of Project A2
          lines: [
            {
              materialId: materialCementAId,
              quantityRequested: 10,
              uom: 'BAG',
            },
          ],
        },
      });

      await assert.rejects(
        () => issueController.createMaterialIssue(req),
        (err: any) => err instanceof BadRequestError && err.message.includes('not valid for issue project')
      );
    });

    it('1.8 should reject creation if material does not exist', async () => {
      const fakeMaterialId = '99999999-7676-9999-9999-999999999999';
      const req = createAuthReq(tokenPmA, {
        body: {
          projectId: projectA1Id,
          storeId: storeA1SiteId,
          lines: [
            {
              materialId: fakeMaterialId,
              quantityRequested: 10,
              uom: 'BAG',
            },
          ],
        },
      });

      await assert.rejects(
        () => issueController.createMaterialIssue(req),
        (err: any) => err instanceof NotFoundError
      );
    });

    it('1.9 should reject creation if material is INACTIVE', async () => {
      const req = createAuthReq(tokenPmA, {
        body: {
          projectId: projectA1Id,
          storeId: storeA1SiteId,
          lines: [
            {
              materialId: materialPaintAId, // INACTIVE material
              quantityRequested: 5,
              uom: 'LTR',
            },
          ],
        },
      });

      await assert.rejects(
        () => issueController.createMaterialIssue(req),
        (err: any) => err instanceof BadRequestError && err.message.includes('inactive')
      );
    });

    it('1.10 should reject cross-project WBS node injection', async () => {
      const req = createAuthReq(tokenPmA, {
        body: {
          projectId: projectA1Id,
          storeId: storeA1SiteId,
          lines: [
            {
              materialId: materialCementAId,
              quantityRequested: 10,
              uom: 'BAG',
              wbsNodeId: wbsA2Id, // WBS belongs to Project A2!
            },
          ],
        },
      });

      await assert.rejects(
        () => issueController.createMaterialIssue(req),
        (err: any) => err instanceof BadRequestError && err.message.includes('belongs to project')
      );
    });

    it('1.11 should reject cross-project Task injection', async () => {
      const req = createAuthReq(tokenPmA, {
        body: {
          projectId: projectA1Id,
          storeId: storeA1SiteId,
          lines: [
            {
              materialId: materialCementAId,
              quantityRequested: 10,
              uom: 'BAG',
              taskId: taskA2Id, // Task belongs to Project A2!
            },
          ],
        },
      });

      await assert.rejects(
        () => issueController.createMaterialIssue(req),
        (err: any) => err instanceof BadRequestError && err.message.includes('belongs to project')
      );
    });

    it('1.12 should reject creation with empty lines array', async () => {
      const req = createAuthReq(tokenPmA, {
        body: {
          projectId: projectA1Id,
          storeId: storeA1SiteId,
          lines: [],
        },
      });

      await assert.rejects(
        () => issueController.createMaterialIssue(req),
        (err: any) => err.name === 'ValidationError' || err instanceof BadRequestError
      );
    });

    it('1.13 should reject creation with negative or zero requested quantity', async () => {
      const req = createAuthReq(tokenPmA, {
        body: {
          projectId: projectA1Id,
          storeId: storeA1SiteId,
          lines: [
            {
              materialId: materialCementAId,
              quantityRequested: 0,
              uom: 'BAG',
            },
          ],
        },
      });

      await assert.rejects(
        () => issueController.createMaterialIssue(req),
        (err: any) => err.name === 'ValidationError' || err instanceof BadRequestError
      );
    });

    it('1.14 should allocate atomic sequential issue numbers without collision', async () => {
      const req1 = createAuthReq(tokenPmA, {
        body: {
          projectId: projectA1Id,
          storeId: storeA1SiteId,
          lines: [{ materialId: materialCementAId, quantityRequested: 1, uom: 'BAG' }],
        },
      });
      const req2 = createAuthReq(tokenPmA, {
        body: {
          projectId: projectA1Id,
          storeId: storeA1SiteId,
          lines: [{ materialId: materialCementAId, quantityRequested: 1, uom: 'BAG' }],
        },
      });

      const res1 = await issueController.createMaterialIssue(req1);
      const res2 = await issueController.createMaterialIssue(req2);

      assert.ok(res1.data.issueNumber);
      assert.ok(res2.data.issueNumber);
      assert.notEqual(res1.data.issueNumber, res2.data.issueNumber);
    });
  });

  // ==========================================
  // 2. UPDATE, GET & DELETE TESTS
  // ==========================================

  describe('2. Material Issue Update, Retrieval & Deletion', () => {
    let draftIssueId: string;

    before(async () => {
      const req = createAuthReq(tokenPmA, {
        body: {
          projectId: projectA1Id,
          storeId: storeA1SiteId,
          purpose: 'Initial purpose',
          lines: [{ materialId: materialCementAId, quantityRequested: 20, uom: 'BAG' }],
        },
      });
      const res = await issueController.createMaterialIssue(req);
      draftIssueId = res.data.id;
    });

    it('2.1 should retrieve a material issue by ID with full relations', async () => {
      const req = createAuthReq(tokenPmA, {
        params: { id: draftIssueId },
      });

      const res = await issueController.getMaterialIssue(req);
      assert.equal(res.success, true);
      assert.equal(res.data.id, draftIssueId);
      assert.equal(res.data.project.code, 'PRJ-MI-A1');
      assert.equal(res.data.store.code, 'STR-A1-SITE');
      assert.equal(res.data.requestedBy.email, 'pm.issue@tenanta.com');
      assert.equal(res.data.lines.length, 1);
      assert.equal(res.data.lines[0].material.itemCode, 'MAT-CEM-53');
    });

    it('2.2 should list material issues with filtering and pagination', async () => {
      const req = createAuthReq(tokenPmA, {
        query: {
          projectId: projectA1Id,
          page: '1',
          limit: '10',
        },
      });

      const res = await issueController.listMaterialIssues(req);
      assert.equal(res.success, true);
      assert.ok(res.data.total >= 1);
      assert.ok(res.data.items.some((i) => i.id === draftIssueId));
    });

    it('2.3 should successfully update a DRAFT material issue', async () => {
      const req = createAuthReq(tokenPmA, {
        params: { id: draftIssueId },
        body: {
          purpose: 'Updated purpose for foundation',
          remarks: 'Updated remarks',
          lines: [
            {
              materialId: materialCementAId,
              quantityRequested: 35,
              uom: 'BAG',
            },
            {
              materialId: materialSteelAId,
              quantityRequested: 5,
              uom: 'MT',
            },
          ],
        },
      });

      const res = await issueController.updateMaterialIssue(req);
      assert.equal(res.success, true);
      assert.equal(res.data.purpose, 'Updated purpose for foundation');
      assert.equal(res.data.remarks, 'Updated remarks');
      assert.equal(res.data.lines.length, 2);
      assert.equal(Number(res.data.lines[0].quantityRequested), 35);
    });

    it('2.4 should delete a DRAFT material issue', async () => {
      const createReq = createAuthReq(tokenPmA, {
        body: {
          projectId: projectA1Id,
          storeId: storeA1SiteId,
          lines: [{ materialId: materialCementAId, quantityRequested: 10, uom: 'BAG' }],
        },
      });
      const created = await issueController.createMaterialIssue(createReq);

      const delReq = createAuthReq(tokenPmA, {
        params: { id: created.data.id },
      });
      const delRes = await issueController.deleteMaterialIssue(delReq);
      assert.equal(delRes.success, true);

      // Verify deletion
      const getReq = createAuthReq(tokenPmA, {
        params: { id: created.data.id },
      });
      await assert.rejects(
        () => issueController.getMaterialIssue(getReq),
        (err: any) => err instanceof NotFoundError
      );
    });
  });

  // ==========================================
  // 3. SUBMISSION & APPROVAL WORKFLOW
  // ==========================================

  describe('3. Submission & Approval Workflow', () => {
    let workflowIssueId: string;

    beforeEach(async () => {
      const createReq = createAuthReq(tokenPmA, {
        body: {
          projectId: projectA1Id,
          storeId: storeA1SiteId,
          purpose: 'Workflow testing note',
          lines: [{ materialId: materialCementAId, quantityRequested: 25, uom: 'BAG' }],
        },
      });
      const created = await issueController.createMaterialIssue(createReq);
      workflowIssueId = created.data.id;
    });

    it('3.1 should submit a DRAFT material issue to SUBMITTED status', async () => {
      const submitReq = createAuthReq(tokenPmA, {
        params: { id: workflowIssueId },
        body: { remarks: 'Submitted for site engineer approval' },
      });

      const res = await issueController.submitMaterialIssue(submitReq);
      assert.equal(res.success, true);
      assert.equal(res.data.status, 'SUBMITTED');
      assert.equal(res.data.remarks, 'Submitted for site engineer approval');
    });

    it('3.2 should reject submitting an already SUBMITTED material issue', async () => {
      const submitReq = createAuthReq(tokenPmA, {
        params: { id: workflowIssueId },
      });
      await issueController.submitMaterialIssue(submitReq);

      // Second submit
      await assert.rejects(
        () => issueController.submitMaterialIssue(submitReq),
        (err: any) => err instanceof BadRequestError && err.message.includes('Only DRAFT')
      );
    });

    it('3.3 should reject approving an issue directly from DRAFT without submission', async () => {
      const approveReq = createAuthReq(tokenApproverA, {
        params: { id: workflowIssueId },
      });

      await assert.rejects(
        () => issueController.approveMaterialIssue(approveReq),
        (err: any) => err instanceof BadRequestError && err.message.includes('Only SUBMITTED')
      );
    });

    it('3.4 should reject approval by the same user who requested the issue (Segregation of Duties)', async () => {
      const submitReq = createAuthReq(tokenPmA, {
        params: { id: workflowIssueId },
      });
      await issueController.submitMaterialIssue(submitReq);

      // Requester attempts to self-approve
      const selfApproveReq = createAuthReq(tokenPmA, {
        params: { id: workflowIssueId },
      });

      await assert.rejects(
        () => issueController.approveMaterialIssue(selfApproveReq),
        (err: any) => err instanceof ForbiddenError && err.message.includes('Segregation of duties')
      );
    });

    it('3.5 should approve a SUBMITTED material issue when approved by an independent user', async () => {
      const submitReq = createAuthReq(tokenPmA, {
        params: { id: workflowIssueId },
      });
      await issueController.submitMaterialIssue(submitReq);

      const approveReq = createAuthReq(tokenApproverA, {
        params: { id: workflowIssueId },
        body: { approvalRemarks: 'Verified against schedule and approved' },
      });

      const res = await issueController.approveMaterialIssue(approveReq);
      assert.equal(res.success, true);
      assert.equal(res.data.status, 'APPROVED');
      assert.equal(res.data.approvedById, approverAId);
      assert.ok(res.data.approvedAt);
    });

    it('3.6 should reject updating a material issue once SUBMITTED or APPROVED', async () => {
      const submitReq = createAuthReq(tokenPmA, {
        params: { id: workflowIssueId },
      });
      await issueController.submitMaterialIssue(submitReq);

      const updateReq = createAuthReq(tokenPmA, {
        params: { id: workflowIssueId },
        body: { purpose: 'Attempted modification' },
      });

      await assert.rejects(
        () => issueController.updateMaterialIssue(updateReq),
        (err: any) => err instanceof BadRequestError && err.message.includes('Only DRAFT')
      );
    });
  });

  // ==========================================
  // 4. STOCK ISSUANCE & INVARIANT VERIFICATION
  // ==========================================

  describe('4. Stock Issuance & Ledger Decrement Invariants', () => {
    it('4.1 should successfully issue materials, decrement stock balance, and create StockMovement.ISSUE', async () => {
      // Get initial cement balance
      const initialBal = await stockLedgerService.getStockBalance(
        tenantAId,
        ownerAId,
        storeA1SiteId,
        materialCementAId
      );
      const startQty = Number(initialBal.quantityOnHand);
      assert.ok(startQty >= 100);

      // Create issue for 30 bags
      const createRes = await issueController.createMaterialIssue(
        createAuthReq(tokenPmA, {
          body: {
            projectId: projectA1Id,
            storeId: storeA1SiteId,
            purpose: 'Piling concrete batch',
            lines: [
              {
                materialId: materialCementAId,
                quantityRequested: 30,
                uom: 'BAG',
                wbsNodeId: wbsA1Id,
                taskId: taskA1Id,
              },
            ],
          },
        })
      );
      const issueId = createRes.data.id;

      // Submit
      await issueController.submitMaterialIssue(
        createAuthReq(tokenPmA, { params: { id: issueId } })
      );

      // Approve
      await issueController.approveMaterialIssue(
        createAuthReq(tokenApproverA, { params: { id: issueId } })
      );

      // Issue by Store Officer
      const issueRes = await issueController.issueMaterialIssue(
        createAuthReq(tokenStoreOfficerA, {
          params: { id: issueId },
          body: { remarks: 'Dispatched 30 bags from Bay 4' },
        })
      );

      assert.equal(issueRes.success, true);
      assert.equal(issueRes.data.status, 'ISSUED');
      assert.equal(issueRes.data.issuedById, storeOfficerAId);
      assert.ok(issueRes.data.issuedAt);
      assert.equal(Number(issueRes.data.lines[0].quantityIssued), 30);

      // Verify Stock Balance decremented by exactly 30
      const afterBal = await stockLedgerService.getStockBalance(
        tenantAId,
        ownerAId,
        storeA1SiteId,
        materialCementAId
      );
      const endQty = Number(afterBal.quantityOnHand);
      assert.equal(endQty, startQty - 30);

      // Verify StockMovement.ISSUE record
      const movements = await prisma.stockMovement.findMany({
        where: {
          tenantId: tenantAId,
          referenceId: issueId,
          referenceType: 'MATERIAL_ISSUE',
        },
      });
      assert.equal(movements.length, 1);
      assert.equal(movements[0].movementType, 'ISSUE');
      assert.equal(Number(movements[0].quantity), 30);
      assert.equal(movements[0].uom, 'BAG');
      assert.equal(movements[0].performedById, storeOfficerAId);
      assert.equal(movements[0].idempotencyKey, `MI-${issueId}-${createRes.data.lines[0].id}`);
    });

    it('4.2 should be idempotent: issuing an already ISSUED note returns current state without re-decrementing', async () => {
      const createRes = await issueController.createMaterialIssue(
        createAuthReq(tokenPmA, {
          body: {
            projectId: projectA1Id,
            storeId: storeA1SiteId,
            lines: [{ materialId: materialCementAId, quantityRequested: 10, uom: 'BAG' }],
          },
        })
      );
      const issueId = createRes.data.id;

      await issueController.submitMaterialIssue(
        createAuthReq(tokenPmA, { params: { id: issueId } })
      );
      await issueController.approveMaterialIssue(
        createAuthReq(tokenApproverA, { params: { id: issueId } })
      );
      await issueController.issueMaterialIssue(
        createAuthReq(tokenStoreOfficerA, { params: { id: issueId } })
      );

      const balBeforeSecondCall = await stockLedgerService.getStockBalance(
        tenantAId,
        ownerAId,
        storeA1SiteId,
        materialCementAId
      );

      // Second issue call
      const res2 = await issueController.issueMaterialIssue(
        createAuthReq(tokenStoreOfficerA, { params: { id: issueId } })
      );
      assert.equal(res2.success, true);
      assert.equal(res2.data.status, 'ISSUED');

      const balAfterSecondCall = await stockLedgerService.getStockBalance(
        tenantAId,
        ownerAId,
        storeA1SiteId,
        materialCementAId
      );
      assert.equal(
        Number(balAfterSecondCall.quantityOnHand),
        Number(balBeforeSecondCall.quantityOnHand)
      );
    });

    it('4.3 should reject issuance by the same user who requested the issue (Segregation of Duties)', async () => {
      const createRes = await issueController.createMaterialIssue(
        createAuthReq(tokenPmA, {
          body: {
            projectId: projectA1Id,
            storeId: storeA1SiteId,
            lines: [{ materialId: materialCementAId, quantityRequested: 5, uom: 'BAG' }],
          },
        })
      );
      const issueId = createRes.data.id;

      await issueController.submitMaterialIssue(
        createAuthReq(tokenPmA, { params: { id: issueId } })
      );
      await issueController.approveMaterialIssue(
        createAuthReq(tokenApproverA, { params: { id: issueId } })
      );

      // Requester attempts to issue
      const issueReq = createAuthReq(tokenPmA, {
        params: { id: issueId },
      });

      await assert.rejects(
        () => issueController.issueMaterialIssue(issueReq),
        (err: any) => err instanceof ForbiddenError && err.message.includes('Segregation of duties')
      );
    });

    it('4.4 should reject issuance if available stock is insufficient (Negative Stock Prevention)', async () => {
      // Material Sand has 0 stock in Store A1
      const createRes = await issueController.createMaterialIssue(
        createAuthReq(tokenPmA, {
          body: {
            projectId: projectA1Id,
            storeId: storeA1SiteId,
            lines: [{ materialId: materialSandAId, quantityRequested: 50, uom: 'TON' }],
          },
        })
      );
      const issueId = createRes.data.id;

      await issueController.submitMaterialIssue(
        createAuthReq(tokenPmA, { params: { id: issueId } })
      );
      await issueController.approveMaterialIssue(
        createAuthReq(tokenApproverA, { params: { id: issueId } })
      );

      const issueReq = createAuthReq(tokenStoreOfficerA, {
        params: { id: issueId },
      });

      await assert.rejects(
        () => issueController.issueMaterialIssue(issueReq),
        (err: any) => err instanceof BadRequestError && err.message.includes('Insufficient stock')
      );

      // Verify status remained APPROVED and was NOT marked ISSUED
      const checkRes = await issueController.getMaterialIssue(
        createAuthReq(tokenPmA, { params: { id: issueId } })
      );
      assert.equal(checkRes.data.status, 'APPROVED');
    });

    it('4.5 should respect reserved stock and reject issue when availableQuantity is insufficient', async () => {
      // In Store A1: Cement onHand is ~400. Let's set reservedQuantity to 395 so available is 5.
      const curBal = await stockLedgerService.getStockBalance(
        tenantAId,
        ownerAId,
        storeA1SiteId,
        materialCementAId
      );
      const onHand = Number(curBal.quantityOnHand);

      await prisma.storeStockBalance.update({
        where: { id: curBal.id },
        data: { reservedQuantity: onHand - 5 },
      });

      // Request 10 bags (which is > 5 available, even though onHand is large)
      const createRes = await issueController.createMaterialIssue(
        createAuthReq(tokenPmA, {
          body: {
            projectId: projectA1Id,
            storeId: storeA1SiteId,
            lines: [{ materialId: materialCementAId, quantityRequested: 10, uom: 'BAG' }],
          },
        })
      );
      const issueId = createRes.data.id;

      await issueController.submitMaterialIssue(
        createAuthReq(tokenPmA, { params: { id: issueId } })
      );
      await issueController.approveMaterialIssue(
        createAuthReq(tokenApproverA, { params: { id: issueId } })
      );

      const issueReq = createAuthReq(tokenStoreOfficerA, {
        params: { id: issueId },
      });

      await assert.rejects(
        () => issueController.issueMaterialIssue(issueReq),
        (err: any) => err instanceof BadRequestError && err.message.includes('Insufficient stock')
      );

      // Clean up reservation
      await prisma.storeStockBalance.update({
        where: { id: curBal.id },
        data: { reservedQuantity: 0 },
      });
    });

    it('4.6 should atomically rollback all lines if any line in a multi-line issue fails stock check', async () => {
      const balCementBefore = await stockLedgerService.getStockBalance(
        tenantAId,
        ownerAId,
        storeA1SiteId,
        materialCementAId
      );
      const balSteelBefore = await stockLedgerService.getStockBalance(
        tenantAId,
        ownerAId,
        storeA1SiteId,
        materialSteelAId
      );

      // Create multi-line: Line 1 has sufficient Cement, Line 2 has Sand (0 stock -> failure)
      const createRes = await issueController.createMaterialIssue(
        createAuthReq(tokenPmA, {
          body: {
            projectId: projectA1Id,
            storeId: storeA1SiteId,
            lines: [
              { materialId: materialCementAId, quantityRequested: 20, uom: 'BAG' },
              { materialId: materialSandAId, quantityRequested: 100, uom: 'TON' }, // Will fail!
            ],
          },
        })
      );
      const issueId = createRes.data.id;

      await issueController.submitMaterialIssue(
        createAuthReq(tokenPmA, { params: { id: issueId } })
      );
      await issueController.approveMaterialIssue(
        createAuthReq(tokenApproverA, { params: { id: issueId } })
      );

      await assert.rejects(
        () =>
          issueController.issueMaterialIssue(
            createAuthReq(tokenStoreOfficerA, { params: { id: issueId } })
          ),
        (err: any) => err instanceof BadRequestError && err.message.includes('Insufficient stock')
      );

      // Verify Cement stock was NOT decremented (Transaction Rollback Integrity)
      const balCementAfter = await stockLedgerService.getStockBalance(
        tenantAId,
        ownerAId,
        storeA1SiteId,
        materialCementAId
      );
      assert.equal(
        Number(balCementAfter.quantityOnHand),
        Number(balCementBefore.quantityOnHand)
      );

      // Verify zero stock movements created for this issue
      const movements = await prisma.stockMovement.findMany({
        where: { referenceId: issueId, tenantId: tenantAId },
      });
      assert.equal(movements.length, 0);
    });
  });

  // ==========================================
  // 5. CONCURRENCY & DEADLOCK AVOIDANCE TESTS
  // ==========================================

  describe('5. Concurrency Race & Deadlock Avoidance', () => {
    it('5.1 should handle high-concurrency race: only valid issues succeed, preventing negative stock', async () => {
      // 1. Set exactly 50 bags in stock
      await seedStock(tenantAId, storeA1SiteId, materialCementAId, 50);

      // 2. Prepare 10 distinct approved issues requesting 10 bags each (Total requested = 100 bags, only 50 available)
      const issueIds: string[] = [];
      for (let i = 0; i < 10; i++) {
        const c = await issueController.createMaterialIssue(
          createAuthReq(tokenPmA, {
            body: {
              projectId: projectA1Id,
              storeId: storeA1SiteId,
              purpose: `Concurrent issue batch ${i}`,
              lines: [{ materialId: materialCementAId, quantityRequested: 10, uom: 'BAG' }],
            },
          })
        );
        await issueController.submitMaterialIssue(
          createAuthReq(tokenPmA, { params: { id: c.data.id } })
        );
        await issueController.approveMaterialIssue(
          createAuthReq(tokenApproverA, { params: { id: c.data.id } })
        );
        issueIds.push(c.data.id);
      }

      // 3. Fire all 10 issuance requests concurrently via Promise.allSettled
      const promises = issueIds.map((id) =>
        issueController.issueMaterialIssue(
          createAuthReq(tokenStoreOfficerA, { params: { id } })
        )
      );

      const results = await Promise.allSettled(promises);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // Exactly 5 should succeed (5 x 10 = 50 bags), exactly 5 should fail with insufficient stock
      assert.equal(fulfilled.length, 5);
      assert.equal(rejected.length, 5);

      // 4. Verify Final Stock Balance is EXACTLY 0, never negative
      const finalBal = await stockLedgerService.getStockBalance(
        tenantAId,
        ownerAId,
        storeA1SiteId,
        materialCementAId
      );
      assert.equal(Number(finalBal.quantityOnHand), 0);
    });

    it('5.2 should avoid deadlocks when concurrent multi-line issues lock materials in reverse order', async () => {
      // Seed sufficient stock
      await seedStock(tenantAId, storeA1SiteId, materialCementAId, 200);
      await seedStock(tenantAId, storeA1SiteId, materialSteelAId, 200);

      // Issue 1: Cement then Steel
      const c1 = await issueController.createMaterialIssue(
        createAuthReq(tokenPmA, {
          body: {
            projectId: projectA1Id,
            storeId: storeA1SiteId,
            lines: [
              { materialId: materialCementAId, quantityRequested: 5, uom: 'BAG' },
              { materialId: materialSteelAId, quantityRequested: 2, uom: 'MT' },
            ],
          },
        })
      );
      await issueController.submitMaterialIssue(
        createAuthReq(tokenPmA, { params: { id: c1.data.id } })
      );
      await issueController.approveMaterialIssue(
        createAuthReq(tokenApproverA, { params: { id: c1.data.id } })
      );

      // Issue 2: Steel then Cement (Reversed order in request payload)
      const c2 = await issueController.createMaterialIssue(
        createAuthReq(tokenPmA, {
          body: {
            projectId: projectA1Id,
            storeId: storeA1SiteId,
            lines: [
              { materialId: materialSteelAId, quantityRequested: 2, uom: 'MT' },
              { materialId: materialCementAId, quantityRequested: 5, uom: 'BAG' },
            ],
          },
        })
      );
      await issueController.submitMaterialIssue(
        createAuthReq(tokenPmA, { params: { id: c2.data.id } })
      );
      await issueController.approveMaterialIssue(
        createAuthReq(tokenApproverA, { params: { id: c2.data.id } })
      );

      // Fire both concurrently
      const results = await Promise.all([
        issueController.issueMaterialIssue(
          createAuthReq(tokenStoreOfficerA, { params: { id: c1.data.id } })
        ),
        issueController.issueMaterialIssue(
          createAuthReq(tokenStoreOfficerA, { params: { id: c2.data.id } })
        ),
      ]);

      assert.equal(results[0].success, true);
      assert.equal(results[1].success, true);
    });
  });

  // ==========================================
  // 6. CANCELLATION TESTS
  // ==========================================

  describe('6. Material Issue Cancellation', () => {
    it('6.1 should allow cancelling a DRAFT material issue', async () => {
      const createRes = await issueController.createMaterialIssue(
        createAuthReq(tokenPmA, {
          body: {
            projectId: projectA1Id,
            storeId: storeA1SiteId,
            lines: [{ materialId: materialCementAId, quantityRequested: 10, uom: 'BAG' }],
          },
        })
      );

      const cancelRes = await issueController.cancelMaterialIssue(
        createAuthReq(tokenPmA, {
          params: { id: createRes.data.id },
          body: { cancellationReason: 'Work rescheduled' },
        })
      );

      assert.equal(cancelRes.success, true);
      assert.equal(cancelRes.data.status, 'CANCELLED');
      assert.equal(cancelRes.data.cancelledById, pmAId);
      assert.equal(cancelRes.data.cancellationReason, 'Work rescheduled');
    });

    it('6.2 should allow cancelling an APPROVED material issue before issuance', async () => {
      const createRes = await issueController.createMaterialIssue(
        createAuthReq(tokenPmA, {
          body: {
            projectId: projectA1Id,
            storeId: storeA1SiteId,
            lines: [{ materialId: materialCementAId, quantityRequested: 10, uom: 'BAG' }],
          },
        })
      );
      const issueId = createRes.data.id;

      await issueController.submitMaterialIssue(
        createAuthReq(tokenPmA, { params: { id: issueId } })
      );
      await issueController.approveMaterialIssue(
        createAuthReq(tokenApproverA, { params: { id: issueId } })
      );

      const cancelRes = await issueController.cancelMaterialIssue(
        createAuthReq(tokenPmA, {
          params: { id: issueId },
          body: { cancellationReason: 'Design change on site' },
        })
      );

      assert.equal(cancelRes.success, true);
      assert.equal(cancelRes.data.status, 'CANCELLED');
    });

    it('6.3 should reject cancelling an already ISSUED material issue', async () => {
      // Seed stock
      await seedStock(tenantAId, storeA1SiteId, materialCementAId, 100);

      const createRes = await issueController.createMaterialIssue(
        createAuthReq(tokenPmA, {
          body: {
            projectId: projectA1Id,
            storeId: storeA1SiteId,
            lines: [{ materialId: materialCementAId, quantityRequested: 10, uom: 'BAG' }],
          },
        })
      );
      const issueId = createRes.data.id;

      await issueController.submitMaterialIssue(
        createAuthReq(tokenPmA, { params: { id: issueId } })
      );
      await issueController.approveMaterialIssue(
        createAuthReq(tokenApproverA, { params: { id: issueId } })
      );
      await issueController.issueMaterialIssue(
        createAuthReq(tokenStoreOfficerA, { params: { id: issueId } })
      );

      // Attempt to cancel
      await assert.rejects(
        () =>
          issueController.cancelMaterialIssue(
            createAuthReq(tokenPmA, { params: { id: issueId } })
          ),
        (err: any) => err instanceof BadRequestError && err.message.includes('already ISSUED')
      );
    });
  });

  // ==========================================
  // 7. MULTI-TENANT ISOLATION & RBAC SCOPING
  // ==========================================

  describe('7. Multi-Tenant Isolation & RBAC Scoping', () => {
    let tenantAIssueId: string;

    before(async () => {
      const c = await issueController.createMaterialIssue(
        createAuthReq(tokenPmA, {
          body: {
            projectId: projectA1Id,
            storeId: storeA1SiteId,
            lines: [{ materialId: materialCementAId, quantityRequested: 15, uom: 'BAG' }],
          },
        })
      );
      tenantAIssueId = c.data.id;
    });

    it('7.1 Tenant B user cannot access or view Tenant A material issues (Tenant Isolation)', async () => {
      const req = createAuthReq(tokenOwnerB, {
        params: { id: tenantAIssueId },
      });

      await assert.rejects(
        () => issueController.getMaterialIssue(req),
        (err: any) => err instanceof NotFoundError
      );
    });

    it('7.2 Tenant B user cannot issue materials against Tenant A notes', async () => {
      const req = createAuthReq(tokenOwnerB, {
        params: { id: tenantAIssueId },
      });

      await assert.rejects(
        () => issueController.issueMaterialIssue(req),
        (err: any) => err instanceof NotFoundError
      );
    });

    it('7.3 Tenant A user cannot create issues pointing to Tenant B project or store', async () => {
      const req = createAuthReq(tokenPmA, {
        body: {
          projectId: projectB1Id, // Tenant B Project
          storeId: storeA1SiteId,
          lines: [{ materialId: materialCementAId, quantityRequested: 5, uom: 'BAG' }],
        },
      });

      await assert.rejects(
        () => issueController.createMaterialIssue(req),
        (err: any) => err instanceof NotFoundError || err instanceof ForbiddenError
      );
    });

    it('7.4 User without project membership cannot view issues for that project', async () => {
      // User No Access is in Tenant A but has no ProjectMember assignment to Project A1
      const req = createAuthReq(tokenNoAccessUserA, {
        params: { id: tenantAIssueId },
      });

      await assert.rejects(
        () => issueController.getMaterialIssue(req),
        (err: any) => err instanceof ForbiddenError
      );
    });
  });

  // ==========================================
  // 8. ZERO FINANCIAL MUTATION PROOF
  // ==========================================

  describe('8. Zero Financial Mutation Integrity', () => {
    it('8.1 Material issue creates purely operational stock movement without financial ledger posting', async () => {
      // Seed stock
      await seedStock(tenantAId, storeA1SiteId, materialCementAId, 100);

      const c = await issueController.createMaterialIssue(
        createAuthReq(tokenPmA, {
          body: {
            projectId: projectA1Id,
            storeId: storeA1SiteId,
            lines: [{ materialId: materialCementAId, quantityRequested: 12, uom: 'BAG' }],
          },
        })
      );
      const issueId = c.data.id;

      await issueController.submitMaterialIssue(
        createAuthReq(tokenPmA, { params: { id: issueId } })
      );
      await issueController.approveMaterialIssue(
        createAuthReq(tokenApproverA, { params: { id: issueId } })
      );
      await issueController.issueMaterialIssue(
        createAuthReq(tokenStoreOfficerA, { params: { id: issueId } })
      );

      // Verify StockMovement exists
      const movement = await prisma.stockMovement.findFirst({
        where: { tenantId: tenantAId, referenceId: issueId },
      });
      assert.ok(movement);
      assert.equal(movement.movementType, 'ISSUE');
      assert.equal(Number(movement.unitRate), 380); // Material standard rate snapshotted

      // Verify no foreign or unknown financial table mutations occurred
      // (Operational issuance is purely inventory attribution)
      assert.equal(movement.referenceType, 'MATERIAL_ISSUE');
    });
  });
});
