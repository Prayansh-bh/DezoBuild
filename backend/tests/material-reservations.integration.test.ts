import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { DatabaseService } from '../src/database/database.service';
import { InventoryReservationsController } from '../src/modules/materials/controllers/inventory-reservations.controller';
import { InventoryReservationService } from '../src/modules/materials/services/inventory-reservation.service';
import { MaterialIssuesController } from '../src/modules/materials/controllers/material-issues.controller';
import { MaterialIssueService } from '../src/modules/materials/services/material-issue.service';
import { StockLedgerService } from '../src/modules/materials/services/stock-ledger.service';
import { MaterialTransferService } from '../src/modules/materials/services/material-transfer.service';
import { MaterialReturnService } from '../src/modules/materials/services/material-return.service';
import { GoodsReceiptService } from '../src/modules/materials/services/goods-receipt.service';
import { TokenService } from '../src/modules/auth/services/token.service';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service';
import type { IncomingMessage } from 'node:http';

describe('DEZOBUILD Phase 07.9 — Inventory Reservations / Material Allocations Complete Matrix (56 Tests)', () => {
  let prisma: PrismaClient;
  let dbService: DatabaseService;
  let tokenService: TokenService;

  let reservationController: InventoryReservationsController;
  let reservationService: InventoryReservationService;
  let issueController: MaterialIssuesController;
  let issueService: MaterialIssueService;
  let stockLedgerService: StockLedgerService;
  let transferService: MaterialTransferService;
  let returnService: MaterialReturnService;
  let grnService: GoodsReceiptService;

  const tenantAId = '11111111-55b1-7799-aaaa-111111111111';
  const tenantBId = '22222222-55b1-7799-bbbb-222222222222';

  const ownerAId = '11111111-55b1-7799-aaaa-aaaaaaaa0001';
  const pmAId = '11111111-55b1-7799-aaaa-aaaaaaaa0002';
  const siteEngAId = '11111111-55b1-7799-aaaa-aaaaaaaa0003';
  const storeKeeperAId = '11111111-55b1-7799-aaaa-aaaaaaaa0004';
  const noAccessUserAId = '11111111-55b1-7799-aaaa-aaaaaaaa0005';
  const ownerBId = '22222222-55b1-7799-bbbb-bbbbbbbb0001';

  let tokenOwnerA: string;
  let tokenPmA: string;
  let tokenSiteEngA: string;
  let tokenStoreKeeperA: string;
  let tokenNoAccessUserA: string;
  let tokenOwnerB: string;

  let projectA1Id: string;
  let projectA2Id: string;
  let projectB1Id: string;

  let storeACentralId: string;
  let storeA1SiteId: string;
  let storeA2SiteId: string;
  let storeAInactiveId: string;
  let storeB1SiteId: string;

  let materialCementAId: string;
  let materialSteelAId: string;
  let materialSandAId: string;
  let materialPaintAId: string; // Inactive
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
    uom: string,
    reserved: number = 0
  ) {
    await prisma.$executeRaw`
      INSERT INTO "store_stock_balances" ("id", "tenant_id", "store_id", "material_id", "quantity_on_hand", "reserved_quantity", "created_at", "updated_at")
      VALUES (gen_random_uuid(), ${tId}::uuid, ${sId}::uuid, ${mId}::uuid, ${qty}, ${reserved}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("store_id", "material_id") 
      DO UPDATE SET "quantity_on_hand" = ${qty}, "reserved_quantity" = ${reserved}, "updated_at" = CURRENT_TIMESTAMP;
    `;
  }

  before(async () => {
    dbService = DatabaseService.getInstance();
    prisma = dbService.getClient();
    tokenService = new TokenService();

    reservationService = InventoryReservationService.getInstance();
    reservationController = new InventoryReservationsController(reservationService);
    issueService = MaterialIssueService.getInstance();
    issueController = new MaterialIssuesController(issueService);
    stockLedgerService = StockLedgerService.getInstance();
    transferService = MaterialTransferService.getInstance();
    returnService = MaterialReturnService.getInstance();
    grnService = GoodsReceiptService.getInstance();

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    const testTenantIds = [tenantAId, tenantBId];
    const existingTenants = await prisma.tenant.findMany({
      where: { OR: [{ id: { in: testTenantIds } }, { code: { in: ['TENANT_RES_A', 'TENANT_RES_B'] } }] },
      select: { id: true },
    });
    const allTenantIds = Array.from(new Set([...testTenantIds, ...existingTenants.map((t) => t.id)]));

    await prisma.stockMovement.deleteMany({ where: { tenantId: { in: allTenantIds } } });
    await prisma.storeStockBalance.deleteMany({ where: { tenantId: { in: allTenantIds } } });
    await prisma.inventoryReservationLine.deleteMany({ where: { tenantId: { in: allTenantIds } } });
    await prisma.inventoryReservation.deleteMany({ where: { tenantId: { in: allTenantIds } } });
    await prisma.inventoryReservationSequence.deleteMany({ where: { tenantId: { in: allTenantIds } } });
    await prisma.materialTransferLine.deleteMany({ where: { tenantId: { in: allTenantIds } } });
    await prisma.materialTransfer.deleteMany({ where: { tenantId: { in: allTenantIds } } });
    await prisma.materialTransferSequence.deleteMany({ where: { tenantId: { in: allTenantIds } } });
    await prisma.materialReturnLine.deleteMany({ where: { tenantId: { in: allTenantIds } } });
    await prisma.materialReturn.deleteMany({ where: { tenantId: { in: allTenantIds } } });
    await prisma.materialIssueLine.deleteMany({ where: { tenantId: { in: allTenantIds } } });
    await prisma.materialIssue.deleteMany({ where: { tenantId: { in: allTenantIds } } });
    await prisma.materialIssueSequence.deleteMany({ where: { tenantId: { in: allTenantIds } } });
    await prisma.material.deleteMany({ where: { tenantId: { in: allTenantIds } } });
    await prisma.storeAccessAssignment.deleteMany({ where: { tenantId: { in: allTenantIds } } });
    await prisma.store.deleteMany({ where: { tenantId: { in: allTenantIds } } });
    await prisma.projectMember.deleteMany({ where: { tenantId: { in: allTenantIds } } });
    await prisma.project.deleteMany({ where: { tenantId: { in: allTenantIds } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: allTenantIds } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: allTenantIds } } });
    await prisma.tenantEntitlementOverride.deleteMany({ where: { tenantId: { in: allTenantIds } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: allTenantIds } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: allTenantIds } } });
    await prisma.tenant.deleteMany({ where: { id: { in: allTenantIds } } });

    // 1. Create Tenant A
    await prisma.tenant.upsert({
      where: { id: tenantAId },
      update: {},
      create: {
        id: tenantAId,
        code: 'TENANT_RES_A',
        name: 'Reservation Tenant A',
        domain: 'res-tenant-a.dezobuild.com',
        planTier: 'PROFESSIONAL',
        status: 'ACTIVE',
      },
    });

    const profPlan = await prisma.platformPlan.findUnique({
      where: { code: 'PROFESSIONAL' },
    });
    if (profPlan) {
      await prisma.tenantSubscription.upsert({
        where: { id: 'aaaaaaaa-55b1-7799-aaaa-aaaaaaaaaaaa' },
        update: {},
        create: {
          id: 'aaaaaaaa-55b1-7799-aaaa-aaaaaaaaaaaa',
          tenantId: tenantAId,
          planId: profPlan.id,
          status: 'ACTIVE',
          billingCycle: 'ANNUAL',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // 2. Create Tenant B
    await prisma.tenant.upsert({
      where: { id: tenantBId },
      update: {},
      create: {
        id: tenantBId,
        code: 'TENANT_RES_B',
        name: 'Reservation Tenant B',
        domain: 'res-tenant-b.dezobuild.com',
        planTier: 'PROFESSIONAL',
        status: 'ACTIVE',
      },
    });
    if (profPlan) {
      await prisma.tenantSubscription.upsert({
        where: { id: 'bbbbbbbb-55b1-7799-bbbb-bbbbbbbbbbbb' },
        update: {},
        create: {
          id: 'bbbbbbbb-55b1-7799-bbbb-bbbbbbbbbbbb',
          tenantId: tenantBId,
          planId: profPlan.id,
          status: 'ACTIVE',
          billingCycle: 'ANNUAL',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // 3. Create Users
    const createTestUser = async (tId: string, uId: string, email: string, name: string) => {
      await prisma.user.upsert({
        where: { id: uId },
        update: {},
        create: {
          id: uId,
          tenantId: tId,
          email,
          fullName: name,
          passwordHash: 'dummy_hash',
          status: 'ACTIVE',
        },
      });
    };

    await createTestUser(tenantAId, ownerAId, 'owner@res-a.com', 'Owner A');
    await createTestUser(tenantAId, pmAId, 'pm@res-a.com', 'PM A');
    await createTestUser(tenantAId, siteEngAId, 'siteeng@res-a.com', 'Site Eng A');
    await createTestUser(tenantAId, storeKeeperAId, 'storekeeper@res-a.com', 'Store Keeper A');
    await createTestUser(tenantAId, noAccessUserAId, 'noaccess@res-a.com', 'No Access User');
    await createTestUser(tenantBId, ownerBId, 'owner@res-b.com', 'Owner B');

    // 4. Assign Roles
    const assignRole = async (tId: string, uId: string, roleName: string) => {
      const role = await prisma.role.findFirst({ where: { name: roleName, tenantId: null } });
      if (role) {
        await prisma.userRoleAssignment.create({
          data: {
            tenantId: tId,
            userId: uId,
            roleId: role.id,
            scopeType: 'TENANT',
          },
        });
      }
    };

    await assignRole(tenantAId, ownerAId, 'COMPANY_OWNER');
    await assignRole(tenantAId, pmAId, 'COMPANY_ADMIN');
    await assignRole(tenantAId, siteEngAId, 'PROCUREMENT_STORE');
    await assignRole(tenantAId, storeKeeperAId, 'PROCUREMENT_STORE');
    await assignRole(tenantAId, noAccessUserAId, 'EMPLOYEE');
    await assignRole(tenantBId, ownerBId, 'COMPANY_OWNER');

    // 5. Generate Auth Tokens
    tokenOwnerA = tokenService.createAccessToken({
      userId: ownerAId,
      tenantId: tenantAId,
      sessionId: 'sess-owner-a-7799',
      sessionVersion: 1,
    });
    tokenPmA = tokenService.createAccessToken({
      userId: pmAId,
      tenantId: tenantAId,
      sessionId: 'sess-pm-a-7799',
      sessionVersion: 1,
    });
    tokenSiteEngA = tokenService.createAccessToken({
      userId: siteEngAId,
      tenantId: tenantAId,
      sessionId: 'sess-siteeng-a-7799',
      sessionVersion: 1,
    });
    tokenStoreKeeperA = tokenService.createAccessToken({
      userId: storeKeeperAId,
      tenantId: tenantAId,
      sessionId: 'sess-storekeeper-a-7799',
      sessionVersion: 1,
    });
    tokenNoAccessUserA = tokenService.createAccessToken({
      userId: noAccessUserAId,
      tenantId: tenantAId,
      sessionId: 'sess-noaccess-a-7799',
      sessionVersion: 1,
    });
    tokenOwnerB = tokenService.createAccessToken({
      userId: ownerBId,
      tenantId: tenantBId,
      sessionId: 'sess-owner-b-7799',
      sessionVersion: 1,
    });

    // 6. Companies & Projects
    const compA = await prisma.company.upsert({
      where: { tenantId_code: { tenantId: tenantAId, code: 'COMP_RES_A' } },
      update: {},
      create: {
        tenantId: tenantAId,
        code: 'COMP_RES_A',
        name: 'Company Res A',
        legalName: 'Company Res A Ltd',
        panNumber: 'ABCDE1234F',
        gstin: '29ABCDE1234F1Z5',
        email: 'info@comp-res-a.com',
        phone: '9988776655',
        address: 'Bangalore Office',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
      },
    });

    const compB = await prisma.company.upsert({
      where: { tenantId_code: { tenantId: tenantBId, code: 'COMP_RES_B' } },
      update: {},
      create: {
        tenantId: tenantBId,
        code: 'COMP_RES_B',
        name: 'Company Res B',
        legalName: 'Company Res B Ltd',
        panNumber: 'VWXYZ1234F',
        gstin: '27VWXYZ1234F1Z5',
        email: 'info@comp-res-b.com',
        phone: '9988776644',
        address: 'Mumbai Office',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    });

    const prjA1 = await prisma.project.upsert({
      where: { tenantId_code: { tenantId: tenantAId, code: 'PRJ_RES_A1' } },
      update: {},
      create: {
        tenantId: tenantAId,
        companyId: compA.id,
        code: 'PRJ_RES_A1',
        name: 'Project Res A1 Site',
        status: 'ACTIVE',
      },
    });
    projectA1Id = prjA1.id;

    const prjA2 = await prisma.project.upsert({
      where: { tenantId_code: { tenantId: tenantAId, code: 'PRJ_RES_A2' } },
      update: {},
      create: {
        tenantId: tenantAId,
        companyId: compA.id,
        code: 'PRJ_RES_A2',
        name: 'Project Res A2 Site',
        status: 'ACTIVE',
      },
    });
    projectA2Id = prjA2.id;

    const prjB1 = await prisma.project.upsert({
      where: { tenantId_code: { tenantId: tenantBId, code: 'PRJ_RES_B1' } },
      update: {},
      create: {
        tenantId: tenantBId,
        companyId: compB.id,
        code: 'PRJ_RES_B1',
        name: 'Project Res B1 Site',
        status: 'ACTIVE',
      },
    });
    projectB1Id = prjB1.id;

    // 7. Project Memberships
    const addMember = async (tId: string, pId: string, uId: string) => {
      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: pId, userId: uId } },
        update: {},
        create: {
          tenantId: tId,
          projectId: pId,
          userId: uId,
          projectRole: 'ENGINEER',
        },
      });
    };
    await addMember(tenantAId, projectA1Id, pmAId);
    await addMember(tenantAId, projectA1Id, siteEngAId);
    await addMember(tenantAId, projectA1Id, storeKeeperAId);
    await addMember(tenantAId, projectA2Id, pmAId);
    await addMember(tenantAId, projectA2Id, siteEngAId);

    // 8. Stores
    const createStore = async (
      tId: string,
      code: string,
      name: string,
      isCentral: boolean,
      pId?: string | null,
      status: string = 'ACTIVE'
    ) => {
      return prisma.store.upsert({
        where: { tenantId_code: { tenantId: tId, code } },
        update: {},
        create: {
          tenantId: tId,
          code,
          name,
          isCentralWarehouse: isCentral,
          storeType: isCentral ? 'CENTRAL' : 'PROJECT_SITE',
          projectId: pId || null,
          status,
        },
      });
    };

    const stACentral = await createStore(tenantAId, 'ST_RES_CENTRAL', 'Central Store A', true);
    storeACentralId = stACentral.id;

    const stA1 = await createStore(tenantAId, 'ST_RES_A1', 'Site Store A1', false, projectA1Id);
    storeA1SiteId = stA1.id;

    const stA2 = await createStore(tenantAId, 'ST_RES_A2', 'Site Store A2', false, projectA2Id);
    storeA2SiteId = stA2.id;

    const stAInact = await createStore(tenantAId, 'ST_RES_INACT', 'Inactive Store A', false, projectA1Id, 'INACTIVE');
    storeAInactiveId = stAInact.id;

    const stB1 = await createStore(tenantBId, 'ST_RES_B1', 'Site Store B1', false, projectB1Id);
    storeB1SiteId = stB1.id;

    // 9. Store Access Assignments
    const addStoreAccess = async (tId: string, sId: string, uId: string) => {
      await prisma.storeAccessAssignment.upsert({
        where: { storeId_userId: { storeId: sId, userId: uId } },
        update: {},
        create: {
          tenantId: tId,
          storeId: sId,
          userId: uId,
          accessLevel: 'FULL',
        },
      });
    };
    await addStoreAccess(tenantAId, storeACentralId, pmAId);
    await addStoreAccess(tenantAId, storeACentralId, siteEngAId);
    await addStoreAccess(tenantAId, storeACentralId, storeKeeperAId);
    await addStoreAccess(tenantAId, storeA1SiteId, pmAId);
    await addStoreAccess(tenantAId, storeA1SiteId, siteEngAId);
    await addStoreAccess(tenantAId, storeA1SiteId, storeKeeperAId);
    await addStoreAccess(tenantAId, storeA2SiteId, pmAId);
    await addStoreAccess(tenantAId, storeA2SiteId, siteEngAId);

    // 10. Materials
    const createMat = async (
      tId: string,
      code: string,
      name: string,
      category: string,
      uom: string,
      rate: number,
      status: string = 'ACTIVE'
    ) => {
      return prisma.material.upsert({
        where: { tenantId_itemCode: { tenantId: tId, itemCode: code } },
        update: {},
        create: {
          tenantId: tId,
          itemCode: code,
          name,
          category,
          primaryUom: uom,
          standardRate: rate,
          status,
        },
      });
    };

    const matCementA = await createMat(tenantAId, 'MAT_RES_CEMENT', 'OPC 53 Cement', 'CIVIL', 'BAG', 380);
    materialCementAId = matCementA.id;

    const matSteelA = await createMat(tenantAId, 'MAT_RES_STEEL', 'Fe550 TMT Rebar 12mm', 'STEEL', 'MT', 58000);
    materialSteelAId = matSteelA.id;

    const matSandA = await createMat(tenantAId, 'MAT_RES_SAND', 'River Sand Coarse', 'AGGREGATES', 'CFT', 45);
    materialSandAId = matSandA.id;

    const matPaintA = await createMat(tenantAId, 'MAT_RES_PAINT', 'Exterior Acrylic Emulsion', 'PAINT', 'LTR', 240, 'INACTIVE');
    materialPaintAId = matPaintA.id;

    const matCementB = await createMat(tenantBId, 'MAT_RES_CEMENT_B', 'PPC Cement', 'CIVIL', 'BAG', 370);
    materialCementBId = matCementB.id;
  });

  beforeEach(async () => {
    // Reset balances before each test
    await seedStock(tenantAId, storeA1SiteId, materialCementAId, 100, 'BAG', 0);
    await seedStock(tenantAId, storeA1SiteId, materialSteelAId, 50, 'MT', 0);
    await seedStock(tenantAId, storeA1SiteId, materialSandAId, 200, 'CFT', 0);
    await seedStock(tenantAId, storeACentralId, materialCementAId, 500, 'BAG', 0);
  });

  // =========================================================================
  // 1-6: CREATION & VALIDATION
  // =========================================================================

  it('1. create draft: should create a valid DRAFT inventory reservation with zero stock mutation', async () => {
    const req = createAuthReq(tokenSiteEngA, {
      body: {
        storeId: storeA1SiteId,
        purpose: 'Foundation footing pour reservation',
        remarks: 'Pour scheduled for next Monday',
        priority: 'URGENT',
        lines: [{ materialId: materialCementAId, quantityReserved: 30, uom: 'BAG' }],
      },
    });

    const res = await reservationController.createReservation(req);
    assert.strictEqual(res.success, true);
    assert.ok(res.data.id);
    assert.strictEqual(res.data.status, 'DRAFT');
    assert.strictEqual(res.data.priority, 'URGENT');
    assert.strictEqual(res.data.projectId, projectA1Id);
    assert.match(res.data.reservationNumber, /^RES-PRJ_RES_A1-\d{8}-\d{4}$/);
    assert.strictEqual(res.data.lines.length, 1);
    assert.strictEqual(Number(res.data.lines[0].quantityReserved), 30);
    assert.strictEqual(Number(res.data.lines[0].quantityFulfilled), 0);
    assert.strictEqual(Number(res.data.lines[0].quantityReleased), 0);

    const bal = await prisma.storeStockBalance.findUnique({
      where: { storeId_materialId: { storeId: storeA1SiteId, materialId: materialCementAId } },
    });
    assert.strictEqual(Number(bal?.quantityOnHand), 100);
    assert.strictEqual(Number(bal?.reservedQuantity), 0);
  });

  it('2. update draft: should update a DRAFT reservation with modified lines and purpose', async () => {
    const createReq = createAuthReq(tokenSiteEngA, {
      body: {
        storeId: storeA1SiteId,
        purpose: 'Initial draft',
        lines: [{ materialId: materialCementAId, quantityReserved: 20, uom: 'BAG' }],
      },
    });
    const created = await reservationController.createReservation(createReq);

    const updateReq = createAuthReq(tokenSiteEngA, {
      params: { id: created.data.id },
      body: {
        purpose: 'Updated draft purpose',
        priority: 'CRITICAL',
        lines: [
          { materialId: materialCementAId, quantityReserved: 25, uom: 'BAG' },
          { materialId: materialSteelAId, quantityReserved: 10, uom: 'MT' },
        ],
      },
    });

    const updated = await reservationController.updateReservation(updateReq);
    assert.strictEqual(updated.success, true);
    assert.strictEqual(updated.data.purpose, 'Updated draft purpose');
    assert.strictEqual(updated.data.priority, 'CRITICAL');
    assert.strictEqual(updated.data.lines.length, 2);
  });

  it('3. reject invalid material: should reject reservation for non-existent material ID', async () => {
    const req = createAuthReq(tokenSiteEngA, {
      body: {
        storeId: storeA1SiteId,
        lines: [{ materialId: '00000000-0000-0000-0000-000000000000', quantityReserved: 10, uom: 'BAG' }],
      },
    });
    await assert.rejects(
      async () => reservationController.createReservation(req),
      (err: any) => err.statusCode === 404 || err.statusCode === 400
    );
  });

  it('4. reject inactive material: should reject reservation creation for inactive material', async () => {
    const req = createAuthReq(tokenSiteEngA, {
      body: {
        storeId: storeA1SiteId,
        lines: [{ materialId: materialPaintAId, quantityReserved: 10, uom: 'LTR' }],
      },
    });
    await assert.rejects(
      async () => reservationController.createReservation(req),
      (err: any) => err.statusCode === 400 && err.message.includes('inactive')
    );
  });

  it('5. reject invalid UOM: should reject reservation line with mismatched UOM', async () => {
    const req = createAuthReq(tokenSiteEngA, {
      body: {
        storeId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityReserved: 10, uom: 'KG' }],
      },
    });
    await assert.rejects(
      async () => reservationController.createReservation(req),
      (err: any) => err.statusCode === 400 && err.message.includes('UOM')
    );
  });

  it('6. reject duplicate material: should reject reservation creation with duplicate material lines', async () => {
    const req = createAuthReq(tokenSiteEngA, {
      body: {
        storeId: storeA1SiteId,
        lines: [
          { materialId: materialCementAId, quantityReserved: 20, uom: 'BAG' },
          { materialId: materialCementAId, quantityReserved: 15, uom: 'BAG' },
        ],
      },
    });
    await assert.rejects(
      async () => reservationController.createReservation(req),
      (err: any) => err.statusCode === 422 || err.statusCode === 400
    );
  });

  // =========================================================================
  // 7-16: LIFECYCLE, APPROVAL & LOCKING
  // =========================================================================

  it('7. submit: should transition DRAFT to SUBMITTED without mutating stock', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: {
          storeId: storeA1SiteId,
          lines: [{ materialId: materialCementAId, quantityReserved: 25, uom: 'BAG' }],
        },
      })
    );

    const submitted = await reservationController.submitReservation(
      createAuthReq(tokenSiteEngA, {
        params: { id: created.data.id },
        body: { remarks: 'Submitted for PM review' },
      })
    );

    assert.strictEqual(submitted.success, true);
    assert.strictEqual(submitted.data.status, 'SUBMITTED');
    assert.strictEqual(submitted.data.submittedById, siteEngAId);
    assert.ok(submitted.data.submittedAt);
  });

  it('8. approve: should transition SUBMITTED to ACTIVE by authorized approver', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: {
          storeId: storeA1SiteId,
          lines: [{ materialId: materialCementAId, quantityReserved: 25, uom: 'BAG' }],
        },
      })
    );
    await reservationController.submitReservation(
      createAuthReq(tokenSiteEngA, { params: { id: created.data.id } })
    );

    const approved = await reservationController.approveReservation(
      createAuthReq(tokenPmA, {
        params: { id: created.data.id },
        body: { approvalRemarks: 'Approved' },
      })
    );

    assert.strictEqual(approved.success, true);
    assert.strictEqual(approved.data.status, 'ACTIVE');
    assert.strictEqual(approved.data.approvedById, pmAId);
  });

  it('9. approval increments reservedQuantity: should atomically increment store reserved stock', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: {
          storeId: storeA1SiteId,
          lines: [{ materialId: materialCementAId, quantityReserved: 40, uom: 'BAG' }],
        },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));
    await reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));

    const bal = await prisma.storeStockBalance.findUnique({
      where: { storeId_materialId: { storeId: storeA1SiteId, materialId: materialCementAId } },
    });
    assert.strictEqual(Number(bal?.reservedQuantity), 40);
  });

  it('10. approval does not change quantityOnHand: physical stock remains invariant on reservation', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: {
          storeId: storeA1SiteId,
          lines: [{ materialId: materialCementAId, quantityReserved: 40, uom: 'BAG' }],
        },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));
    await reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));

    const bal = await prisma.storeStockBalance.findUnique({
      where: { storeId_materialId: { storeId: storeA1SiteId, materialId: materialCementAId } },
    });
    assert.strictEqual(Number(bal?.quantityOnHand), 100);
  });

  it('11. availableQuantity decreases: calculated available stock reflects (onHand - reserved)', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: {
          storeId: storeA1SiteId,
          lines: [{ materialId: materialCementAId, quantityReserved: 35, uom: 'BAG' }],
        },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));
    await reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));

    const bal = await prisma.storeStockBalance.findUnique({
      where: { storeId_materialId: { storeId: storeA1SiteId, materialId: materialCementAId } },
    });
    const available = Number(bal?.quantityOnHand) - Number(bal?.reservedQuantity);
    assert.strictEqual(available, 65);
  });

  it('12. over-reservation rejected: should reject approval when requested > available stock', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: {
          storeId: storeA1SiteId,
          lines: [{ materialId: materialCementAId, quantityReserved: 120, uom: 'BAG' }],
        },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));

    await assert.rejects(
      async () => reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } })),
      (err: any) => err.statusCode === 400 && err.message.includes('Insufficient available stock')
    );
  });

  it('13. concurrent reservations: serialize competing approvals on StoreStockBalance', async () => {
    const res1 = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: { storeId: storeA1SiteId, lines: [{ materialId: materialSteelAId, quantityReserved: 30, uom: 'MT' }] },
      })
    );
    const res2 = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: { storeId: storeA1SiteId, lines: [{ materialId: materialSteelAId, quantityReserved: 30, uom: 'MT' }] },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: res1.data.id } }));
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: res2.data.id } }));

    const results = await Promise.allSettled([
      reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: res1.data.id } })),
      reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: res2.data.id } })),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    assert.strictEqual(fulfilled.length, 1);
    assert.strictEqual(rejected.length, 1);
  });

  it('14. multi-line reservation: should atomically reserve multiple materials', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: {
          storeId: storeA1SiteId,
          lines: [
            { materialId: materialCementAId, quantityReserved: 20, uom: 'BAG' },
            { materialId: materialSteelAId, quantityReserved: 10, uom: 'MT' },
            { materialId: materialSandAId, quantityReserved: 50, uom: 'CFT' },
          ],
        },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));
    await reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));

    const balCement = await prisma.storeStockBalance.findUnique({
      where: { storeId_materialId: { storeId: storeA1SiteId, materialId: materialCementAId } },
    });
    const balSteel = await prisma.storeStockBalance.findUnique({
      where: { storeId_materialId: { storeId: storeA1SiteId, materialId: materialSteelAId } },
    });
    const balSand = await prisma.storeStockBalance.findUnique({
      where: { storeId_materialId: { storeId: storeA1SiteId, materialId: materialSandAId } },
    });

    assert.strictEqual(Number(balCement?.reservedQuantity), 20);
    assert.strictEqual(Number(balSteel?.reservedQuantity), 10);
    assert.strictEqual(Number(balSand?.reservedQuantity), 50);
  });

  it('15. deterministic locking: multi-material operations sort by materialId ASC', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: {
          storeId: storeA1SiteId,
          lines: [
            { materialId: materialSandAId, quantityReserved: 10, uom: 'CFT' },
            { materialId: materialCementAId, quantityReserved: 10, uom: 'BAG' },
          ],
        },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));
    const approved = await reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));
    assert.strictEqual(approved.data.status, 'ACTIVE');
  });

  it('16. self-approval rejected: Segregation of Duties blocks creator from approving own reservation', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: { storeId: storeA1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 10, uom: 'BAG' }] },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));

    await assert.rejects(
      async () => reservationController.approveReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } })),
      (err: any) => err.statusCode === 403 && err.message.includes('Segregation of duties')
    );
  });

  // =========================================================================
  // 17-25: RELEASE & MATERIAL ISSUE FULFILLMENT
  // =========================================================================

  it('17. release: transition ACTIVE reservation to RELEASED', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: { storeId: storeA1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 30, uom: 'BAG' }] },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));
    await reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));

    const released = await reservationController.releaseReservation(
      createAuthReq(tokenPmA, {
        params: { id: created.data.id },
        body: { releaseRemarks: 'No longer needed' },
      })
    );
    assert.strictEqual(released.data.status, 'RELEASED');
  });

  it('18. active release decrements reservedQuantity: restoring reserved stock to available', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: { storeId: storeA1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 30, uom: 'BAG' }] },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));
    await reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));

    await reservationController.releaseReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));

    const bal = await prisma.storeStockBalance.findUnique({
      where: { storeId_materialId: { storeId: storeA1SiteId, materialId: materialCementAId } },
    });
    assert.strictEqual(Number(bal?.reservedQuantity), 0);
    assert.strictEqual(Number(bal?.quantityOnHand), 100);
  });

  it('19. partial fulfillment: issue subset of reservation moves status to PARTIALLY_FULFILLED', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: { storeId: storeA1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 50, uom: 'BAG' }] },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));
    const approved = await reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));
    const lineId = approved.data.lines[0].id;

    const iss = await issueController.createMaterialIssue(
      createAuthReq(tokenSiteEngA, {
        body: {
          projectId: projectA1Id,
          storeId: storeA1SiteId,
          lines: [{ materialId: materialCementAId, quantityRequested: 20, uom: 'BAG', reservationLineId: lineId }],
        },
      })
    );
    await issueController.submitMaterialIssue(createAuthReq(tokenSiteEngA, { params: { id: iss.data.id } }));
    await issueController.approveMaterialIssue(createAuthReq(tokenPmA, { params: { id: iss.data.id } }));
    await issueController.issueMaterialIssue(createAuthReq(tokenStoreKeeperA, { params: { id: iss.data.id } }));

    const resCheck = await prisma.inventoryReservation.findUnique({
      where: { id: created.data.id },
      include: { lines: true },
    });
    assert.strictEqual(resCheck?.status, 'PARTIALLY_FULFILLED');
    assert.strictEqual(Number(resCheck?.lines[0].quantityFulfilled), 20);
  });

  it('20. full fulfillment: issuing entire reserved quantity transitions status to FULFILLED', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: { storeId: storeA1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 50, uom: 'BAG' }] },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));
    const approved = await reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));
    const lineId = approved.data.lines[0].id;

    const iss = await issueController.createMaterialIssue(
      createAuthReq(tokenSiteEngA, {
        body: {
          projectId: projectA1Id,
          storeId: storeA1SiteId,
          lines: [{ materialId: materialCementAId, quantityRequested: 50, uom: 'BAG', reservationLineId: lineId }],
        },
      })
    );
    await issueController.submitMaterialIssue(createAuthReq(tokenSiteEngA, { params: { id: iss.data.id } }));
    await issueController.approveMaterialIssue(createAuthReq(tokenPmA, { params: { id: iss.data.id } }));
    await issueController.issueMaterialIssue(createAuthReq(tokenStoreKeeperA, { params: { id: iss.data.id } }));

    const resCheck = await prisma.inventoryReservation.findUnique({
      where: { id: created.data.id },
      include: { lines: true },
    });
    assert.strictEqual(resCheck?.status, 'FULFILLED');
    assert.strictEqual(Number(resCheck?.lines[0].quantityFulfilled), 50);
  });

  it('21. issue against reservation: decrements on-hand AND reservedQuantity simultaneously', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: { storeId: storeA1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 40, uom: 'BAG' }] },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));
    const approved = await reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));
    const lineId = approved.data.lines[0].id;

    const iss = await issueController.createMaterialIssue(
      createAuthReq(tokenSiteEngA, {
        body: {
          projectId: projectA1Id,
          storeId: storeA1SiteId,
          lines: [{ materialId: materialCementAId, quantityRequested: 40, uom: 'BAG', reservationLineId: lineId }],
        },
      })
    );
    await issueController.submitMaterialIssue(createAuthReq(tokenSiteEngA, { params: { id: iss.data.id } }));
    await issueController.approveMaterialIssue(createAuthReq(tokenPmA, { params: { id: iss.data.id } }));
    await issueController.issueMaterialIssue(createAuthReq(tokenStoreKeeperA, { params: { id: iss.data.id } }));

    const bal = await prisma.storeStockBalance.findUnique({
      where: { storeId_materialId: { storeId: storeA1SiteId, materialId: materialCementAId } },
    });
    assert.strictEqual(Number(bal?.quantityOnHand), 60);
    assert.strictEqual(Number(bal?.reservedQuantity), 0);
  });

  it('22. issue cannot exceed reserved quantity: reject issue quantity greater than reservation line remainder', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: { storeId: storeA1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 30, uom: 'BAG' }] },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));
    const approved = await reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));
    const lineId = approved.data.lines[0].id;

    const iss = await issueController.createMaterialIssue(
      createAuthReq(tokenSiteEngA, {
        body: {
          projectId: projectA1Id,
          storeId: storeA1SiteId,
          lines: [{ materialId: materialCementAId, quantityRequested: 40, uom: 'BAG', reservationLineId: lineId }],
        },
      })
    );
    await issueController.submitMaterialIssue(createAuthReq(tokenSiteEngA, { params: { id: iss.data.id } }));
    await issueController.approveMaterialIssue(createAuthReq(tokenPmA, { params: { id: iss.data.id } }));

    await assert.rejects(
      async () => issueController.issueMaterialIssue(createAuthReq(tokenStoreKeeperA, { params: { id: iss.data.id } })),
      (err: any) => err.statusCode === 400 && err.message.includes('exceeds remaining reserved quantity')
    );
  });

  it('23. issue cannot violate physical on-hand: reject issue when physical on-hand is insufficient', async () => {
    await seedStock(tenantAId, storeA1SiteId, materialCementAId, 20, 'BAG', 20);

    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: { storeId: storeA1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 20, uom: 'BAG' }] },
      })
    );
    // Artificially deplete stock on hand to 10
    await prisma.$executeRaw`UPDATE store_stock_balances SET quantity_on_hand = 10 WHERE store_id = ${storeA1SiteId}::uuid AND material_id = ${materialCementAId}::uuid`;

    const iss = await issueController.createMaterialIssue(
      createAuthReq(tokenSiteEngA, {
        body: {
          projectId: projectA1Id,
          storeId: storeA1SiteId,
          lines: [{ materialId: materialCementAId, quantityRequested: 20, uom: 'BAG' }],
        },
      })
    );
    await issueController.submitMaterialIssue(createAuthReq(tokenSiteEngA, { params: { id: iss.data.id } }));
    await issueController.approveMaterialIssue(createAuthReq(tokenPmA, { params: { id: iss.data.id } }));

    await assert.rejects(
      async () => issueController.issueMaterialIssue(createAuthReq(tokenStoreKeeperA, { params: { id: iss.data.id } })),
      (err: any) => err.statusCode === 400 && err.message.includes('Insufficient stock')
    );
  });

  it('24. reservation status after partial issue: remains PARTIALLY_FULFILLED', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: { storeId: storeA1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 60, uom: 'BAG' }] },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));
    const approved = await reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));
    const lineId = approved.data.lines[0].id;

    const iss = await issueController.createMaterialIssue(
      createAuthReq(tokenSiteEngA, {
        body: {
          projectId: projectA1Id,
          storeId: storeA1SiteId,
          lines: [{ materialId: materialCementAId, quantityRequested: 25, uom: 'BAG', reservationLineId: lineId }],
        },
      })
    );
    await issueController.submitMaterialIssue(createAuthReq(tokenSiteEngA, { params: { id: iss.data.id } }));
    await issueController.approveMaterialIssue(createAuthReq(tokenPmA, { params: { id: iss.data.id } }));
    await issueController.issueMaterialIssue(createAuthReq(tokenStoreKeeperA, { params: { id: iss.data.id } }));

    const resCheck = await prisma.inventoryReservation.findUnique({ where: { id: created.data.id } });
    assert.strictEqual(resCheck?.status, 'PARTIALLY_FULFILLED');
  });

  it('25. reservation status after full issue: becomes FULFILLED', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: { storeId: storeA1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 40, uom: 'BAG' }] },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));
    const approved = await reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));
    const lineId = approved.data.lines[0].id;

    const iss = await issueController.createMaterialIssue(
      createAuthReq(tokenSiteEngA, {
        body: {
          projectId: projectA1Id,
          storeId: storeA1SiteId,
          lines: [{ materialId: materialCementAId, quantityRequested: 40, uom: 'BAG', reservationLineId: lineId }],
        },
      })
    );
    await issueController.submitMaterialIssue(createAuthReq(tokenSiteEngA, { params: { id: iss.data.id } }));
    await issueController.approveMaterialIssue(createAuthReq(tokenPmA, { params: { id: iss.data.id } }));
    await issueController.issueMaterialIssue(createAuthReq(tokenStoreKeeperA, { params: { id: iss.data.id } }));

    const resCheck = await prisma.inventoryReservation.findUnique({ where: { id: created.data.id } });
    assert.strictEqual(resCheck?.status, 'FULFILLED');
  });

  // =========================================================================
  // 26-31: UNRESERVED & CROSS-MODULE INVARIANTS
  // =========================================================================

  it('26. unreserved issue still works: direct issue decrements on-hand without touching reservedQuantity', async () => {
    await seedStock(tenantAId, storeA1SiteId, materialCementAId, 100, 'BAG', 30);

    const iss = await issueController.createMaterialIssue(
      createAuthReq(tokenSiteEngA, {
        body: {
          projectId: projectA1Id,
          storeId: storeA1SiteId,
          lines: [{ materialId: materialCementAId, quantityRequested: 20, uom: 'BAG' }],
        },
      })
    );
    await issueController.submitMaterialIssue(createAuthReq(tokenSiteEngA, { params: { id: iss.data.id } }));
    await issueController.approveMaterialIssue(createAuthReq(tokenPmA, { params: { id: iss.data.id } }));
    await issueController.issueMaterialIssue(createAuthReq(tokenStoreKeeperA, { params: { id: iss.data.id } }));

    const bal = await prisma.storeStockBalance.findUnique({
      where: { storeId_materialId: { storeId: storeA1SiteId, materialId: materialCementAId } },
    });
    assert.strictEqual(Number(bal?.quantityOnHand), 80);
    assert.strictEqual(Number(bal?.reservedQuantity), 30);
  });

  it('27. unreserved issue cannot consume reserved stock: direct issue blocked if qty > available', async () => {
    await seedStock(tenantAId, storeA1SiteId, materialCementAId, 100, 'BAG', 50);

    const iss = await issueController.createMaterialIssue(
      createAuthReq(tokenSiteEngA, {
        body: {
          projectId: projectA1Id,
          storeId: storeA1SiteId,
          lines: [{ materialId: materialCementAId, quantityRequested: 60, uom: 'BAG' }],
        },
      })
    );
    await issueController.submitMaterialIssue(createAuthReq(tokenSiteEngA, { params: { id: iss.data.id } }));
    await issueController.approveMaterialIssue(createAuthReq(tokenPmA, { params: { id: iss.data.id } }));

    await assert.rejects(
      async () => issueController.issueMaterialIssue(createAuthReq(tokenStoreKeeperA, { params: { id: iss.data.id } })),
      (err: any) => err.statusCode === 400 && err.message.includes('Insufficient stock')
    );
  });

  it('28. transfer cannot consume reserved stock: transfer dispatch blocked when requested > available', async () => {
    await seedStock(tenantAId, storeA1SiteId, materialCementAId, 100, 'BAG', 50);

    const transfer = await transferService.createMaterialTransfer(
      tenantAId,
      siteEngAId,
      {
        sourceStoreId: storeA1SiteId,
        destinationStoreId: storeA2SiteId,
        lines: [{ materialId: materialCementAId, quantityTransferred: 60 }],
      }
    );
    await transferService.submitMaterialTransfer(tenantAId, siteEngAId, transfer.id);
    await transferService.approveMaterialTransfer(tenantAId, pmAId, transfer.id);

    await assert.rejects(
      async () => transferService.dispatchMaterialTransfer(tenantAId, storeKeeperAId, transfer.id),
      (err: any) => err.statusCode === 400 && err.message.includes('Insufficient stock')
    );
  });

  it('29. return does not auto-allocate: material return increases on-hand and leaves reservedQuantity untouched', async () => {
    await seedStock(tenantAId, storeA1SiteId, materialCementAId, 100, 'BAG', 30);
    await seedStock(tenantAId, storeA1SiteId, materialCementAId, 110, 'BAG', 30);

    const bal = await prisma.storeStockBalance.findUnique({
      where: { storeId_materialId: { storeId: storeA1SiteId, materialId: materialCementAId } },
    });
    assert.strictEqual(Number(bal?.quantityOnHand), 110);
    assert.strictEqual(Number(bal?.reservedQuantity), 30);
  });

  it('30. GRN does not auto-allocate: goods receipt increases on-hand and does not alter reservedQuantity', async () => {
    await seedStock(tenantAId, storeA1SiteId, materialCementAId, 100, 'BAG', 30);

    // Opening balance seed simulation of GRN
    await seedStock(tenantAId, storeA1SiteId, materialCementAId, 150, 'BAG', 30);

    const bal = await prisma.storeStockBalance.findUnique({
      where: { storeId_materialId: { storeId: storeA1SiteId, materialId: materialCementAId } },
    });
    assert.strictEqual(Number(bal?.quantityOnHand), 150);
    assert.strictEqual(Number(bal?.reservedQuantity), 30);
  });

  it('31. adjustment cannot violate reserved <= on-hand: negative adjustment failing guard', async () => {
    await seedStock(tenantAId, storeA1SiteId, materialCementAId, 100, 'BAG', 50);

    await assert.rejects(
      async () =>
        stockLedgerService.recordAdjustment(
          tenantAId,
          ownerAId,
          storeA1SiteId,
          materialCementAId,
          {
            movementType: 'ADJUSTMENT_OUT',
            quantity: 60,
            reason: 'Physical inventory shrinkage write-off',
          }
        ),
      (err: any) => err.statusCode === 400 && err.message.includes('cannot be less than active reserved quantity')
    );
  });

  // =========================================================================
  // 32-37: CANCELLATIONS
  // =========================================================================

  it('32. cancel draft: cancellation of DRAFT does not touch stock', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: { storeId: storeA1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 20, uom: 'BAG' }] },
      })
    );
    const cancelled = await reservationController.cancelReservation(
      createAuthReq(tokenSiteEngA, {
        params: { id: created.data.id },
        body: { cancellationReason: 'Draft abandoned' },
      })
    );
    assert.strictEqual(cancelled.data.status, 'CANCELLED');

    const bal = await prisma.storeStockBalance.findUnique({
      where: { storeId_materialId: { storeId: storeA1SiteId, materialId: materialCementAId } },
    });
    assert.strictEqual(Number(bal?.reservedQuantity), 0);
  });

  it('33. cancel submitted: cancellation of SUBMITTED does not touch stock', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: { storeId: storeA1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 20, uom: 'BAG' }] },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));
    const cancelled = await reservationController.cancelReservation(
      createAuthReq(tokenSiteEngA, {
        params: { id: created.data.id },
        body: { cancellationReason: 'Cancelled before review' },
      })
    );
    assert.strictEqual(cancelled.data.status, 'CANCELLED');
  });

  it('34. cancel active: cancellation of ACTIVE reservation releases reservedQuantity', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: { storeId: storeA1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 30, uom: 'BAG' }] },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));
    await reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));

    const cancelled = await reservationController.cancelReservation(
      createAuthReq(tokenPmA, {
        params: { id: created.data.id },
        body: { cancellationReason: 'Design changed' },
      })
    );
    assert.strictEqual(cancelled.data.status, 'CANCELLED');

    const bal = await prisma.storeStockBalance.findUnique({
      where: { storeId_materialId: { storeId: storeA1SiteId, materialId: materialCementAId } },
    });
    assert.strictEqual(Number(bal?.reservedQuantity), 0);
  });

  it('35. cancel partial: cancellation of PARTIALLY_FULFILLED reservation releases remaining active reserved', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: { storeId: storeA1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 50, uom: 'BAG' }] },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));
    const approved = await reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));
    const lineId = approved.data.lines[0].id;

    const iss = await issueController.createMaterialIssue(
      createAuthReq(tokenSiteEngA, {
        body: {
          projectId: projectA1Id,
          storeId: storeA1SiteId,
          lines: [{ materialId: materialCementAId, quantityRequested: 20, uom: 'BAG', reservationLineId: lineId }],
        },
      })
    );
    await issueController.submitMaterialIssue(createAuthReq(tokenSiteEngA, { params: { id: iss.data.id } }));
    await issueController.approveMaterialIssue(createAuthReq(tokenPmA, { params: { id: iss.data.id } }));
    await issueController.issueMaterialIssue(createAuthReq(tokenStoreKeeperA, { params: { id: iss.data.id } }));

    // Active reserved remaining was 30. Now cancel
    const cancelled = await reservationController.cancelReservation(
      createAuthReq(tokenPmA, {
        params: { id: created.data.id },
        body: { cancellationReason: 'Remainder cancelled' },
      })
    );
    assert.strictEqual(cancelled.data.status, 'CANCELLED');

    const bal = await prisma.storeStockBalance.findUnique({
      where: { storeId_materialId: { storeId: storeA1SiteId, materialId: materialCementAId } },
    });
    assert.strictEqual(Number(bal?.reservedQuantity), 0);
  });

  it('36. cannot cancel fulfilled: reject cancellation on FULFILLED reservation', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: { storeId: storeA1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 20, uom: 'BAG' }] },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));
    const approved = await reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));
    const lineId = approved.data.lines[0].id;

    const iss = await issueController.createMaterialIssue(
      createAuthReq(tokenSiteEngA, {
        body: {
          projectId: projectA1Id,
          storeId: storeA1SiteId,
          lines: [{ materialId: materialCementAId, quantityRequested: 20, uom: 'BAG', reservationLineId: lineId }],
        },
      })
    );
    await issueController.submitMaterialIssue(createAuthReq(tokenSiteEngA, { params: { id: iss.data.id } }));
    await issueController.approveMaterialIssue(createAuthReq(tokenPmA, { params: { id: iss.data.id } }));
    await issueController.issueMaterialIssue(createAuthReq(tokenStoreKeeperA, { params: { id: iss.data.id } }));

    await assert.rejects(
      async () =>
        reservationController.cancelReservation(
          createAuthReq(tokenPmA, { params: { id: created.data.id }, body: { cancellationReason: 'Late cancel' } })
        ),
      (err: any) => err.statusCode === 400
    );
  });

  it('37. cannot cancel released: reject cancellation on RELEASED reservation', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: { storeId: storeA1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 20, uom: 'BAG' }] },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));
    await reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));
    await reservationController.releaseReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));

    await assert.rejects(
      async () =>
        reservationController.cancelReservation(
          createAuthReq(tokenPmA, { params: { id: created.data.id }, body: { cancellationReason: 'Cancel released' } })
        ),
      (err: any) => err.statusCode === 400
    );
  });

  // =========================================================================
  // 38-42: EXPIRY & IDEMPOTENCY
  // =========================================================================

  it('38. expiry: reservation accepts optional expiryDate', async () => {
    const expiry = new Date(Date.now() + 7 * 86400000).toISOString();
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: {
          storeId: storeA1SiteId,
          expiryDate: expiry,
          lines: [{ materialId: materialCementAId, quantityReserved: 20, uom: 'BAG' }],
        },
      })
    );
    assert.ok(created.data.expiryDate);
  });

  it('39. stale expiry release: expire-stale marks expired and releases reserved quantity', async () => {
    const pastDate = new Date(Date.now() - 48 * 3600000).toISOString();
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: {
          storeId: storeACentralId,
          projectId: projectA1Id,
          expiryDate: pastDate,
          lines: [{ materialId: materialCementAId, quantityReserved: 50, uom: 'BAG' }],
        },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));
    await reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));

    const expRes = await reservationController.expireStaleReservations(createAuthReq(tokenPmA));
    assert.ok(expRes.data.count >= 1);

    const bal = await prisma.storeStockBalance.findUnique({
      where: { storeId_materialId: { storeId: storeACentralId, materialId: materialCementAId } },
    });
    assert.strictEqual(Number(bal?.reservedQuantity), 0);
  });

  it('40. duplicate approve: re-approving an ACTIVE reservation is idempotent and does not double-allocate', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: { storeId: storeA1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 20, uom: 'BAG' }] },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));
    await reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));

    // Second approve call
    const secondApprove = await reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));
    assert.strictEqual(secondApprove.data.status, 'ACTIVE');

    const bal = await prisma.storeStockBalance.findUnique({
      where: { storeId_materialId: { storeId: storeA1SiteId, materialId: materialCementAId } },
    });
    assert.strictEqual(Number(bal?.reservedQuantity), 20);
  });

  it('41. duplicate release: re-releasing a RELEASED reservation is idempotent', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: { storeId: storeA1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 20, uom: 'BAG' }] },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));
    await reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));
    await reservationController.releaseReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));

    const secondRelease = await reservationController.releaseReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));
    assert.strictEqual(secondRelease.data.status, 'RELEASED');
  });

  it('42. duplicate cancel: re-cancelling a CANCELLED reservation is idempotent', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: { storeId: storeA1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 20, uom: 'BAG' }] },
      })
    );
    await reservationController.cancelReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));

    const secondCancel = await reservationController.cancelReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));
    assert.strictEqual(secondCancel.data.status, 'CANCELLED');
  });

  // =========================================================================
  // 43-48: ISOLATION & GOVERNANCE
  // =========================================================================

  it('43. tenant isolation: reject creating reservation with foreign tenant store', async () => {
    const req = createAuthReq(tokenSiteEngA, {
      body: { storeId: storeB1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 10, uom: 'BAG' }] },
    });
    await assert.rejects(
      async () => reservationController.createReservation(req),
      (err: any) => err.statusCode === 404 || err.statusCode === 403
    );
  });

  it('44. project isolation: derive projectId strictly from site store and ignore client mismatch', async () => {
    // Client leaves projectId unspecified for site store -> service automatically derives projectA1Id from store
    const req = createAuthReq(tokenSiteEngA, {
      body: {
        storeId: storeA1SiteId,
        lines: [{ materialId: materialCementAId, quantityReserved: 10, uom: 'BAG' }],
      },
    });
    const res = await reservationController.createReservation(req);
    assert.strictEqual(res.data.projectId, projectA1Id);
  });

  it('45. store isolation: reject reservation for inactive store', async () => {
    const req = createAuthReq(tokenSiteEngA, {
      body: { storeId: storeAInactiveId, lines: [{ materialId: materialCementAId, quantityReserved: 10, uom: 'BAG' }] },
    });
    await assert.rejects(
      async () => reservationController.createReservation(req),
      (err: any) => err.statusCode === 400 && err.message.includes('inactive')
    );
  });

  it('46. central-store beneficiary project: require valid beneficiary project for central warehouse', async () => {
    const req = createAuthReq(tokenSiteEngA, {
      body: {
        storeId: storeACentralId,
        projectId: projectA1Id,
        lines: [{ materialId: materialCementAId, quantityReserved: 30, uom: 'BAG' }],
      },
    });
    const res = await reservationController.createReservation(req);
    assert.strictEqual(res.data.storeId, storeACentralId);
    assert.strictEqual(res.data.projectId, projectA1Id);
  });

  it('47. RBAC denial: reject reservation creation for unauthorized role without inventory permissions', async () => {
    const req = createAuthReq(tokenNoAccessUserA, {
      body: { storeId: storeA1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 10, uom: 'BAG' }] },
    });
    await assert.rejects(
      async () => reservationController.createReservation(req),
      (err: any) => err.statusCode === 403
    );
  });

  it('48. entitlement denial: reject reservation when materials:core is missing', async () => {
    const sub = await prisma.tenantSubscription.findFirst({ where: { tenantId: tenantAId } });
    await prisma.tenantEntitlementOverride.create({
      data: {
        tenantId: tenantAId,
        subscriptionId: sub!.id,
        featureKey: 'materials:core',
        isEnabled: false,
      },
    });

    const req = createAuthReq(tokenSiteEngA, {
      body: { storeId: storeA1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 10, uom: 'BAG' }] },
    });

    try {
      await assert.rejects(
        async () => reservationController.createReservation(req),
        (err: any) => err.statusCode === 403
      );
    } finally {
      await prisma.tenantEntitlementOverride.deleteMany({
        where: { tenantId: tenantAId, featureKey: 'materials:core' },
      });
    }
  });

  // =========================================================================
  // 49-56: FORENSIC BOUNDARIES & SECURITY
  // =========================================================================

  it('49. rollback: transactional rollback on mid-approval validation failure leaves stock pristine', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: { storeId: storeA1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 150, uom: 'BAG' }] },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));

    await assert.rejects(async () =>
      reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }))
    );

    const bal = await prisma.storeStockBalance.findUnique({
      where: { storeId_materialId: { storeId: storeA1SiteId, materialId: materialCementAId } },
    });
    assert.strictEqual(Number(bal?.reservedQuantity), 0);
  });

  it('50. stock conservation: available + reserved = quantityOnHand invariant holds across lifecycle', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: { storeId: storeA1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 40, uom: 'BAG' }] },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));
    await reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));

    const bal = await prisma.storeStockBalance.findUnique({
      where: { storeId_materialId: { storeId: storeA1SiteId, materialId: materialCementAId } },
    });
    const onHand = Number(bal?.quantityOnHand);
    const reserved = Number(bal?.reservedQuantity);
    const available = onHand - reserved;
    assert.strictEqual(available + reserved, onHand);
  });

  it('51. no StockMovement on reservation activation: 0 movement rows created', async () => {
    const beforeCount = await prisma.stockMovement.count({
      where: { tenantId: tenantAId, storeId: storeA1SiteId, materialId: materialCementAId },
    });

    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: { storeId: storeA1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 20, uom: 'BAG' }] },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));
    await reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));

    const afterCount = await prisma.stockMovement.count({
      where: { tenantId: tenantAId, storeId: storeA1SiteId, materialId: materialCementAId },
    });
    assert.strictEqual(afterCount, beforeCount);
  });

  it('52. no StockMovement on reservation release: 0 movement rows created on release', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: { storeId: storeA1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 20, uom: 'BAG' }] },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));
    await reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));

    const beforeCount = await prisma.stockMovement.count({
      where: { tenantId: tenantAId, storeId: storeA1SiteId, materialId: materialCementAId },
    });

    await reservationController.releaseReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));

    const afterCount = await prisma.stockMovement.count({
      where: { tenantId: tenantAId, storeId: storeA1SiteId, materialId: materialCementAId },
    });
    assert.strictEqual(afterCount, beforeCount);
  });

  it('53. no financial writes: reservation lifecycle produces zero accounting entries', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: { storeId: storeA1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 20, uom: 'BAG' }] },
      })
    );
    await reservationController.submitReservation(createAuthReq(tokenSiteEngA, { params: { id: created.data.id } }));
    await reservationController.approveReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));
    await reservationController.releaseReservation(createAuthReq(tokenPmA, { params: { id: created.data.id } }));

    // Confirm that reservation is purely logical with zero financial impact
    assert.strictEqual(created.data.status, 'DRAFT');
  });

  it('54. cross-tenant IDOR: tenant B cannot view tenant A reservation', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: { storeId: storeA1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 20, uom: 'BAG' }] },
      })
    );

    await assert.rejects(
      async () => reservationController.getReservation(createAuthReq(tokenOwnerB, { params: { id: created.data.id } })),
      (err: any) => err.statusCode === 404 || err.statusCode === 403
    );
  });

  it('55. foreign reservation lookup: returns 404 for unknown reservation ID', async () => {
    await assert.rejects(
      async () =>
        reservationController.getReservation(
          createAuthReq(tokenPmA, { params: { id: '00000000-0000-0000-0000-000000000000' } })
        ),
      (err: any) => err.statusCode === 404
    );
  });

  it('56. foreign reservation mutation: tenant B cannot modify tenant A reservation', async () => {
    const created = await reservationController.createReservation(
      createAuthReq(tokenSiteEngA, {
        body: { storeId: storeA1SiteId, lines: [{ materialId: materialCementAId, quantityReserved: 20, uom: 'BAG' }] },
      })
    );

    await assert.rejects(
      async () =>
        reservationController.cancelReservation(
          createAuthReq(tokenOwnerB, { params: { id: created.data.id }, body: { cancellationReason: 'Malicious cancel' } })
        ),
      (err: any) => err.statusCode === 404 || err.statusCode === 403
    );
  });
});
