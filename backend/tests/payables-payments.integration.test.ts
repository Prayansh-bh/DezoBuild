import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../src/database/database.service.js';
import { PaymentsController } from '../src/modules/finance/controllers/payments.controller.js';
import { PayablesController } from '../src/modules/finance/controllers/payables.controller.js';
import { PaymentService } from '../src/modules/finance/services/payment.service.js';
import { PayableService } from '../src/modules/finance/services/payable.service.js';
import { PaymentRepository } from '../src/modules/finance/repositories/payment.repository.js';
import { FinanceSequenceRepository } from '../src/modules/finance/repositories/finance-sequence.repository.js';
import { FinanceAuditRepository } from '../src/modules/finance/repositories/finance-audit.repository.js';
import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../src/common/errors/app-error.js';

describe('DEZOBUILD Phase 10 — Payables Subledger & Payments Integration Suite', () => {
  let dbService: DatabaseService;
  let paymentsController: PaymentsController;
  let payablesController: PayablesController;
  let tokenService: TokenService;
  let prisma: any;

  const tenantAId = 'aaaa8888-aaaa-4444-aaaa-888888888888';
  const ownerAId = 'aaaa8888-1111-4444-aaaa-888888888888';
  const pmAId = 'aaaa8888-2222-4444-aaaa-888888888888';
  const acctAId = 'aaaa8888-3333-4444-aaaa-888888888888';

  let tokenOwnerA: string;
  let tokenPmA: string;
  let tokenAcctA: string;

  let projectAId: string;
  let vendorAId: string;
  let invoiceAId: string;
  let expenseAId: string;

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
    const paymentRepo = new PaymentRepository(prisma);

    const paymentService = new PaymentService(prisma, paymentRepo, sequenceRepo, auditRepo);
    const payableService = new PayableService(prisma);

    paymentsController = new PaymentsController(paymentService);
    payablesController = new PayablesController(payableService);
    tokenService = TokenService.getInstance();

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Clean fixtures
    await prisma.financeAuditLog.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.paymentAllocation.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.paymentVoucher.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.expenseClaim.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.expenseCategory.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.vendorInvoiceLine.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.vendorInvoice.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.financeSequence.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.vendor.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.project.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.company.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.user.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.tenant.deleteMany({ where: { id: tenantAId } });

    // Tenant
    await prisma.tenant.create({
      data: { id: tenantAId, name: 'Payables Construction Ltd', code: 'PCL_FIN', status: 'ACTIVE' },
    });
    const entPlan = await prisma.platformPlan.findFirstOrThrow({ where: { code: 'ENTERPRISE' } });
    await prisma.tenantSubscription.create({
      data: { tenantId: tenantAId, planId: entPlan.id, status: 'ACTIVE', billingCycle: 'MONTHLY', currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
    });

    // Company
    const compA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        code: 'PCL_C1',
        name: 'Payables Corp',
        legalName: 'Payables Construction Ltd',
        panNumber: 'AAACP1234A',
        gstin: '29AAACP1234A1Z5',
        email: 'info@pcl.com',
        phone: '+919876543210',
        address: '100 Payables Way',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
      },
    });

    // Users
    const ownerRole = await prisma.role.findFirstOrThrow({ where: { name: 'COMPANY_OWNER' } });
    const pmRole = await prisma.role.findFirstOrThrow({ where: { name: 'PROJECT_MANAGER' } });

    await prisma.user.create({
      data: { id: ownerAId, tenantId: tenantAId, email: 'owner.pay@pcl.com', fullName: 'Oliver Owner', passwordHash: 'hash' },
    });
    await prisma.userRoleAssignment.create({
      data: { userId: ownerAId, roleId: ownerRole.id, tenantId: tenantAId },
    });

    await prisma.user.create({
      data: { id: pmAId, tenantId: tenantAId, email: 'pm.pay@pcl.com', fullName: 'Patrick PM', passwordHash: 'hash' },
    });
    await prisma.userRoleAssignment.create({
      data: { userId: pmAId, roleId: pmRole.id, tenantId: tenantAId },
    });

    await prisma.user.create({
      data: { id: acctAId, tenantId: tenantAId, email: 'acct.pay@pcl.com', fullName: 'Arthur Accountant', passwordHash: 'hash' },
    });
    await prisma.userRoleAssignment.create({
      data: { userId: acctAId, roleId: ownerRole.id, tenantId: tenantAId },
    });

    // Project & Vendor
    const project = await prisma.project.create({
      data: { tenantId: tenantAId, companyId: compA.id, name: 'Payables Metro Hub', code: 'PMH', status: 'ACTIVE' },
    });
    projectAId = project.id;

    const vendor = await prisma.vendor.create({
      data: {
        tenantId: tenantAId,
        name: 'Steel Matrix Suppliers',
        code: 'VEND_SMS',
        status: 'ACTIVE',
      },
    });
    vendorAId = vendor.id;

    // Create an APPROVED Vendor Invoice (Net Payable 50,000)
    const invoice = await prisma.vendorInvoice.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        vendorId: vendorAId,
        invoiceNumber: 'INV-2026-000001',
        vendorInvoiceNumber: 'SMS-INV-9901',
        invoiceDate: new Date('2026-08-01'),
        dueDate: new Date('2026-08-31'), // Overdue for aging testing
        subtotalAmount: new Prisma.Decimal(50000),
        taxAmount: new Prisma.Decimal(0),
        grossTotal: new Prisma.Decimal(50000),
        netPayable: new Prisma.Decimal(50000),
        paidAmount: new Prisma.Decimal(0),
        outstandingBalance: new Prisma.Decimal(50000),
        status: 'APPROVED',
        createdById: ownerAId,
        lines: {
          create: [
            {
              tenantId: tenantAId,
              description: 'TMT Rebars 12mm',
              billedQuantity: new Prisma.Decimal(10),
              unitRate: new Prisma.Decimal(5000),
              lineTotal: new Prisma.Decimal(50000),
            },
          ],
        },
      },
    });
    invoiceAId = invoice.id;

    // Create an APPROVED Expense Claim (Total 4,000)
    const category = await prisma.expenseCategory.create({
      data: { tenantId: tenantAId, name: 'Site Repairs', code: 'EXP_REP', isActive: true },
    });

    const claim = await prisma.expenseClaim.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        categoryId: category.id,
        claimNumber: 'EXP-2026-000001',
        submittedById: pmAId,
        amount: new Prisma.Decimal(4000),
        taxAmount: new Prisma.Decimal(0),
        claimDate: new Date('2026-09-01'),
        paidTo: 'Emergency Welder Works',
        description: 'Davit arm repair',
        status: 'APPROVED',
      },
    });
    expenseAId = claim.id;

    tokenOwnerA = tokenService.createAccessToken({ userId: ownerAId, tenantId: tenantAId, sessionId: 's-own', sessionVersion: 1 });
    tokenPmA = tokenService.createAccessToken({ userId: pmAId, tenantId: tenantAId, sessionId: 's-pm', sessionVersion: 1 });
    tokenAcctA = tokenService.createAccessToken({ userId: acctAId, tenantId: tenantAId, sessionId: 's-act', sessionVersion: 1 });
  });

  after(async () => {
    if (prisma) {
      await prisma.financeAuditLog.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.paymentAllocation.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.paymentVoucher.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.expenseClaim.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.expenseCategory.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.vendorInvoiceLine.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.vendorInvoice.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.financeSequence.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.vendor.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.project.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.company.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.userRoleAssignment.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.user.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.tenantSubscription.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.tenant.deleteMany({ where: { id: tenantAId } });
      await dbService.disconnect();
    }
  });

  it('1. should list commercial payables subledger with accurate aging buckets', async () => {
    const req = createAuthReq(tokenAcctA, { query: { projectId: projectAId } });
    const res = await payablesController.listPayables(req);
    assert.strictEqual(res.success, true);
    const payables = res.data as any;
    assert.strictEqual(payables.total, 1);
    const item = payables.items[0];
    assert.strictEqual(item.sourceType, 'VENDOR_INVOICE');
    assert.strictEqual(item.netPayable, 50000);
    assert.strictEqual(item.outstandingBalance, 50000);
    assert.ok(item.daysOverdue >= 10);
  });

  it('2. should reject payment allocation targeting multiple document types (PostgreSQL CHECK Constraint)', async () => {
    const req = createAuthReq(tokenAcctA, {
      body: {
        projectId: projectAId,
        paymentDate: '2026-09-11',
        paymentMode: 'BANK_TRANSFER',
        referenceNumber: 'NEFT-INVALID-TARGET',
        allocations: [
          {
            invoiceId: invoiceAId,
            expenseClaimId: expenseAId, // Invalid: multiple targets!
            allocatedAmount: 10000,
          },
        ],
      },
    });
    await assert.rejects(async () => paymentsController.createPayment(req), ValidationError);
  });

  it('3. should reject payment allocation exceeding target outstanding balance', async () => {
    const req = createAuthReq(tokenAcctA, {
      body: {
        projectId: projectAId,
        paymentDate: '2026-09-11',
        paymentMode: 'BANK_TRANSFER',
        referenceNumber: 'NEFT-OVERALLOC',
        allocations: [
          {
            invoiceId: invoiceAId,
            allocatedAmount: 60000, // Outstanding is 50,000!
          },
        ],
      },
    });
    await assert.rejects(async () => paymentsController.createPayment(req), ValidationError);
  });

  it('4. should create a valid Payment Voucher in DRAFT status with multiple single-target allocations', async () => {
    const req = createAuthReq(tokenAcctA, {
      body: {
        projectId: projectAId,
        paymentDate: '2026-09-11',
        paymentMode: 'BANK_TRANSFER',
        referenceNumber: 'NEFT-HDFC-99201',
        bankAccountRef: 'HDFC-CORP-6612',
        notes: 'September Batch Payout',
        allocations: [
          {
            invoiceId: invoiceAId,
            allocatedAmount: 20000, // Partial payment
          },
          {
            expenseClaimId: expenseAId,
            allocatedAmount: 4000, // Full payment
          },
        ],
      },
    });
    const res = await paymentsController.createPayment(req);
    assert.strictEqual(res.success, true);
    const voucher = res.data as any;
    assert.strictEqual(voucher.status, 'DRAFT');
    assert.match(voucher.voucherNumber, /^PAY-\d{4}-\d{6}$/);
    assert.strictEqual(Number(voucher.totalAmount), 24000); // 20,000 + 4,000 = 24,000
    assert.strictEqual(voucher.allocations.length, 2);
  });

  it('5. Segregation of Duties: Creator CANNOT approve their own payment voucher', async () => {
    const listRes = await paymentsController.listPayments(createAuthReq(tokenAcctA, { query: { projectId: projectAId } }));
    const voucherId = (listRes.data as any).items[0].id;

    const approveReq = createAuthReq(tokenAcctA, {
      params: { id: voucherId },
      body: { approvalRemarks: 'Self approval attempt' },
    });
    await assert.rejects(async () => paymentsController.approvePayment(approveReq), ConflictError);
  });

  it('6. should allow independent manager to approve payment voucher', async () => {
    const listRes = await paymentsController.listPayments(createAuthReq(tokenAcctA, { query: { projectId: projectAId } }));
    const voucherId = (listRes.data as any).items[0].id;

    const approveReq = createAuthReq(tokenOwnerA, {
      params: { id: voucherId },
      body: { approvalRemarks: 'Voucher approved for bank disbursement' },
    });
    const approveRes = await paymentsController.approvePayment(approveReq);
    assert.strictEqual(approveRes.success, true);
    assert.strictEqual((approveRes.data as any).status, 'APPROVED');
  });

  it('7. Disbursement authorization: user without finance:payment:disburse CANNOT disburse voucher', async () => {
    const listRes = await paymentsController.listPayments(createAuthReq(tokenAcctA, { query: { projectId: projectAId } }));
    const voucherId = (listRes.data as any).items[0].id;

    // PM does not possess finance:payment:disburse permission
    const disburseReq = createAuthReq(tokenPmA, {
      params: { id: voucherId },
      body: { disbursementRemarks: 'Unauthorized disburse attempt' },
    });
    await assert.rejects(async () => paymentsController.disbursePayment(disburseReq), ForbiddenError);
  });

  it('8. should disburse voucher atomically, update targets (PARTIALLY_PAID and PAID), and prevent double payment', async () => {
    const listRes = await paymentsController.listPayments(createAuthReq(tokenAcctA, { query: { projectId: projectAId } }));
    const voucherId = (listRes.data as any).items[0].id;

    // Authorized Owner executes disbursement
    const disburseReq = createAuthReq(tokenOwnerA, {
      params: { id: voucherId },
      body: { disbursementRemarks: 'Disbursed via corporate banking gateway UTR 887162' },
    });
    const disburseRes = await paymentsController.disbursePayment(disburseReq);
    assert.strictEqual(disburseRes.success, true);
    assert.strictEqual((disburseRes.data as any).status, 'DISBURSED');

    // Verify Invoice state: paidAmount = 20,000, outstandingBalance = 30,000, status = PARTIALLY_PAID
    const updatedInvoice = await prisma.vendorInvoice.findUnique({ where: { id: invoiceAId } });
    assert.strictEqual(Number(updatedInvoice.paidAmount), 20000);
    assert.strictEqual(Number(updatedInvoice.outstandingBalance), 30000);
    assert.strictEqual(updatedInvoice.status, 'PARTIALLY_PAID');

    // Verify Expense Claim state: paidAmount = 4,000, status = PAID
    const updatedClaim = await prisma.expenseClaim.findUnique({ where: { id: expenseAId } });
    assert.strictEqual(Number(updatedClaim.paidAmount), 4000);
    assert.strictEqual(updatedClaim.status, 'PAID');

    // RETRY disbursement on already disbursed voucher must be strictly rejected (Zero double payment)
    await assert.rejects(async () => paymentsController.disbursePayment(disburseReq), ConflictError);
  });
});
