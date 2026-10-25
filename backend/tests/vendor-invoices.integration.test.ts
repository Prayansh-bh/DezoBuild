import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../src/database/database.service.js';
import { InvoicesController } from '../src/modules/finance/controllers/invoices.controller.js';
import { InvoiceService } from '../src/modules/finance/services/invoice.service.js';
import { InvoiceRepository } from '../src/modules/finance/repositories/invoice.repository.js';
import { AdvanceRepository } from '../src/modules/finance/repositories/advance.repository.js';
import { RetentionRepository } from '../src/modules/finance/repositories/retention.repository.js';
import { FinanceSequenceRepository } from '../src/modules/finance/repositories/finance-sequence.repository.js';
import { FinanceAuditRepository } from '../src/modules/finance/repositories/finance-audit.repository.js';
import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../src/common/errors/app-error.js';

describe('DEZOBUILD Phase 10 — Vendor Invoices & 3-Way Match Integration Suite', () => {
  let dbService: DatabaseService;
  let invoicesController: InvoicesController;
  let invoiceService: InvoiceService;
  let tokenService: TokenService;
  let prisma: any;

  const tenantAId = '99999999-aaaa-4444-aaaa-999999999999';
  const ownerAId = '99999999-1111-4444-aaaa-999999999999';
  const pmAId = '99999999-2222-4444-aaaa-999999999999';
  const acctAId = '99999999-3333-4444-aaaa-999999999999';

  const tenantBId = '99999999-bbbb-4444-bbbb-999999999999';
  const ownerBId = '99999999-1111-4444-bbbb-999999999999';

  let tokenOwnerA: string;
  let tokenPmA: string;
  let tokenAcctA: string;
  let tokenOwnerB: string;

  let projectAId: string;
  let vendorAId: string;
  let materialAId: string;
  let storeAId: string;
  let poAId: string;
  let poLineAId: string;
  let grnAId: string;
  let grnLineAId: string;

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

    const sequenceRepo = new FinanceSequenceRepository(prisma);
    const auditRepo = new FinanceAuditRepository(prisma);
    const invoiceRepo = new InvoiceRepository(prisma);
    const advanceRepo = new AdvanceRepository(prisma);
    const retentionRepo = new RetentionRepository(prisma);

    invoiceService = new InvoiceService(prisma, invoiceRepo, advanceRepo, retentionRepo, sequenceRepo, auditRepo);
    invoicesController = new InvoicesController(invoiceService);
    tokenService = TokenService.getInstance();

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Clean fixtures
    await prisma.financeAuditLog.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.retentionReleaseAllocation.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.retentionRecord.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.appliedTaxLine.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.vendorInvoiceGrnAllocation.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.vendorInvoiceLine.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.vendorInvoice.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.financeSequence.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.goodsReceiptLine.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.goodsReceiptNote.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.purchaseOrderLine.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.purchaseOrder.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.store.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.material.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.vendor.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.project.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });

    // Tenants
    await prisma.tenant.create({
      data: { id: tenantAId, name: 'Metro Infra Ltd', code: 'MIL_FIN', status: 'ACTIVE' },
    });
    const entPlan = await prisma.platformPlan.findFirstOrThrow({ where: { code: 'ENTERPRISE' } });
    await prisma.tenantSubscription.create({
      data: { tenantId: tenantAId, planId: entPlan.id, status: 'ACTIVE', billingCycle: 'MONTHLY', currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
    });

    await prisma.tenant.create({
      data: { id: tenantBId, name: 'Foreign Corp B', code: 'FCB_FIN', status: 'ACTIVE' },
    });
    await prisma.tenantSubscription.create({
      data: { tenantId: tenantBId, planId: entPlan.id, status: 'ACTIVE', billingCycle: 'MONTHLY', currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
    });

    // Companies
    const compA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        code: 'MIL_C1',
        name: 'Metro Infra Corp',
        legalName: 'Metro Infra Corp Ltd',
        panNumber: 'AAACM1234A',
        gstin: '29AAACM1234A1Z5',
        email: 'info@mil.com',
        phone: '+919876543210',
        address: '100 Metro Way',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
      },
    });

    // Users
    const ownerRole = await prisma.role.findFirstOrThrow({ where: { name: 'COMPANY_OWNER' } });
    const pmRole = await prisma.role.findFirstOrThrow({ where: { name: 'PROJECT_MANAGER' } });

    await prisma.user.create({
      data: { id: ownerAId, tenantId: tenantAId, email: 'owner.inv@mil.com', fullName: 'Owner Alpha', passwordHash: 'hash' },
    });
    await prisma.userRoleAssignment.create({
      data: { userId: ownerAId, roleId: ownerRole.id, tenantId: tenantAId },
    });

    await prisma.user.create({
      data: { id: pmAId, tenantId: tenantAId, email: 'pm.inv@mil.com', fullName: 'Project Manager Mike', passwordHash: 'hash' },
    });
    await prisma.userRoleAssignment.create({
      data: { userId: pmAId, roleId: pmRole.id, tenantId: tenantAId },
    });

    await prisma.user.create({
      data: { id: acctAId, tenantId: tenantAId, email: 'acct.inv@mil.com', fullName: 'Accountant Alex', passwordHash: 'hash' },
    });
    await prisma.userRoleAssignment.create({
      data: { userId: acctAId, roleId: pmRole.id, tenantId: tenantAId },
    });

    await prisma.user.create({
      data: { id: ownerBId, tenantId: tenantBId, email: 'owner.inv@fcb.com', fullName: 'Owner Beta', passwordHash: 'hash' },
    });
    await prisma.userRoleAssignment.create({
      data: { userId: ownerBId, roleId: ownerRole.id, tenantId: tenantBId },
    });

    // Project, Vendor, Material, Store
    const project = await prisma.project.create({
      data: { tenantId: tenantAId, companyId: compA.id, name: 'Metro Flyover Sec-4', code: 'MFS4', status: 'ACTIVE' },
    });
    projectAId = project.id;

    const vendor = await prisma.vendor.create({
      data: {
        tenantId: tenantAId,
        name: 'UltraTech Cement Suppliers',
        code: 'VEND_UTC',
        status: 'ACTIVE',
      },
    });
    vendorAId = vendor.id;

    const material = await prisma.material.create({
      data: {
        tenantId: tenantAId,
        itemCode: 'MAT-OPC-53',
        name: 'OPC 53 Grade Cement',
        primaryUom: 'BAG',
        category: 'CIVIL_RAW',
        status: 'ACTIVE',
      },
    });
    materialAId = material.id;

    const store = await prisma.store.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        name: 'Site Central Yard Store',
        code: 'STR_SCY',
        storeType: 'PROJECT_SITE',
        status: 'ACTIVE',
      },
    });
    storeAId = store.id;

    // PO: 100 bags @ 400.00 = 40,000
    const po = await prisma.purchaseOrder.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        vendorId: vendorAId,
        poNumber: 'PO-2026-0001',
        status: 'ORDERED',
        expectedDeliveryDate: new Date('2026-09-30'),
        createdById: ownerAId,
        subtotalAmount: new Prisma.Decimal(40000),
        grandTotal: new Prisma.Decimal(40000),
        lines: {
          create: [
            {
              tenantId: tenantAId,
              materialId: materialAId,
              quantityOrdered: new Prisma.Decimal(100),
              quantityReceived: new Prisma.Decimal(100),
              uom: 'BAG',
              unitRate: new Prisma.Decimal(400),
              lineTotal: new Prisma.Decimal(40000),
            },
          ],
        },
      },
      include: { lines: true },
    });
    poAId = po.id;
    poLineAId = po.lines[0].id;

    // GRN: 100 delivered, 100 accepted
    const grn = await prisma.goodsReceiptNote.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        storeId: storeAId,
        vendorId: vendorAId,
        purchaseOrderId: poAId,
        grnNumber: 'GRN-2026-0001',
        status: 'VERIFIED',
        receiptDate: new Date('2026-09-10'),
        receivedById: pmAId,
        verifiedById: ownerAId,
        verifiedAt: new Date(),
        lines: {
          create: [
            {
              tenantId: tenantAId,
              materialId: materialAId,
              purchaseOrderLineId: poLineAId,
              uom: 'BAG',
              quantityDelivered: new Prisma.Decimal(100),
              quantityAccepted: new Prisma.Decimal(100),
              quantityRejected: new Prisma.Decimal(0),
              unitRate: new Prisma.Decimal(400),
            },
          ],
        },
      },
      include: { lines: true },
    });
    grnAId = grn.id;
    grnLineAId = grn.lines[0].id;

    tokenOwnerA = tokenService.createAccessToken({ userId: ownerAId, tenantId: tenantAId, sessionId: 's-own-a', sessionVersion: 1 });
    tokenPmA = tokenService.createAccessToken({ userId: pmAId, tenantId: tenantAId, sessionId: 's-pm-a', sessionVersion: 1 });
    tokenAcctA = tokenService.createAccessToken({ userId: acctAId, tenantId: tenantAId, sessionId: 's-act-a', sessionVersion: 1 });
    tokenOwnerB = tokenService.createAccessToken({ userId: ownerBId, tenantId: tenantBId, sessionId: 's-own-b', sessionVersion: 1 });
  });

  after(async () => {
    if (prisma) {
      await prisma.financeAuditLog.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.retentionReleaseAllocation.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.retentionRecord.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.appliedTaxLine.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.vendorInvoiceGrnAllocation.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.vendorInvoiceLine.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.vendorInvoice.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.financeSequence.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.goodsReceiptLine.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.goodsReceiptNote.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.purchaseOrderLine.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.purchaseOrder.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.store.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.material.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.vendor.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.project.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.company.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
      await dbService.disconnect();
    }
  });

  it('1. should create a valid vendor invoice in DRAFT with exact Decimal arithmetic', async () => {
    const req = createAuthReq(tokenAcctA, {
      body: {
        projectId: projectAId,
        vendorId: vendorAId,
        purchaseOrderId: poAId,
        vendorInvoiceNumber: 'INV-UTC-2026-889',
        invoiceDate: '2026-09-11',
        dueDate: '2026-10-11',
        discountAmount: 1000.0,
        directChargesAmount: 500.0,
        retentionWithheld: 2000.0,
        tdsDeducted: 400.0,
        lines: [
          {
            poLineId: poLineAId,
            materialId: materialAId,
            description: '100 bags 53 Grade Cement',
            billedQuantity: 100,
            unitRate: 400.0,
            taxAmount: 7200.0, // 18% GST on 40,000
            grnAllocations: [
              {
                grnLineId: grnLineAId,
                allocatedQuantity: 100,
              },
            ],
          },
        ],
      },
    });

    const res = await invoicesController.createInvoice(req);
    assert.strictEqual(res.success, true);
    const invoice = res.data as any;
    assert.strictEqual(invoice.status, 'DRAFT');
    assert.match(invoice.invoiceNumber, /^INV-\d{4}-\d{6}$/);
    assert.strictEqual(Number(invoice.subtotalAmount), 40000);
    assert.strictEqual(Number(invoice.taxAmount), 7200);
    assert.strictEqual(Number(invoice.grossTotal), 46700); // 40000 + 7200 - 1000 + 500 = 46700
    assert.strictEqual(Number(invoice.deductionsTotal), 2400); // 2000 + 400 = 2400
    assert.strictEqual(Number(invoice.netPayable), 44300); // 46700 - 2400 = 44300
    assert.strictEqual(Number(invoice.outstandingBalance), 44300);
  });

  it('2. should reject duplicate vendorInvoiceNumber for the same vendor', async () => {
    const req = createAuthReq(tokenAcctA, {
      body: {
        projectId: projectAId,
        vendorId: vendorAId,
        vendorInvoiceNumber: 'INV-UTC-2026-889',
        invoiceDate: '2026-09-11',
        dueDate: '2026-10-11',
        lines: [
          {
            description: 'Duplicate invoice test',
            billedQuantity: 10,
            unitRate: 400,
          },
        ],
      },
    });
    await assert.rejects(async () => invoicesController.createInvoice(req), ConflictError);
  });

  it('3. should verify invoice 3-way match successfully against accepted GRN quantity', async () => {
    const listRes = await invoicesController.listInvoices(createAuthReq(tokenAcctA, { query: { projectId: projectAId } }));
    const invoiceId = (listRes.data as any).items[0].id;

    const verifyReq = createAuthReq(tokenPmA, {
      params: { id: invoiceId },
      body: {
        verificationRemarks: '3-Way matching verified against physical GRN-2026-0001',
      },
    });
    const verifyRes = await invoicesController.verifyInvoice(verifyReq);
    assert.strictEqual(verifyRes.success, true);
    assert.strictEqual((verifyRes.data as any).status, 'VERIFIED');
  });

  it('4. should reject invoice verification if GRN line is overbilled', async () => {
    // Attempt creating another invoice trying to bill the same 100 bags from the GRN line
    const createReq = createAuthReq(tokenAcctA, {
      body: {
        projectId: projectAId,
        vendorId: vendorAId,
        vendorInvoiceNumber: 'INV-UTC-OVERBILL',
        invoiceDate: '2026-09-11',
        dueDate: '2026-10-11',
        lines: [
          {
            poLineId: poLineAId,
            materialId: materialAId,
            description: 'Overbilling attempt',
            billedQuantity: 50,
            unitRate: 400.0,
            grnAllocations: [
              {
                grnLineId: grnLineAId,
                allocatedQuantity: 50, // Available is 0 (100 - 100)
              },
            ],
          },
        ],
      },
    });
    const createRes = await invoicesController.createInvoice(createReq);
    const invoiceId = (createRes.data as any).id;

    const verifyReq = createAuthReq(tokenPmA, {
      params: { id: invoiceId },
      body: { verificationRemarks: 'Overbill check' },
    });
    await assert.rejects(async () => invoicesController.verifyInvoice(verifyReq), ConflictError);
  });

  it('5. should reject verification when price variance exists without explicit authorization', async () => {
    // Create new GRN with 50 accepted bags
    const grn2 = await prisma.goodsReceiptNote.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        storeId: storeAId,
        vendorId: vendorAId,
        purchaseOrderId: poAId,
        grnNumber: 'GRN-2026-VAR',
        status: 'VERIFIED',
        receiptDate: new Date('2026-09-11'),
        receivedById: pmAId,
        verifiedById: ownerAId,
        lines: {
          create: [
            {
              tenantId: tenantAId,
              materialId: materialAId,
              purchaseOrderLineId: poLineAId,
              uom: 'BAG',
              quantityDelivered: new Prisma.Decimal(50),
              quantityAccepted: new Prisma.Decimal(50),
              quantityRejected: new Prisma.Decimal(0),
              unitRate: new Prisma.Decimal(400),
            },
          ],
        },
      },
      include: { lines: true },
    });

    // Invoice with unitRate 450 > PO unitRate 400
    const createReq = createAuthReq(tokenAcctA, {
      body: {
        projectId: projectAId,
        vendorId: vendorAId,
        vendorInvoiceNumber: 'INV-UTC-PRICE-VAR',
        invoiceDate: '2026-09-11',
        dueDate: '2026-10-11',
        lines: [
          {
            poLineId: poLineAId,
            materialId: materialAId,
            description: 'Cement with price escalation',
            billedQuantity: 50,
            unitRate: 450.0, // PO rate is 400
            grnAllocations: [{ grnLineId: grn2.lines[0].id, allocatedQuantity: 50 }],
          },
        ],
      },
    });
    const createRes = await invoicesController.createInvoice(createReq);
    const invoiceId = (createRes.data as any).id;

    // Verify without authorization -> Must Fail
    const unauthReq = createAuthReq(tokenPmA, {
      params: { id: invoiceId },
      body: { priceVarianceAuthorized: false },
    });
    await assert.rejects(async () => invoicesController.verifyInvoice(unauthReq), ConflictError);

    // Verify WITH explicit authorization -> Must Succeed
    const authReq = createAuthReq(tokenPmA, {
      params: { id: invoiceId },
      body: {
        priceVarianceAuthorized: true,
        varianceAuthorizationReason: 'Authorized diesel surcharge increase per contract annexure 4',
      },
    });
    const authRes = await invoicesController.verifyInvoice(authReq);
    assert.strictEqual(authRes.success, true);
    assert.strictEqual((authRes.data as any).status, 'VERIFIED');
  });

  it('6. Segregation of Duties: Creator CANNOT approve their own invoice', async () => {
    // Create an invoice by Owner
    const createReq = createAuthReq(tokenOwnerA, {
      body: {
        projectId: projectAId,
        vendorId: vendorAId,
        vendorInvoiceNumber: 'INV-UTC-SOD-TEST',
        invoiceDate: '2026-09-11',
        dueDate: '2026-10-11',
        lines: [{ description: 'Site scaffolding direct charge', billedQuantity: 1, unitRate: 5000, isDirectCharge: true }],
      },
    });
    const createRes = await invoicesController.createInvoice(createReq);
    const invoiceId = (createRes.data as any).id;

    await invoicesController.verifyInvoice(createAuthReq(tokenPmA, { params: { id: invoiceId } }));

    // Owner attempts to approve own created invoice
    const approveReq = createAuthReq(tokenOwnerA, {
      params: { id: invoiceId },
      body: { approvalRemarks: 'Self approval attempt' },
    });
    await assert.rejects(async () => invoicesController.approveInvoice(approveReq), ConflictError);
  });

  it('7. should approve verified invoice and atomically create RetentionRecord when retentionWithheld > 0', async () => {
    const listRes = await invoicesController.listInvoices(createAuthReq(tokenAcctA, { query: { projectId: projectAId, status: 'VERIFIED' } }));
    const invoice = (listRes.data as any).items.find((i: any) => i.vendorInvoiceNumber === 'INV-VENDOR-2026-001') || (listRes.data as any).items[0];
    const invoiceId = invoice.id;

    const approveReq = createAuthReq(tokenOwnerA, {
      params: { id: invoiceId },
      body: { approvalRemarks: 'Commercial invoice approved for payment cycle' },
    });
    const approveRes = await invoicesController.approveInvoice(approveReq);
    assert.strictEqual(approveRes.success, true);
    assert.strictEqual((approveRes.data as any).status, 'APPROVED');

    // Verify RetentionRecord created
    const retention = await prisma.retentionRecord.findFirst({
      where: { tenantId: tenantAId, invoiceId },
    });
    assert.ok(retention);
    assert.strictEqual(Number(retention.retainedAmount), 2000);
    assert.strictEqual(Number(retention.balanceAmount), 2000);
    assert.strictEqual(retention.status, 'HELD');
  });

  it('8. Multi-Tenant Isolation: Tenant B cannot access or approve Tenant A invoice', async () => {
    const listRes = await invoicesController.listInvoices(createAuthReq(tokenAcctA, { query: { projectId: projectAId } }));
    const invoiceId = (listRes.data as any).items[0].id;

    const getReq = createAuthReq(tokenOwnerB, { params: { id: invoiceId } });
    await assert.rejects(async () => invoicesController.getInvoice(getReq), NotFoundError);
  });
});
