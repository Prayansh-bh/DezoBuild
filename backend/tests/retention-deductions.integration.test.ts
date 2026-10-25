import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../src/database/database.service.js';
import { RetentionRepository } from '../src/modules/finance/repositories/retention.repository.js';
import { PaymentRepository } from '../src/modules/finance/repositories/payment.repository.js';

describe('DEZOBUILD Phase 10 — Retention Records & Structured Deductions Integration Suite', () => {
  let dbService: DatabaseService;
  let retentionRepo: RetentionRepository;
  let paymentRepo: PaymentRepository;
  let prisma: any;

  const tenantAId = 'cccc8888-aaaa-4444-aaaa-888888888888';
  const ownerAId = 'cccc8888-1111-4444-aaaa-888888888888';

  let projectAId: string;
  let vendorAId: string;
  let retentionRecordId: string;
  let paymentVoucherId: string;

  before(async () => {
    dbService = DatabaseService.getInstance();
    await dbService.connect();
    prisma = dbService.getClient();

    retentionRepo = new RetentionRepository(prisma);
    paymentRepo = new PaymentRepository(prisma);

    // Clean fixtures
    await prisma.retentionReleaseAllocation.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.retentionRecord.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.paymentAllocation.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.paymentVoucher.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.vendor.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.project.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.company.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.user.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.tenant.deleteMany({ where: { id: tenantAId } });

    // Tenant
    await prisma.tenant.create({
      data: { id: tenantAId, name: 'Retention Infra Ltd', code: 'RIL_FIN', status: 'ACTIVE' },
    });

    const entPlan = await prisma.platformPlan.findFirstOrThrow({ where: { code: 'ENTERPRISE' } });
    await prisma.tenantSubscription.create({
      data: { tenantId: tenantAId, planId: entPlan.id, status: 'ACTIVE', billingCycle: 'MONTHLY', currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
    });

    // Company
    const compA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        code: 'RIL_C1',
        name: 'Retention Infra Corp',
        legalName: 'Retention Infra Corp Ltd',
        panNumber: 'AAACR1234A',
        gstin: '29AAACR1234A1Z5',
        email: 'info@ril.com',
        phone: '+919876543210',
        address: '100 Marine Way',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
      },
    });

    await prisma.user.create({
      data: { id: ownerAId, tenantId: tenantAId, email: 'owner.ret@ril.com', fullName: 'Richard Owner', passwordHash: 'hash' },
    });

    const project = await prisma.project.create({
      data: { tenantId: tenantAId, companyId: compA.id, name: 'Retention Marine Port', code: 'RMP', status: 'ACTIVE' },
    });
    projectAId = project.id;

    const vendor = await prisma.vendor.create({
      data: {
        tenantId: tenantAId,
        name: 'Maritime Piling Specialists',
        code: 'VEND_MPS',
        status: 'ACTIVE',
      },
    });
    vendorAId = vendor.id;

    // Create an invoice to serve as the single source for retention
    const invoice = await prisma.vendorInvoice.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        vendorId: vendorAId,
        invoiceNumber: 'INV-2026-RET-SRC',
        vendorInvoiceNumber: 'MPS-RET-01',
        invoiceDate: new Date(),
        dueDate: new Date(),
        subtotalAmount: new Prisma.Decimal(50000),
        taxAmount: new Prisma.Decimal(0),
        grossTotal: new Prisma.Decimal(50000),
        netPayable: new Prisma.Decimal(50000),
        paidAmount: new Prisma.Decimal(0),
        outstandingBalance: new Prisma.Decimal(50000),
        status: 'APPROVED',
        createdById: ownerAId,
      },
    });

    // Create a voucher to link release allocation
    const voucher = await prisma.paymentVoucher.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        voucherNumber: 'PAY-2026-RET001',
        paymentDate: new Date('2026-09-11'),
        paymentMode: 'BANK_TRANSFER',
        referenceNumber: 'RET-RELEASE-UTR-1',
        totalAmount: new Prisma.Decimal(50000),
        status: 'APPROVED',
        createdById: ownerAId,
      },
    });
    paymentVoucherId = voucher.id;
  });

  after(async () => {
    if (prisma) {
      await prisma.retentionReleaseAllocation.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.retentionRecord.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.paymentAllocation.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.paymentVoucher.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.vendorInvoiceLine.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.vendorInvoice.deleteMany({ where: { tenantId: tenantAId } });
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

  it('1. should create RetentionRecord with status HELD and balance equal to retainedAmount', async () => {
    const inv = await prisma.vendorInvoice.findFirstOrThrow({ where: { tenantId: tenantAId, invoiceNumber: 'INV-2026-RET-SRC' } });
    const record = await retentionRepo.createRetentionRecord(
      tenantAId,
      projectAId,
      vendorAId,
      new Prisma.Decimal(50000.0),
      { invoiceId: inv.id }
    );
    assert.ok(record);
    retentionRecordId = record.id;
    assert.strictEqual(record.status, 'HELD');
    assert.strictEqual(Number(record.retainedAmount), 50000);
    assert.strictEqual(Number(record.releasedAmount), 0);
    assert.strictEqual(Number(record.balanceAmount), 50000);
  });

  it('2. should release partial retention and update status to PARTIALLY_RELEASED', async () => {
    const alloc = await retentionRepo.createReleaseAllocation(
      tenantAId,
      retentionRecordId,
      paymentVoucherId,
      ownerAId,
      new Prisma.Decimal(20000.0)
    );
    assert.ok(alloc);
    assert.strictEqual(Number(alloc.releaseAmount), 20000);

    const record = await retentionRepo.findRetentionById(tenantAId, retentionRecordId);
    assert.strictEqual(Number(record!.releasedAmount), 20000);
    assert.strictEqual(Number(record!.balanceAmount), 30000);
    assert.strictEqual(record!.status, 'PARTIALLY_RELEASED');
  });

  it('3. should release remaining retention and transition status to FULLY_RELEASED', async () => {
    await retentionRepo.createReleaseAllocation(
      tenantAId,
      retentionRecordId,
      paymentVoucherId,
      ownerAId,
      new Prisma.Decimal(30000.0)
    );

    const record = await retentionRepo.findRetentionById(tenantAId, retentionRecordId);
    assert.strictEqual(Number(record!.releasedAmount), 50000);
    assert.strictEqual(Number(record!.balanceAmount), 0);
    assert.strictEqual(record!.status, 'FULLY_RELEASED');
  });
});
