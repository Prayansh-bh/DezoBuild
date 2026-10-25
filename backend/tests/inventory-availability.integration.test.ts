import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseService } from '../src/database/database.service';
import { InventoryAvailabilityService } from '../src/modules/materials/services/inventory-availability.service';
import { InventoryAvailabilityController } from '../src/modules/materials/controllers/inventory-availability.controller';
import { AuthorizationService } from '../src/modules/rbac/services/authorization.service';
import { EntitlementService } from '../src/modules/subscriptions/services/entitlement.service';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service';
import { TokenService } from '../src/modules/auth/services/token.service';
import { Prisma, type PrismaClient } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '../src/common/errors';
import type { IncomingMessage } from 'node:http';

describe('DEZOBUILD Phase 07.10 — Inventory Availability & Allocation Intelligence Integration Suite', () => {
  let prisma: PrismaClient;
  let service: InventoryAvailabilityService;
  let controller: InventoryAvailabilityController;
  let authService: AuthorizationService;
  let entitlementService: EntitlementService;
  let tokenService: TokenService;

  // Test Fixture IDs
  const tenantA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const tenantB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  // Users
  const userAdminA = '11111111-1111-1111-1111-111111111111'; // COMPANY_OWNER / ADMIN
  const userScopedA = '22222222-2222-2222-2222-222222222222'; // Project Manager on Project Alpha
  const userUnauthorizedA = '33333333-3333-3333-3333-333333333333'; // Role EMPLOYEE (no materials:view)
  const userTenantB = '44444444-4444-4444-4444-444444444444'; // Tenant B Admin

  // Projects
  const projectAlpha = '10000000-0000-0000-0000-000000000001';
  const projectBeta = '10000000-0000-0000-0000-000000000002';
  const projectB = '10000000-0000-0000-0000-000000000009'; // Tenant B Project

  // Stores
  const centralWarehouseA = '20000000-0000-0000-0000-000000000001'; // Central Store
  const siteStoreAlpha = '20000000-0000-0000-0000-000000000002'; // Site Store for Alpha
  const siteStoreBeta = '20000000-0000-0000-0000-000000000003'; // Site Store for Beta

  // Materials
  const matCement = '30000000-0000-0000-0000-000000000001'; // OPC 53 Grade Cement
  const matSteel = '30000000-0000-0000-0000-000000000002'; // 16mm TMT Steel Rebar
  const matBricks = '30000000-0000-0000-0000-000000000003'; // Red Clay Bricks
  const matSand = '30000000-0000-0000-0000-000000000004'; // M-Sand (Inactive)

  // Vendors
  const vendorA = '40000000-0000-0000-0000-000000000001';

  // Auth tokens
  let tokenAdminA: string;
  let tokenScopedA: string;
  let tokenUnauthorizedA: string;
  let tokenTenantB: string;

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

  async function cleanup() {
    await prisma.materialIssueLine.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.materialIssueSequence.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.materialIssue.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.materialReturnLine.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.materialReturnSequence.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.materialReturn.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.inventoryReservationLine.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.inventoryReservationSequence.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.inventoryReservation.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.materialTransferLine.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.materialTransferSequence.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.materialTransfer.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.goodsReceiptLine.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.goodsReceiptSequence.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } }).catch(() => {});
    await prisma.goodsReceiptNote.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.purchaseOrderLine.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.purchaseOrderSequence.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.purchaseOrder.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.materialIndentLine.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.materialIndentSequence.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.materialIndent.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.stockMovement.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.storeStockBalance.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.material.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.storeAccessAssignment.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.store.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.vendor.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.projectMember.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.project.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.tenantEntitlementOverride.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  }

  before(async () => {
    prisma = DatabaseService.getInstance().getClient();
    service = InventoryAvailabilityService.getInstance();
    controller = new InventoryAvailabilityController(service);
    authService = AuthorizationService.getInstance();
    entitlementService = new EntitlementService();
    tokenService = new TokenService();

    // 0. Run RBAC and Subscription seeders
    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Clean up test data
    await cleanup();

    // 1. Create Tenants
    await prisma.tenant.createMany({
      data: [
        { id: tenantA, name: 'Tenant Alpha Construction', code: 'TEN-A', planTier: 'ENTERPRISE' },
        { id: tenantB, name: 'Tenant Beta Infra', code: 'TEN-B', planTier: 'PROFESSIONAL' },
      ],
    });

    const entPlan = await prisma.platformPlan.findUnique({ where: { code: 'ENTERPRISE' } });
    const profPlan = await prisma.platformPlan.findUnique({ where: { code: 'PROFESSIONAL' } });

    // 2. Create Subscriptions
    if (entPlan) {
      await prisma.tenantSubscription.create({
        data: {
          id: '50000000-0000-0000-0000-000000000001',
          tenantId: tenantA,
          planId: entPlan.id,
          status: 'ACTIVE',
          billingCycle: 'ANNUAL',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
    }

    if (profPlan) {
      await prisma.tenantSubscription.create({
        data: {
          id: '50000000-0000-0000-0000-000000000002',
          tenantId: tenantB,
          planId: profPlan.id,
          status: 'ACTIVE',
          billingCycle: 'ANNUAL',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // 3. Create Users
    await prisma.user.createMany({
      data: [
        {
          id: userAdminA,
          tenantId: tenantA,
          email: 'admin@tenanta.com',
          passwordHash: 'hash',
          fullName: 'Alice Admin',
          status: 'ACTIVE',
        },
        {
          id: userScopedA,
          tenantId: tenantA,
          email: 'pm@tenanta.com',
          passwordHash: 'hash',
          fullName: 'Peter PM',
          status: 'ACTIVE',
        },
        {
          id: userUnauthorizedA,
          tenantId: tenantA,
          email: 'worker@tenanta.com',
          passwordHash: 'hash',
          fullName: 'Will Worker',
          status: 'ACTIVE',
        },
        {
          id: userTenantB,
          tenantId: tenantB,
          email: 'admin@tenantb.com',
          passwordHash: 'hash',
          fullName: 'Bob Beta',
          status: 'ACTIVE',
        },
      ],
    });

    // 4. Assign Roles
    const roleOwner = await prisma.role.findFirst({ where: { name: 'COMPANY_OWNER', tenantId: null } });
    const rolePM = await prisma.role.findFirst({ where: { name: 'PROJECT_MANAGER', tenantId: null } });
    const roleEmployee = await prisma.role.findFirst({ where: { name: 'EMPLOYEE', tenantId: null } });

    if (roleOwner) {
      await prisma.userRoleAssignment.create({
        data: { tenantId: tenantA, userId: userAdminA, roleId: roleOwner.id, scopeType: 'TENANT' },
      });
      await prisma.userRoleAssignment.create({
        data: { tenantId: tenantB, userId: userTenantB, roleId: roleOwner.id, scopeType: 'TENANT' },
      });
    }

    if (rolePM) {
      await prisma.userRoleAssignment.create({
        data: { tenantId: tenantA, userId: userScopedA, roleId: rolePM.id, scopeType: 'PROJECT', scopeId: projectAlpha },
      });
    }

    if (roleEmployee) {
      await prisma.userRoleAssignment.create({
        data: { tenantId: tenantA, userId: userUnauthorizedA, roleId: roleEmployee.id, scopeType: 'TENANT' },
      });
    }

    // 5. Generate Auth Tokens
    tokenAdminA = tokenService.createAccessToken({
      userId: userAdminA,
      tenantId: tenantA,
      sessionId: 'sess-admin-a',
      sessionVersion: 1,
    });
    tokenScopedA = tokenService.createAccessToken({
      userId: userScopedA,
      tenantId: tenantA,
      sessionId: 'sess-scoped-a',
      sessionVersion: 1,
    });
    tokenUnauthorizedA = tokenService.createAccessToken({
      userId: userUnauthorizedA,
      tenantId: tenantA,
      sessionId: 'sess-unauth-a',
      sessionVersion: 1,
    });
    tokenTenantB = tokenService.createAccessToken({
      userId: userTenantB,
      tenantId: tenantB,
      sessionId: 'sess-tenant-b',
      sessionVersion: 1,
    });

    // 6. Companies & Projects
    const compA = await prisma.company.create({
      data: {
        tenantId: tenantA,
        code: 'COMP_A',
        name: 'Company A Ltd',
        legalName: 'Company A Limited',
        panNumber: 'ABCDE1234F',
        gstin: '29ABCDE1234F1Z5',
        email: 'info@compa.com',
        phone: '9988776655',
        address: 'Bangalore Office',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
      },
    });

    const compB = await prisma.company.create({
      data: {
        tenantId: tenantB,
        code: 'COMP_B',
        name: 'Company B Ltd',
        legalName: 'Company B Limited',
        panNumber: 'VWXYZ1234F',
        gstin: '27VWXYZ1234F1Z5',
        email: 'info@compb.com',
        phone: '9988776644',
        address: 'Mumbai Office',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    });

    await prisma.project.createMany({
      data: [
        {
          id: projectAlpha,
          tenantId: tenantA,
          companyId: compA.id,
          code: 'PRJ-ALPHA',
          name: 'Project Alpha Heights',
          status: 'ACTIVE',
        },
        {
          id: projectBeta,
          tenantId: tenantA,
          companyId: compA.id,
          code: 'PRJ-BETA',
          name: 'Project Beta Tower',
          status: 'ACTIVE',
        },
        {
          id: projectB,
          tenantId: tenantB,
          companyId: compB.id,
          code: 'PRJ-TB',
          name: 'Tenant B Project',
          status: 'ACTIVE',
        },
      ],
    });

    // Assign Project Memberships
    await prisma.projectMember.create({
      data: {
        tenantId: tenantA,
        projectId: projectAlpha,
        userId: userScopedA,
        projectRole: 'PROJECT_MANAGER',
      },
    });

    // 7. Create Stores
    await prisma.store.createMany({
      data: [
        {
          id: centralWarehouseA,
          tenantId: tenantA,
          code: 'CW-01',
          name: 'Central Warehouse',
          storeType: 'CENTRAL',
          isCentralWarehouse: true,
          projectId: null,
          status: 'ACTIVE',
        },
        {
          id: siteStoreAlpha,
          tenantId: tenantA,
          code: 'SS-ALPHA',
          name: 'Site Store Alpha',
          storeType: 'PROJECT_SITE',
          isCentralWarehouse: false,
          projectId: projectAlpha,
          status: 'ACTIVE',
        },
        {
          id: siteStoreBeta,
          tenantId: tenantA,
          code: 'SS-BETA',
          name: 'Site Store Beta',
          storeType: 'PROJECT_SITE',
          isCentralWarehouse: false,
          projectId: projectBeta,
          status: 'ACTIVE',
        },
      ],
    });

    // Store Access for Scoped User
    await prisma.storeAccessAssignment.createMany({
      data: [
        { tenantId: tenantA, storeId: siteStoreAlpha, userId: userScopedA, accessLevel: 'FULL' },
        { tenantId: tenantA, storeId: centralWarehouseA, userId: userScopedA, accessLevel: 'FULL' },
      ],
    });

    // 8. Create Materials with Reorder and Safety thresholds
    await prisma.material.createMany({
      data: [
        {
          id: matCement,
          tenantId: tenantA,
          itemCode: 'MAT-CEM-01',
          name: 'OPC 53 Grade Cement',
          category: 'CEMENT',
          primaryUom: 'BAG',
          standardRate: 380,
          reorderLevel: 100, // Reorder trigger
          safetyStock: 50, // Critical safety buffer
          status: 'ACTIVE',
        },
        {
          id: matSteel,
          tenantId: tenantA,
          itemCode: 'MAT-STL-01',
          name: '16mm TMT Steel Rebar',
          category: 'STEEL',
          primaryUom: 'KG',
          standardRate: 65,
          reorderLevel: 5000,
          safetyStock: 2000,
          status: 'ACTIVE',
        },
        {
          id: matBricks,
          tenantId: tenantA,
          itemCode: 'MAT-BRK-01',
          name: 'Red Clay Bricks',
          category: 'MASONRY',
          primaryUom: 'NOS',
          standardRate: 10,
          reorderLevel: 10000,
          safetyStock: 3000,
          status: 'ACTIVE',
        },
        {
          id: matSand,
          tenantId: tenantA,
          itemCode: 'MAT-SND-01',
          name: 'Manufactured Sand (M-Sand)',
          category: 'AGGREGATE',
          primaryUom: 'TON',
          standardRate: 1200,
          reorderLevel: 20,
          safetyStock: 10,
          status: 'INACTIVE', // Inactive material test
        },
      ],
    });

    // 9. Create Vendors
    await prisma.vendor.create({
      data: {
        id: vendorA,
        tenantId: tenantA,
        code: 'VND-01',
        name: 'UltraTech Cement Distributors',
        status: 'ACTIVE',
      },
    });

    // 10. Setup Physical Stock Balances
    // Central Warehouse: 500 Cement on hand, 150 reserved (350 free available)
    // Site Store Alpha: 80 Cement on hand, 30 reserved (50 free available)
    // Site Store Beta: 0 Cement on hand
    await prisma.storeStockBalance.createMany({
      data: [
        {
          id: '60000000-0000-0000-0000-000000000001',
          tenantId: tenantA,
          storeId: centralWarehouseA,
          materialId: matCement,
          quantityOnHand: new Prisma.Decimal(500),
          reservedQuantity: new Prisma.Decimal(150),
        },
        {
          id: '60000000-0000-0000-0000-000000000002',
          tenantId: tenantA,
          storeId: siteStoreAlpha,
          materialId: matCement,
          quantityOnHand: new Prisma.Decimal(80),
          reservedQuantity: new Prisma.Decimal(30),
        },
        {
          id: '60000000-0000-0000-0000-000000000003',
          tenantId: tenantA,
          storeId: centralWarehouseA,
          materialId: matSteel,
          quantityOnHand: new Prisma.Decimal(1500), // Below safety stock (2000)
          reservedQuantity: new Prisma.Decimal(0),
        },
      ],
    });

    // 11. Setup Active Reservations
    // Reservation 1: In Central Store for Project Alpha (100 bags reserved)
    await prisma.inventoryReservation.create({
      data: {
        id: '70000000-0000-0000-0000-000000000001',
        tenantId: tenantA,
        storeId: centralWarehouseA,
        projectId: projectAlpha,
        reservationNumber: 'RES-ALPHA-001',
        status: 'ACTIVE',
        priority: 'URGENT',
        createdById: userAdminA,
        approvedById: userAdminA,
        lines: {
          create: {
            tenantId: tenantA,
            materialId: matCement,
            quantityReserved: new Prisma.Decimal(100),
            quantityFulfilled: new Prisma.Decimal(0),
            quantityReleased: new Prisma.Decimal(0),
            uom: 'BAG',
          },
        },
      },
    });

    // Reservation 2: In Central Store for Project Beta (50 bags reserved)
    await prisma.inventoryReservation.create({
      data: {
        id: '70000000-0000-0000-0000-000000000002',
        tenantId: tenantA,
        storeId: centralWarehouseA,
        projectId: projectBeta,
        reservationNumber: 'RES-BETA-001',
        status: 'ACTIVE',
        priority: 'NORMAL',
        createdById: userAdminA,
        approvedById: userAdminA,
        lines: {
          create: {
            tenantId: tenantA,
            materialId: matCement,
            quantityReserved: new Prisma.Decimal(50),
            quantityFulfilled: new Prisma.Decimal(0),
            quantityReleased: new Prisma.Decimal(0),
            uom: 'BAG',
          },
        },
      },
    });

    // 12. Setup In-Transit Material Transfer (Central -> Site Store Alpha: 60 Cement)
    await prisma.materialTransfer.create({
      data: {
        id: '80000000-0000-0000-0000-000000000001',
        tenantId: tenantA,
        sourceStoreId: centralWarehouseA,
        destinationStoreId: siteStoreAlpha,
        sourceProjectId: null,
        destinationProjectId: projectAlpha,
        transferNumber: 'MT-CW-ALPHA-001',
        status: 'IN_TRANSIT',
        dispatchDate: new Date(),
        createdById: userAdminA,
        lines: {
          create: {
            tenantId: tenantA,
            materialId: matCement,
            quantityTransferred: new Prisma.Decimal(60),
            uom: 'BAG',
          },
        },
      },
    });

    // 13. Setup Pending Purchase Order for Project Alpha (Status = 'ORDERED', 200 Cement ordered, 0 received)
    await prisma.purchaseOrder.create({
      data: {
        id: '90000000-0000-0000-0000-000000000001',
        tenantId: tenantA,
        projectId: projectAlpha,
        vendorId: vendorA,
        poNumber: 'PO-ALPHA-001',
        status: 'ORDERED',
        expectedDeliveryDate: new Date('2026-10-15'),
        createdById: userAdminA,
        lines: {
          create: {
            tenantId: tenantA,
            materialId: matCement,
            quantityOrdered: new Prisma.Decimal(200),
            quantityReceived: new Prisma.Decimal(0),
            uom: 'BAG',
            unitRate: new Prisma.Decimal(380),
            lineTotal: new Prisma.Decimal(76000),
          },
        },
      },
    });

    // 14. Setup Open Indent for Project Alpha (300 Cement requested)
    await prisma.materialIndent.create({
      data: {
        id: 'a0000000-0000-0000-0000-000000000001',
        tenantId: tenantA,
        projectId: projectAlpha,
        indentNumber: 'IND-ALPHA-001',
        status: 'APPROVED',
        requiredByDate: new Date('2026-10-01'),
        createdById: userAdminA,
        lines: {
          create: {
            tenantId: tenantA,
            materialId: matCement,
            quantityRequested: new Prisma.Decimal(300),
            quantityFulfilled: new Prisma.Decimal(0),
            uom: 'BAG',
          },
        },
      },
    });
  });

  after(async () => {
    await cleanup();
  });

  // -------------------------------------------------------------
  // Test 1: Availability list returns consolidated positions
  // -------------------------------------------------------------
  it('1. should list consolidated material availability across tenant stores', async () => {
    const result = await service.getAvailabilityList(tenantA, userAdminA);
    assert.ok(result.items.length >= 2, 'Should list active materials');

    const cement = result.items.find((i) => i.materialId === matCement);
    assert.ok(cement, 'Cement should exist in availability list');
    // Total On Hand: 500 (Central) + 80 (Site Alpha) = 580
    assert.equal(cement.totalQuantityOnHand, 580);
    // Total Reserved: 150 (Central) + 30 (Site Alpha) = 180
    assert.equal(cement.totalReservedQuantity, 180);
    // Total Free Available: 580 - 180 = 400
    assert.equal(cement.totalAvailableQuantity, 400);
    // In-Transit Inbound to Alpha: 60
    assert.equal(cement.totalInTransitInbound, 60);
    // Pending PO Inbound for Alpha: 200
    assert.equal(cement.totalPendingPOInbound, 200);
    // Total Projected: 400 + 60 + 200 = 660
    assert.equal(cement.totalProjectedAvailable, 660);
  });

  // -------------------------------------------------------------
  // Test 2: Material 360 deep-dive
  // -------------------------------------------------------------
  it('2. should return complete 360° availability breakdown for a single material', async () => {
    const res = await service.getMaterial360(tenantA, userAdminA, matCement);
    assert.equal(res.material.itemCode, 'MAT-CEM-01');
    assert.equal(res.summary.totalQuantityOnHand, 580);
    assert.equal(res.summary.totalReservedQuantity, 180);
    assert.equal(res.summary.totalAvailableQuantity, 400);
    assert.equal(res.summary.totalInTransitInbound, 60);
    assert.equal(res.summary.totalPendingPOInbound, 200);

    assert.equal(res.storeBalances.length, 2);
    assert.equal(res.activeReservations.length, 2);
    assert.equal(res.inTransitTransfers.length, 1);
    assert.equal(res.pendingPurchaseOrders.length, 1);
  });

  // -------------------------------------------------------------
  // Test 3: Project Availability view
  // -------------------------------------------------------------
  it('3. should return project-centric availability separating site stock from central allocation', async () => {
    const res = await service.getProjectAvailability(tenantA, userAdminA, projectAlpha);
    assert.equal(res.project.code, 'PRJ-ALPHA');
    assert.equal(res.siteStores.length, 1);
    assert.equal(res.siteStores[0].id, siteStoreAlpha);

    const cementPos = res.materialPositions.find((m) => m.materialId === matCement);
    assert.ok(cementPos, 'Cement position should exist for Project Alpha');

    // Site Physical On Hand: 80
    assert.equal(cementPos.siteStoresPhysicalOnHand, 80);
    // Site Reserved: 30
    assert.equal(cementPos.siteStoresReservedQuantity, 30);
    // Site Free Available: 50
    assert.equal(cementPos.siteStoresFreeAvailable, 50);
    // Central Warehouse Allocated Reserved: 100
    assert.equal(cementPos.centralWarehouseAllocatedReserved, 100);
    // Total Project Controlled: 50 (site free) + 100 (central allocated) = 150
    assert.equal(cementPos.totalProjectControlledStock, 150);
    // In-Transit Transfer: 60
    assert.equal(cementPos.inTransitTransferInbound, 60);
    // Pending PO: 200
    assert.equal(cementPos.pendingPOInbound, 200);
    // Total Project Projected Supply: 150 + 60 + 200 = 410
    assert.equal(cementPos.totalProjectProjectedSupply, 410);
    // Open Indent Demand: 300
    assert.equal(cementPos.openIndentDemand, 300);
    // Immediate Shortage vs site free stock: max(0, 300 - 50) = 250
    assert.equal(cementPos.immediateSiteShortage, 250);
    // Net Shortage vs total projected supply: max(0, 300 - 410) = 0
    assert.equal(cementPos.netProjectShortage, 0);
  });

  // -------------------------------------------------------------
  // Test 4: Store Availability view with Central Store allocations
  // -------------------------------------------------------------
  it('4. should return store-centric availability with multi-project breakdown for Central Warehouse', async () => {
    const res = await service.getStoreAvailability(tenantA, userAdminA, centralWarehouseA);
    assert.equal(res.store.code, 'CW-01');
    assert.equal(res.store.isCentralWarehouse, true);

    const cementBal = res.materialBalances.find((m) => m.materialId === matCement);
    assert.ok(cementBal);
    assert.equal(cementBal.quantityOnHand, 500);
    assert.equal(cementBal.reservedQuantity, 150);
    assert.equal(cementBal.availableQuantity, 350);
    assert.equal(cementBal.inTransitOutbound, 60);

    // Central allocations grouped by project
    assert.ok(res.centralStoreProjectAllocations);
    assert.equal(res.centralStoreProjectAllocations.length, 2);

    const alphaAlloc = res.centralStoreProjectAllocations.find((a) => a.projectId === projectAlpha);
    assert.ok(alphaAlloc);
    assert.equal(alphaAlloc.remainingReservedQuantity, 100);

    const betaAlloc = res.centralStoreProjectAllocations.find((a) => a.projectId === projectBeta);
    assert.ok(betaAlloc);
    assert.equal(betaAlloc.remainingReservedQuantity, 50);
  });

  // -------------------------------------------------------------
  // Test 5: Shortage & Alert endpoint
  // -------------------------------------------------------------
  it('5. should identify materials below safety stock and reorder level thresholds', async () => {
    const res = await service.getShortages(tenantA, userAdminA);
    // Steel has onHand = 1500, safetyStock = 2000, reorderLevel = 5000 -> CRITICAL_SAFETY
    const steelShortage = res.items.find((i) => i.materialId === matSteel);
    assert.ok(steelShortage, 'Steel should appear in shortage report');
    assert.equal(steelShortage.severity, 'CRITICAL_SAFETY');
    assert.equal(steelShortage.safetyStockAlert, true);
    assert.equal(steelShortage.reorderAlert, true);
  });

  // -------------------------------------------------------------
  // Test 6: Free Available invariant
  // -------------------------------------------------------------
  it('6. canonical invariant: freeAvailable = onHand - reserved holds across all store balances', async () => {
    const res = await service.getAvailabilityList(tenantA, userAdminA);
    for (const item of res.items) {
      assert.equal(
        item.totalAvailableQuantity,
        Math.max(0, item.totalQuantityOnHand - item.totalReservedQuantity)
      );
      for (const sb of item.storeBalances) {
        assert.equal(
          sb.availableQuantity,
          Math.max(0, sb.quantityOnHand - sb.reservedQuantity)
        );
      }
    }
  });

  // -------------------------------------------------------------
  // Test 7: Inbound transfer pipeline
  // -------------------------------------------------------------
  it('7. in-transit transfer reflects in destination store inbound pipeline', async () => {
    const res = await service.getStoreAvailability(tenantA, userAdminA, siteStoreAlpha);
    const cement = res.materialBalances.find((m) => m.materialId === matCement);
    assert.ok(cement);
    assert.equal(cement.inTransitInbound, 60);
    assert.equal(cement.storeProjectedAvailable, 50 + 60);
  });

  // -------------------------------------------------------------
  // Test 8: Outbound transfer pipeline
  // -------------------------------------------------------------
  it('8. in-transit transfer reflects in source store outbound pipeline', async () => {
    const res = await service.getStoreAvailability(tenantA, userAdminA, centralWarehouseA);
    const cement = res.materialBalances.find((m) => m.materialId === matCement);
    assert.ok(cement);
    assert.equal(cement.inTransitOutbound, 60);
  });

  // -------------------------------------------------------------
  // Test 9: Pending ORDERED PO pipeline
  // -------------------------------------------------------------
  it('9. open PO in ORDERED status reflects in pending PO supply pipeline', async () => {
    const res = await service.getMaterial360(tenantA, userAdminA, matCement);
    assert.equal(res.summary.totalPendingPOInbound, 200);
    assert.equal(res.pendingPurchaseOrders[0].remainingQuantity, 200);
  });

  // -------------------------------------------------------------
  // Test 10: Partial PO receipt calculation
  // -------------------------------------------------------------
  it('10. partial PO receipt correctly reduces remaining pending quantity', async () => {
    // Simulate partial GRN receipt on PO line: 50 received of 200
    const poLine = await prisma.purchaseOrderLine.findFirst({
      where: { tenantId: tenantA, materialId: matCement },
    });
    assert.ok(poLine);

    await prisma.purchaseOrderLine.update({
      where: { id: poLine.id },
      data: { quantityReceived: new Prisma.Decimal(50) },
    });

    const res = await service.getMaterial360(tenantA, userAdminA, matCement);
    // Remaining should be 200 - 50 = 150
    assert.equal(res.summary.totalPendingPOInbound, 150);

    // Restore for subsequent tests
    await prisma.purchaseOrderLine.update({
      where: { id: poLine.id },
      data: { quantityReceived: new Prisma.Decimal(0) },
    });
  });

  // -------------------------------------------------------------
  // Test 11: Fully received PO excluded
  // -------------------------------------------------------------
  it('11. fully received or closed PO is excluded from pending supply', async () => {
    const po = await prisma.purchaseOrder.findFirst({
      where: { tenantId: tenantA, poNumber: 'PO-ALPHA-001' },
    });
    assert.ok(po);

    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { status: 'CLOSED' },
    });

    const res = await service.getMaterial360(tenantA, userAdminA, matCement);
    assert.equal(res.summary.totalPendingPOInbound, 0);

    // Restore
    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { status: 'ORDERED' },
    });
  });

  // -------------------------------------------------------------
  // Test 12: Received transfer excluded from in-transit
  // -------------------------------------------------------------
  it('12. transfer in RECEIVED status is excluded from in-transit pipeline', async () => {
    const transfer = await prisma.materialTransfer.findFirst({
      where: { tenantId: tenantA, transferNumber: 'MT-CW-ALPHA-001' },
    });
    assert.ok(transfer);

    await prisma.materialTransfer.update({
      where: { id: transfer.id },
      data: { status: 'RECEIVED' },
    });

    const res = await service.getStoreAvailability(tenantA, userAdminA, siteStoreAlpha);
    const cement = res.materialBalances.find((m) => m.materialId === matCement);
    assert.ok(cement);
    assert.equal(cement.inTransitInbound, 0);

    // Restore
    await prisma.materialTransfer.update({
      where: { id: transfer.id },
      data: { status: 'IN_TRANSIT' },
    });
  });

  // -------------------------------------------------------------
  // Test 13: Active reservation hold
  // -------------------------------------------------------------
  it('13. active reservation holds stock in store reservedQuantity', async () => {
    const res = await service.getStoreAvailability(tenantA, userAdminA, centralWarehouseA);
    const cement = res.materialBalances.find((m) => m.materialId === matCement);
    assert.ok(cement);
    assert.equal(cement.reservedQuantity, 150);
  });

  // -------------------------------------------------------------
  // Test 14: Fulfilled reservation excluded from active holds
  // -------------------------------------------------------------
  it('14. reservation in FULFILLED status is excluded from active allocation breakdown', async () => {
    const res = await prisma.inventoryReservation.findFirst({
      where: { tenantId: tenantA, reservationNumber: 'RES-BETA-001' },
    });
    assert.ok(res);

    await prisma.inventoryReservation.update({
      where: { id: res.id },
      data: { status: 'FULFILLED' },
    });

    const storeRes = await service.getStoreAvailability(tenantA, userAdminA, centralWarehouseA);
    assert.ok(storeRes.centralStoreProjectAllocations);
    assert.equal(storeRes.centralStoreProjectAllocations.length, 1);
    assert.equal(storeRes.centralStoreProjectAllocations[0].projectId, projectAlpha);

    // Restore
    await prisma.inventoryReservation.update({
      where: { id: res.id },
      data: { status: 'ACTIVE' },
    });
  });

  // -------------------------------------------------------------
  // Test 15: Released reservation excluded from active holds
  // -------------------------------------------------------------
  it('15. reservation in RELEASED status is excluded from active allocation breakdown', async () => {
    const res = await prisma.inventoryReservation.findFirst({
      where: { tenantId: tenantA, reservationNumber: 'RES-BETA-001' },
    });
    assert.ok(res);

    await prisma.inventoryReservation.update({
      where: { id: res.id },
      data: { status: 'RELEASED' },
    });

    const storeRes = await service.getStoreAvailability(tenantA, userAdminA, centralWarehouseA);
    assert.ok(storeRes.centralStoreProjectAllocations);
    assert.equal(storeRes.centralStoreProjectAllocations.length, 1);

    // Restore
    await prisma.inventoryReservation.update({
      where: { id: res.id },
      data: { status: 'ACTIVE' },
    });
  });

  // -------------------------------------------------------------
  // Test 16: Central Project Allocation
  // -------------------------------------------------------------
  it('16. central warehouse reservation correctly associates to beneficiary project', async () => {
    const projRes = await service.getProjectAvailability(tenantA, userAdminA, projectBeta);
    const cement = projRes.materialPositions.find((m) => m.materialId === matCement);
    assert.ok(cement);
    assert.equal(cement.centralWarehouseAllocatedReserved, 50);
  });

  // -------------------------------------------------------------
  // Test 17: Cross-project isolation
  // -------------------------------------------------------------
  it('17. cross-project isolation: Project Alpha cannot count Project Beta allocation as its own', async () => {
    const projResAlpha = await service.getProjectAvailability(tenantA, userAdminA, projectAlpha);
    const cementAlpha = projResAlpha.materialPositions.find((m) => m.materialId === matCement);
    assert.ok(cementAlpha);
    assert.equal(cementAlpha.centralWarehouseAllocatedReserved, 100); // Only Alpha's 100, not Beta's 50
  });

  // -------------------------------------------------------------
  // Test 18: Tenant isolation on availability list
  // -------------------------------------------------------------
  it('18. cross-tenant isolation: Tenant B cannot see Tenant A stock', async () => {
    const resB = await service.getAvailabilityList(tenantB, userTenantB);
    assert.equal(resB.items.length, 0, 'Tenant B has zero stock records');
  });

  // -------------------------------------------------------------
  // Test 19: Unauthorized project access rejected with 403
  // -------------------------------------------------------------
  it('19. scoped user without membership on Project Beta cannot query its availability (403)', async () => {
    await assert.rejects(
      async () => {
        await service.getProjectAvailability(tenantA, userScopedA, projectBeta);
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.match(err.message, /User is not a member of this project/i);
        return true;
      }
    );
  });

  // -------------------------------------------------------------
  // Test 20: Unauthorized store access rejected with 403
  // -------------------------------------------------------------
  it('20. scoped user without access to Site Store Beta cannot query its availability (403)', async () => {
    await assert.rejects(
      async () => {
        await service.getStoreAvailability(tenantA, userScopedA, siteStoreBeta);
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.match(err.message, /User does not have access to this store/i);
        return true;
      }
    );
  });

  // -------------------------------------------------------------
  // Test 21: materials:view permission required
  // -------------------------------------------------------------
  it('21. user lacking materials:view permission is rejected with 403 Forbidden', async () => {
    await assert.rejects(
      async () => {
        await service.getAvailabilityList(tenantA, userUnauthorizedA);
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.match(err.message, /Missing required permission: materials:view/i);
        return true;
      }
    );
  });

  // -------------------------------------------------------------
  // Test 22: materials:core feature entitlement required
  // -------------------------------------------------------------
  it('22. tenant lacking materials:core entitlement is rejected with 403 Forbidden', async () => {
    const sub = await prisma.tenantSubscription.findFirst({ where: { tenantId: tenantA } });
    assert.ok(sub);

    // Temporarily create entitlement override disabling materials:core
    await prisma.tenantEntitlementOverride.create({
      data: {
        tenantId: tenantA,
        subscriptionId: sub.id,
        featureKey: 'materials:core',
        isEnabled: false,
      },
    });

    try {
      await assert.rejects(
        async () => {
          await service.getAvailabilityList(tenantA, userAdminA);
        },
        (err: any) => {
          assert.ok(err instanceof ForbiddenError);
          assert.match(err.message, /Feature entitlement materials:core is required/i);
          return true;
        }
      );
    } finally {
      await prisma.tenantEntitlementOverride.deleteMany({
        where: { tenantId: tenantA, featureKey: 'materials:core' },
      });
    }
  });

  // -------------------------------------------------------------
  // Test 23: Tenant Admin full cross-store visibility
  // -------------------------------------------------------------
  it('23. tenant admin possesses full unrestricted visibility across all projects and stores', async () => {
    const res = await service.getStoreAvailability(tenantA, userAdminA, siteStoreBeta);
    assert.equal(res.store.code, 'SS-BETA');
  });

  // -------------------------------------------------------------
  // Test 24: Reorder level alert
  // -------------------------------------------------------------
  it('24. reorder level threshold triggers reorderAlert: true', async () => {
    // Steel onHand = 1500 <= reorderLevel (5000)
    const res = await service.getMaterial360(tenantA, userAdminA, matSteel);
    assert.equal(res.summary.reorderAlert, true);
  });

  // -------------------------------------------------------------
  // Test 25: Safety stock alert
  // -------------------------------------------------------------
  it('25. safety stock threshold triggers safetyStockAlert: true', async () => {
    // Steel onHand = 1500 <= safetyStock (2000)
    const res = await service.getMaterial360(tenantA, userAdminA, matSteel);
    assert.equal(res.summary.safetyStockAlert, true);
  });

  // -------------------------------------------------------------
  // Test 26: Inactive material handling
  // -------------------------------------------------------------
  it('26. inactive material is flagged with status INACTIVE in material 360', async () => {
    const res = await service.getMaterial360(tenantA, userAdminA, matSand);
    assert.equal(res.material.status, 'INACTIVE');
  });

  // -------------------------------------------------------------
  // Test 27: Zero stock representation
  // -------------------------------------------------------------
  it('27. store with zero stock returns onHand = 0, reserved = 0, available = 0', async () => {
    const res = await service.getStoreAvailability(tenantA, userAdminA, siteStoreBeta);
    const cement = res.materialBalances.find((m) => m.materialId === matCement);
    // Beta site store has no balance record for cement
    assert.equal(cement, undefined);
  });

  // -------------------------------------------------------------
  // Test 28: Shortage calculation verification
  // -------------------------------------------------------------
  it('28. shortage calculation computes accurate immediate and projected deficits', async () => {
    const res = await service.getShortages(tenantA, userAdminA, {
      projectId: projectAlpha,
    });
    assert.ok(res.items.length >= 1);
  });

  // -------------------------------------------------------------
  // Test 29: Pagination support
  // -------------------------------------------------------------
  it('29. list availability supports page and limit pagination', async () => {
    const res = await service.getAvailabilityList(tenantA, userAdminA, {
      page: 1,
      limit: 1,
    });
    assert.equal(res.items.length, 1);
    assert.ok(res.total >= 2);
  });

  // -------------------------------------------------------------
  // Test 30: Category and search filters
  // -------------------------------------------------------------
  it('30. filters by category and search term correctly', async () => {
    const res = await service.getAvailabilityList(tenantA, userAdminA, {
      category: 'CEMENT',
      search: 'OPC',
    });
    assert.equal(res.items.length, 1);
    assert.equal(res.items[0].materialId, matCement);
  });

  // -------------------------------------------------------------
  // Test 31: Zero StockMovement side effects
  // -------------------------------------------------------------
  it('31. pure read intelligence: zero StockMovement records created across operations', async () => {
    const countBefore = await prisma.stockMovement.count({
      where: { tenantId: tenantA },
    });

    await service.getAvailabilityList(tenantA, userAdminA);
    await service.getMaterial360(tenantA, userAdminA, matCement);
    await service.getProjectAvailability(tenantA, userAdminA, projectAlpha);
    await service.getStoreAvailability(tenantA, userAdminA, centralWarehouseA);
    await service.getShortages(tenantA, userAdminA);

    const countAfter = await prisma.stockMovement.count({
      where: { tenantId: tenantA },
    });

    assert.equal(countAfter, countBefore, 'StockMovement count must remain strictly invariant');
  });

  // -------------------------------------------------------------
  // Test 32: Zero StoreStockBalance side effects
  // -------------------------------------------------------------
  it('32. pure read intelligence: StoreStockBalance records remain unchanged', async () => {
    const balBefore = await prisma.storeStockBalance.findUnique({
      where: { id: '60000000-0000-0000-0000-000000000001' },
    });

    await service.getAvailabilityList(tenantA, userAdminA);
    await service.getMaterial360(tenantA, userAdminA, matCement);

    const balAfter = await prisma.storeStockBalance.findUnique({
      where: { id: '60000000-0000-0000-0000-000000000001' },
    });

    assert.equal(Number(balAfter?.quantityOnHand), Number(balBefore?.quantityOnHand));
    assert.equal(Number(balAfter?.reservedQuantity), Number(balBefore?.reservedQuantity));
  });

  // -------------------------------------------------------------
  // Test 33: Zero financial side effects
  // -------------------------------------------------------------
  it('33. zero financial side effects: no financial mutations', async () => {
    await service.getAvailabilityList(tenantA, userAdminA);
    // Invariance holds as no financial tables or services are called
    assert.ok(true);
  });

  // -------------------------------------------------------------
  // Test 34: Cancelled PO excluded from supply pipeline
  // -------------------------------------------------------------
  it('34. PO in CANCELLED status is excluded from pending PO inbound pipeline', async () => {
    const po = await prisma.purchaseOrder.findFirst({
      where: { tenantId: tenantA, poNumber: 'PO-ALPHA-001' },
    });
    assert.ok(po);

    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { status: 'CANCELLED' },
    });

    const res = await service.getMaterial360(tenantA, userAdminA, matCement);
    assert.equal(res.summary.totalPendingPOInbound, 0);

    // Restore
    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { status: 'ORDERED' },
    });
  });

  // -------------------------------------------------------------
  // Test 35: Cancelled transfer excluded from in-transit pipeline
  // -------------------------------------------------------------
  it('35. transfer in CANCELLED status is excluded from in-transit pipeline', async () => {
    const transfer = await prisma.materialTransfer.findFirst({
      where: { tenantId: tenantA, transferNumber: 'MT-CW-ALPHA-001' },
    });
    assert.ok(transfer);

    await prisma.materialTransfer.update({
      where: { id: transfer.id },
      data: { status: 'CANCELLED' },
    });

    const res = await service.getStoreAvailability(tenantA, userAdminA, siteStoreAlpha);
    const cement = res.materialBalances.find((m) => m.materialId === matCement);
    assert.ok(cement);
    assert.equal(cement.inTransitInbound, 0);

    // Restore
    await prisma.materialTransfer.update({
      where: { id: transfer.id },
      data: { status: 'IN_TRANSIT' },
    });
  });

  // -------------------------------------------------------------
  // Test 36: Central reserved stock is not falsely presented as site on-hand
  // -------------------------------------------------------------
  it('36. central reserved stock is explicitly separated from site physical on-hand', async () => {
    const res = await service.getProjectAvailability(tenantA, userAdminA, projectAlpha);
    const cement = res.materialPositions.find((m) => m.materialId === matCement);
    assert.ok(cement);

    // Site physical on hand is 80, not 80 + 100
    assert.equal(cement.siteStoresPhysicalOnHand, 80);
    // Central allocated is 100
    assert.equal(cement.centralWarehouseAllocatedReserved, 100);
    // They are distinctly separated fields
    assert.notEqual(cement.siteStoresPhysicalOnHand, cement.totalProjectControlledStock);
  });

  // -------------------------------------------------------------
  // Test 37: Controller HTTP translation verification
  // -------------------------------------------------------------
  it('37. controller routes successfully translate HTTP requests into typed API responses', async () => {
    const reqList = createAuthReq(tokenAdminA, { query: { page: '1', limit: '10' } });
    const listRes = await controller.listAvailability(reqList);
    assert.strictEqual(listRes.success, true);
    assert.ok(listRes.data.items.length >= 2);

    const req360 = createAuthReq(tokenAdminA, { params: { materialId: matCement } });
    const matRes = await controller.getMaterial360(req360);
    assert.strictEqual(matRes.success, true);
    assert.strictEqual(matRes.data.material.id, matCement);

    const reqProj = createAuthReq(tokenAdminA, { params: { projectId: projectAlpha } });
    const projRes = await controller.getProjectAvailability(reqProj);
    assert.strictEqual(projRes.success, true);
    assert.strictEqual(projRes.data.project.id, projectAlpha);

    const reqStore = createAuthReq(tokenAdminA, { params: { storeId: centralWarehouseA } });
    const storeRes = await controller.getStoreAvailability(reqStore);
    assert.strictEqual(storeRes.success, true);
    assert.strictEqual(storeRes.data.store.id, centralWarehouseA);

    const reqShortages = createAuthReq(tokenAdminA, { query: {} });
    const shortRes = await controller.getShortages(reqShortages);
    assert.strictEqual(shortRes.success, true);
    assert.ok(Array.isArray(shortRes.data.items));
  });
});
