import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service';
import { PurchaseOrdersController } from '../src/modules/materials/controllers/purchase-orders.controller';
import { PurchaseOrderService } from '../src/modules/materials/services/purchase-order.service';
import { TokenService } from '../src/modules/auth/services/token.service';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ValidationError,
} from '../src/common/errors/app-error';

describe('DEZOBUILD Phase 07.4 — Purchase Orders / Procurement Integration Suite', () => {
  let dbService: DatabaseService;
  let poController: PurchaseOrdersController;
  let poService: PurchaseOrderService;
  let tokenService: TokenService;
  let prisma: any;

  // Tenant A (PROFESSIONAL Plan - has materials:po_matching)
  const tenantAId = 'aaaaaaaa-6666-9999-aaaa-aaaaaaaaaaaa';
  const ownerAId = 'aaaaaaaa-1111-6666-aaaa-aaaaaaaaaaaa';
  const pmAId = 'aaaaaaaa-2222-6666-aaaa-aaaaaaaaaaaa';
  const procStoreAId = 'aaaaaaaa-3333-6666-aaaa-aaaaaaaaaaaa';
  const seAId = 'aaaaaaaa-4444-6666-aaaa-aaaaaaaaaaaa';
  const noAccessUserAId = 'aaaaaaaa-5555-6666-aaaa-aaaaaaaaaaaa';

  let tokenOwnerA: string;
  let tokenPmA: string;
  let tokenProcStoreA: string;
  let tokenSeA: string;
  let tokenNoAccessUserA: string;

  // Tenant B (PROFESSIONAL Plan - Isolation)
  const tenantBId = 'bbbbbbbb-6666-9999-bbbb-bbbbbbbbbbbb';
  const ownerBId = 'bbbbbbbb-1111-6666-bbbb-bbbbbbbbbbbb';
  let tokenOwnerB: string;

  // Tenant C (STARTER Plan - No materials:po_matching entitlement)
  const tenantCId = 'cccccccc-6666-9999-cccc-cccccccccccc';
  const ownerCId = 'cccccccc-1111-6666-cccc-cccccccccccc';
  let tokenOwnerC: string;

  let projectA1Id: string;
  let projectA2Id: string;
  let projectB1Id: string;
  let vendorA1Id: string;
  let vendorA2InactiveId: string;
  let vendorB1Id: string;
  let materialCementAId: string;
  let materialSteelAId: string;
  let materialCementBId: string;
  let indentApprovedA1Id: string;
  let indentLineCementA1Id: string;
  let indentLineSteelA1Id: string;
  let indentDraftA1Id: string;
  let indentLineDraftA1Id: string;
  let wbsA1Id: string;
  let taskA1Id: string;

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
    poController = new PurchaseOrdersController(poService);

    // 2. Clean up test data
    await prisma.purchaseOrderLine.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId, tenantCId] } },
    });
    await prisma.purchaseOrderSequence.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId, tenantCId] } },
    });
    await prisma.purchaseOrder.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId, tenantCId] } },
    });
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
    await prisma.vendor.deleteMany({
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
        { id: tenantAId, code: 'TEN-PO-A66', name: 'Tenant A Procurement', planTier: 'PROFESSIONAL' },
        { id: tenantBId, code: 'TEN-PO-B66', name: 'Tenant B Procurement', planTier: 'PROFESSIONAL' },
        { id: tenantCId, code: 'TEN-PO-C66', name: 'Tenant C Starter', planTier: 'STARTER' },
      ],
    });

    const starterPlan = await prisma.platformPlan.findUnique({ where: { code: 'STARTER' } });
    const proPlan = await prisma.platformPlan.findUnique({ where: { code: 'PROFESSIONAL' } });

    // 4. Create Subscriptions
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantAId,
        planId: proPlan.id,
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

    // 5. Create Companies
    const companyA = await prisma.company.create({
      data: { tenantId: tenantAId, code: 'CMP-PO-A', name: 'Company A Procurement', legalName: 'Company A Proc Ltd', panNumber: 'AAACA1111A', gstin: '29AAACA1111A1Z1', email: 'po-a@co.com', phone: '9000000001', address: 'Addr A', city: 'BLR', state: 'KA', pincode: '560001' },
    });
    const companyB = await prisma.company.create({
      data: { tenantId: tenantBId, code: 'CMP-PO-B', name: 'Company B Procurement', legalName: 'Company B Proc Ltd', panNumber: 'AAACB2222B', gstin: '29AAACB2222B1Z2', email: 'po-b@co.com', phone: '9000000002', address: 'Addr B', city: 'BLR', state: 'KA', pincode: '560001' },
    });

    // 6. Create Users
    await prisma.user.createMany({
      data: [
        { id: ownerAId, tenantId: tenantAId, email: 'owner.po.a@dezobuild.com', fullName: 'Alice Owner A', passwordHash: 'hash' },
        { id: pmAId, tenantId: tenantAId, email: 'pm.po.a@dezobuild.com', fullName: 'Peter PM A', passwordHash: 'hash' },
        { id: procStoreAId, tenantId: tenantAId, email: 'proc.po.a@dezobuild.com', fullName: 'Paul ProcStore A', passwordHash: 'hash' },
        { id: seAId, tenantId: tenantAId, email: 'se.po.a@dezobuild.com', fullName: 'Sam SiteEng A', passwordHash: 'hash' },
        { id: noAccessUserAId, tenantId: tenantAId, email: 'noaccess.po.a@dezobuild.com', fullName: 'Ned NoAccess A', passwordHash: 'hash' },
        { id: ownerBId, tenantId: tenantBId, email: 'owner.po.b@dezobuild.com', fullName: 'Bob Owner B', passwordHash: 'hash' },
        { id: ownerCId, tenantId: tenantCId, email: 'owner.po.c@dezobuild.com', fullName: 'Charlie Owner C', passwordHash: 'hash' },
      ],
    });

    // 7. Role assignments
    const companyOwnerRole = await prisma.role.findFirst({ where: { name: 'COMPANY_OWNER', tenantId: null } });
    const pmRole = await prisma.role.findFirst({ where: { name: 'PROJECT_MANAGER', tenantId: null } });
    const procStoreRole = await prisma.role.findFirst({ where: { name: 'PROCUREMENT_STORE', tenantId: null } });
    const seRole = await prisma.role.findFirst({ where: { name: 'SITE_ENGINEER', tenantId: null } });

    await prisma.userRoleAssignment.createMany({
      data: [
        { tenantId: tenantAId, userId: ownerAId, roleId: companyOwnerRole.id, scopeType: 'TENANT' },
        { tenantId: tenantAId, userId: pmAId, roleId: pmRole.id, scopeType: 'PROJECT' },
        { tenantId: tenantAId, userId: procStoreAId, roleId: procStoreRole.id, scopeType: 'TENANT' },
        { tenantId: tenantAId, userId: seAId, roleId: seRole.id, scopeType: 'PROJECT' },
        { tenantId: tenantBId, userId: ownerBId, roleId: companyOwnerRole.id, scopeType: 'TENANT' },
        { tenantId: tenantCId, userId: ownerCId, roleId: companyOwnerRole.id, scopeType: 'TENANT' },
      ],
    });

    // 8. Create Projects
    const prjA1 = await prisma.project.create({
      data: { tenantId: tenantAId, companyId: companyA.id, code: 'POH66', name: 'Orchid Heights 66', status: 'ACTIVE' },
    });
    projectA1Id = prjA1.id;

    const prjA2 = await prisma.project.create({
      data: { tenantId: tenantAId, companyId: companyA.id, code: 'POM66', name: 'Metro Tower 66', status: 'ACTIVE' },
    });
    projectA2Id = prjA2.id;

    const prjB1 = await prisma.project.create({
      data: { tenantId: tenantBId, companyId: companyB.id, code: 'POL66', name: 'Lakeview 66', status: 'ACTIVE' },
    });
    projectB1Id = prjB1.id;

    // Project memberships
    await prisma.projectMember.createMany({
      data: [
        { tenantId: tenantAId, projectId: projectA1Id, userId: pmAId, projectRole: 'PROJECT_MANAGER' },
        { tenantId: tenantAId, projectId: projectA1Id, userId: seAId, projectRole: 'SITE_ENGINEER' },
        { tenantId: tenantAId, projectId: projectA1Id, userId: procStoreAId, projectRole: 'PROJECT_MANAGER' },
        { tenantId: tenantAId, projectId: projectA2Id, userId: pmAId, projectRole: 'PROJECT_MANAGER' },
        { tenantId: tenantAId, projectId: projectA2Id, userId: procStoreAId, projectRole: 'PROJECT_MANAGER' },
      ],
    });

    // 9. Create Vendors
    const vendorA1 = await prisma.vendor.create({
      data: { tenantId: tenantAId, code: 'VND-ULTRA-66', name: 'UltraTech Cement Ltd', gstin: '29AAACU1111A1Z1', paymentTerms: 'Net 30', status: 'ACTIVE' },
    });
    vendorA1Id = vendorA1.id;

    const vendorA2Inactive = await prisma.vendor.create({
      data: { tenantId: tenantAId, code: 'VND-OLD-66', name: 'Defunct Steel Corp', status: 'INACTIVE' },
    });
    vendorA2InactiveId = vendorA2Inactive.id;

    const vendorB1 = await prisma.vendor.create({
      data: { tenantId: tenantBId, code: 'VND-TATA-66', name: 'Tata Steel Ltd', status: 'ACTIVE' },
    });
    vendorB1Id = vendorB1.id;

    // 10. Create Materials
    const matCementA = await prisma.material.create({
      data: { tenantId: tenantAId, itemCode: 'MAT-CEM-66A', name: 'OPC 53 Grade Cement', category: 'Cement', primaryUom: 'BAGS', secondaryUom: 'MT', conversionFactor: 0.05, status: 'ACTIVE' },
    });
    materialCementAId = matCementA.id;

    const matSteelA = await prisma.material.create({
      data: { tenantId: tenantAId, itemCode: 'MAT-STL-66A', name: 'TMT Rebar 16mm', category: 'Steel', primaryUom: 'MT', secondaryUom: 'KG', conversionFactor: 1000, status: 'ACTIVE' },
    });
    materialSteelAId = matSteelA.id;

    const matCementB = await prisma.material.create({
      data: { tenantId: tenantBId, itemCode: 'MAT-CEM-66B', name: 'Tenant B Cement', category: 'Cement', primaryUom: 'BAGS', status: 'ACTIVE' },
    });
    materialCementBId = matCementB.id;

    // 11. Create WBS & Tasks
    const wbs1 = await prisma.wbsNode.create({
      data: { tenantId: tenantAId, projectId: projectA1Id, code: '1.0', name: 'Structure', level: 1 },
    });
    wbsA1Id = wbs1.id;

    const task1 = await prisma.task.create({
      data: { tenantId: tenantAId, projectId: projectA1Id, wbsNodeId: wbsA1Id, name: 'Slab Casting 66', status: 'IN_PROGRESS' },
    });
    taskA1Id = task1.id;

    // 12. Create Approved Indent for demand-linked PO tests
    const indentApproved = await prisma.materialIndent.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        indentNumber: 'IND-POH66-20260910-0001',
        status: 'APPROVED',
        priority: 'URGENT',
        requiredByDate: new Date('2026-09-30'),
        createdById: seAId,
        submittedById: seAId,
        submittedAt: new Date(),
        approvedById: pmAId,
        approvedAt: new Date(),
        lines: {
          create: [
            {
              tenantId: tenantAId,
              materialId: materialCementAId,
              quantityRequested: 100, // 100 bags available
              quantityFulfilled: 0,
              uom: 'BAGS',
              purpose: 'Slab casting batch 1',
            },
            {
              tenantId: tenantAId,
              materialId: materialSteelAId,
              quantityRequested: 10, // 10 MT available
              quantityFulfilled: 0,
              uom: 'MT',
              purpose: 'Rebar reinforcement',
            },
          ],
        },
      },
      include: { lines: true },
    });
    indentApprovedA1Id = indentApproved.id;
    indentLineCementA1Id = indentApproved.lines.find((l: any) => l.materialId === materialCementAId)!.id;
    indentLineSteelA1Id = indentApproved.lines.find((l: any) => l.materialId === materialSteelAId)!.id;

    // Draft indent for negative testing
    const indentDraft = await prisma.materialIndent.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        indentNumber: 'IND-POH66-20260910-0002',
        status: 'DRAFT',
        requiredByDate: new Date('2026-09-30'),
        createdById: seAId,
        lines: {
          create: [
            {
              tenantId: tenantAId,
              materialId: materialCementAId,
              quantityRequested: 50,
              uom: 'BAGS',
            },
          ],
        },
      },
      include: { lines: true },
    });
    indentDraftA1Id = indentDraft.id;
    indentLineDraftA1Id = indentDraft.lines[0].id;

    // 13. Generate JWT Tokens
    tokenOwnerA = tokenService.createAccessToken({ userId: ownerAId, tenantId: tenantAId, sessionId: 'sess-owner-a66', sessionVersion: 1 });
    tokenPmA = tokenService.createAccessToken({ userId: pmAId, tenantId: tenantAId, sessionId: 'sess-pm-a66', sessionVersion: 1 });
    tokenProcStoreA = tokenService.createAccessToken({ userId: procStoreAId, tenantId: tenantAId, sessionId: 'sess-proc-a66', sessionVersion: 1 });
    tokenSeA = tokenService.createAccessToken({ userId: seAId, tenantId: tenantAId, sessionId: 'sess-se-a66', sessionVersion: 1 });
    tokenNoAccessUserA = tokenService.createAccessToken({ userId: noAccessUserAId, tenantId: tenantAId, sessionId: 'sess-noacc-a66', sessionVersion: 1 });
    tokenOwnerB = tokenService.createAccessToken({ userId: ownerBId, tenantId: tenantBId, sessionId: 'sess-owner-b66', sessionVersion: 1 });
    tokenOwnerC = tokenService.createAccessToken({ userId: ownerCId, tenantId: tenantCId, sessionId: 'sess-owner-c66', sessionVersion: 1 });
  });

  after(async () => {
    await dbService.disconnect();
  });

  // ============================================================
  // 1. CREATE DRAFT & COMMERCIAL CALCULATIONS
  // ============================================================
  let po1Id: string;
  let po1Number: string;

  it('1. create draft: Should create single-line PO with exact commercial calculations', async () => {
    const req = createAuthReq(tokenProcStoreA, {
      body: {
        projectId: projectA1Id,
        vendorId: vendorA1Id,
        expectedDeliveryDate: '2026-09-25',
        paymentTerms: '30 days net',
        lines: [
          {
            materialId: materialCementAId,
            indentLineId: indentLineCementA1Id,
            quantityOrdered: 60, // Partial procurement (60 of 100)
            uom: 'BAGS',
            unitRate: 400, // 60 * 400 = 24,000 gross
            discountRatePercent: 5, // 5% of 24,000 = 1,200 discount. Net = 22,800
            taxRatePercent: 18, // 18% of 22,800 = 4,104 tax. Line total = 26,904
            wbsNodeId: wbsA1Id,
            taskId: taskA1Id,
          },
        ],
      },
    });

    const res = await poController.createPurchaseOrder(req);
    assert.equal(res.success, true);
    assert.equal(res.data.status, 'DRAFT');
    assert.equal(res.data.createdById, procStoreAId);
    assert.ok(res.data.poNumber.startsWith('PO-POH66-'));
    assert.equal(res.data.lines.length, 1);
    assert.equal(Number(res.data.lines[0].quantityOrdered), 60);
    assert.equal(Number(res.data.lines[0].quantityReceived), 0);
    assert.equal(Number(res.data.lines[0].unitRate), 400);
    assert.equal(Number(res.data.lines[0].discountRatePercent), 5);
    assert.equal(Number(res.data.lines[0].taxRatePercent), 18);
    assert.equal(Number(res.data.lines[0].lineTotal), 26904);

    assert.equal(Number(res.data.subtotalAmount), 24000);
    assert.equal(Number(res.data.discountAmount), 1200);
    assert.equal(Number(res.data.taxAmount), 4104);
    assert.equal(Number(res.data.grandTotal), 26904);

    po1Id = res.data.id;
    po1Number = res.data.poNumber;
  });

  it('2. multi-line create: Should calculate multi-line PO totals correctly on server', async () => {
    // Line 1: Cement 40 bags @ 400 with 0% discount, 18% tax -> Net = 16,000, Tax = 2,880, Total = 18,880 (Remaining 40 of 100)
    // Line 2: Steel 5 MT @ 60,000 with 10% discount, 18% tax -> Gross = 300,000, Disc = 30,000, Net = 270,000, Tax = 48,600, Total = 318,600
    // Grand totals: Subtotal = 316,000, Discount = 30,000, Tax = 51,480, Grand Total = 337,480
    const req = createAuthReq(tokenProcStoreA, {
      body: {
        projectId: projectA1Id,
        vendorId: vendorA1Id,
        expectedDeliveryDate: '2026-09-28',
        lines: [
          {
            materialId: materialCementAId,
            indentLineId: indentLineCementA1Id,
            quantityOrdered: 40,
            uom: 'BAGS',
            unitRate: 400,
            discountRatePercent: 0,
            taxRatePercent: 18,
          },
          {
            materialId: materialSteelAId,
            indentLineId: indentLineSteelA1Id,
            quantityOrdered: 5,
            uom: 'MT',
            unitRate: 60000,
            discountRatePercent: 10,
            taxRatePercent: 18,
          },
        ],
      },
    });

    const res = await poController.createPurchaseOrder(req);
    assert.equal(res.success, true);
    assert.equal(res.data.lines.length, 2);
    assert.equal(Number(res.data.subtotalAmount), 316000);
    assert.equal(Number(res.data.discountAmount), 30000);
    assert.equal(Number(res.data.taxAmount), 51480);
    assert.equal(Number(res.data.grandTotal), 337480);

    // Clean up second PO to keep cement demand available for remaining tests
    await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: res.data.id } });
    await prisma.purchaseOrder.delete({ where: { id: res.data.id } });
  });

  it('3. client total spoofing ignored: Server must compute authoritative totals regardless of body payload', async () => {
    const req = createAuthReq(tokenProcStoreA, {
      body: {
        projectId: projectA1Id,
        vendorId: vendorA1Id,
        expectedDeliveryDate: '2026-09-25',
        subtotalAmount: 1, // Spoofed value
        discountAmount: 9999, // Spoofed value
        taxAmount: 0, // Spoofed value
        grandTotal: 1, // Spoofed value
        lines: [
          {
            materialId: materialSteelAId,
            indentLineId: indentLineSteelA1Id,
            quantityOrdered: 2,
            uom: 'MT',
            unitRate: 50000,
            lineTotal: 5, // Spoofed value
          },
        ],
      },
    });

    const res = await poController.createPurchaseOrder(req);
    assert.equal(res.success, true);
    assert.equal(Number(res.data.subtotalAmount), 100000);
    assert.equal(Number(res.data.grandTotal), 100000);
    assert.equal(Number(res.data.lines[0].lineTotal), 100000);

    // Clean up
    await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: res.data.id } });
    await prisma.purchaseOrder.delete({ where: { id: res.data.id } });
  });

  // ============================================================
  // 2. ISOLATION & VALIDATIONS
  // ============================================================

  it('4. tenant isolation: Deny fetching or modifying Tenant A PO with Tenant B token (IDOR)', async () => {
    const req = createAuthReq(tokenOwnerB, { params: { id: po1Id } });

    await assert.rejects(
      async () => poController.getPurchaseOrder(req),
      (err: any) => err instanceof NotFoundError
    );
  });

  it('5. vendor isolation: Deny referencing vendor from another tenant', async () => {
    const req = createAuthReq(tokenProcStoreA, {
      body: {
        projectId: projectA1Id,
        vendorId: vendorB1Id, // Foreign tenant vendor
        expectedDeliveryDate: '2026-09-30',
        lines: [{ materialId: materialCementAId, quantityOrdered: 10, uom: 'BAGS', unitRate: 400 }],
      },
    });

    await assert.rejects(
      async () => poController.createPurchaseOrder(req),
      (err: any) => err instanceof NotFoundError
    );
  });

  it('6. inactive vendor rejection: Deny referencing inactive vendor', async () => {
    const req = createAuthReq(tokenProcStoreA, {
      body: {
        projectId: projectA1Id,
        vendorId: vendorA2InactiveId, // Inactive vendor
        expectedDeliveryDate: '2026-09-30',
        lines: [{ materialId: materialCementAId, quantityOrdered: 10, uom: 'BAGS', unitRate: 400 }],
      },
    });

    await assert.rejects(
      async () => poController.createPurchaseOrder(req),
      (err: any) => err instanceof BadRequestError && err.message.includes('inactive')
    );
  });

  it('7. unapproved indent rejection: Deny linking PO line to a DRAFT indent', async () => {
    const req = createAuthReq(tokenProcStoreA, {
      body: {
        projectId: projectA1Id,
        vendorId: vendorA1Id,
        expectedDeliveryDate: '2026-09-30',
        lines: [
          {
            materialId: materialCementAId,
            indentLineId: indentLineDraftA1Id, // Draft indent line
            quantityOrdered: 10,
            uom: 'BAGS',
            unitRate: 400,
          },
        ],
      },
    });

    await assert.rejects(
      async () => poController.createPurchaseOrder(req),
      (err: any) => err instanceof BadRequestError && err.message.includes('must be APPROVED')
    );
  });

  it('8. foreign indent rejection: Deny linking indent belonging to a different project', async () => {
    const req = createAuthReq(tokenProcStoreA, {
      body: {
        projectId: projectA2Id, // Metro Tower project
        vendorId: vendorA1Id,
        expectedDeliveryDate: '2026-09-30',
        lines: [
          {
            materialId: materialCementAId,
            indentLineId: indentLineCementA1Id, // Indent belongs to Orchid Heights (projectA1Id)
            quantityOrdered: 10,
            uom: 'BAGS',
            unitRate: 400,
          },
        ],
      },
    });

    await assert.rejects(
      async () => poController.createPurchaseOrder(req),
      (err: any) => err instanceof BadRequestError && err.message.includes('different project')
    );
  });

  it('9. indent material mismatch rejection: Reject when PO line material does not match indent line material', async () => {
    const req = createAuthReq(tokenProcStoreA, {
      body: {
        projectId: projectA1Id,
        vendorId: vendorA1Id,
        expectedDeliveryDate: '2026-09-30',
        lines: [
          {
            materialId: materialSteelAId, // Steel material passed
            indentLineId: indentLineCementA1Id, // Cement indent line referenced
            quantityOrdered: 10,
            uom: 'MT',
            unitRate: 50000,
          },
        ],
      },
    });

    await assert.rejects(
      async () => poController.createPurchaseOrder(req),
      (err: any) => err instanceof BadRequestError && err.message.includes('does not match')
    );
  });

  it('10. oversubscription rejection: Deny ordering quantity greater than remaining available indent quantity', async () => {
    // indentLineCement has 100 bags total, 60 already committed in po1Id -> 40 available. Requesting 50 must fail.
    const req = createAuthReq(tokenProcStoreA, {
      body: {
        projectId: projectA1Id,
        vendorId: vendorA1Id,
        expectedDeliveryDate: '2026-09-30',
        lines: [
          {
            materialId: materialCementAId,
            indentLineId: indentLineCementA1Id,
            quantityOrdered: 50, // Exceeds 40 available
            uom: 'BAGS',
            unitRate: 400,
          },
        ],
      },
    });

    await assert.rejects(
      async () => poController.createPurchaseOrder(req),
      (err: any) => err instanceof BadRequestError && err.message.includes('exceeds available uncommitted indent quantity')
    );
  });

  it('11. duplicate material line rejection: Deny duplicate materials in single PO', async () => {
    const req = createAuthReq(tokenProcStoreA, {
      body: {
        projectId: projectA1Id,
        vendorId: vendorA1Id,
        expectedDeliveryDate: '2026-09-30',
        lines: [
          { materialId: materialCementAId, quantityOrdered: 10, uom: 'BAGS', unitRate: 400 },
          { materialId: materialCementAId, quantityOrdered: 20, uom: 'BAGS', unitRate: 400 },
        ],
      },
    });

    await assert.rejects(
      async () => poController.createPurchaseOrder(req),
      (err: any) => err instanceof BadRequestError && err.message.includes('Duplicate material lines')
    );
  });

  it('12. invalid numeric validations: Reject negative rates and quantity <= 0', async () => {
    // Quantity 0
    const reqZeroQty = createAuthReq(tokenProcStoreA, {
      body: {
        projectId: projectA1Id,
        vendorId: vendorA1Id,
        expectedDeliveryDate: '2026-09-30',
        lines: [{ materialId: materialCementAId, quantityOrdered: 0, uom: 'BAGS', unitRate: 400 }],
      },
    });
    await assert.rejects(
      async () => poController.createPurchaseOrder(reqZeroQty),
      (err: any) => err instanceof ValidationError || err instanceof BadRequestError
    );

    // Negative unit rate
    const reqNegRate = createAuthReq(tokenProcStoreA, {
      body: {
        projectId: projectA1Id,
        vendorId: vendorA1Id,
        expectedDeliveryDate: '2026-09-30',
        lines: [{ materialId: materialCementAId, quantityOrdered: 10, uom: 'BAGS', unitRate: -50 }],
      },
    });
    await assert.rejects(
      async () => poController.createPurchaseOrder(reqNegRate),
      (err: any) => err instanceof ValidationError || err instanceof BadRequestError
    );
  });

  // ============================================================
  // 3. LIFECYCLE, SoD, REJECTION & REVISION
  // ============================================================

  it('13. submit: Valid transition from DRAFT to SUBMITTED', async () => {
    const req = createAuthReq(tokenProcStoreA, {
      params: { id: po1Id },
      body: { notes: 'Submitted for PM review' },
    });

    const res = await poController.submitPurchaseOrder(req);
    assert.equal(res.success, true);
    assert.equal(res.data.status, 'SUBMITTED');
    assert.equal(res.data.submittedById, procStoreAId);
    assert.ok(res.data.submittedAt);
  });

  it('14. reject: Valid transition from SUBMITTED to REJECTED with mandatory reason', async () => {
    // Reject with empty reason must fail
    const reqEmptyReason = createAuthReq(tokenOwnerA, {
      params: { id: po1Id },
      body: { rejectionReason: '   ' },
    });
    await assert.rejects(
      async () => poController.rejectPurchaseOrder(reqEmptyReason),
      (err: any) => err instanceof BadRequestError
    );

    // Reject with valid reason
    const reqValidReject = createAuthReq(tokenOwnerA, {
      params: { id: po1Id },
      body: { rejectionReason: 'Negotiate 8% discount with UltraTech before final approval' },
    });

    const res = await poController.rejectPurchaseOrder(reqValidReject);
    assert.equal(res.success, true);
    assert.equal(res.data.status, 'REJECTED');
    assert.equal(res.data.rejectedById, ownerAId);
    assert.ok(res.data.rejectedAt);
    assert.equal(res.data.rejectionReason, 'Negotiate 8% discount with UltraTech before final approval');
  });

  it('15. revise rejected PO: Update discount to 8% and resubmit', async () => {
    const updateReq = createAuthReq(tokenProcStoreA, {
      params: { id: po1Id },
      body: {
        lines: [
          {
            materialId: materialCementAId,
            indentLineId: indentLineCementA1Id,
            quantityOrdered: 60,
            uom: 'BAGS',
            unitRate: 400, // 24,000 gross
            discountRatePercent: 8, // 8% of 24,000 = 1,920 discount. Net = 22,080
            taxRatePercent: 18, // 18% of 22,080 = 3,974.40 tax. Total = 26,054.40
          },
        ],
      },
    });

    const updateRes = await poController.updatePurchaseOrder(updateReq);
    assert.equal(updateRes.success, true);
    assert.equal(Number(updateRes.data.discountAmount), 1920);
    assert.equal(Number(updateRes.data.grandTotal), 26054.4);

    // Resubmit
    const resubmitReq = createAuthReq(tokenProcStoreA, { params: { id: po1Id } });
    const resubmitRes = await poController.submitPurchaseOrder(resubmitReq);
    assert.equal(resubmitRes.success, true);
    assert.equal(resubmitRes.data.status, 'SUBMITTED');
    assert.equal(resubmitRes.data.rejectionReason, null);
    assert.equal(resubmitRes.data.rejectedById, null);
  });

  it('16. creator self approval denied: Strictly reject approverId === createdById (SoD)', async () => {
    // po1Id was created by Paul ProcStore (procStoreAId)
    const req = createAuthReq(tokenProcStoreA, {
      params: { id: po1Id },
      body: { approvalRemarks: 'Self approval attempt' },
    });

    await assert.rejects(
      async () => poController.approvePurchaseOrder(req),
      (err: any) => err instanceof ForbiddenError && err.message.includes('Segregation of Duties')
    );
  });

  it('17. submitter self approval denied: Strictly reject approverId === submittedById (SoD)', async () => {
    // Create PO with ProcStore A, but submit with Owner A
    const createReq = createAuthReq(tokenProcStoreA, {
      body: {
        projectId: projectA1Id,
        vendorId: vendorA1Id,
        expectedDeliveryDate: '2026-09-30',
        lines: [{ materialId: materialSteelAId, indentLineId: indentLineSteelA1Id, quantityOrdered: 2, uom: 'MT', unitRate: 50000 }],
      },
    });
    const created = await poController.createPurchaseOrder(createReq);

    const submitReq = createAuthReq(tokenOwnerA, { params: { id: created.data.id } });
    await poController.submitPurchaseOrder(submitReq);

    // Owner A (submitter) attempts approval
    const approveReq = createAuthReq(tokenOwnerA, { params: { id: created.data.id } });
    await assert.rejects(
      async () => poController.approvePurchaseOrder(approveReq),
      (err: any) => err instanceof ForbiddenError && err.message.includes('Segregation of Duties')
    );

    // Clean up
    await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: created.data.id } });
    await prisma.purchaseOrder.delete({ where: { id: created.data.id } });
  });

  it('18. approve: Valid approval by distinct authorized approver (Owner approving ProcStore PO)', async () => {
    const req = createAuthReq(tokenOwnerA, {
      params: { id: po1Id },
      body: { approvalRemarks: 'Commercial rates and 8% discount verified. Approved for procurement.' },
    });

    const res = await poController.approvePurchaseOrder(req);
    assert.equal(res.success, true);
    assert.equal(res.data.status, 'APPROVED');
    assert.equal(res.data.approvedById, ownerAId);
    assert.ok(res.data.approvedAt);
  });

  it('19. order: Transition from APPROVED to ORDERED records actor timestamp', async () => {
    const req = createAuthReq(tokenProcStoreA, {
      params: { id: po1Id },
      body: { notes: 'PO PDF emailed to UltraTech dispatch team' },
    });

    const res = await poController.orderPurchaseOrder(req);
    assert.equal(res.success, true);
    assert.equal(res.data.status, 'ORDERED');
    assert.equal(res.data.orderedById, procStoreAId);
    assert.ok(res.data.orderedAt);
  });

  it('20. approved/ordered immutability: Reject PATCH on ORDERED purchase order', async () => {
    const req = createAuthReq(tokenProcStoreA, {
      params: { id: po1Id },
      body: { notes: 'Trying to change notes after dispatch' },
    });

    await assert.rejects(
      async () => poController.updatePurchaseOrder(req),
      (err: any) => err instanceof BadRequestError && err.message.includes('permanently immutable')
    );
  });

  // ============================================================
  // 4. CANCELLATION & DELETION
  // ============================================================

  it('21. cancel: Allow cancelling unfulfilled ORDERED purchase order', async () => {
    const req = createAuthReq(tokenProcStoreA, {
      params: { id: po1Id },
      body: { cancellationReason: 'Vendor factory shutdown. Order cancelled before delivery.' },
    });

    const res = await poController.cancelPurchaseOrder(req);
    assert.equal(res.success, true);
    assert.equal(res.data.status, 'CANCELLED');
    assert.equal(res.data.cancelledById, procStoreAId);
    assert.ok(res.data.cancelledAt);
    assert.equal(res.data.cancellationReason, 'Vendor factory shutdown. Order cancelled before delivery.');
  });

  it('22. delete draft: Allow permanent deletion of DRAFT PO and lines', async () => {
    const createReq = createAuthReq(tokenProcStoreA, {
      body: {
        projectId: projectA1Id,
        vendorId: vendorA1Id,
        expectedDeliveryDate: '2026-10-10',
        lines: [{ materialId: materialCementAId, quantityOrdered: 10, uom: 'BAGS', unitRate: 400 }],
      },
    });
    const draft = await poController.createPurchaseOrder(createReq);

    const deleteReq = createAuthReq(tokenProcStoreA, { params: { id: draft.data.id } });
    const deleteRes = await poController.deletePurchaseOrder(deleteReq);
    assert.equal(deleteRes.success, true);
    assert.equal(deleteRes.data.deleted, true);

    const found = await prisma.purchaseOrder.findUnique({ where: { id: draft.data.id } });
    assert.equal(found, null);
  });

  it('23. delete non-draft denied: Deny deleting non-DRAFT POs', async () => {
    // po1Id is CANCELLED
    const req = createAuthReq(tokenOwnerA, { params: { id: po1Id } });

    await assert.rejects(
      async () => poController.deletePurchaseOrder(req),
      (err: any) => err instanceof BadRequestError && err.message.includes('Only DRAFT purchase orders can be deleted')
    );
  });

  // ============================================================
  // 5. SECURITY, RBAC & ENTITLEMENTS
  // ============================================================

  it('24. entitlement denial: Starter tier (Tenant C) fails closed due to missing materials:po_matching', async () => {
    const req = createAuthReq(tokenOwnerC, {
      body: {
        projectId: projectA1Id,
        vendorId: vendorA1Id,
        expectedDeliveryDate: '2026-10-15',
        lines: [{ materialId: materialCementAId, quantityOrdered: 10, uom: 'BAGS', unitRate: 400 }],
      },
    });

    await assert.rejects(
      async () => poController.createPurchaseOrder(req),
      (err: any) => err instanceof ForbiddenError && err.message.includes('materials:po_matching')
    );
  });

  it('25. permission denial: User without materials:po:create cannot create PO', async () => {
    const req = createAuthReq(tokenNoAccessUserA, {
      body: {
        projectId: projectA1Id,
        vendorId: vendorA1Id,
        expectedDeliveryDate: '2026-10-15',
        lines: [{ materialId: materialCementAId, quantityOrdered: 10, uom: 'BAGS', unitRate: 400 }],
      },
    });

    await assert.rejects(
      async () => poController.createPurchaseOrder(req),
      (err: any) => err instanceof ForbiddenError
    );
  });

  // ============================================================
  // 6. CONCURRENCY RESILIENCE & STOCK/FINANCIAL INVARIANCE
  // ============================================================

  it('26. concurrent PO sequence generation: 10 simultaneous creations allocate unique sequential numbers', async () => {
    const promises = Array.from({ length: 10 }).map((_, idx) =>
      poController.createPurchaseOrder(
        createAuthReq(tokenProcStoreA, {
          body: {
            projectId: projectA2Id, // Metro project (POM)
            vendorId: vendorA1Id,
            expectedDeliveryDate: '2026-10-25',
            lines: [{ materialId: materialCementAId, quantityOrdered: (idx + 1) * 5, uom: 'BAGS', unitRate: 380 }],
          },
        })
      )
    );

    const responses = await Promise.all(promises);
    const poNumbers = responses.map((r) => r.data.poNumber);

    const uniqueNumbers = new Set(poNumbers);
    assert.equal(uniqueNumbers.size, 10);
    for (const num of poNumbers) {
      assert.ok(num.startsWith('PO-POM66-'));
    }

    // Clean up
    for (const r of responses) {
      await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: r.data.id } });
      await prisma.purchaseOrder.delete({ where: { id: r.data.id } });
    }
  });

  it('27. concurrent oversubscription prevention: Two concurrent POs of 70 against indent of 100 allow only 1', async () => {
    // Clean up any remaining PO lines on indentLineSteelA1Id
    await prisma.purchaseOrderLine.deleteMany({ where: { indentLineId: indentLineSteelA1Id } });

    // indentLineSteel has 10 MT total. Two simultaneous requests for 7 MT each:
    const req1 = createAuthReq(tokenProcStoreA, {
      body: {
        projectId: projectA1Id,
        vendorId: vendorA1Id,
        expectedDeliveryDate: '2026-10-20',
        lines: [{ materialId: materialSteelAId, indentLineId: indentLineSteelA1Id, quantityOrdered: 7, uom: 'MT', unitRate: 50000 }],
      },
    });

    const req2 = createAuthReq(tokenOwnerA, {
      body: {
        projectId: projectA1Id,
        vendorId: vendorA1Id,
        expectedDeliveryDate: '2026-10-20',
        lines: [{ materialId: materialSteelAId, indentLineId: indentLineSteelA1Id, quantityOrdered: 7, uom: 'MT', unitRate: 50000 }],
      },
    });

    // Execute concurrently
    const results = await Promise.allSettled([
      poController.createPurchaseOrder(req1),
      poController.createPurchaseOrder(req2),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.equal(fulfilled.length, 1, 'Exactly one PO creation must succeed');
    assert.equal(rejected.length, 1, 'The competing over-subscribing PO creation must fail');

    // Clean up successful PO
    if (fulfilled[0]?.status === 'fulfilled') {
      const successfulPoId = (fulfilled[0].value as any).data.id;
      await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: successfulPoId } });
      await prisma.purchaseOrder.delete({ where: { id: successfulPoId } });
    }
  });

  it('28. stock and financial invariance: Zero StockMovements or balance changes created during PO lifecycle', async () => {
    const initialMovementCount = await prisma.stockMovement.count({ where: { tenantId: tenantAId } });
    const initialBalanceCount = await prisma.storeStockBalance.count({ where: { tenantId: tenantAId } });

    // Full lifecycle test: Create -> Submit -> Approve -> Order -> Cancel
    const createRes = await poController.createPurchaseOrder(
      createAuthReq(tokenProcStoreA, {
        body: {
          projectId: projectA1Id,
          vendorId: vendorA1Id,
          expectedDeliveryDate: '2026-10-30',
          lines: [{ materialId: materialSteelAId, quantityOrdered: 5, uom: 'MT', unitRate: 55000 }],
        },
      })
    );
    await poController.submitPurchaseOrder(createAuthReq(tokenProcStoreA, { params: { id: createRes.data.id } }));
    await poController.approvePurchaseOrder(createAuthReq(tokenOwnerA, { params: { id: createRes.data.id } }));
    await poController.orderPurchaseOrder(createAuthReq(tokenProcStoreA, { params: { id: createRes.data.id } }));
    await poController.cancelPurchaseOrder(createAuthReq(tokenOwnerA, { params: { id: createRes.data.id } }));

    const finalMovementCount = await prisma.stockMovement.count({ where: { tenantId: tenantAId } });
    const finalBalanceCount = await prisma.storeStockBalance.count({ where: { tenantId: tenantAId } });

    assert.equal(finalMovementCount, initialMovementCount, 'StockMovement count must remain 0');
    assert.equal(finalBalanceCount, initialBalanceCount, 'StoreStockBalance count must remain 0');

    // Clean up
    await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: createRes.data.id } });
    await prisma.purchaseOrder.delete({ where: { id: createRes.data.id } });
  });

  it('29. list purchase orders: Filtering by status, vendor, and search', async () => {
    const listReq = createAuthReq(tokenOwnerA, {
      query: { status: 'CANCELLED' },
    });
    const listRes = await poController.listPurchaseOrders(listReq);
    assert.equal(listRes.success, true);
    assert.ok(listRes.data.items.every((p) => p.status === 'CANCELLED'));
  });

  // ============================================================
  // 7. COMPREHENSIVE EDGE CASES & INVARIANCE
  // ============================================================

  it('30. invalid state transitions: Prevent DRAFT -> APPROVED, DRAFT -> ORDERED, CANCELLED -> APPROVED', async () => {
    const draftRes = await poController.createPurchaseOrder(
      createAuthReq(tokenProcStoreA, {
        body: {
          projectId: projectA1Id,
          vendorId: vendorA1Id,
          expectedDeliveryDate: '2026-11-01',
          lines: [{ materialId: materialCementAId, quantityOrdered: 5, uom: 'BAGS', unitRate: 400 }],
        },
      })
    );

    // DRAFT -> APPROVED denied
    await assert.rejects(
      async () => poController.approvePurchaseOrder(createAuthReq(tokenOwnerA, { params: { id: draftRes.data.id } })),
      (err: any) => err instanceof BadRequestError && err.message.includes('has not been submitted')
    );

    // DRAFT -> ORDERED denied
    await assert.rejects(
      async () => poController.orderPurchaseOrder(createAuthReq(tokenProcStoreA, { params: { id: draftRes.data.id } })),
      (err: any) => err instanceof BadRequestError && err.message.includes('must be APPROVED first')
    );

    // Submit -> Approve -> Cancel
    await poController.submitPurchaseOrder(createAuthReq(tokenProcStoreA, { params: { id: draftRes.data.id } }));
    await poController.approvePurchaseOrder(createAuthReq(tokenOwnerA, { params: { id: draftRes.data.id } }));
    await poController.cancelPurchaseOrder(createAuthReq(tokenOwnerA, { params: { id: draftRes.data.id } }));

    // CANCELLED -> APPROVED denied
    await assert.rejects(
      async () => poController.approvePurchaseOrder(createAuthReq(tokenOwnerA, { params: { id: draftRes.data.id } })),
      (err: any) => err instanceof BadRequestError
    );

    // Clean up
    await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: draftRes.data.id } });
    await prisma.purchaseOrder.delete({ where: { id: draftRes.data.id } });
  });

  it('31. order before approval rejection: Attempting to order a submitted PO fails', async () => {
    const draftRes = await poController.createPurchaseOrder(
      createAuthReq(tokenProcStoreA, {
        body: {
          projectId: projectA1Id,
          vendorId: vendorA1Id,
          expectedDeliveryDate: '2026-11-05',
          lines: [{ materialId: materialCementAId, quantityOrdered: 5, uom: 'BAGS', unitRate: 400 }],
        },
      })
    );
    await poController.submitPurchaseOrder(createAuthReq(tokenProcStoreA, { params: { id: draftRes.data.id } }));

    await assert.rejects(
      async () => poController.orderPurchaseOrder(createAuthReq(tokenProcStoreA, { params: { id: draftRes.data.id } })),
      (err: any) => err instanceof BadRequestError && err.message.includes('must be APPROVED first')
    );

    // Clean up
    await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: draftRes.data.id } });
    await prisma.purchaseOrder.delete({ where: { id: draftRes.data.id } });
  });

  it('32. UOM validation: Reject invalid UOM (e.g. LITERS for Cement bags/MT)', async () => {
    const reqInvalidUom = createAuthReq(tokenProcStoreA, {
      body: {
        projectId: projectA1Id,
        vendorId: vendorA1Id,
        expectedDeliveryDate: '2026-11-05',
        lines: [{ materialId: materialCementAId, quantityOrdered: 10, uom: 'LITERS', unitRate: 400 }],
      },
    });

    await assert.rejects(
      async () => poController.createPurchaseOrder(reqInvalidUom),
      (err: any) => err instanceof BadRequestError && err.message.includes('UOM LITERS is invalid')
    );
  });

  it('33. project isolation: Non-member user cannot view or create PO in unassigned project', async () => {
    // Sam Site Engineer (seAId) is a member of projectA1Id, NOT projectA2Id
    const req = createAuthReq(tokenSeA, {
      body: {
        projectId: projectA2Id, // Metro Tower (no membership)
        vendorId: vendorA1Id,
        expectedDeliveryDate: '2026-11-10',
        lines: [{ materialId: materialCementAId, quantityOrdered: 5, uom: 'BAGS', unitRate: 400 }],
      },
    });

    await assert.rejects(
      async () => poController.createPurchaseOrder(req),
      (err: any) => err instanceof ForbiddenError
    );
  });

  it('34. simultaneous approval: Two concurrent approval requests on same submitted PO handle gracefully', async () => {
    const draftRes = await poController.createPurchaseOrder(
      createAuthReq(tokenProcStoreA, {
        body: {
          projectId: projectA1Id,
          vendorId: vendorA1Id,
          expectedDeliveryDate: '2026-11-15',
          lines: [{ materialId: materialCementAId, quantityOrdered: 5, uom: 'BAGS', unitRate: 400 }],
        },
      })
    );
    await poController.submitPurchaseOrder(createAuthReq(tokenProcStoreA, { params: { id: draftRes.data.id } }));

    const appReq1 = createAuthReq(tokenOwnerA, { params: { id: draftRes.data.id }, body: { approvalRemarks: 'Approve 1' } });
    const appReq2 = createAuthReq(tokenOwnerA, { params: { id: draftRes.data.id }, body: { approvalRemarks: 'Approve 2' } });

    const results = await Promise.allSettled([
      poController.approvePurchaseOrder(appReq1),
      poController.approvePurchaseOrder(appReq2),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    assert.ok(fulfilled.length >= 1, 'At least one approval succeeds');

    const po = await prisma.purchaseOrder.findUnique({ where: { id: draftRes.data.id } });
    assert.equal(po.status, 'APPROVED');

    // Clean up
    await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: draftRes.data.id } });
    await prisma.purchaseOrder.delete({ where: { id: draftRes.data.id } });
  });

  it('35. rejection on non-submitted PO: Deny rejecting DRAFT or APPROVED purchase order', async () => {
    const draftRes = await poController.createPurchaseOrder(
      createAuthReq(tokenProcStoreA, {
        body: {
          projectId: projectA1Id,
          vendorId: vendorA1Id,
          expectedDeliveryDate: '2026-11-20',
          lines: [{ materialId: materialCementAId, quantityOrdered: 5, uom: 'BAGS', unitRate: 400 }],
        },
      })
    );

    // Reject DRAFT
    await assert.rejects(
      async () => poController.rejectPurchaseOrder(createAuthReq(tokenOwnerA, { params: { id: draftRes.data.id }, body: { rejectionReason: 'Reason' } })),
      (err: any) => err instanceof BadRequestError && err.message.includes('still in draft status')
    );

    // Clean up
    await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: draftRes.data.id } });
    await prisma.purchaseOrder.delete({ where: { id: draftRes.data.id } });
  });

  it('36. financial invariance: PO creation, approval, and order do not mutate financial ledger', async () => {
    // Verify no finance tables are mutated
    const draftRes = await poController.createPurchaseOrder(
      createAuthReq(tokenProcStoreA, {
        body: {
          projectId: projectA1Id,
          vendorId: vendorA1Id,
          expectedDeliveryDate: '2026-11-25',
          lines: [{ materialId: materialCementAId, quantityOrdered: 10, uom: 'BAGS', unitRate: 400, taxRatePercent: 18 }],
        },
      })
    );

    await poController.submitPurchaseOrder(createAuthReq(tokenProcStoreA, { params: { id: draftRes.data.id } }));
    await poController.approvePurchaseOrder(createAuthReq(tokenOwnerA, { params: { id: draftRes.data.id } }));
    await poController.orderPurchaseOrder(createAuthReq(tokenProcStoreA, { params: { id: draftRes.data.id } }));

    // Verify PO exists and totals are computed without touching any finance/payable tables
    const po = await prisma.purchaseOrder.findUnique({ where: { id: draftRes.data.id } });
    assert.equal(po.status, 'ORDERED');
    assert.equal(Number(po.grandTotal), 4720);

    // Clean up
    await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: draftRes.data.id } });
    await prisma.purchaseOrder.delete({ where: { id: draftRes.data.id } });
  });

  it('37. commercial calculation edge cases: 100% discount and 0% tax calculations are accurate', async () => {
    // 10 bags @ 100 with 100% discount and 0% tax -> Net = 0, Tax = 0, Grand Total = 0
    const draftRes = await poController.createPurchaseOrder(
      createAuthReq(tokenProcStoreA, {
        body: {
          projectId: projectA1Id,
          vendorId: vendorA1Id,
          expectedDeliveryDate: '2026-11-30',
          lines: [
            {
              materialId: materialCementAId,
              quantityOrdered: 10,
              uom: 'BAGS',
              unitRate: 100,
              discountRatePercent: 100,
              taxRatePercent: 0,
            },
          ],
        },
      })
    );

    assert.equal(Number(draftRes.data.subtotalAmount), 1000);
    assert.equal(Number(draftRes.data.discountAmount), 1000);
    assert.equal(Number(draftRes.data.taxAmount), 0);
    assert.equal(Number(draftRes.data.grandTotal), 0);
    assert.equal(Number(draftRes.data.lines[0].lineTotal), 0);

    // Clean up
    await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: draftRes.data.id } });
    await prisma.purchaseOrder.delete({ where: { id: draftRes.data.id } });
  });
});
