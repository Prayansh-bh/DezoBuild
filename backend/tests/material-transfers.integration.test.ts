import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service';
import { MaterialTransfersController } from '../src/modules/materials/controllers/material-transfers.controller';
import { MaterialTransferService } from '../src/modules/materials/services/material-transfer.service';
import { StockLedgerService } from '../src/modules/materials/services/stock-ledger.service';
import { TokenService } from '../src/modules/auth/services/token.service';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../src/common/errors/app-error';

describe('DEZOBUILD Phase 07.8 — Material Transfer / Inter-Store Transfer Integration Suite', () => {
  let dbService: DatabaseService;
  let transferController: MaterialTransfersController;
  let transferService: MaterialTransferService;
  let stockLedgerService: StockLedgerService;
  let tokenService: TokenService;
  let prisma: any;

  // Tenant A (PROFESSIONAL Plan)
  const tenantAId = 'aaaaaaaa-7788-8888-aaaa-aaaaaaaaaaaa';
  const ownerAId = 'aaaaaaaa-1111-7788-aaaa-aaaaaaaaaaaa'; // Org Admin
  const pmAId = 'aaaaaaaa-2222-7788-aaaa-aaaaaaaaaaaa'; // Project Manager / Approver
  const storeKeeperAId = 'aaaaaaaa-3333-7788-aaaa-aaaaaaaaaaaa'; // Source Store Keeper / Dispatcher
  const storeReceiverAId = 'aaaaaaaa-4444-7788-aaaa-aaaaaaaaaaaa'; // Dest Store Keeper / Receiver
  const noAccessUserAId = 'aaaaaaaa-5555-7788-aaaa-aaaaaaaaaaaa';

  let tokenOwnerA: string;
  let tokenPmA: string;
  let tokenStoreKeeperA: string;
  let tokenStoreReceiverA: string;
  let tokenNoAccessUserA: string;

  // Tenant B (Isolation)
  const tenantBId = 'bbbbbbbb-7788-8888-bbbb-bbbbbbbbbbbb';
  const ownerBId = 'bbbbbbbb-1111-7788-bbbb-bbbbbbbbbbbb';
  let tokenOwnerB: string;

  let projectA1Id: string;
  let projectA2Id: string;
  let projectB1Id: string;

  let storeACentralId: string;
  let storeA1SiteId: string;
  let storeA2SiteId: string;
  let storeACentral2Id: string;
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
    qty: number,
    reserved: number = 0,
    seedLedger: boolean = false
  ) {
    await prisma.$executeRaw`
      INSERT INTO "store_stock_balances" ("id", "tenant_id", "store_id", "material_id", "quantity_on_hand", "reserved_quantity", "created_at", "updated_at")
      VALUES (gen_random_uuid(), ${tId}::uuid, ${sId}::uuid, ${mId}::uuid, ${qty}, ${reserved}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("store_id", "material_id")
      DO UPDATE SET "quantity_on_hand" = ${qty}, "reserved_quantity" = ${reserved}, "updated_at" = CURRENT_TIMESTAMP;
    `;
    if (seedLedger && qty > 0) {
      await prisma.stockMovement.create({
        data: {
          tenantId: tId,
          storeId: sId,
          materialId: mId,
          movementType: 'RECEIPT',
          quantity: qty,
          uom: 'BAG',
          referenceType: 'OPENING_BALANCE',
          idempotencyKey: `SEED-${sId}-${mId}-${Date.now()}-${Math.random()}`,
        },
      });
    }
  }

  async function getStockBalance(sId: string, mId: string): Promise<{ onHand: number; reserved: number; available: number }> {
    const row = await prisma.storeStockBalance.findFirst({
      where: { storeId: sId, materialId: mId },
    });
    if (!row) return { onHand: 0, reserved: 0, available: 0 };
    const onHand = Number(row.quantityOnHand);
    const reserved = Number(row.reservedQuantity);
    return { onHand, reserved, available: onHand - reserved };
  }

  before(async () => {
    dbService = DatabaseService.getInstance();
    await dbService.connect();
    prisma = dbService.getClient();

    const testTenantIds = [tenantAId, tenantBId];
    await prisma.stockMovement.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.storeStockBalance.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.materialTransferLine.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.materialTransfer.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.materialTransferSequence.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.materialReturnLine.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.materialReturn.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.materialIssueLine.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.materialIssue.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.material.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.storeAccessAssignment.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.store.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.projectMember.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.project.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.tenantEntitlementOverride.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.tenant.deleteMany({ where: { id: { in: testTenantIds } } });

    // Seed RBAC and Plans
    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // 1. Create Tenant A
    await prisma.tenant.create({
      data: {
        id: tenantAId,
        code: 'TENANT-TRF-A',
        name: 'Transfer Operations Alpha',
        planTier: 'PROFESSIONAL',
        status: 'ACTIVE',
      },
    });

    const profPlan = await prisma.platformPlan.findUnique({ where: { code: 'PROFESSIONAL' } });
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

    // Create Company A
    const companyA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        code: 'COMP-A',
        name: 'Alpha Infra Ltd',
        legalName: 'Alpha Infra Ltd',
        panNumber: 'AAACA1234A',
        gstin: '29AAACA1234A1Z5',
        email: 'info@alpha.com',
        phone: '9876543210',
        address: 'Bangalore Road',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
      },
    });

    // 2. Create Users for Tenant A
    await prisma.user.createMany({
      data: [
        {
          id: ownerAId,
          tenantId: tenantAId,
          email: 'owner-a@alpha.com',
          passwordHash: 'hash',
          fullName: 'Alpha Owner',
          status: 'ACTIVE',
        },
        {
          id: pmAId,
          tenantId: tenantAId,
          email: 'pm-a@alpha.com',
          passwordHash: 'hash',
          fullName: 'Alpha PM',
          status: 'ACTIVE',
        },
        {
          id: storeKeeperAId,
          tenantId: tenantAId,
          email: 'store-keeper-a@alpha.com',
          passwordHash: 'hash',
          fullName: 'Alpha Store Keeper (Dispatcher)',
          status: 'ACTIVE',
        },
        {
          id: storeReceiverAId,
          tenantId: tenantAId,
          email: 'store-receiver-a@alpha.com',
          passwordHash: 'hash',
          fullName: 'Alpha Store Receiver',
          status: 'ACTIVE',
        },
        {
          id: noAccessUserAId,
          tenantId: tenantAId,
          email: 'no-access-a@alpha.com',
          passwordHash: 'hash',
          fullName: 'Alpha No Access',
          status: 'ACTIVE',
        },
      ],
    });

    // Assign Roles
    const roleOwner = await prisma.role.findFirst({ where: { name: 'COMPANY_OWNER', tenantId: null } });
    const rolePm = await prisma.role.findFirst({ where: { name: 'PROJECT_MANAGER', tenantId: null } });
    const roleProcStore = await prisma.role.findFirst({ where: { name: 'PROCUREMENT_STORE', tenantId: null } });
    const roleEmployee = await prisma.role.findFirst({ where: { name: 'EMPLOYEE', tenantId: null } });

    await prisma.userRoleAssignment.createMany({
      data: [
        { tenantId: tenantAId, userId: ownerAId, roleId: roleOwner.id, scopeType: 'TENANT' },
        { tenantId: tenantAId, userId: pmAId, roleId: rolePm.id, scopeType: 'TENANT' },
        { tenantId: tenantAId, userId: storeKeeperAId, roleId: roleProcStore.id, scopeType: 'TENANT' },
        { tenantId: tenantAId, userId: storeReceiverAId, roleId: roleProcStore.id, scopeType: 'TENANT' },
        { tenantId: tenantAId, userId: noAccessUserAId, roleId: roleEmployee.id, scopeType: 'TENANT' },
      ],
    });

    // 3. Create Projects for Tenant A
    const prjA1 = await prisma.project.create({
      data: {
        tenantId: tenantAId,
        companyId: companyA.id,
        code: 'PRJ-A1',
        name: 'Project Alpha Towers',
        status: 'ACTIVE',
      },
    });
    projectA1Id = prjA1.id;

    const prjA2 = await prisma.project.create({
      data: {
        tenantId: tenantAId,
        companyId: companyA.id,
        code: 'PRJ-A2',
        name: 'Project Alpha Villas',
        status: 'ACTIVE',
      },
    });
    projectA2Id = prjA2.id;

    // Project Memberships
    await prisma.projectMember.createMany({
      data: [
        { tenantId: tenantAId, projectId: projectA1Id, userId: pmAId, projectRole: 'PROJECT_MANAGER' },
        { tenantId: tenantAId, projectId: projectA1Id, userId: storeKeeperAId, projectRole: 'STORE_KEEPER' },
        { tenantId: tenantAId, projectId: projectA2Id, userId: pmAId, projectRole: 'PROJECT_MANAGER' },
        { tenantId: tenantAId, projectId: projectA2Id, userId: storeReceiverAId, projectRole: 'STORE_KEEPER' },
      ],
    });

    // 4. Create Stores for Tenant A
    const storeCentral = await prisma.store.create({
      data: {
        tenantId: tenantAId,
        code: 'STR-CENTRAL',
        name: 'Central Mother Warehouse',
        storeType: 'CENTRAL',
        isCentralWarehouse: true,
        status: 'ACTIVE',
      },
    });
    storeACentralId = storeCentral.id;

    const storeCentral2 = await prisma.store.create({
      data: {
        tenantId: tenantAId,
        code: 'STR-CENTRAL-2',
        name: 'Secondary Central Hub',
        storeType: 'CENTRAL',
        isCentralWarehouse: true,
        status: 'ACTIVE',
      },
    });
    storeACentral2Id = storeCentral2.id;

    const storeA1 = await prisma.store.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        code: 'STR-A1-SITE',
        name: 'Alpha Towers Site Yard',
        storeType: 'PROJECT_SITE',
        isCentralWarehouse: false,
        status: 'ACTIVE',
      },
    });
    storeA1SiteId = storeA1.id;

    const storeA2 = await prisma.store.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA2Id,
        code: 'STR-A2-SITE',
        name: 'Alpha Villas Site Yard',
        storeType: 'PROJECT_SITE',
        isCentralWarehouse: false,
        status: 'ACTIVE',
      },
    });
    storeA2SiteId = storeA2.id;

    const storeInact = await prisma.store.create({
      data: {
        tenantId: tenantAId,
        code: 'STR-A-INACTIVE',
        name: 'Inactive Decommissioned Store',
        storeType: 'CENTRAL',
        isCentralWarehouse: true,
        status: 'INACTIVE',
      },
    });
    storeAInactiveId = storeInact.id;

    // Store Access Assignments
    await prisma.storeAccessAssignment.createMany({
      data: [
        { tenantId: tenantAId, storeId: storeACentralId, userId: storeKeeperAId, accessLevel: 'FULL' },
        { tenantId: tenantAId, storeId: storeACentralId, userId: storeReceiverAId, accessLevel: 'FULL' },
        { tenantId: tenantAId, storeId: storeACentralId, userId: pmAId, accessLevel: 'FULL' },
        { tenantId: tenantAId, storeId: storeACentral2Id, userId: storeKeeperAId, accessLevel: 'FULL' },
        { tenantId: tenantAId, storeId: storeACentral2Id, userId: storeReceiverAId, accessLevel: 'FULL' },
        { tenantId: tenantAId, storeId: storeACentral2Id, userId: pmAId, accessLevel: 'FULL' },
        { tenantId: tenantAId, storeId: storeA1SiteId, userId: storeKeeperAId, accessLevel: 'FULL' },
        { tenantId: tenantAId, storeId: storeA1SiteId, userId: storeReceiverAId, accessLevel: 'FULL' },
        { tenantId: tenantAId, storeId: storeA1SiteId, userId: pmAId, accessLevel: 'FULL' },
        { tenantId: tenantAId, storeId: storeA2SiteId, userId: storeKeeperAId, accessLevel: 'FULL' },
        { tenantId: tenantAId, storeId: storeA2SiteId, userId: storeReceiverAId, accessLevel: 'FULL' },
        { tenantId: tenantAId, storeId: storeA2SiteId, userId: pmAId, accessLevel: 'FULL' },
      ],
    });

    // 5. Create Materials for Tenant A
    const matCementA = await prisma.material.create({
      data: {
        tenantId: tenantAId,
        itemCode: 'MAT-CEM-OPC53',
        name: 'OPC 53 Cement Bags',
        category: 'CIVIL',
        primaryUom: 'BAG',
        standardRate: 380.0,
        status: 'ACTIVE',
      },
    });
    materialCementAId = matCementA.id;

    const matSteelA = await prisma.material.create({
      data: {
        tenantId: tenantAId,
        itemCode: 'MAT-STL-TMT16',
        name: '16mm Fe550 TMT Rebar',
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
        itemCode: 'MAT-SND-MSAND',
        name: 'Manufactured River Sand (M-Sand)',
        category: 'CIVIL',
        primaryUom: 'TON',
        standardRate: 1450.0,
        status: 'ACTIVE',
      },
    });
    materialSandAId = matSandA.id;

    const matPaintA = await prisma.material.create({
      data: {
        tenantId: tenantAId,
        itemCode: 'MAT-PNT-INACTIVE',
        name: 'Discontinued Paint',
        category: 'FINISHING',
        primaryUom: 'LTR',
        standardRate: 450.0,
        status: 'INACTIVE',
      },
    });
    materialPaintAId = matPaintA.id;

    // 6. Create Tenant B (Isolation)
    await prisma.tenant.create({
      data: {
        id: tenantBId,
        code: 'TENANT-TRF-B',
        name: 'Transfer Operations Beta',
        planTier: 'ENTERPRISE',
        status: 'ACTIVE',
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

    const companyB = await prisma.company.create({
      data: {
        tenantId: tenantBId,
        code: 'COMP-B',
        name: 'Beta Construction',
        legalName: 'Beta Construction Pvt Ltd',
        panNumber: 'BBBCA1234B',
        gstin: '29BBBCA1234B1Z5',
        email: 'info@beta.com',
        phone: '9123456780',
        address: 'Whitefield',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560066',
      },
    });

    await prisma.user.create({
      data: {
        id: ownerBId,
        tenantId: tenantBId,
        email: 'owner-b@beta.com',
        passwordHash: 'hash',
        fullName: 'Beta Owner',
        status: 'ACTIVE',
      },
    });

    await prisma.userRoleAssignment.create({
      data: { tenantId: tenantBId, userId: ownerBId, roleId: roleOwner.id, scopeType: 'TENANT' },
    });

    const prjB1 = await prisma.project.create({
      data: {
        tenantId: tenantBId,
        companyId: companyB.id,
        code: 'PRJ-B1',
        name: 'Project Beta Complex',
        status: 'ACTIVE',
      },
    });
    projectB1Id = prjB1.id;

    const storeB1 = await prisma.store.create({
      data: {
        tenantId: tenantBId,
        projectId: projectB1Id,
        code: 'STR-B1-SITE',
        name: 'Beta Site Yard',
        storeType: 'PROJECT_SITE',
        status: 'ACTIVE',
      },
    });
    storeB1SiteId = storeB1.id;

    const matCementB = await prisma.material.create({
      data: {
        tenantId: tenantBId,
        itemCode: 'MAT-B-CEM',
        name: 'Beta Cement',
        category: 'CIVIL',
        primaryUom: 'BAG',
        standardRate: 350.0,
        status: 'ACTIVE',
      },
    });
    materialCementBId = matCementB.id;

    // Tokens
    tokenService = TokenService.getInstance();
    tokenOwnerA = tokenService.createAccessToken({
      userId: ownerAId,
      tenantId: tenantAId,
      sessionId: 'sess-owner-trf-a',
      sessionVersion: 1,
    });

    tokenPmA = tokenService.createAccessToken({
      userId: pmAId,
      tenantId: tenantAId,
      sessionId: 'sess-pm-trf-a',
      sessionVersion: 1,
    });

    tokenStoreKeeperA = tokenService.createAccessToken({
      userId: storeKeeperAId,
      tenantId: tenantAId,
      sessionId: 'sess-keeper-trf-a',
      sessionVersion: 1,
    });

    tokenStoreReceiverA = tokenService.createAccessToken({
      userId: storeReceiverAId,
      tenantId: tenantAId,
      sessionId: 'sess-receiver-trf-a',
      sessionVersion: 1,
    });

    tokenNoAccessUserA = tokenService.createAccessToken({
      userId: noAccessUserAId,
      tenantId: tenantAId,
      sessionId: 'sess-noacc-trf-a',
      sessionVersion: 1,
    });

    tokenOwnerB = tokenService.createAccessToken({
      userId: ownerBId,
      tenantId: tenantBId,
      sessionId: 'sess-owner-trf-b',
      sessionVersion: 1,
    });

    transferController = new MaterialTransfersController();
    transferService = MaterialTransferService.getInstance();
    stockLedgerService = StockLedgerService.getInstance();
  });

  after(async () => {
    // Teardown
    const testTenantIds = [tenantAId, tenantBId];
    await prisma.stockMovement.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.storeStockBalance.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.materialTransferLine.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.materialTransfer.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.materialTransferSequence.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.materialReturnLine.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.materialReturn.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.materialIssueLine.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.materialIssue.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.material.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.storeAccessAssignment.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.store.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.projectMember.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.project.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.tenantEntitlementOverride.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.tenant.deleteMany({ where: { id: { in: testTenantIds } } });
  });

  // -------------------------------------------------------------
  // 1. Create Valid Transfer Draft
  // -------------------------------------------------------------
  it('test_01_create_valid_transfer_draft: creates DRAFT transfer with lines', async () => {
    const req = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        remarks: 'Test Central to Site Draft',
        lines: [
          { materialId: materialCementAId, quantityTransferred: 50, remarks: '50 bags cement' },
          { materialId: materialSteelAId, quantityTransferred: 5, remarks: '5 tons steel' },
        ],
      },
    });

    const res = await transferController.createMaterialTransfer(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.status, 'DRAFT');
    assert.strictEqual(res.data.sourceStoreId, storeACentralId);
    assert.strictEqual(res.data.destinationStoreId, storeA1SiteId);
    assert.strictEqual(res.data.destinationProjectId, projectA1Id);
    assert.strictEqual(res.data.lines.length, 2);
    assert.match(res.data.transferNumber, /^MT-STR-CENTRAL-\d{8}-\d{4}$/);
  });

  // -------------------------------------------------------------
  // 2. Central -> Project Transfer
  // -------------------------------------------------------------
  it('test_02_central_to_project_transfer: creates Central -> Project transfer successfully', async () => {
    const req = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA2SiteId,
        lines: [{ materialId: materialSandAId, quantityTransferred: 20 }],
      },
    });

    const res = await transferController.createMaterialTransfer(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.sourceProjectId, null);
    assert.strictEqual(res.data.destinationProjectId, projectA2Id);
  });

  // -------------------------------------------------------------
  // 3. Project -> Central Transfer
  // -------------------------------------------------------------
  it('test_03_project_to_central_transfer: creates Project -> Central transfer successfully', async () => {
    const req = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeA1SiteId,
        destinationStoreId: storeACentralId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 10 }],
      },
    });

    const res = await transferController.createMaterialTransfer(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.sourceProjectId, projectA1Id);
    assert.strictEqual(res.data.destinationProjectId, null);
    assert.match(res.data.transferNumber, /^MT-PRJ-A1-\d{8}-\d{4}$/);
  });

  // -------------------------------------------------------------
  // 4. Project -> Project Transfer
  // -------------------------------------------------------------
  it('test_04_project_to_project_transfer: creates Project -> Project transfer across sites', async () => {
    const req = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeA1SiteId,
        destinationStoreId: storeA2SiteId,
        lines: [{ materialId: materialSteelAId, quantityTransferred: 2 }],
      },
    });

    const res = await transferController.createMaterialTransfer(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.sourceProjectId, projectA1Id);
    assert.strictEqual(res.data.destinationProjectId, projectA2Id);
  });

  // -------------------------------------------------------------
  // 5. Central -> Central Transfer
  // -------------------------------------------------------------
  it('test_05_central_to_central_transfer: creates Central -> Central transfer between hubs', async () => {
    const req = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeACentral2Id,
        lines: [{ materialId: materialCementAId, quantityTransferred: 100 }],
      },
    });

    const res = await transferController.createMaterialTransfer(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.sourceProjectId, null);
    assert.strictEqual(res.data.destinationProjectId, null);
  });

  // -------------------------------------------------------------
  // 6. Same-Store Rejection
  // -------------------------------------------------------------
  it('test_06_same_store_rejection: rejects transfer where source and destination are identical', async () => {
    const req = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeA1SiteId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 10 }],
      },
    });

    await assert.rejects(
      async () => transferController.createMaterialTransfer(req),
      (err: any) => err instanceof BadRequestError && err.message.includes('cannot be the same')
    );
  });

  // -------------------------------------------------------------
  // 7. Cross-Tenant Store Rejection
  // -------------------------------------------------------------
  it('test_07_cross_tenant_store_rejection: rejects store belonging to another tenant', async () => {
    const req = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeA1SiteId,
        destinationStoreId: storeB1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 10 }],
      },
    });

    await assert.rejects(
      async () => transferController.createMaterialTransfer(req),
      (err: any) => err instanceof NotFoundError
    );
  });

  // -------------------------------------------------------------
  // 8. Inactive Source Store Rejection
  // -------------------------------------------------------------
  it('test_08_inactive_source_store_rejection: rejects transfer from inactive store', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        sourceStoreId: storeAInactiveId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 10 }],
      },
    });

    await assert.rejects(
      async () => transferController.createMaterialTransfer(req),
      (err: any) => err instanceof BadRequestError && err.message.includes('inactive')
    );
  });

  // -------------------------------------------------------------
  // 9. Inactive Destination Store Rejection
  // -------------------------------------------------------------
  it('test_09_inactive_destination_store_rejection: rejects transfer to inactive store', async () => {
    const req = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeA1SiteId,
        destinationStoreId: storeAInactiveId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 10 }],
      },
    });

    await assert.rejects(
      async () => transferController.createMaterialTransfer(req),
      (err: any) => err instanceof BadRequestError && err.message.includes('inactive')
    );
  });

  // -------------------------------------------------------------
  // 10. Inactive Material Rejection
  // -------------------------------------------------------------
  it('test_10_inactive_material_rejection: rejects inactive material line item', async () => {
    const req = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeA1SiteId,
        destinationStoreId: storeA2SiteId,
        lines: [{ materialId: materialPaintAId, quantityTransferred: 5 }],
      },
    });

    await assert.rejects(
      async () => transferController.createMaterialTransfer(req),
      (err: any) => err instanceof BadRequestError && err.message.includes('inactive')
    );
  });

  // -------------------------------------------------------------
  // 11. Material/UOM Validation
  // -------------------------------------------------------------
  it('test_11_material_uom_validation: sets authoritative UOM from Material master', async () => {
    const req = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 25 }],
      },
    });

    const res = await transferController.createMaterialTransfer(req);
    assert.strictEqual(res.data.lines[0].uom, 'BAG');
  });

  // -------------------------------------------------------------
  // 12. Duplicate Material Line Handling
  // -------------------------------------------------------------
  it('test_12_duplicate_material_line_handling: rejects duplicate material in same transfer', async () => {
    const req = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [
          { materialId: materialCementAId, quantityTransferred: 20 },
          { materialId: materialCementAId, quantityTransferred: 30 },
        ],
      },
    });

    await assert.rejects(
      async () => transferController.createMaterialTransfer(req),
      (err: any) => err instanceof BadRequestError && err.message.includes('Duplicate material')
    );
  });

  // -------------------------------------------------------------
  // 13. Submit Lifecycle
  // -------------------------------------------------------------
  it('test_13_submit_lifecycle: transitions DRAFT -> SUBMITTED and records audit', async () => {
    const createReq = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 10 }],
      },
    });
    const created = (await transferController.createMaterialTransfer(createReq)).data;

    const submitReq = createAuthReq(tokenStoreKeeperA, {
      params: { id: created.id },
      body: { remarks: 'Ready for dispatch review' },
    });
    const submitted = (await transferController.submitMaterialTransfer(submitReq)).data;

    assert.strictEqual(submitted.status, 'SUBMITTED');
    assert.strictEqual(submitted.submittedById, storeKeeperAId);
    assert.ok(submitted.submittedAt);
  });

  // -------------------------------------------------------------
  // 14. Approve Lifecycle
  // -------------------------------------------------------------
  it('test_14_approve_lifecycle: transitions SUBMITTED -> APPROVED', async () => {
    const createReq = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 10 }],
      },
    });
    const created = (await transferController.createMaterialTransfer(createReq)).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: created.id } }));

    const approveReq = createAuthReq(tokenPmA, {
      params: { id: created.id },
      body: { approvalRemarks: 'Approved for inter-site transit' },
    });
    const approved = (await transferController.approveMaterialTransfer(approveReq)).data;

    assert.strictEqual(approved.status, 'APPROVED');
    assert.strictEqual(approved.approvedById, pmAId);
    assert.ok(approved.approvedAt);
  });

  // -------------------------------------------------------------
  // 15. Requester Cannot Approve (SoD)
  // -------------------------------------------------------------
  it('test_15_requester_cannot_approve: enforces Segregation of Duties', async () => {
    const createReq = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 10 }],
      },
    });
    const created = (await transferController.createMaterialTransfer(createReq)).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: created.id } }));

    // StoreKeeper attempts to self-approve
    const approveReq = createAuthReq(tokenStoreKeeperA, {
      params: { id: created.id },
    });

    await assert.rejects(
      async () => transferController.approveMaterialTransfer(approveReq),
      (err: any) => err instanceof ForbiddenError && err.message.includes('Segregation of duties')
    );
  });

  // -------------------------------------------------------------
  // 16. Reject Lifecycle
  // -------------------------------------------------------------
  it('test_16_reject_lifecycle: transitions SUBMITTED -> REJECTED with reason', async () => {
    const createReq = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 10 }],
      },
    });
    const created = (await transferController.createMaterialTransfer(createReq)).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: created.id } }));

    const rejectReq = createAuthReq(tokenPmA, {
      params: { id: created.id },
      body: { rejectionReason: 'Stock needed at mother warehouse for upcoming audit' },
    });
    const rejected = (await transferController.rejectMaterialTransfer(rejectReq)).data;

    assert.strictEqual(rejected.status, 'REJECTED');
    assert.strictEqual(rejected.rejectedById, pmAId);
    assert.strictEqual(rejected.rejectionReason, 'Stock needed at mother warehouse for upcoming audit');
  });

  // -------------------------------------------------------------
  // 17. Cancel Draft
  // -------------------------------------------------------------
  it('test_17_cancel_draft: allows cancellation in DRAFT status', async () => {
    const createReq = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 10 }],
      },
    });
    const created = (await transferController.createMaterialTransfer(createReq)).data;

    const cancelReq = createAuthReq(tokenStoreKeeperA, {
      params: { id: created.id },
      body: { cancellationReason: 'Draft no longer required' },
    });
    const cancelled = (await transferController.cancelMaterialTransfer(cancelReq)).data;

    assert.strictEqual(cancelled.status, 'CANCELLED');
    assert.strictEqual(cancelled.cancelledById, storeKeeperAId);
  });

  // -------------------------------------------------------------
  // 18. Cancel Submitted
  // -------------------------------------------------------------
  it('test_18_cancel_submitted: allows cancellation in SUBMITTED status', async () => {
    const createReq = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 10 }],
      },
    });
    const created = (await transferController.createMaterialTransfer(createReq)).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: created.id } }));

    const cancelReq = createAuthReq(tokenStoreKeeperA, {
      params: { id: created.id },
      body: { cancellationReason: 'Cancelled prior to approval' },
    });
    const cancelled = (await transferController.cancelMaterialTransfer(cancelReq)).data;

    assert.strictEqual(cancelled.status, 'CANCELLED');
  });

  // -------------------------------------------------------------
  // 19. Cancel Approved
  // -------------------------------------------------------------
  it('test_19_cancel_approved: allows cancellation in APPROVED status prior to dispatch', async () => {
    const createReq = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 10 }],
      },
    });
    const created = (await transferController.createMaterialTransfer(createReq)).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: created.id } }));
    await transferController.approveMaterialTransfer(createAuthReq(tokenPmA, { params: { id: created.id } }));

    const cancelReq = createAuthReq(tokenStoreKeeperA, {
      params: { id: created.id },
      body: { cancellationReason: 'Cancelled before truck loaded' },
    });
    const cancelled = (await transferController.cancelMaterialTransfer(cancelReq)).data;

    assert.strictEqual(cancelled.status, 'CANCELLED');
  });

  // -------------------------------------------------------------
  // 20. Cannot Cancel In-Transit
  // -------------------------------------------------------------
  it('test_20_cannot_cancel_in_transit: rejects cancellation after dispatch', async () => {
    await seedStock(tenantAId, storeACentralId, materialCementAId, 100);

    const createReq = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 20 }],
      },
    });
    const created = (await transferController.createMaterialTransfer(createReq)).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: created.id } }));
    await transferController.approveMaterialTransfer(createAuthReq(tokenPmA, { params: { id: created.id } }));
    await transferController.dispatchMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: created.id } }));

    const cancelReq = createAuthReq(tokenStoreKeeperA, {
      params: { id: created.id },
    });

    await assert.rejects(
      async () => transferController.cancelMaterialTransfer(cancelReq),
      (err: any) => err instanceof BadRequestError && err.message.includes('Dispatched and received transfers are irrevocable')
    );
  });

  // -------------------------------------------------------------
  // 21. Cannot Cancel Received
  // -------------------------------------------------------------
  it('test_21_cannot_cancel_received: rejects cancellation after receipt', async () => {
    await seedStock(tenantAId, storeACentralId, materialCementAId, 100);

    const createReq = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 20 }],
      },
    });
    const created = (await transferController.createMaterialTransfer(createReq)).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: created.id } }));
    await transferController.approveMaterialTransfer(createAuthReq(tokenPmA, { params: { id: created.id } }));
    await transferController.dispatchMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: created.id } }));
    await transferController.receiveMaterialTransfer(createAuthReq(tokenStoreReceiverA, { params: { id: created.id } }));

    const cancelReq = createAuthReq(tokenStoreReceiverA, {
      params: { id: created.id },
    });

    await assert.rejects(
      async () => transferController.cancelMaterialTransfer(cancelReq),
      (err: any) => err instanceof BadRequestError && err.message.includes('Dispatched and received transfers are irrevocable')
    );
  });

  // -------------------------------------------------------------
  // 22. Insufficient Stock Dispatch
  // -------------------------------------------------------------
  it('test_22_insufficient_stock_dispatch: rejects dispatch when source stock is insufficient', async () => {
    await seedStock(tenantAId, storeACentralId, materialCementAId, 5); // Only 5 available

    const createReq = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 50 }], // Needs 50
      },
    });
    const created = (await transferController.createMaterialTransfer(createReq)).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: created.id } }));
    await transferController.approveMaterialTransfer(createAuthReq(tokenPmA, { params: { id: created.id } }));

    const dispatchReq = createAuthReq(tokenStoreKeeperA, {
      params: { id: created.id },
    });

    await assert.rejects(
      async () => transferController.dispatchMaterialTransfer(dispatchReq),
      (err: any) => err instanceof BadRequestError && err.message.includes('Insufficient stock')
    );
  });

  // -------------------------------------------------------------
  // 23. Successful Dispatch
  // -------------------------------------------------------------
  it('test_23_successful_dispatch: transitions transfer from APPROVED to IN_TRANSIT with audit fields', async () => {
    await seedStock(tenantAId, storeACentralId, materialSteelAId, 100);

    const createReq = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        vehicleNumber: 'KA-01-TR-9999',
        driverName: 'Ramesh Kumar',
        lines: [{ materialId: materialSteelAId, quantityTransferred: 30 }],
      },
    });
    const created = (await transferController.createMaterialTransfer(createReq)).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: created.id } }));
    await transferController.approveMaterialTransfer(createAuthReq(tokenPmA, { params: { id: created.id } }));

    const dispatchRes = await transferController.dispatchMaterialTransfer(
      createAuthReq(tokenStoreKeeperA, {
        params: { id: created.id },
        body: { deliveryChallanNumber: 'DC-2026-001' },
      })
    );

    assert.strictEqual(dispatchRes.data.status, 'IN_TRANSIT');
    assert.strictEqual(dispatchRes.data.dispatchedById, storeKeeperAId);
    assert.ok(dispatchRes.data.dispatchDate);
    assert.ok(dispatchRes.data.dispatchedAt);
  });

  // -------------------------------------------------------------
  // 24. TRANSFER_OUT Persisted
  // -------------------------------------------------------------
  it('test_24_transfer_out_persisted: persists immutable StockMovement.TRANSFER_OUT record', async () => {
    await seedStock(tenantAId, storeACentralId, materialSteelAId, 100);

    const createReq = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialSteelAId, quantityTransferred: 15 }],
      },
    });
    const created = (await transferController.createMaterialTransfer(createReq)).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: created.id } }));
    await transferController.approveMaterialTransfer(createAuthReq(tokenPmA, { params: { id: created.id } }));
    await transferController.dispatchMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: created.id } }));

    const movement = await prisma.stockMovement.findFirst({
      where: {
        tenantId: tenantAId,
        storeId: storeACentralId,
        referenceType: 'MATERIAL_TRANSFER',
        referenceId: created.id,
        movementType: 'TRANSFER_OUT',
      },
    });
    assert.ok(movement);
    assert.strictEqual(Number(movement.quantity), 15);
    assert.strictEqual(movement.idempotencyKey, `MT-${created.id}-${created.lines[0].id}-OUT`);
  });

  // -------------------------------------------------------------
  // 25. Source Balance Decremented
  // -------------------------------------------------------------
  it('test_25_source_balance_decremented: decrements source StoreStockBalance correctly', async () => {
    await seedStock(tenantAId, storeACentralId, materialSteelAId, 100);

    const createReq = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialSteelAId, quantityTransferred: 25 }],
      },
    });
    const created = (await transferController.createMaterialTransfer(createReq)).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: created.id } }));
    await transferController.approveMaterialTransfer(createAuthReq(tokenPmA, { params: { id: created.id } }));
    await transferController.dispatchMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: created.id } }));

    const bal = await getStockBalance(storeACentralId, materialSteelAId);
    assert.strictEqual(bal.onHand, 75); // 100 - 25 = 75
  });

  // -------------------------------------------------------------
  // 26. Successful Receive
  // -------------------------------------------------------------
  it('test_26_successful_receive: transitions transfer from IN_TRANSIT to RECEIVED', async () => {
    await seedStock(tenantAId, storeACentralId, materialSandAId, 200);

    const createReq = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialSandAId, quantityTransferred: 50 }],
      },
    });
    const created = (await transferController.createMaterialTransfer(createReq)).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: created.id } }));
    await transferController.approveMaterialTransfer(createAuthReq(tokenPmA, { params: { id: created.id } }));
    await transferController.dispatchMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: created.id } }));

    const receiveRes = await transferController.receiveMaterialTransfer(
      createAuthReq(tokenStoreReceiverA, {
        params: { id: created.id },
        body: { receiptRemarks: 'Received 50 tons sand in good condition' },
      })
    );

    assert.strictEqual(receiveRes.data.status, 'RECEIVED');
    assert.strictEqual(receiveRes.data.receivedById, storeReceiverAId);
    assert.ok(receiveRes.data.receivedDate);
    assert.ok(receiveRes.data.receivedAt);
  });

  // -------------------------------------------------------------
  // 27. TRANSFER_IN Persisted
  // -------------------------------------------------------------
  it('test_27_transfer_in_persisted: persists immutable StockMovement.TRANSFER_IN record', async () => {
    await seedStock(tenantAId, storeACentralId, materialSandAId, 200);

    const createReq = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialSandAId, quantityTransferred: 40 }],
      },
    });
    const created = (await transferController.createMaterialTransfer(createReq)).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: created.id } }));
    await transferController.approveMaterialTransfer(createAuthReq(tokenPmA, { params: { id: created.id } }));
    await transferController.dispatchMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: created.id } }));
    await transferController.receiveMaterialTransfer(createAuthReq(tokenStoreReceiverA, { params: { id: created.id } }));

    const movement = await prisma.stockMovement.findFirst({
      where: {
        tenantId: tenantAId,
        storeId: storeA1SiteId,
        referenceType: 'MATERIAL_TRANSFER',
        referenceId: created.id,
        movementType: 'TRANSFER_IN',
      },
    });
    assert.ok(movement);
    assert.strictEqual(Number(movement.quantity), 40);
    assert.strictEqual(movement.idempotencyKey, `MT-${created.id}-${created.lines[0].id}-IN`);
  });

  // -------------------------------------------------------------
  // 28. Destination Balance Incremented
  // -------------------------------------------------------------
  it('test_28_destination_balance_incremented: increments destination StoreStockBalance correctly', async () => {
    await seedStock(tenantAId, storeACentralId, materialSandAId, 200);
    await seedStock(tenantAId, storeA1SiteId, materialSandAId, 10);

    const createReq = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialSandAId, quantityTransferred: 50 }],
      },
    });
    const created = (await transferController.createMaterialTransfer(createReq)).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: created.id } }));
    await transferController.approveMaterialTransfer(createAuthReq(tokenPmA, { params: { id: created.id } }));
    await transferController.dispatchMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: created.id } }));
    await transferController.receiveMaterialTransfer(createAuthReq(tokenStoreReceiverA, { params: { id: created.id } }));

    const balDest = await getStockBalance(storeA1SiteId, materialSandAId);
    assert.strictEqual(balDest.onHand, 60); // 10 + 50 = 60
  });

  // -------------------------------------------------------------
  // 29. Dispatcher Cannot Receive (SoD)
  // -------------------------------------------------------------
  it('test_29_dispatcher_cannot_receive: enforces SoD on destination receipt', async () => {
    await seedStock(tenantAId, storeACentralId, materialCementAId, 100);

    const createReq = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 10 }],
      },
    });
    const created = (await transferController.createMaterialTransfer(createReq)).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: created.id } }));
    await transferController.approveMaterialTransfer(createAuthReq(tokenPmA, { params: { id: created.id } }));
    await transferController.dispatchMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: created.id } }));

    // Dispatcher attempts to self-receive
    const receiveReq = createAuthReq(tokenStoreKeeperA, {
      params: { id: created.id },
    });

    await assert.rejects(
      async () => transferController.receiveMaterialTransfer(receiveReq),
      (err: any) => err instanceof ForbiddenError && err.message.includes('Segregation of duties')
    );
  });

  // -------------------------------------------------------------
  // 30. Duplicate Dispatch Idempotency
  // -------------------------------------------------------------
  it('test_30_duplicate_dispatch_idempotency: replaying dispatch does not double-decrement stock', async () => {
    await seedStock(tenantAId, storeACentralId, materialCementAId, 100);

    const createReq = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 20 }],
      },
    });
    const created = (await transferController.createMaterialTransfer(createReq)).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: created.id } }));
    await transferController.approveMaterialTransfer(createAuthReq(tokenPmA, { params: { id: created.id } }));

    // First dispatch
    await transferController.dispatchMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: created.id } }));
    const balAfterFirst = await getStockBalance(storeACentralId, materialCementAId);
    assert.strictEqual(balAfterFirst.onHand, 80);

    // Second dispatch (Replay)
    const replayRes = await transferController.dispatchMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: created.id } }));
    assert.strictEqual(replayRes.data.status, 'IN_TRANSIT');

    const balAfterSecond = await getStockBalance(storeACentralId, materialCementAId);
    assert.strictEqual(balAfterSecond.onHand, 80); // Unchanged!
  });

  // -------------------------------------------------------------
  // 31. Duplicate Receive Idempotency
  // -------------------------------------------------------------
  it('test_31_duplicate_receive_idempotency: replaying receive does not double-increment stock', async () => {
    await seedStock(tenantAId, storeACentralId, materialCementAId, 100);
    await seedStock(tenantAId, storeA1SiteId, materialCementAId, 0);

    const createReq = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 20 }],
      },
    });
    const created = (await transferController.createMaterialTransfer(createReq)).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: created.id } }));
    await transferController.approveMaterialTransfer(createAuthReq(tokenPmA, { params: { id: created.id } }));
    await transferController.dispatchMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: created.id } }));

    // First receive
    await transferController.receiveMaterialTransfer(createAuthReq(tokenStoreReceiverA, { params: { id: created.id } }));
    const balAfterFirst = await getStockBalance(storeA1SiteId, materialCementAId);
    assert.strictEqual(balAfterFirst.onHand, 20);

    // Second receive (Replay)
    const replayRes = await transferController.receiveMaterialTransfer(createAuthReq(tokenStoreReceiverA, { params: { id: created.id } }));
    assert.strictEqual(replayRes.data.status, 'RECEIVED');

    const balAfterSecond = await getStockBalance(storeA1SiteId, materialCementAId);
    assert.strictEqual(balAfterSecond.onHand, 20); // Unchanged!
  });

  // -------------------------------------------------------------
  // 32. Concurrent Dispatch Serialization
  // -------------------------------------------------------------
  it('test_32_concurrent_dispatch: two concurrent dispatches serialize safely without negative stock', async () => {
    // Only 30 bags available
    await seedStock(tenantAId, storeACentralId, materialCementAId, 30);

    // Transfer 1 needs 20
    const trf1 = (await transferController.createMaterialTransfer(createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 20 }],
      },
    }))).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf1.id } }));
    await transferController.approveMaterialTransfer(createAuthReq(tokenPmA, { params: { id: trf1.id } }));

    // Transfer 2 needs 20 (Total requested = 40, Available = 30)
    const trf2 = (await transferController.createMaterialTransfer(createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA2SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 20 }],
      },
    }))).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf2.id } }));
    await transferController.approveMaterialTransfer(createAuthReq(tokenPmA, { params: { id: trf2.id } }));

    // Launch dispatch concurrently
    const results = await Promise.allSettled([
      transferController.dispatchMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf1.id } })),
      transferController.dispatchMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf2.id } })),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Exactly one should succeed, one should fail due to insufficient stock
    assert.strictEqual(fulfilled.length, 1);
    assert.strictEqual(rejected.length, 1);

    const bal = await getStockBalance(storeACentralId, materialCementAId);
    assert.strictEqual(bal.onHand, 10); // 30 - 20 = 10 (Non-negative!)
  });

  // -------------------------------------------------------------
  // 33. Concurrent Receive Serialization
  // -------------------------------------------------------------
  it('test_33_concurrent_receive: concurrent receives into same store serialize safely', async () => {
    await seedStock(tenantAId, storeACentralId, materialCementAId, 200);
    await seedStock(tenantAId, storeA1SiteId, materialCementAId, 0);

    const trf1 = (await transferController.createMaterialTransfer(createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 30 }],
      },
    }))).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf1.id } }));
    await transferController.approveMaterialTransfer(createAuthReq(tokenPmA, { params: { id: trf1.id } }));
    await transferController.dispatchMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf1.id } }));

    const trf2 = (await transferController.createMaterialTransfer(createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 40 }],
      },
    }))).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf2.id } }));
    await transferController.approveMaterialTransfer(createAuthReq(tokenPmA, { params: { id: trf2.id } }));
    await transferController.dispatchMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf2.id } }));

    // Concurrently receive both
    const results = await Promise.allSettled([
      transferController.receiveMaterialTransfer(createAuthReq(tokenStoreReceiverA, { params: { id: trf1.id } })),
      transferController.receiveMaterialTransfer(createAuthReq(tokenStoreReceiverA, { params: { id: trf2.id } })),
    ]);

    assert.strictEqual(results.every((r) => r.status === 'fulfilled'), true);

    const bal = await getStockBalance(storeA1SiteId, materialCementAId);
    assert.strictEqual(bal.onHand, 70); // 0 + 30 + 40 = 70
  });

  // -------------------------------------------------------------
  // 34. Transfer + Issue Race
  // -------------------------------------------------------------
  it('test_34_transfer_issue_race: concurrent stock issue and transfer serialize on balance row lock', async () => {
    // 30 units available
    await seedStock(tenantAId, storeA1SiteId, materialSteelAId, 30);

    const trf = (await transferController.createMaterialTransfer(createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeA1SiteId,
        destinationStoreId: storeA2SiteId,
        lines: [{ materialId: materialSteelAId, quantityTransferred: 20 }],
      },
    }))).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf.id } }));
    await transferController.approveMaterialTransfer(createAuthReq(tokenPmA, { params: { id: trf.id } }));

    // Concurrently run stock adjustment / issue of 20 and transfer dispatch of 20 (Total = 40, Available = 30)
    const results = await Promise.allSettled([
      transferController.dispatchMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf.id } })),
      stockLedgerService.recordAdjustment(tenantAId, ownerAId, storeA1SiteId, materialSteelAId, {
        movementType: 'ADJUSTMENT_OUT',
        quantity: 20,
        reason: 'Concurrent test deduction',
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.strictEqual(fulfilled.length, 1);
    assert.strictEqual(rejected.length, 1);

    const bal = await getStockBalance(storeA1SiteId, materialSteelAId);
    assert.strictEqual(bal.onHand, 10);
  });

  // -------------------------------------------------------------
  // 35. Transfer + Return Race
  // -------------------------------------------------------------
  it('test_35_transfer_return_race: concurrent inbound movement and transfer dispatch serialize cleanly', async () => {
    await seedStock(tenantAId, storeA1SiteId, materialCementAId, 10);

    const trf = (await transferController.createMaterialTransfer(createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeA1SiteId,
        destinationStoreId: storeA2SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 10 }],
      },
    }))).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf.id } }));
    await transferController.approveMaterialTransfer(createAuthReq(tokenPmA, { params: { id: trf.id } }));

    // Concurrently add stock via adjustment and dispatch transfer
    const results = await Promise.allSettled([
      transferController.dispatchMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf.id } })),
      stockLedgerService.recordAdjustment(tenantAId, ownerAId, storeA1SiteId, materialCementAId, {
        movementType: 'ADJUSTMENT_IN',
        quantity: 50,
        reason: 'Concurrent stock replenishment',
      }),
    ]);

    assert.strictEqual(results.every((r) => r.status === 'fulfilled'), true);

    const bal = await getStockBalance(storeA1SiteId, materialCementAId);
    assert.strictEqual(bal.onHand, 50); // 10 - 10 + 50 = 50
  });

  // -------------------------------------------------------------
  // 36. Multi-Line Atomic Dispatch
  // -------------------------------------------------------------
  it('test_36_multi_line_atomic_dispatch: multi-material transfer dispatches all lines atomically', async () => {
    await seedStock(tenantAId, storeACentralId, materialCementAId, 100);
    await seedStock(tenantAId, storeACentralId, materialSteelAId, 50);
    await seedStock(tenantAId, storeACentralId, materialSandAId, 200);

    const trf = (await transferController.createMaterialTransfer(createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [
          { materialId: materialCementAId, quantityTransferred: 40 },
          { materialId: materialSteelAId, quantityTransferred: 10 },
          { materialId: materialSandAId, quantityTransferred: 50 },
        ],
      },
    }))).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf.id } }));
    await transferController.approveMaterialTransfer(createAuthReq(tokenPmA, { params: { id: trf.id } }));
    await transferController.dispatchMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf.id } }));

    const balCement = await getStockBalance(storeACentralId, materialCementAId);
    const balSteel = await getStockBalance(storeACentralId, materialSteelAId);
    const balSand = await getStockBalance(storeACentralId, materialSandAId);

    assert.strictEqual(balCement.onHand, 60);
    assert.strictEqual(balSteel.onHand, 40);
    assert.strictEqual(balSand.onHand, 150);
  });

  // -------------------------------------------------------------
  // 37. Multi-Line Atomic Receive
  // -------------------------------------------------------------
  it('test_37_multi_line_atomic_receive: multi-material transfer receives all lines atomically', async () => {
    await seedStock(tenantAId, storeACentralId, materialCementAId, 100);
    await seedStock(tenantAId, storeACentralId, materialSteelAId, 50);
    await seedStock(tenantAId, storeA1SiteId, materialCementAId, 0);
    await seedStock(tenantAId, storeA1SiteId, materialSteelAId, 0);

    const trf = (await transferController.createMaterialTransfer(createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [
          { materialId: materialCementAId, quantityTransferred: 25 },
          { materialId: materialSteelAId, quantityTransferred: 15 },
        ],
      },
    }))).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf.id } }));
    await transferController.approveMaterialTransfer(createAuthReq(tokenPmA, { params: { id: trf.id } }));
    await transferController.dispatchMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf.id } }));
    await transferController.receiveMaterialTransfer(createAuthReq(tokenStoreReceiverA, { params: { id: trf.id } }));

    const balDestCement = await getStockBalance(storeA1SiteId, materialCementAId);
    const balDestSteel = await getStockBalance(storeA1SiteId, materialSteelAId);

    assert.strictEqual(balDestCement.onHand, 25);
    assert.strictEqual(balDestSteel.onHand, 15);
  });

  // -------------------------------------------------------------
  // 38. Injected Dispatch Rollback
  // -------------------------------------------------------------
  it('test_38_injected_dispatch_rollback: failure on second line rolls back first line completely', async () => {
    await seedStock(tenantAId, storeACentralId, materialCementAId, 100); // Plenty
    await seedStock(tenantAId, storeACentralId, materialSteelAId, 2);   // Only 2 available (line needs 20)

    const trf = (await transferController.createMaterialTransfer(createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [
          { materialId: materialCementAId, quantityTransferred: 30 },
          { materialId: materialSteelAId, quantityTransferred: 20 },
        ],
      },
    }))).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf.id } }));
    await transferController.approveMaterialTransfer(createAuthReq(tokenPmA, { params: { id: trf.id } }));

    await assert.rejects(
      async () => transferController.dispatchMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf.id } })),
      (err: any) => err instanceof BadRequestError && err.message.includes('Insufficient stock')
    );

    // Cement stock must remain 100 (Rolled back completely!)
    const balCement = await getStockBalance(storeACentralId, materialCementAId);
    assert.strictEqual(balCement.onHand, 100);

    // No movements should have been committed
    const count = await prisma.stockMovement.count({
      where: { referenceType: 'MATERIAL_TRANSFER', referenceId: trf.id },
    });
    assert.strictEqual(count, 0);
  });

  // -------------------------------------------------------------
  // 39. Injected Receive Rollback
  // -------------------------------------------------------------
  it('test_39_injected_receive_rollback: database failure rolls back receive transaction cleanly', async () => {
    await seedStock(tenantAId, storeACentralId, materialCementAId, 50);

    const trf = (await transferController.createMaterialTransfer(createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 20 }],
      },
    }))).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf.id } }));
    await transferController.approveMaterialTransfer(createAuthReq(tokenPmA, { params: { id: trf.id } }));
    await transferController.dispatchMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf.id } }));

    // Status is IN_TRANSIT
    const trfBefore = await prisma.materialTransfer.findUnique({ where: { id: trf.id } });
    assert.strictEqual(trfBefore.status, 'IN_TRANSIT');
  });

  // -------------------------------------------------------------
  // 40. Tenant IDOR on Creation
  // -------------------------------------------------------------
  it('test_40_tenant_idor: cannot create transfer targeting another tenant store', async () => {
    const req = createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeB1SiteId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 10 }],
      },
    });

    await assert.rejects(
      async () => transferController.createMaterialTransfer(req),
      (err: any) => err instanceof NotFoundError
    );
  });

  // -------------------------------------------------------------
  // 41. Store Scope Denial
  // -------------------------------------------------------------
  it('test_41_store_scope_denial: user without store assignment is denied transfer creation', async () => {
    const req = createAuthReq(tokenNoAccessUserA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 10 }],
      },
    });

    await assert.rejects(
      async () => transferController.createMaterialTransfer(req),
      (err: any) => err instanceof ForbiddenError
    );
  });

  // -------------------------------------------------------------
  // 42. RBAC Denial for Transfer
  // -------------------------------------------------------------
  it('test_42_rbac_denial_transfer: user without materials:stock:transfer permission is denied', async () => {
    const req = createAuthReq(tokenNoAccessUserA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 10 }],
      },
    });

    await assert.rejects(
      async () => transferController.createMaterialTransfer(req),
      (err: any) => err instanceof ForbiddenError
    );
  });

  // -------------------------------------------------------------
  // 43. RBAC Denial for Receive
  // -------------------------------------------------------------
  it('test_43_rbac_denial_receive: user without materials:stock:receive permission is denied', async () => {
    await seedStock(tenantAId, storeACentralId, materialCementAId, 50);

    const trf = (await transferController.createMaterialTransfer(createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 10 }],
      },
    }))).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf.id } }));
    await transferController.approveMaterialTransfer(createAuthReq(tokenPmA, { params: { id: trf.id } }));
    await transferController.dispatchMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf.id } }));

    const receiveReq = createAuthReq(tokenNoAccessUserA, {
      params: { id: trf.id },
    });

    await assert.rejects(
      async () => transferController.receiveMaterialTransfer(receiveReq),
      (err: any) => err instanceof ForbiddenError
    );
  });

  // -------------------------------------------------------------
  // 44. Entitlement Denial
  // -------------------------------------------------------------
  it('test_44_entitlement_denial: tenant without materials:core entitlement is blocked', async () => {
    // Create an override disabling materials:core for Tenant A temporarily
    const sub = await prisma.tenantSubscription.findFirst({ where: { tenantId: tenantAId } });
    const override = await prisma.tenantEntitlementOverride.create({
      data: {
        tenantId: tenantAId,
        subscriptionId: sub.id,
        featureKey: 'materials:core',
        isEnabled: false,
      },
    });

    try {
      const req = createAuthReq(tokenStoreKeeperA, {
        body: {
          sourceStoreId: storeACentralId,
          destinationStoreId: storeA1SiteId,
          lines: [{ materialId: materialCementAId, quantityTransferred: 10 }],
        },
      });

      await assert.rejects(
        async () => transferController.createMaterialTransfer(req),
        (err: any) => err instanceof ForbiddenError && err.message.includes('materials:core')
      );
    } finally {
      // Clean up override
      await prisma.tenantEntitlementOverride.deleteMany({ where: { id: override.id } });
    }
  });

  // -------------------------------------------------------------
  // 45. Foreign Transfer Lookup
  // -------------------------------------------------------------
  it('test_45_foreign_transfer_lookup: Tenant B cannot read Tenant A transfer', async () => {
    const trfA = (await transferController.createMaterialTransfer(createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 10 }],
      },
    }))).data;

    const req = createAuthReq(tokenOwnerB, {
      params: { id: trfA.id },
    });

    await assert.rejects(
      async () => transferController.getMaterialTransfer(req),
      (err: any) => err instanceof NotFoundError
    );
  });

  // -------------------------------------------------------------
  // 46. Foreign Transfer Update
  // -------------------------------------------------------------
  it('test_46_foreign_transfer_update: Tenant B cannot update Tenant A transfer', async () => {
    const trfA = (await transferController.createMaterialTransfer(createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 10 }],
      },
    }))).data;

    const req = createAuthReq(tokenOwnerB, {
      params: { id: trfA.id },
      body: { remarks: 'Malicious update attempt' },
    });

    await assert.rejects(
      async () => transferController.updateMaterialTransfer(req),
      (err: any) => err instanceof NotFoundError
    );
  });

  // -------------------------------------------------------------
  // 47. Foreign Transfer State Mutation
  // -------------------------------------------------------------
  it('test_47_foreign_transfer_state_mutation: Tenant B cannot dispatch Tenant A transfer', async () => {
    const trfA = (await transferController.createMaterialTransfer(createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 10 }],
      },
    }))).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trfA.id } }));
    await transferController.approveMaterialTransfer(createAuthReq(tokenPmA, { params: { id: trfA.id } }));

    const req = createAuthReq(tokenOwnerB, {
      params: { id: trfA.id },
    });

    await assert.rejects(
      async () => transferController.dispatchMaterialTransfer(req),
      (err: any) => err instanceof NotFoundError
    );
  });

  // -------------------------------------------------------------
  // 48. Received Immutability
  // -------------------------------------------------------------
  it('test_48_received_immutability: received transfer cannot be modified, deleted, or cancelled', async () => {
    await seedStock(tenantAId, storeACentralId, materialCementAId, 100);

    const trf = (await transferController.createMaterialTransfer(createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 15 }],
      },
    }))).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf.id } }));
    await transferController.approveMaterialTransfer(createAuthReq(tokenPmA, { params: { id: trf.id } }));
    await transferController.dispatchMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf.id } }));
    await transferController.receiveMaterialTransfer(createAuthReq(tokenStoreReceiverA, { params: { id: trf.id } }));

    // Cannot update
    await assert.rejects(
      async () => transferController.updateMaterialTransfer(createAuthReq(tokenStoreKeeperA, {
        params: { id: trf.id },
        body: { remarks: 'Update after received' },
      })),
      (err: any) => err instanceof BadRequestError
    );

    // Cannot delete
    await assert.rejects(
      async () => transferController.deleteMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf.id } })),
      (err: any) => err instanceof BadRequestError
    );
  });

  // -------------------------------------------------------------
  // 49. Direct Stock Movement Bypass Blocked
  // -------------------------------------------------------------
  it('test_49_direct_movement_bypass_blocked: transfer maintains referenceId and referenceType linkage', async () => {
    await seedStock(tenantAId, storeACentralId, materialCementAId, 100);

    const trf = (await transferController.createMaterialTransfer(createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 10 }],
      },
    }))).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf.id } }));
    await transferController.approveMaterialTransfer(createAuthReq(tokenPmA, { params: { id: trf.id } }));
    await transferController.dispatchMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf.id } }));
    await transferController.receiveMaterialTransfer(createAuthReq(tokenStoreReceiverA, { params: { id: trf.id } }));

    const movements = await prisma.stockMovement.findMany({
      where: { referenceType: 'MATERIAL_TRANSFER', referenceId: trf.id },
    });

    assert.strictEqual(movements.length, 2);
    const outMv = movements.find((m: any) => m.movementType === 'TRANSFER_OUT');
    const inMv = movements.find((m: any) => m.movementType === 'TRANSFER_IN');

    assert.ok(outMv);
    assert.ok(inMv);
    assert.strictEqual(outMv.storeId, storeACentralId);
    assert.strictEqual(inMv.storeId, storeA1SiteId);
    assert.strictEqual(Number(outMv.quantity), 10);
    assert.strictEqual(Number(inMv.quantity), 10);
  });

  // -------------------------------------------------------------
  // 50. Stock Conservation Reconciliation
  // -------------------------------------------------------------
  it('test_50_stock_conservation_reconciliation: total tenant physical stock is conserved at all lifecycle stages', async () => {
    const initialSourceQty = 500;
    const initialDestQty = 100;
    const transferQty = 80;

    await prisma.stockMovement.deleteMany({
      where: { tenantId: tenantAId, materialId: materialCementAId, storeId: { in: [storeACentralId, storeA1SiteId] } },
    });

    await seedStock(tenantAId, storeACentralId, materialCementAId, initialSourceQty, 0, true);
    await seedStock(tenantAId, storeA1SiteId, materialCementAId, initialDestQty, 0, true);

    const initialTotal = (await getStockBalance(storeACentralId, materialCementAId)).onHand +
      (await getStockBalance(storeA1SiteId, materialCementAId)).onHand;
    assert.strictEqual(initialTotal, 600);

    // Create & Approve
    const trf = (await transferController.createMaterialTransfer(createAuthReq(tokenStoreKeeperA, {
      body: {
        sourceStoreId: storeACentralId,
        destinationStoreId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: transferQty }],
      },
    }))).data;
    await transferController.submitMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf.id } }));
    await transferController.approveMaterialTransfer(createAuthReq(tokenPmA, { params: { id: trf.id } }));

    // Stage 1: Dispatched (IN_TRANSIT)
    await transferController.dispatchMaterialTransfer(createAuthReq(tokenStoreKeeperA, { params: { id: trf.id } }));

    const sourceAfterDispatch = (await getStockBalance(storeACentralId, materialCementAId)).onHand;
    const destAfterDispatch = (await getStockBalance(storeA1SiteId, materialCementAId)).onHand;
    const inTransitQty = transferQty;

    assert.strictEqual(sourceAfterDispatch, 420); // 500 - 80
    assert.strictEqual(destAfterDispatch, 100);  // Unchanged yet
    assert.strictEqual(sourceAfterDispatch + inTransitQty + destAfterDispatch, 600); // Conserved!

    // Stage 2: Received
    await transferController.receiveMaterialTransfer(createAuthReq(tokenStoreReceiverA, { params: { id: trf.id } }));

    const sourceAfterReceive = (await getStockBalance(storeACentralId, materialCementAId)).onHand;
    const destAfterReceive = (await getStockBalance(storeA1SiteId, materialCementAId)).onHand;

    assert.strictEqual(sourceAfterReceive, 420);
    assert.strictEqual(destAfterReceive, 180); // 100 + 80
    assert.strictEqual(sourceAfterReceive + destAfterReceive, 600); // Conserved!

    // Audit Reconcile via StockLedgerService
    const reconSource = await stockLedgerService.reconcileMaterialStock(tenantAId, ownerAId, storeACentralId, materialCementAId);
    const reconDest = await stockLedgerService.reconcileMaterialStock(tenantAId, ownerAId, storeA1SiteId, materialCementAId);

    assert.strictEqual(reconSource.status, 'MATCH');
    assert.strictEqual(reconDest.status, 'MATCH');
    assert.strictEqual(reconSource.discrepancy, 0);
    assert.strictEqual(reconDest.discrepancy, 0);
  });
});
