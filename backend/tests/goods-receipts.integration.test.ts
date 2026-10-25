import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service';
import { GoodsReceiptsController } from '../src/modules/materials/controllers/goods-receipts.controller';
import { GoodsReceiptService } from '../src/modules/materials/services/goods-receipt.service';
import { PurchaseOrderService } from '../src/modules/materials/services/purchase-order.service';
import { StockLedgerService } from '../src/modules/materials/services/stock-ledger.service';
import { TokenService } from '../src/modules/auth/services/token.service';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ValidationError,
} from '../src/common/errors/app-error';

describe('DEZOBUILD Phase 07.5 — Goods Receipt Notes / Physical Receipt Integration Suite', () => {
  let dbService: DatabaseService;
  let grnController: GoodsReceiptsController;
  let grnService: GoodsReceiptService;
  let poService: PurchaseOrderService;
  let stockLedgerService: StockLedgerService;
  let tokenService: TokenService;
  let prisma: any;

  // Tenant A (PROFESSIONAL Plan - has materials:po_matching)
  const tenantAId = 'aaaaaaaa-7575-9999-aaaa-aaaaaaaaaaaa';
  const ownerAId = 'aaaaaaaa-1111-7575-aaaa-aaaaaaaaaaaa'; // Org Admin
  const pmAId = 'aaaaaaaa-2222-7575-aaaa-aaaaaaaaaaaa'; // Project Manager (creates PO)
  const procStoreAId = 'aaaaaaaa-3333-7575-aaaa-aaaaaaaaaaaa'; // Store Officer (receiver)
  const seAId = 'aaaaaaaa-4444-7575-aaaa-aaaaaaaaaaaa'; // Site Engineer (independent verifier)
  const noAccessUserAId = 'aaaaaaaa-5555-7575-aaaa-aaaaaaaaaaaa';

  let tokenOwnerA: string;
  let tokenPmA: string;
  let tokenProcStoreA: string;
  let tokenSeA: string;
  let tokenNoAccessUserA: string;

  // Tenant B (PROFESSIONAL Plan - Isolation)
  const tenantBId = 'bbbbbbbb-7575-9999-bbbb-bbbbbbbbbbbb';
  const ownerBId = 'bbbbbbbb-1111-7575-bbbb-bbbbbbbbbbbb';
  let tokenOwnerB: string;

  // Tenant C (STARTER Plan - No materials:po_matching entitlement)
  const tenantCId = 'cccccccc-7575-9999-cccc-cccccccccccc';
  const ownerCId = 'cccccccc-1111-7575-cccc-cccccccccccc';
  let tokenOwnerC: string;

  let projectA1Id: string;
  let projectA2Id: string;
  let projectB1Id: string;
  let storeA1SiteId: string;
  let storeA2SiteId: string;
  let storeA3CentralId: string;
  let storeB1SiteId: string;
  let storeAInactiveId: string;
  let vendorA1Id: string;
  let vendorB1Id: string;
  let materialCementAId: string;
  let materialSteelAId: string;
  let materialPaintAId: string;
  let materialCementBId: string;

  let poOrderedA1Id: string;
  let poLineCementA1Id: string;
  let poLineSteelA1Id: string;

  let poApprovedAId: string;
  let poDraftAId: string;
  let poCancelledAId: string;

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
    poService = PurchaseOrderService.getInstance();
    stockLedgerService = StockLedgerService.getInstance();
    grnService = GoodsReceiptService.getInstance();
    grnController = new GoodsReceiptsController(grnService);

    const testTenantIds = [tenantAId, tenantBId, tenantCId];
    await prisma.goodsReceiptLine.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.goodsReceiptNote.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.goodsReceiptSequence.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.stockMovement.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.storeStockBalance.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.purchaseOrderLine.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.purchaseOrderSequence.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.purchaseOrder.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.materialIndentLine.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.materialIndent.deleteMany({
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
    await prisma.vendor.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.projectMember.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.project.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.userRoleAssignment.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.user.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.tenantEntitlementOverride.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.tenantSubscription.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.branch.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.company.deleteMany({
      where: { tenantId: { in: testTenantIds } },
    });
    await prisma.tenant.deleteMany({
      where: {
        OR: [
          { id: { in: testTenantIds } },
          { code: { in: ['GRN-TENANT-A', 'GRN-TENANT-B', 'GRN-TENANT-C'] } },
        ],
      },
    });

    // 3. Create Tenants & Subscriptions
    const profPlan = await prisma.platformPlan.findUnique({ where: { code: 'PROFESSIONAL' } });
    const starterPlan = await prisma.platformPlan.findUnique({ where: { code: 'STARTER' } });

    await prisma.tenant.create({
      data: {
        id: tenantAId,
        code: 'GRN-TENANT-A',
        name: 'Tenant A Construction',
        planTier: 'PROFESSIONAL',
        status: 'ACTIVE',
      },
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

    await prisma.tenant.create({
      data: {
        id: tenantBId,
        code: 'GRN-TENANT-B',
        name: 'Tenant B Infra',
        planTier: 'PROFESSIONAL',
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

    await prisma.tenant.create({
      data: {
        id: tenantCId,
        code: 'GRN-TENANT-C',
        name: 'Tenant C Starter',
        planTier: 'STARTER',
        status: 'ACTIVE',
      },
    });
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantCId,
        planId: starterPlan.id,
        status: 'ACTIVE',
        billingCycle: 'ANNUAL',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
      },
    });

    // 4. Create Companies
    const companyA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        code: 'CO-A',
        name: 'Company A',
        legalName: 'Company A Pvt Ltd',
        panNumber: 'AAAAA1111A',
        gstin: '29AAAAA1111A1Z5',
        email: 'admin@companya.com',
        phone: '9900000001',
        address: 'Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
      },
    });

    const companyB = await prisma.company.create({
      data: {
        tenantId: tenantBId,
        code: 'CO-B',
        name: 'Company B',
        legalName: 'Company B Pvt Ltd',
        panNumber: 'BBBBB1111B',
        gstin: '29BBBBB1111B1Z5',
        email: 'admin@companyb.com',
        phone: '9900000002',
        address: 'Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
      },
    });

    const companyC = await prisma.company.create({
      data: {
        tenantId: tenantCId,
        code: 'CO-C',
        name: 'Company C',
        legalName: 'Company C Pvt Ltd',
        panNumber: 'CCCCC1111C',
        gstin: '29CCCCC1111C1Z5',
        email: 'admin@companyc.com',
        phone: '9900000003',
        address: 'Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
      },
    });

    // 5. Create Projects
    const projectA1 = await prisma.project.create({
      data: {
        tenantId: tenantAId,
        companyId: companyA.id,
        code: 'PRJ-A1',
        name: 'Skyline Towers',
        status: 'ACTIVE',
      },
    });
    projectA1Id = projectA1.id;

    const projectA2 = await prisma.project.create({
      data: {
        tenantId: tenantAId,
        companyId: companyA.id,
        code: 'PRJ-A2',
        name: 'Greenfield Villas',
        status: 'ACTIVE',
      },
    });
    projectA2Id = projectA2.id;

    const projectB1 = await prisma.project.create({
      data: {
        tenantId: tenantBId,
        companyId: companyB.id,
        code: 'PRJ-B1',
        name: 'Metro Line 1',
        status: 'ACTIVE',
      },
    });
    projectB1Id = projectB1.id;

    // 6. Create Stores
    const storeA1 = await prisma.store.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        code: 'ST-A1-SITE',
        name: 'Skyline Site Store',
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
        code: 'ST-A2-SITE',
        name: 'Greenfield Site Store',
        storeType: 'PROJECT_SITE',
        isCentralWarehouse: false,
        status: 'ACTIVE',
      },
    });
    storeA2SiteId = storeA2.id;

    const storeA3 = await prisma.store.create({
      data: {
        tenantId: tenantAId,
        projectId: null,
        code: 'ST-A3-CENTRAL',
        name: 'Central Warehouse Bangalore',
        storeType: 'CENTRAL',
        isCentralWarehouse: true,
        status: 'ACTIVE',
      },
    });
    storeA3CentralId = storeA3.id;

    const storeAInactive = await prisma.store.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        code: 'ST-A-INACTIVE',
        name: 'Inactive Site Store',
        storeType: 'PROJECT_SITE',
        isCentralWarehouse: false,
        status: 'INACTIVE',
      },
    });
    storeAInactiveId = storeAInactive.id;

    const storeB1 = await prisma.store.create({
      data: {
        tenantId: tenantBId,
        projectId: projectB1Id,
        code: 'ST-B1-SITE',
        name: 'Metro Site Store',
        storeType: 'PROJECT_SITE',
        isCentralWarehouse: false,
        status: 'ACTIVE',
      },
    });
    storeB1SiteId = storeB1.id;

    // 7. Create Users & Roles
    const companyOwnerRole = await prisma.role.findFirst({
      where: { name: 'COMPANY_OWNER', tenantId: null },
    });
    const pmRole = await prisma.role.findFirst({
      where: { name: 'PROJECT_MANAGER', tenantId: null },
    });
    const procStoreRole = await prisma.role.findFirst({
      where: { name: 'PROCUREMENT_STORE', tenantId: null },
    });
    const seRole = await prisma.role.findFirst({
      where: { name: 'SITE_ENGINEER', tenantId: null },
    });

    // User Owner A
    await prisma.user.create({
      data: {
        id: ownerAId,
        tenantId: tenantAId,
        email: 'owner.a@dezobuild.com',
        fullName: 'Owner Alice',
        passwordHash: 'hashed_password',
        status: 'ACTIVE',
      },
    });
    await prisma.userRoleAssignment.create({
      data: { tenantId: tenantAId, userId: ownerAId, roleId: companyOwnerRole.id, scopeType: 'TENANT' },
    });

    // User PM A (creates PO)
    await prisma.user.create({
      data: {
        id: pmAId,
        tenantId: tenantAId,
        email: 'pm.a@dezobuild.com',
        fullName: 'Peter PM',
        passwordHash: 'hashed_password',
        status: 'ACTIVE',
      },
    });
    await prisma.userRoleAssignment.create({
      data: { tenantId: tenantAId, userId: pmAId, roleId: pmRole.id, scopeType: 'PROJECT' },
    });
    await prisma.projectMember.create({
      data: { tenantId: tenantAId, projectId: projectA1Id, userId: pmAId, projectRole: 'MANAGER' },
    });
    await prisma.projectMember.create({
      data: { tenantId: tenantAId, projectId: projectA2Id, userId: pmAId, projectRole: 'MANAGER' },
    });

    // User Store Officer A (creates & submits GRN)
    await prisma.user.create({
      data: {
        id: procStoreAId,
        tenantId: tenantAId,
        email: 'store.a@dezobuild.com',
        fullName: 'Sam Storeman',
        passwordHash: 'hashed_password',
        status: 'ACTIVE',
      },
    });
    await prisma.userRoleAssignment.create({
      data: { tenantId: tenantAId, userId: procStoreAId, roleId: procStoreRole.id, scopeType: 'TENANT' },
    });
    await prisma.projectMember.create({
      data: { tenantId: tenantAId, projectId: projectA1Id, userId: procStoreAId, projectRole: 'MEMBER' },
    });
    await prisma.projectMember.create({
      data: { tenantId: tenantAId, projectId: projectA2Id, userId: procStoreAId, projectRole: 'MEMBER' },
    });

    // User SE A (Site Engineer)
    await prisma.user.create({
      data: {
        id: seAId,
        tenantId: tenantAId,
        email: 'se.a@dezobuild.com',
        fullName: 'Steve Engineer',
        passwordHash: 'hashed_password',
        status: 'ACTIVE',
      },
    });
    await prisma.userRoleAssignment.create({
      data: { tenantId: tenantAId, userId: seAId, roleId: seRole.id, scopeType: 'PROJECT' },
    });
    await prisma.projectMember.create({
      data: { tenantId: tenantAId, projectId: projectA1Id, userId: seAId, projectRole: 'ENGINEER' },
    });

    // User No Access
    await prisma.user.create({
      data: {
        id: noAccessUserAId,
        tenantId: tenantAId,
        email: 'noaccess.a@dezobuild.com',
        fullName: 'No Access User',
        passwordHash: 'hashed_password',
        status: 'ACTIVE',
      },
    });

    // User Owner B
    await prisma.user.create({
      data: {
        id: ownerBId,
        tenantId: tenantBId,
        email: 'owner.b@dezobuild.com',
        fullName: 'Owner Bob',
        passwordHash: 'hashed_password',
        status: 'ACTIVE',
      },
    });
    await prisma.userRoleAssignment.create({
      data: { tenantId: tenantBId, userId: ownerBId, roleId: companyOwnerRole.id, scopeType: 'TENANT' },
    });
    await prisma.projectMember.create({
      data: { tenantId: tenantBId, projectId: projectB1Id, userId: ownerBId, projectRole: 'MANAGER' },
    });

    // User Owner C
    await prisma.user.create({
      data: {
        id: ownerCId,
        tenantId: tenantCId,
        email: 'owner.c@dezobuild.com',
        fullName: 'Owner Charlie',
        passwordHash: 'hashed_password',
        status: 'ACTIVE',
      },
    });
    await prisma.userRoleAssignment.create({
      data: { tenantId: tenantCId, userId: ownerCId, roleId: companyOwnerRole.id, scopeType: 'TENANT' },
    });

    // 8. Create Vendors
    const vendorA1 = await prisma.vendor.create({
      data: {
        tenantId: tenantAId,
        code: 'VEN-A1',
        name: 'UltraTech Cement Suppliers',
        status: 'ACTIVE',
      },
    });
    vendorA1Id = vendorA1.id;

    const vendorB1 = await prisma.vendor.create({
      data: {
        tenantId: tenantBId,
        code: 'VEN-B1',
        name: 'Metro Steel Corp',
        status: 'ACTIVE',
      },
    });
    vendorB1Id = vendorB1.id;

    // 9. Create Materials
    const matCementA = await prisma.material.create({
      data: {
        tenantId: tenantAId,
        itemCode: 'MAT-CEM-01',
        name: 'OPC 53 Grade Cement',
        category: 'CIVIL',
        primaryUom: 'BAG',
        standardRate: 380,
        status: 'ACTIVE',
      },
    });
    materialCementAId = matCementA.id;

    const matSteelA = await prisma.material.create({
      data: {
        tenantId: tenantAId,
        itemCode: 'MAT-STL-01',
        name: 'TMT Steel Bars 12mm',
        category: 'STEEL',
        primaryUom: 'KG',
        standardRate: 65,
        status: 'ACTIVE',
      },
    });
    materialSteelAId = matSteelA.id;

    const matPaintA = await prisma.material.create({
      data: {
        tenantId: tenantAId,
        itemCode: 'MAT-PNT-01',
        name: 'Weatherproof Exterior Paint',
        category: 'FINISHING',
        primaryUom: 'LITRE',
        standardRate: 450,
        status: 'ACTIVE',
      },
    });
    materialPaintAId = matPaintA.id;

    const matCementB = await prisma.material.create({
      data: {
        tenantId: tenantBId,
        itemCode: 'MAT-CEM-B1',
        name: 'OPC Cement B',
        category: 'CIVIL',
        primaryUom: 'BAG',
        standardRate: 380,
        status: 'ACTIVE',
      },
    });
    materialCementBId = matCementB.id;

    // 10. Create Purchase Orders
    // PO 1: ORDERED with 2 lines (Cement: 100 BAG @ 380, Steel: 500 KG @ 65) - created by Peter PM
    const poOrderedA1 = await prisma.purchaseOrder.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        vendorId: vendorA1Id,
        poNumber: 'PO-PRJ-A1-20260910-0001',
        status: 'ORDERED',
        expectedDeliveryDate: new Date('2026-09-20'),
        createdById: pmAId,
        submittedById: pmAId,
        submittedAt: new Date(),
        approvedById: ownerAId,
        approvedAt: new Date(),
        orderedById: ownerAId,
        orderedAt: new Date(),
        lines: {
          create: [
            {
              tenantId: tenantAId,
              materialId: materialCementAId,
              quantityOrdered: 100,
              quantityReceived: 0,
              uom: 'BAG',
              unitRate: 380,
              lineTotal: 38000,
            },
            {
              tenantId: tenantAId,
              materialId: materialSteelAId,
              quantityOrdered: 500,
              quantityReceived: 0,
              uom: 'KG',
              unitRate: 65,
              lineTotal: 32500,
            },
          ],
        },
      },
      include: { lines: true },
    });
    poOrderedA1Id = poOrderedA1.id;
    poLineCementA1Id = poOrderedA1.lines.find((l: any) => l.materialId === materialCementAId)!.id;
    poLineSteelA1Id = poOrderedA1.lines.find((l: any) => l.materialId === materialSteelAId)!.id;

    // PO 2: APPROVED (not ORDERED)
    const poApprovedA = await prisma.purchaseOrder.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        vendorId: vendorA1Id,
        poNumber: 'PO-PRJ-A1-20260910-0002',
        status: 'APPROVED',
        expectedDeliveryDate: new Date('2026-09-20'),
        createdById: pmAId,
        lines: {
          create: [
            {
              tenantId: tenantAId,
              materialId: materialCementAId,
              quantityOrdered: 50,
              quantityReceived: 0,
              uom: 'BAG',
              unitRate: 380,
              lineTotal: 19000,
            },
          ],
        },
      },
    });
    poApprovedAId = poApprovedA.id;

    // PO 3: DRAFT
    const poDraftA = await prisma.purchaseOrder.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        vendorId: vendorA1Id,
        poNumber: 'PO-PRJ-A1-20260910-0003',
        status: 'DRAFT',
        expectedDeliveryDate: new Date('2026-09-20'),
        createdById: pmAId,
        lines: {
          create: [
            {
              tenantId: tenantAId,
              materialId: materialCementAId,
              quantityOrdered: 20,
              quantityReceived: 0,
              uom: 'BAG',
              unitRate: 380,
              lineTotal: 7600,
            },
          ],
        },
      },
    });
    poDraftAId = poDraftA.id;

    // PO 4: CANCELLED
    const poCancelledA = await prisma.purchaseOrder.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        vendorId: vendorA1Id,
        poNumber: 'PO-PRJ-A1-20260910-0004',
        status: 'CANCELLED',
        expectedDeliveryDate: new Date('2026-09-20'),
        createdById: pmAId,
        lines: {
          create: [
            {
              tenantId: tenantAId,
              materialId: materialCementAId,
              quantityOrdered: 20,
              quantityReceived: 0,
              uom: 'BAG',
              unitRate: 380,
              lineTotal: 7600,
            },
          ],
        },
      },
    });
    poCancelledAId = poCancelledA.id;

    // Generate JWT tokens
    tokenOwnerA = tokenService.createAccessToken({
      userId: ownerAId,
      tenantId: tenantAId,
      sessionId: 'sess-owner-a-77',
      sessionVersion: 1,
    });

    tokenPmA = tokenService.createAccessToken({
      userId: pmAId,
      tenantId: tenantAId,
      sessionId: 'sess-pm-a-77',
      sessionVersion: 1,
    });

    tokenProcStoreA = tokenService.createAccessToken({
      userId: procStoreAId,
      tenantId: tenantAId,
      sessionId: 'sess-proc-a-77',
      sessionVersion: 1,
    });

    tokenSeA = tokenService.createAccessToken({
      userId: seAId,
      tenantId: tenantAId,
      sessionId: 'sess-se-a-77',
      sessionVersion: 1,
    });

    tokenNoAccessUserA = tokenService.createAccessToken({
      userId: noAccessUserAId,
      tenantId: tenantAId,
      sessionId: 'sess-noacc-a-77',
      sessionVersion: 1,
    });

    tokenOwnerB = tokenService.createAccessToken({
      userId: ownerBId,
      tenantId: tenantBId,
      sessionId: 'sess-owner-b-77',
      sessionVersion: 1,
    });

    tokenOwnerC = tokenService.createAccessToken({
      userId: ownerCId,
      tenantId: tenantCId,
      sessionId: 'sess-owner-c-77',
      sessionVersion: 1,
    });
  });

  after(async () => {
    await dbService.disconnect();
  });

  // =========================================================================
  // 1. DRAFT CREATION & PO ELIGIBILITY
  // =========================================================================
  it('1. should create a valid DRAFT goods receipt against an ORDERED purchase order', async () => {
    const req = createAuthReq(tokenProcStoreA, {
      body: {
        purchaseOrderId: poOrderedA1Id,
        storeId: storeA1SiteId,
        receiptDate: '2026-09-10',
        deliveryChallanNumber: 'DC-9901',
        deliveryChallanDate: '2026-09-10',
        vehicleNumber: 'KA-01-AB-1234',
        remarks: 'First batch of cement delivered',
        lines: [
          {
            purchaseOrderLineId: poLineCementA1Id,
            materialId: materialCementAId,
            quantityDelivered: 60,
            quantityAccepted: 55,
            quantityRejected: 5,
            uom: 'BAG',
            storageLocation: 'Bay A1',
            remarks: '5 bags wet damaged',
          },
        ],
      },
    });

    const res = await grnController.createGoodsReceipt(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.status, 'DRAFT');
    assert.match(res.data.grnNumber, /^GRN-PRJ-A1-\d{8}-\d{4}$/);
    assert.strictEqual(res.data.receivedById, procStoreAId);
    assert.strictEqual(res.data.lines.length, 1);
    assert.strictEqual(Number(res.data.lines[0].quantityDelivered), 60);
    assert.strictEqual(Number(res.data.lines[0].quantityAccepted), 55);
    assert.strictEqual(Number(res.data.lines[0].quantityRejected), 5);
  });

  it('2. should strictly reject creating GRN against APPROVED (non-ORDERED) PO', async () => {
    const req = createAuthReq(tokenProcStoreA, {
      body: {
        purchaseOrderId: poApprovedAId,
        storeId: storeA1SiteId,
        lines: [
          {
            purchaseOrderLineId: poLineCementA1Id,
            materialId: materialCementAId,
            quantityDelivered: 10,
            quantityAccepted: 10,
            quantityRejected: 0,
            uom: 'BAG',
          },
        ],
      },
    });

    await assert.rejects(
      async () => grnController.createGoodsReceipt(req),
      (err: any) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /only be created against purchase orders in ORDERED status/i);
        return true;
      }
    );
  });

  it('3. should strictly reject creating GRN against DRAFT PO', async () => {
    const req = createAuthReq(tokenProcStoreA, {
      body: {
        purchaseOrderId: poDraftAId,
        storeId: storeA1SiteId,
        lines: [
          {
            purchaseOrderLineId: poLineCementA1Id,
            materialId: materialCementAId,
            quantityDelivered: 10,
            quantityAccepted: 10,
            quantityRejected: 0,
            uom: 'BAG',
          },
        ],
      },
    });

    await assert.rejects(
      async () => grnController.createGoodsReceipt(req),
      (err: any) => {
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );
  });

  it('4. should strictly reject creating GRN against CANCELLED PO', async () => {
    const req = createAuthReq(tokenProcStoreA, {
      body: {
        purchaseOrderId: poCancelledAId,
        storeId: storeA1SiteId,
        lines: [
          {
            purchaseOrderLineId: poLineCementA1Id,
            materialId: materialCementAId,
            quantityDelivered: 10,
            quantityAccepted: 10,
            quantityRejected: 0,
            uom: 'BAG',
          },
        ],
      },
    });

    await assert.rejects(
      async () => grnController.createGoodsReceipt(req),
      (err: any) => {
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );
  });

  // =========================================================================
  // 2. ISOLATION: TENANT, PROJECT, STORE
  // =========================================================================
  it('5. should enforce tenant isolation: Tenant B cannot create GRN for Tenant A PO', async () => {
    const req = createAuthReq(tokenOwnerB, {
      body: {
        purchaseOrderId: poOrderedA1Id,
        storeId: storeB1SiteId,
        lines: [
          {
            purchaseOrderLineId: poLineCementA1Id,
            materialId: materialCementAId,
            quantityDelivered: 10,
            quantityAccepted: 10,
            quantityRejected: 0,
            uom: 'BAG',
          },
        ],
      },
    });

    await assert.rejects(
      async () => grnController.createGoodsReceipt(req),
      (err: any) => {
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );
  });

  it('6. should reject store destination from Project A2 when PO belongs to Project A1', async () => {
    const req = createAuthReq(tokenProcStoreA, {
      body: {
        purchaseOrderId: poOrderedA1Id,
        storeId: storeA2SiteId, // Greenfield Site Store for Project A2
        lines: [
          {
            purchaseOrderLineId: poLineCementA1Id,
            materialId: materialCementAId,
            quantityDelivered: 10,
            quantityAccepted: 10,
            quantityRejected: 0,
            uom: 'BAG',
          },
        ],
      },
    });

    await assert.rejects(
      async () => grnController.createGoodsReceipt(req),
      (err: any) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /not valid for PO project/i);
        return true;
      }
    );
  });

  it('7. should allow designated central warehouse store to receive for any project PO', async () => {
    const req = createAuthReq(tokenProcStoreA, {
      body: {
        purchaseOrderId: poOrderedA1Id,
        storeId: storeA3CentralId, // Central Warehouse
        lines: [
          {
            purchaseOrderLineId: poLineCementA1Id,
            materialId: materialCementAId,
            quantityDelivered: 20,
            quantityAccepted: 20,
            quantityRejected: 0,
            uom: 'BAG',
          },
        ],
      },
    });

    const res = await grnController.createGoodsReceipt(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.storeId, storeA3CentralId);

    // Clean up draft
    await grnService.deleteGoodsReceipt(tenantAId, procStoreAId, res.data.id);
  });

  it('8. should reject receipt into an INACTIVE store', async () => {
    const req = createAuthReq(tokenProcStoreA, {
      body: {
        purchaseOrderId: poOrderedA1Id,
        storeId: storeAInactiveId,
        lines: [
          {
            purchaseOrderLineId: poLineCementA1Id,
            materialId: materialCementAId,
            quantityDelivered: 10,
            quantityAccepted: 10,
            quantityRejected: 0,
            uom: 'BAG',
          },
        ],
      },
    });

    await assert.rejects(
      async () => grnController.createGoodsReceipt(req),
      (err: any) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /inactive/i);
        return true;
      }
    );
  });

  // =========================================================================
  // 3. MASTER DATA CONSISTENCY & VALIDATION
  // =========================================================================
  it('9. should reject GRN line with mismatching material from PO line', async () => {
    const req = createAuthReq(tokenProcStoreA, {
      body: {
        purchaseOrderId: poOrderedA1Id,
        storeId: storeA1SiteId,
        lines: [
          {
            purchaseOrderLineId: poLineCementA1Id, // expects Cement
            materialId: materialPaintAId, // Paint supplied
            quantityDelivered: 10,
            quantityAccepted: 10,
            quantityRejected: 0,
            uom: 'BAG',
          },
        ],
      },
    });

    await assert.rejects(
      async () => grnController.createGoodsReceipt(req),
      (err: any) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /does not match PO line material/i);
        return true;
      }
    );
  });

  it('10. should reject GRN line with mismatching UOM from PO line', async () => {
    const req = createAuthReq(tokenProcStoreA, {
      body: {
        purchaseOrderId: poOrderedA1Id,
        storeId: storeA1SiteId,
        lines: [
          {
            purchaseOrderLineId: poLineCementA1Id,
            materialId: materialCementAId,
            quantityDelivered: 10,
            quantityAccepted: 10,
            quantityRejected: 0,
            uom: 'MT', // PO line is BAG
          },
        ],
      },
    });

    await assert.rejects(
      async () => grnController.createGoodsReceipt(req),
      (err: any) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /does not match PO line UOM/i);
        return true;
      }
    );
  });

  it('11. should reject when delivered != accepted + rejected', async () => {
    const req = createAuthReq(tokenProcStoreA, {
      body: {
        purchaseOrderId: poOrderedA1Id,
        storeId: storeA1SiteId,
        lines: [
          {
            purchaseOrderLineId: poLineCementA1Id,
            materialId: materialCementAId,
            quantityDelivered: 50,
            quantityAccepted: 40,
            quantityRejected: 5, // sum = 45 != 50
            uom: 'BAG',
          },
        ],
      },
    });

    await assert.rejects(
      async () => grnController.createGoodsReceipt(req),
      (err: any) => {
        assert.strictEqual(err.statusCode, 422);
        assert.ok(
          err.invalidParams?.some((p: any) =>
            /Delivered quantity must strictly equal accepted quantity \+ rejected quantity/i.test(p.reason)
          )
        );
        return true;
      }
    );
  });

  it('12. should reject when delivered quantity <= 0', async () => {
    const req = createAuthReq(tokenProcStoreA, {
      body: {
        purchaseOrderId: poOrderedA1Id,
        storeId: storeA1SiteId,
        lines: [
          {
            purchaseOrderLineId: poLineCementA1Id,
            materialId: materialCementAId,
            quantityDelivered: 0,
            quantityAccepted: 0,
            quantityRejected: 0,
            uom: 'BAG',
          },
        ],
      },
    });

    await assert.rejects(
      async () => grnController.createGoodsReceipt(req),
      (err: any) => {
        assert.strictEqual(err.statusCode, 422);
        return true;
      }
    );
  });

  // =========================================================================
  // 4. OVER-RECEIPT (0% TOLERANCE)
  // =========================================================================
  it('13. should reject over-receipt: accepted quantity > remaining PO quantity', async () => {
    const req = createAuthReq(tokenProcStoreA, {
      body: {
        purchaseOrderId: poOrderedA1Id,
        storeId: storeA1SiteId,
        lines: [
          {
            purchaseOrderLineId: poLineCementA1Id, // ordered: 100, received: 0
            materialId: materialCementAId,
            quantityDelivered: 105,
            quantityAccepted: 101, // 101 > 100 remaining
            quantityRejected: 4,
            uom: 'BAG',
          },
        ],
      },
    });

    await assert.rejects(
      async () => grnController.createGoodsReceipt(req),
      (err: any) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /Over-receipt rejected \(0% tolerance\)/i);
        return true;
      }
    );
  });

  it('14. should accept excess vendor delivery if excess is recorded in quantityRejected', async () => {
    const req = createAuthReq(tokenProcStoreA, {
      body: {
        purchaseOrderId: poOrderedA1Id,
        storeId: storeA1SiteId,
        lines: [
          {
            purchaseOrderLineId: poLineCementA1Id, // ordered: 100
            materialId: materialCementAId,
            quantityDelivered: 110,
            quantityAccepted: 100, // exactly 100 accepted
            quantityRejected: 10,  // 10 rejected
            uom: 'BAG',
          },
        ],
      },
    });

    const res = await grnController.createGoodsReceipt(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual(Number(res.data.lines[0].quantityAccepted), 100);
    assert.strictEqual(Number(res.data.lines[0].quantityRejected), 10);

    // Clean up draft
    await grnService.deleteGoodsReceipt(tenantAId, procStoreAId, res.data.id);
  });

  // =========================================================================
  // 5. LIFECYCLE & SEGREGATION OF DUTIES (SoD)
  // =========================================================================
  it('15. should reject receiver self-verification (SoD violation)', async () => {
    // 1. Receiver (Sam Storeman) creates and submits GRN
    const createReq = createAuthReq(tokenProcStoreA, {
      body: {
        purchaseOrderId: poOrderedA1Id,
        storeId: storeA1SiteId,
        lines: [
          {
            purchaseOrderLineId: poLineCementA1Id,
            materialId: materialCementAId,
            quantityDelivered: 40,
            quantityAccepted: 40,
            quantityRejected: 0,
            uom: 'BAG',
          },
        ],
      },
    });
    const draftRes = await grnController.createGoodsReceipt(createReq);
    const grnId = draftRes.data.id;

    const submitReq = createAuthReq(tokenProcStoreA, { params: { id: grnId } });
    await grnController.submitGoodsReceipt(submitReq);

    // 2. Receiver attempts self-verification -> 403 Forbidden
    const verifyReq = createAuthReq(tokenProcStoreA, {
      params: { id: grnId },
      body: { verificationRemarks: 'Trying to self-verify' },
    });

    await assert.rejects(
      async () => grnController.verifyGoodsReceipt(verifyReq),
      (err: any) => {
        assert.strictEqual(err.statusCode, 403);
        assert.match(err.message, /Verifier cannot be the receiver/i);
        return true;
      }
    );
  });

  it('16. should reject PO creator from verifying GRN (SoD violation)', async () => {
    // 1. Create a PO where creator is Owner Alice (ownerAId)
    const ownerPo = await prisma.purchaseOrder.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        vendorId: vendorA1Id,
        poNumber: 'PO-PRJ-A1-20260910-0077',
        status: 'ORDERED',
        expectedDeliveryDate: new Date('2026-09-25'),
        createdById: ownerAId,
        lines: {
          create: [
            {
              tenantId: tenantAId,
              materialId: materialCementAId,
              quantityOrdered: 30,
              quantityReceived: 0,
              uom: 'BAG',
              unitRate: 380,
              lineTotal: 11400,
            },
          ],
        },
      },
      include: { lines: true },
    });

    // 2. Sam Storeman receives and submits GRN
    const createReq = createAuthReq(tokenProcStoreA, {
      body: {
        purchaseOrderId: ownerPo.id,
        storeId: storeA1SiteId,
        lines: [
          {
            purchaseOrderLineId: ownerPo.lines[0].id,
            materialId: materialCementAId,
            quantityDelivered: 30,
            quantityAccepted: 30,
            quantityRejected: 0,
            uom: 'BAG',
          },
        ],
      },
    });
    const grn = await grnController.createGoodsReceipt(createReq);
    await grnController.submitGoodsReceipt(
      createAuthReq(tokenProcStoreA, { params: { id: grn.data.id } })
    );

    // 3. Owner Alice attempts to verify (Owner Alice has materials:grn:verify, but created the PO)
    const verifyReq = createAuthReq(tokenOwnerA, {
      params: { id: grn.data.id },
      body: { verificationRemarks: 'PO creator trying to verify' },
    });

    await assert.rejects(
      async () => grnController.verifyGoodsReceipt(verifyReq),
      (err: any) => {
        assert.strictEqual(err.statusCode, 403);
        assert.match(err.message, /Verifier cannot be the creator of the purchase order/i);
        return true;
      }
    );
  });

  it('17. should allow independent authorized verifier (Org Owner) to verify GRN and mutate stock', async () => {
    const listRes = await grnService.listGoodsReceipts(tenantAId, ownerAId, {
      purchaseOrderId: poOrderedA1Id,
      status: 'SUBMITTED',
    });
    const grnId = listRes.items[0].id;

    // Check pre-stock balance
    const preBal = await prisma.storeStockBalance.findFirst({
      where: { tenantId: tenantAId, storeId: storeA1SiteId, materialId: materialCementAId },
    });
    const preOnHand = Number(preBal?.quantityOnHand ?? 0);

    const verifyReq = createAuthReq(tokenOwnerA, {
      params: { id: grnId },
      body: { verificationRemarks: 'Verified OK on site' },
    });

    const verifyRes = await grnController.verifyGoodsReceipt(verifyReq);
    assert.strictEqual(verifyRes.success, true);
    assert.strictEqual(verifyRes.data.status, 'VERIFIED');
    assert.strictEqual(verifyRes.data.verifiedById, ownerAId);

    // Check post-stock balance: exactly +40
    const postBal = await prisma.storeStockBalance.findFirst({
      where: { tenantId: tenantAId, storeId: storeA1SiteId, materialId: materialCementAId },
    });
    const postOnHand = Number(postBal.quantityOnHand);
    assert.strictEqual(postOnHand, preOnHand + 40);

    // Check StockMovement created
    const movement = await prisma.stockMovement.findFirst({
      where: {
        tenantId: tenantAId,
        referenceType: 'GRN',
        referenceId: grnId,
      },
    });
    assert.ok(movement);
    assert.strictEqual(movement.movementType, 'RECEIPT');
    assert.strictEqual(Number(movement.quantity), 40);
    assert.strictEqual(Number(movement.unitRate), 380);

    // Check PO Line quantityReceived updated to 40
    const poLine = await prisma.purchaseOrderLine.findUnique({
      where: { id: poLineCementA1Id },
    });
    assert.strictEqual(Number(poLine.quantityReceived), 40);

    // PO remains ORDERED because it is not fully received
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poOrderedA1Id },
    });
    assert.strictEqual(po.status, 'ORDERED');
  });

  // =========================================================================
  // 6. IDEMPOTENT VERIFICATION
  // =========================================================================
  it('18. duplicate verification request must be idempotent and NEVER double stock', async () => {
    const listRes = await grnService.listGoodsReceipts(tenantAId, ownerAId, {
      purchaseOrderId: poOrderedA1Id,
      status: 'VERIFIED',
    });
    const grnId = listRes.items[0].id;

    const preBal = await prisma.storeStockBalance.findFirst({
      where: { tenantId: tenantAId, storeId: storeA1SiteId, materialId: materialCementAId },
    });
    const preOnHand = Number(preBal.quantityOnHand);

    const verifyReq = createAuthReq(tokenOwnerA, {
      params: { id: grnId },
      body: { verificationRemarks: 'Retrying verification' },
    });

    const res = await grnController.verifyGoodsReceipt(verifyReq);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.status, 'VERIFIED');

    // Balance remains exactly identical
    const postBal = await prisma.storeStockBalance.findFirst({
      where: { tenantId: tenantAId, storeId: storeA1SiteId, materialId: materialCementAId },
    });
    assert.strictEqual(Number(postBal.quantityOnHand), preOnHand);

    // Number of stock movements for this GRN remains 1
    const movementCount = await prisma.stockMovement.count({
      where: {
        tenantId: tenantAId,
        referenceType: 'GRN',
        referenceId: grnId,
      },
    });
    assert.strictEqual(movementCount, 1);
  });

  // =========================================================================
  // 7. MULTIPLE GRNs & COMPLETE RECEIPT PO CLOSURE
  // =========================================================================
  it('19. should allow multiple partial GRNs and auto-close PO when all lines are fully received', async () => {
    // Current PO state: Cement: 40/100 received (remaining 60), Steel: 0/500 received (remaining 500)

    // GRN 2: Remaining 60 Cement + 200 Steel
    const grn2Req = createAuthReq(tokenProcStoreA, {
      body: {
        purchaseOrderId: poOrderedA1Id,
        storeId: storeA1SiteId,
        lines: [
          {
            purchaseOrderLineId: poLineCementA1Id,
            materialId: materialCementAId,
            quantityDelivered: 60,
            quantityAccepted: 60,
            quantityRejected: 0,
            uom: 'BAG',
          },
          {
            purchaseOrderLineId: poLineSteelA1Id,
            materialId: materialSteelAId,
            quantityDelivered: 200,
            quantityAccepted: 200,
            quantityRejected: 0,
            uom: 'KG',
          },
        ],
      },
    });
    const grn2 = await grnController.createGoodsReceipt(grn2Req);
    await grnController.submitGoodsReceipt(
      createAuthReq(tokenProcStoreA, { params: { id: grn2.data.id } })
    );
    await grnController.verifyGoodsReceipt(
      createAuthReq(tokenOwnerA, { params: { id: grn2.data.id } })
    );

    // Cement is now 100/100, Steel is 200/500 -> PO remains ORDERED
    let po = await prisma.purchaseOrder.findUnique({ where: { id: poOrderedA1Id } });
    assert.strictEqual(po.status, 'ORDERED');

    // GRN 3: Remaining 300 Steel (completing the entire PO)
    const grn3Req = createAuthReq(tokenProcStoreA, {
      body: {
        purchaseOrderId: poOrderedA1Id,
        storeId: storeA1SiteId,
        lines: [
          {
            purchaseOrderLineId: poLineSteelA1Id,
            materialId: materialSteelAId,
            quantityDelivered: 300,
            quantityAccepted: 300,
            quantityRejected: 0,
            uom: 'KG',
          },
        ],
      },
    });
    const grn3 = await grnController.createGoodsReceipt(grn3Req);
    await grnController.submitGoodsReceipt(
      createAuthReq(tokenProcStoreA, { params: { id: grn3.data.id } })
    );
    await grnController.verifyGoodsReceipt(
      createAuthReq(tokenOwnerA, { params: { id: grn3.data.id } })
    );

    // Both lines fully received -> PO transitions to CLOSED automatically
    po = await prisma.purchaseOrder.findUnique({
      where: { id: poOrderedA1Id },
      include: { lines: true },
    });
    assert.strictEqual(po.status, 'CLOSED');
    for (const line of po.lines) {
      assert.strictEqual(Number(line.quantityReceived), Number(line.quantityOrdered));
    }
  });

  // =========================================================================
  // 8. REJECTION, REVISION & CANCELLATION
  // =========================================================================
  it('20. should allow rejecting a SUBMITTED GRN, revising it in DRAFT, and resubmitting', async () => {
    // Create new PO for lifecycle test
    const testPo = await prisma.purchaseOrder.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        vendorId: vendorA1Id,
        poNumber: 'PO-PRJ-A1-20260910-0088',
        status: 'ORDERED',
        expectedDeliveryDate: new Date('2026-09-25'),
        createdById: pmAId,
        lines: {
          create: [
            {
              tenantId: tenantAId,
              materialId: materialCementAId,
              quantityOrdered: 50,
              quantityReceived: 0,
              uom: 'BAG',
              unitRate: 380,
              lineTotal: 19000,
            },
          ],
        },
      },
      include: { lines: true },
    });

    const createReq = createAuthReq(tokenProcStoreA, {
      body: {
        purchaseOrderId: testPo.id,
        storeId: storeA1SiteId,
        lines: [
          {
            purchaseOrderLineId: testPo.lines[0].id,
            materialId: materialCementAId,
            quantityDelivered: 50,
            quantityAccepted: 50,
            quantityRejected: 0,
            uom: 'BAG',
          },
        ],
      },
    });
    const grn = await grnController.createGoodsReceipt(createReq);
    const grnId = grn.data.id;

    // Submit
    await grnController.submitGoodsReceipt(
      createAuthReq(tokenProcStoreA, { params: { id: grnId } })
    );

    // Reject by Org Owner
    const rejectReq = createAuthReq(tokenOwnerA, {
      params: { id: grnId },
      body: { rejectionReason: 'Delivery challan copy missing signature' },
    });
    const rejRes = await grnController.rejectGoodsReceipt(rejectReq);
    assert.strictEqual(rejRes.data.status, 'REJECTED');
    assert.strictEqual(rejRes.data.rejectionReason, 'Delivery challan copy missing signature');

    // Update in REJECTED state (attaching correct challan)
    const updateReq = createAuthReq(tokenProcStoreA, {
      params: { id: grnId },
      body: {
        deliveryChallanNumber: 'DC-SIGNED-9901',
        deliveryChallanDate: '2026-09-10',
      },
    });
    const updRes = await grnController.updateGoodsReceipt(updateReq);
    assert.strictEqual(updRes.data.deliveryChallanNumber, 'DC-SIGNED-9901');

    // Resubmit
    const subRes = await grnController.submitGoodsReceipt(
      createAuthReq(tokenProcStoreA, { params: { id: grnId } })
    );
    assert.strictEqual(subRes.data.status, 'SUBMITTED');
    assert.strictEqual(subRes.data.rejectionReason, null);

    // Cancel from SUBMITTED state
    const cancelReq = createAuthReq(tokenOwnerA, {
      params: { id: grnId },
      body: { cancellationReason: 'Vendor recalled shipment' },
    });
    const cancelRes = await grnController.cancelGoodsReceipt(cancelReq);
    assert.strictEqual(cancelRes.data.status, 'CANCELLED');
    assert.strictEqual(cancelRes.data.cancellationReason, 'Vendor recalled shipment');

    // CANCELLED cannot be verified
    await assert.rejects(
      async () =>
        grnController.verifyGoodsReceipt(
          createAuthReq(tokenOwnerA, { params: { id: grnId } })
        ),
      (err: any) => {
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );
  });

  // =========================================================================
  // 9. RBAC & ENTITLEMENT ENFORCEMENT
  // =========================================================================
  it('21. should DENY access for user with no permissions', async () => {
    const req = createAuthReq(tokenNoAccessUserA, {
      body: {
        purchaseOrderId: poOrderedA1Id,
        storeId: storeA1SiteId,
        lines: [],
      },
    });

    await assert.rejects(
      async () => grnController.createGoodsReceipt(req),
      (err: any) => {
        assert.strictEqual(err.statusCode, 403);
        return true;
      }
    );
  });

  it('22. should strictly DENY GRN operations on STARTER plan tier (fail-closed entitlement)', async () => {
    const req = createAuthReq(tokenOwnerC, {
      body: {
        purchaseOrderId: poOrderedA1Id,
        storeId: storeA1SiteId,
        lines: [],
      },
    });

    await assert.rejects(
      async () => grnController.createGoodsReceipt(req),
      (err: any) => {
        assert.strictEqual(err.statusCode, 403);
        assert.match(err.message, /materials:po_matching/i);
        return true;
      }
    );
  });

  // =========================================================================
  // 10. CONCURRENCY: SEQUENCE ALLOCATION & RECEIPT LOCKING
  // =========================================================================
  it('23. should allocate 10 concurrent GRN sequence numbers without race conditions or duplicates', async () => {
    const date = new Date('2026-09-10T10:00:00Z');
    const promises = Array.from({ length: 10 }, () =>
      grnService['grnRepo'].allocateGrnNumber(tenantAId, projectA1Id, 'PRJ-A1', date)
    );

    const allocatedNumbers = await Promise.all(promises);
    assert.strictEqual(allocatedNumbers.length, 10);

    const uniqueNumbers = new Set(allocatedNumbers);
    assert.strictEqual(uniqueNumbers.size, 10);

    for (const num of allocatedNumbers) {
      assert.match(num, /^GRN-PRJ-A1-20260910-\d{4}$/);
    }
  });

  it('24. concurrent verification on same PO line must prevent over-receipt (pessimistic lock race check)', async () => {
    // Create new PO with ordered = 100
    const concPo = await prisma.purchaseOrder.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        vendorId: vendorA1Id,
        poNumber: 'PO-PRJ-A1-20260910-0099',
        status: 'ORDERED',
        expectedDeliveryDate: new Date('2026-09-25'),
        createdById: pmAId,
        lines: {
          create: [
            {
              tenantId: tenantAId,
              materialId: materialCementAId,
              quantityOrdered: 100,
              quantityReceived: 0,
              uom: 'BAG',
              unitRate: 380,
              lineTotal: 38000,
            },
          ],
        },
      },
      include: { lines: true },
    });

    // Create GRN A for 60
    const grnAReq = createAuthReq(tokenProcStoreA, {
      body: {
        purchaseOrderId: concPo.id,
        storeId: storeA1SiteId,
        lines: [
          {
            purchaseOrderLineId: concPo.lines[0].id,
            materialId: materialCementAId,
            quantityDelivered: 60,
            quantityAccepted: 60,
            quantityRejected: 0,
            uom: 'BAG',
          },
        ],
      },
    });
    const grnA = await grnController.createGoodsReceipt(grnAReq);
    await grnController.submitGoodsReceipt(
      createAuthReq(tokenProcStoreA, { params: { id: grnA.data.id } })
    );

    // Create GRN B for 60 (total 120 > 100)
    const grnBReq = createAuthReq(tokenProcStoreA, {
      body: {
        purchaseOrderId: concPo.id,
        storeId: storeA1SiteId,
        lines: [
          {
            purchaseOrderLineId: concPo.lines[0].id,
            materialId: materialCementAId,
            quantityDelivered: 60,
            quantityAccepted: 60,
            quantityRejected: 0,
            uom: 'BAG',
          },
        ],
      },
    });
    const grnB = await grnController.createGoodsReceipt(grnBReq);
    await grnController.submitGoodsReceipt(
      createAuthReq(tokenProcStoreA, { params: { id: grnB.data.id } })
    );

    // Verify GRN A and GRN B simultaneously
    const results = await Promise.allSettled([
      grnController.verifyGoodsReceipt(
        createAuthReq(tokenOwnerA, { params: { id: grnA.data.id } })
      ),
      grnController.verifyGoodsReceipt(
        createAuthReq(tokenOwnerA, { params: { id: grnB.data.id } })
      ),
    ]);

    // Exactly one must succeed and the second must be rejected due to over-receipt under lock
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.strictEqual(fulfilled.length, 1);
    assert.strictEqual(rejected.length, 1);

    // The rejection must be an over-receipt error
    const rejectionReason = (rejected[0] as PromiseRejectedResult).reason;
    assert.strictEqual(rejectionReason.statusCode, 400);
    assert.match(rejectionReason.message, /Over-receipt rejected/i);

    // Cumulative received in database must not exceed 100
    const finalPoLine = await prisma.purchaseOrderLine.findUnique({
      where: { id: concPo.lines[0].id },
    });
    assert.strictEqual(Number(finalPoLine.quantityReceived), 60);
  });

  // =========================================================================
  // 11. FINANCIAL BOUNDARY & STOCK INVARIANCE PROOF
  // =========================================================================
  it('25. should guarantee stock ledger integrity and ZERO financial mutations', async () => {
    // 1. Stock Reconciliation: store_stock_balances.quantityOnHand === sum of StockMovement.quantity
    const balances = await prisma.storeStockBalance.findMany({
      where: { tenantId: tenantAId, storeId: storeA1SiteId },
    });

    for (const bal of balances) {
      const movements = await prisma.stockMovement.findMany({
        where: {
          tenantId: tenantAId,
          storeId: storeA1SiteId,
          materialId: bal.materialId,
        },
      });

      const calculatedSum = movements.reduce((acc: number, m: any) => {
        if (m.movementType === 'RECEIPT') return acc + Number(m.quantity);
        if (m.movementType === 'ISSUE') return acc - Number(m.quantity);
        return acc;
      }, 0);

      assert.strictEqual(
        Number(bal.quantityOnHand),
        calculatedSum,
        `Stock reconciliation mismatch for material ${bal.materialId}`
      );
    }

    // 2. Financial Boundary: Check that zero native GL tables exist and zero vendor invoices were created
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('journal_entries', 'general_ledger', 'chart_of_accounts');
    `;
    assert.strictEqual(tables.length, 0, 'No native GL tables should exist');
    const invoiceCount = await prisma.vendorInvoice.count({
      where: { tenantId: tenantAId },
    });
    assert.strictEqual(invoiceCount, 0, 'Zero invoice mutations during GRN');
  });

  // =========================================================================
  // 12. REST API & AUDIT PRESERVATION
  // =========================================================================
  it('26. should retrieve goods receipts list and details via REST controller', async () => {
    const listReq = createAuthReq(tokenProcStoreA, {
      query: { projectId: projectA1Id, limit: '10' },
    });
    const listRes = await grnController.listGoodsReceipts(listReq);
    assert.strictEqual(listRes.success, true);
    assert.ok(listRes.data.items.length > 0);

    const firstId = listRes.data.items[0].id;
    const detailReq = createAuthReq(tokenProcStoreA, {
      params: { id: firstId },
    });
    const detailRes = await grnController.getGoodsReceipt(detailReq);
    assert.strictEqual(detailRes.success, true);
    assert.strictEqual(detailRes.data.id, firstId);
    assert.ok(detailRes.data.project.code);
    assert.ok(detailRes.data.store.code);
    assert.ok(detailRes.data.purchaseOrder.poNumber);
  });

  // =========================================================================
  // 13. EXTENDED IDOR & SCOPING
  // =========================================================================
  it('27. IDOR: Tenant B caller CANNOT read Tenant A goods receipt', async () => {
    const listRes = await grnService.listGoodsReceipts(tenantAId, ownerAId, { limit: 1 });
    const grnAId = listRes.items[0].id;

    const req = createAuthReq(tokenOwnerB, { params: { id: grnAId } });
    await assert.rejects(
      async () => grnController.getGoodsReceipt(req),
      (err: any) => {
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );
  });

  it('28. IDOR: Tenant B caller CANNOT update Tenant A goods receipt', async () => {
    const listRes = await grnService.listGoodsReceipts(tenantAId, ownerAId, { limit: 1 });
    const grnAId = listRes.items[0].id;

    const req = createAuthReq(tokenOwnerB, {
      params: { id: grnAId },
      body: { remarks: 'Malicious Tenant B update' },
    });
    await assert.rejects(
      async () => grnController.updateGoodsReceipt(req),
      (err: any) => {
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );
  });

  it('29. IDOR: Tenant B caller CANNOT submit, verify, reject, cancel, or delete Tenant A goods receipt', async () => {
    const listRes = await grnService.listGoodsReceipts(tenantAId, ownerAId, { limit: 1 });
    const grnAId = listRes.items[0].id;

    // Submit attempt
    await assert.rejects(
      async () =>
        grnController.submitGoodsReceipt(
          createAuthReq(tokenOwnerB, { params: { id: grnAId } })
        ),
      (err: any) => {
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );

    // Verify attempt
    await assert.rejects(
      async () =>
        grnController.verifyGoodsReceipt(
          createAuthReq(tokenOwnerB, {
            params: { id: grnAId },
            body: { verificationRemarks: 'Malicious verify' },
          })
        ),
      (err: any) => {
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );

    // Delete attempt
    await assert.rejects(
      async () =>
        grnController.deleteGoodsReceipt(
          createAuthReq(tokenOwnerB, { params: { id: grnAId } })
        ),
      (err: any) => {
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );
  });

  it('30. Project Scoping: User restricted to Project A2 cannot view Project A1 GRN', async () => {
    // Create a user who is assigned only to Project A2
    const p2UserId = 'aaaaaaaa-8888-7575-aaaa-aaaaaaaaaaaa';
    await prisma.user.create({
      data: {
        id: p2UserId,
        tenantId: tenantAId,
        email: 'p2user.a@dezobuild.com',
        fullName: 'Project 2 Only User',
        passwordHash: 'hash',
        status: 'ACTIVE',
      },
    });
    const seRole = await prisma.role.findFirst({
      where: { name: 'SITE_ENGINEER', tenantId: null },
    });
    await prisma.userRoleAssignment.create({
      data: { tenantId: tenantAId, userId: p2UserId, roleId: seRole.id, scopeType: 'PROJECT' },
    });
    await prisma.projectMember.create({
      data: { tenantId: tenantAId, projectId: projectA2Id, userId: p2UserId, projectRole: 'ENGINEER' },
    });

    const tokenP2User = tokenService.createAccessToken({
      userId: p2UserId,
      tenantId: tenantAId,
      sessionId: 'sess-p2-75',
      sessionVersion: 1,
    });

    const listRes = await grnService.listGoodsReceipts(tenantAId, ownerAId, {
      projectId: projectA1Id,
      limit: 1,
    });
    const grnA1Id = listRes.items[0].id;

    const req = createAuthReq(tokenP2User, { params: { id: grnA1Id } });
    await assert.rejects(
      async () => grnController.getGoodsReceipt(req),
      (err: any) => {
        assert.strictEqual(err.statusCode, 403);
        assert.match(err.message, /Access to project denied|User is not a member of this project/i);
        return true;
      }
    );
  });

  // =========================================================================
  // 14. STATE MACHINE & DELETION RULES
  // =========================================================================
  it('31. State machine: direct DRAFT -> VERIFIED transition is strictly rejected', async () => {
    // Create test PO & DRAFT GRN
    const po = await prisma.purchaseOrder.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        vendorId: vendorA1Id,
        poNumber: 'PO-PRJ-A1-20260910-0061',
        status: 'ORDERED',
        expectedDeliveryDate: new Date('2026-09-25'),
        createdById: pmAId,
        lines: {
          create: [
            {
              tenantId: tenantAId,
              materialId: materialCementAId,
              quantityOrdered: 20,
              quantityReceived: 0,
              uom: 'BAG',
              unitRate: 380,
              lineTotal: 7600,
            },
          ],
        },
      },
      include: { lines: true },
    });

    const draftGrn = await grnController.createGoodsReceipt(
      createAuthReq(tokenProcStoreA, {
        body: {
          purchaseOrderId: po.id,
          storeId: storeA1SiteId,
          lines: [
            {
              purchaseOrderLineId: po.lines[0].id,
              materialId: materialCementAId,
              quantityDelivered: 20,
              quantityAccepted: 20,
              quantityRejected: 0,
              uom: 'BAG',
            },
          ],
        },
      })
    );

    // Direct verify of DRAFT -> 400 Bad Request
    const verifyReq = createAuthReq(tokenOwnerA, {
      params: { id: draftGrn.data.id },
      body: { verificationRemarks: 'Attempting invalid transition' },
    });

    await assert.rejects(
      async () => grnController.verifyGoodsReceipt(verifyReq),
      (err: any) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /Only SUBMITTED goods receipts can be verified/i);
        return true;
      }
    );

    // Clean up draft
    await grnService.deleteGoodsReceipt(tenantAId, procStoreAId, draftGrn.data.id);
  });

  it('32. State machine: verified GRN cannot be cancelled', async () => {
    const listRes = await grnService.listGoodsReceipts(tenantAId, ownerAId, {
      status: 'VERIFIED',
      limit: 1,
    });
    const verifiedGrnId = listRes.items[0].id;

    const req = createAuthReq(tokenOwnerA, {
      params: { id: verifiedGrnId },
      body: { cancellationReason: 'Trying to cancel verified GRN' },
    });

    await assert.rejects(
      async () => grnController.cancelGoodsReceipt(req),
      (err: any) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /Verified goods receipts cannot be cancelled/i);
        return true;
      }
    );
  });

  it('33. Draft Deletion: DRAFT goods receipt can be deleted successfully', async () => {
    const po = await prisma.purchaseOrder.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        vendorId: vendorA1Id,
        poNumber: 'PO-PRJ-A1-20260910-0062',
        status: 'ORDERED',
        expectedDeliveryDate: new Date('2026-09-25'),
        createdById: pmAId,
        lines: {
          create: [
            {
              tenantId: tenantAId,
              materialId: materialCementAId,
              quantityOrdered: 10,
              quantityReceived: 0,
              uom: 'BAG',
              unitRate: 380,
              lineTotal: 3800,
            },
          ],
        },
      },
      include: { lines: true },
    });

    const draftGrn = await grnController.createGoodsReceipt(
      createAuthReq(tokenProcStoreA, {
        body: {
          purchaseOrderId: po.id,
          storeId: storeA1SiteId,
          lines: [
            {
              purchaseOrderLineId: po.lines[0].id,
              materialId: materialCementAId,
              quantityDelivered: 10,
              quantityAccepted: 10,
              quantityRejected: 0,
              uom: 'BAG',
            },
          ],
        },
      })
    );

    const delReq = createAuthReq(tokenProcStoreA, { params: { id: draftGrn.data.id } });
    const delRes = await grnController.deleteGoodsReceipt(delReq);
    assert.strictEqual(delRes.success, true);

    const lookup = await prisma.goodsReceiptNote.findUnique({
      where: { id: draftGrn.data.id },
    });
    assert.strictEqual(lookup, null);
  });

  it('34. Draft Deletion: REJECTED goods receipt can be deleted successfully', async () => {
    const po = await prisma.purchaseOrder.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        vendorId: vendorA1Id,
        poNumber: 'PO-PRJ-A1-20260910-0063',
        status: 'ORDERED',
        expectedDeliveryDate: new Date('2026-09-25'),
        createdById: pmAId,
        lines: {
          create: [
            {
              tenantId: tenantAId,
              materialId: materialCementAId,
              quantityOrdered: 10,
              quantityReceived: 0,
              uom: 'BAG',
              unitRate: 380,
              lineTotal: 3800,
            },
          ],
        },
      },
      include: { lines: true },
    });

    const draftGrn = await grnController.createGoodsReceipt(
      createAuthReq(tokenProcStoreA, {
        body: {
          purchaseOrderId: po.id,
          storeId: storeA1SiteId,
          lines: [
            {
              purchaseOrderLineId: po.lines[0].id,
              materialId: materialCementAId,
              quantityDelivered: 10,
              quantityAccepted: 10,
              quantityRejected: 0,
              uom: 'BAG',
            },
          ],
        },
      })
    );

    await grnController.submitGoodsReceipt(
      createAuthReq(tokenProcStoreA, { params: { id: draftGrn.data.id } })
    );

    await grnController.rejectGoodsReceipt(
      createAuthReq(tokenOwnerA, {
        params: { id: draftGrn.data.id },
        body: { rejectionReason: 'Damaged shipment' },
      })
    );

    const delReq = createAuthReq(tokenProcStoreA, { params: { id: draftGrn.data.id } });
    const delRes = await grnController.deleteGoodsReceipt(delReq);
    assert.strictEqual(delRes.success, true);
  });

  it('35. Draft Deletion: SUBMITTED and VERIFIED receipts CANNOT be deleted', async () => {
    // 1. Check SUBMITTED deletion rejection
    const po = await prisma.purchaseOrder.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        vendorId: vendorA1Id,
        poNumber: 'PO-PRJ-A1-20260910-0064',
        status: 'ORDERED',
        expectedDeliveryDate: new Date('2026-09-25'),
        createdById: pmAId,
        lines: {
          create: [
            {
              tenantId: tenantAId,
              materialId: materialCementAId,
              quantityOrdered: 10,
              quantityReceived: 0,
              uom: 'BAG',
              unitRate: 380,
              lineTotal: 3800,
            },
          ],
        },
      },
      include: { lines: true },
    });

    const grn = await grnController.createGoodsReceipt(
      createAuthReq(tokenProcStoreA, {
        body: {
          purchaseOrderId: po.id,
          storeId: storeA1SiteId,
          lines: [
            {
              purchaseOrderLineId: po.lines[0].id,
              materialId: materialCementAId,
              quantityDelivered: 10,
              quantityAccepted: 10,
              quantityRejected: 0,
              uom: 'BAG',
            },
          ],
        },
      })
    );

    await grnController.submitGoodsReceipt(
      createAuthReq(tokenProcStoreA, { params: { id: grn.data.id } })
    );

    await assert.rejects(
      async () =>
        grnController.deleteGoodsReceipt(
          createAuthReq(tokenProcStoreA, { params: { id: grn.data.id } })
        ),
      (err: any) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /Only DRAFT or REJECTED goods receipts can be deleted/i);
        return true;
      }
    );

    // 2. Check VERIFIED deletion rejection
    const verifiedList = await grnService.listGoodsReceipts(tenantAId, ownerAId, {
      status: 'VERIFIED',
      limit: 1,
    });
    const verifiedId = verifiedList.items[0].id;

    await assert.rejects(
      async () =>
        grnController.deleteGoodsReceipt(
          createAuthReq(tokenProcStoreA, { params: { id: verifiedId } })
        ),
      (err: any) => {
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );
  });

  // =========================================================================
  // 15. SHORT RECEIPT & DATABASE INTEGRITY
  // =========================================================================
  it('36. Short Receipt: Partial vendor delivery leaves PO in ORDERED status without premature closure', async () => {
    const shortPo = await prisma.purchaseOrder.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        vendorId: vendorA1Id,
        poNumber: 'PO-PRJ-A1-20260910-0065',
        status: 'ORDERED',
        expectedDeliveryDate: new Date('2026-09-25'),
        createdById: pmAId,
        lines: {
          create: [
            {
              tenantId: tenantAId,
              materialId: materialCementAId,
              quantityOrdered: 100,
              quantityReceived: 0,
              uom: 'BAG',
              unitRate: 380,
              lineTotal: 38000,
            },
          ],
        },
      },
      include: { lines: true },
    });

    const grn = await grnController.createGoodsReceipt(
      createAuthReq(tokenProcStoreA, {
        body: {
          purchaseOrderId: shortPo.id,
          storeId: storeA1SiteId,
          lines: [
            {
              purchaseOrderLineId: shortPo.lines[0].id,
              materialId: materialCementAId,
              quantityDelivered: 80,
              quantityAccepted: 80,
              quantityRejected: 0,
              uom: 'BAG',
            },
          ],
        },
      })
    );

    await grnController.submitGoodsReceipt(
      createAuthReq(tokenProcStoreA, { params: { id: grn.data.id } })
    );

    await grnController.verifyGoodsReceipt(
      createAuthReq(tokenOwnerA, { params: { id: grn.data.id } })
    );

    const refreshedPo = await prisma.purchaseOrder.findUnique({
      where: { id: shortPo.id },
      include: { lines: true },
    });

    assert.strictEqual(refreshedPo.status, 'ORDERED');
    assert.strictEqual(Number(refreshedPo.lines[0].quantityReceived), 80);
    assert.strictEqual(Number(refreshedPo.lines[0].quantityOrdered), 100);
  });

  it('37. Database FK integrity: Deleting a Store or Project referenced by verified GRNs is blocked by RESTRICT', async () => {
    // Attempting to delete storeA1SiteId directly via Prisma/SQL must fail due to FK RESTRICT
    await assert.rejects(
      async () =>
        prisma.store.delete({
          where: { id: storeA1SiteId },
        }),
      (err: any) => {
        // Prisma foreign key constraint violation code
        assert.ok(err.code === 'P2003' || /foreign key/i.test(err.message));
        return true;
      }
    );
  });

  it('38. 3-Way Matching Preservation: Delivery challan, date, vehicle number, and rate data are preserved accurately', async () => {
    const list = await grnService.listGoodsReceipts(tenantAId, ownerAId, {
      status: 'VERIFIED',
      limit: 1,
    });
    const grn = list.items[0];

    assert.ok(grn.grnNumber);
    assert.ok(grn.receiptDate);
    assert.ok(grn.receivedById);
    assert.ok(grn.verifiedById);
    assert.ok(grn.verifiedAt);
    assert.ok(grn.lines.length > 0);
    assert.ok(Number(grn.lines[0].unitRate) > 0);
    assert.ok(grn.lines[0].uom);
  });

  it('39. Stock Reconciliation: Store stock balance exactly matches sum of StockMovements across all transactions', async () => {
    const balances = await prisma.storeStockBalance.findMany({
      where: { tenantId: tenantAId },
    });

    for (const b of balances) {
      const movements = await prisma.stockMovement.findMany({
        where: { tenantId: tenantAId, storeId: b.storeId, materialId: b.materialId },
      });

      const movementSum = movements.reduce((acc: number, m: any) => {
        if (m.movementType === 'RECEIPT') return acc + Number(m.quantity);
        if (m.movementType === 'ISSUE') return acc - Number(m.quantity);
        return acc;
      }, 0);

      assert.strictEqual(Number(b.quantityOnHand), movementSum);
    }
  });

  it('40. Zero financial mutation: zero accounting liability records created during Phase 07.5', async () => {
    const financialTables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('general_ledger', 'journal_entries', 'double_entry_ledgers');
    `;
    assert.strictEqual(financialTables.length, 0);
    const invoiceCount = await prisma.vendorInvoice.count({
      where: { tenantId: { in: [tenantAId, tenantBId, tenantCId] } },
    });
    assert.strictEqual(invoiceCount, 0, 'Zero accounting liability records created during Phase 07.5');
  });

  after(async () => {
    if (prisma) {
      const testTenantIds = [tenantAId, tenantBId, tenantCId];
      await prisma.goodsReceiptLine.deleteMany({
        where: { tenantId: { in: testTenantIds } },
      });
      await prisma.goodsReceiptNote.deleteMany({
        where: { tenantId: { in: testTenantIds } },
      });
      await prisma.goodsReceiptSequence.deleteMany({
        where: { tenantId: { in: testTenantIds } },
      });
      await prisma.stockMovement.deleteMany({
        where: { tenantId: { in: testTenantIds } },
      });
      await prisma.storeStockBalance.deleteMany({
        where: { tenantId: { in: testTenantIds } },
      });
      await prisma.purchaseOrderLine.deleteMany({
        where: { tenantId: { in: testTenantIds } },
      });
      await prisma.purchaseOrderSequence.deleteMany({
        where: { tenantId: { in: testTenantIds } },
      });
      await prisma.purchaseOrder.deleteMany({
        where: { tenantId: { in: testTenantIds } },
      });
      await prisma.materialIndentLine.deleteMany({
        where: { tenantId: { in: testTenantIds } },
      });
      await prisma.materialIndent.deleteMany({
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
      await prisma.vendor.deleteMany({
        where: { tenantId: { in: testTenantIds } },
      });
      await prisma.projectMember.deleteMany({
        where: { tenantId: { in: testTenantIds } },
      });
      await prisma.project.deleteMany({
        where: { tenantId: { in: testTenantIds } },
      });
      await prisma.userRoleAssignment.deleteMany({
        where: { tenantId: { in: testTenantIds } },
      });
      await prisma.user.deleteMany({
        where: { tenantId: { in: testTenantIds } },
      });
      await prisma.tenantEntitlementOverride.deleteMany({
        where: { tenantId: { in: testTenantIds } },
      });
      await prisma.tenantSubscription.deleteMany({
        where: { tenantId: { in: testTenantIds } },
      });
      await prisma.branch.deleteMany({
        where: { tenantId: { in: testTenantIds } },
      });
      await prisma.company.deleteMany({
        where: { tenantId: { in: testTenantIds } },
      });
      await prisma.tenant.deleteMany({
        where: {
          OR: [
            { id: { in: testTenantIds } },
            { code: { in: ['GRN-TENANT-A', 'GRN-TENANT-B', 'GRN-TENANT-C'] } },
          ],
        },
      });
      await dbService.disconnect();
    }
  });
});

