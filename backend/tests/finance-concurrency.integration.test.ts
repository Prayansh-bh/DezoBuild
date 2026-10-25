import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../src/database/database.service.js';
import { FinanceSequenceRepository } from '../src/modules/finance/repositories/finance-sequence.repository.js';
import { PaymentService } from '../src/modules/finance/services/payment.service.js';
import { PaymentRepository } from '../src/modules/finance/repositories/payment.repository.js';
import { FinanceAuditRepository } from '../src/modules/finance/repositories/finance-audit.repository.js';
import { RaBillService } from '../src/modules/finance/services/ra-bill.service.js';
import { RaBillRepository } from '../src/modules/finance/repositories/ra-bill.repository.js';
import { AdvanceRepository } from '../src/modules/finance/repositories/advance.repository.js';
import { RetentionRepository } from '../src/modules/finance/repositories/retention.repository.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';

describe('DEZOBUILD Phase 10 — Finance Concurrency & High-Contention Race Conditions Suite', () => {
  let dbService: DatabaseService;
  let sequenceRepo: FinanceSequenceRepository;
  let paymentService: PaymentService;
  let raBillService: RaBillService;
  let advanceRepo: AdvanceRepository;
  let prisma: any;

  const tenantAId = 'eeee8888-aaaa-4444-aaaa-888888888888';
  const ownerAId = 'eeee8888-1111-4444-aaaa-888888888888';
  const user1Id = 'eeee8888-2222-4444-aaaa-888888888888';

  let projectAId: string;
  let vendorAId: string;

  before(async () => {
    dbService = DatabaseService.getInstance();
    await dbService.connect();
    prisma = dbService.getClient();

    sequenceRepo = new FinanceSequenceRepository(prisma);
    const auditRepo = new FinanceAuditRepository(prisma);
    const paymentRepo = new PaymentRepository(prisma);
    const raBillRepo = new RaBillRepository(prisma);
    advanceRepo = new AdvanceRepository(prisma);
    const retentionRepo = new RetentionRepository(prisma);

    paymentService = new PaymentService(prisma, paymentRepo, sequenceRepo, auditRepo);
    raBillService = new RaBillService(prisma, raBillRepo, advanceRepo, retentionRepo, sequenceRepo, auditRepo);

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Clean fixtures
    await prisma.financeAuditLog.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.paymentAllocation.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.paymentVoucher.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.advanceRecoveryAllocation.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.advanceRecord.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.retentionReleaseAllocation.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.retentionRecord.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.raBillMeasurementAllocation.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.raBillDeduction.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.raBillItem.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.raBill.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.digitalMbRecord.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.boqItem.deleteMany({ where: { tenantId: tenantAId } });
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

    // Tenant & Subscription
    await prisma.tenant.create({
      data: { id: tenantAId, name: 'Concurrency Testing Corp', code: 'CTC_FIN', status: 'ACTIVE' },
    });
    const entPlan = await prisma.platformPlan.findFirstOrThrow({ where: { code: 'ENTERPRISE' } });
    await prisma.tenantSubscription.create({
      data: { tenantId: tenantAId, planId: entPlan.id, status: 'ACTIVE', billingCycle: 'MONTHLY', currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
    });

    // Company
    const compA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        code: 'CTC_C1',
        name: 'Concurrency Company',
        legalName: 'Concurrency Testing Corp',
        panNumber: 'AAACC1234K',
        gstin: '29AAACC1234K1Z5',
        email: 'info@ctc.com',
        phone: '+919876543211',
        address: '100 Concurrency St',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
      },
    });

    // Users
    await prisma.user.create({
      data: { id: ownerAId, tenantId: tenantAId, email: 'owner.conc@ctc.com', fullName: 'Charles Concurrency', passwordHash: 'hash' },
    });

    await prisma.user.create({
      data: { id: user1Id, tenantId: tenantAId, email: 'user1.conc@ctc.com', fullName: 'Ursa User', passwordHash: 'hash' },
    });

    const project = await prisma.project.create({
      data: { tenantId: tenantAId, companyId: compA.id, name: 'High-Concurrency Project', code: 'HCP', status: 'ACTIVE' },
    });
    projectAId = project.id;

    const vendor = await prisma.vendor.create({
      data: {
        tenantId: tenantAId,
        name: 'Concurrent Heavy Infra',
        code: 'VEND_CHI',
        status: 'ACTIVE',
      },
    });
    vendorAId = vendor.id;
  });

  after(async () => {
    if (prisma) {
      await prisma.financeAuditLog.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.paymentAllocation.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.paymentVoucher.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.advanceRecoveryAllocation.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.advanceRecord.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.retentionReleaseAllocation.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.retentionRecord.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.raBillMeasurementAllocation.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.raBillDeduction.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.raBillItem.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.raBill.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.digitalMbRecord.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.boqItem.deleteMany({ where: { tenantId: tenantAId } });
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

  it('1. should atomically allocate 20 concurrent sequence numbers without duplicates', async () => {
    const promises = Array.from({ length: 20 }, () =>
      sequenceRepo.getNextSequence(tenantAId, 'INV')
    );

    const results = await Promise.all(promises);
    assert.strictEqual(results.length, 20);

    const uniqueSet = new Set(results);
    assert.strictEqual(uniqueSet.size, 20, 'All generated sequence numbers must be distinct');
  });

  it('2. should prevent race conditions on concurrent RA bill creation via partial unique index', async () => {
    // Create BOQ and MB
    const boq = await prisma.boqItem.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        itemNumber: '9.01',
        description: 'Concurrency Excavation',
        uom: 'CUM',
        quantity: new Prisma.Decimal(100),
        unitRate: new Prisma.Decimal(1000),
        totalAmount: new Prisma.Decimal(100000),
        createdById: ownerAId,
      },
    });

    const mb = await prisma.digitalMbRecord.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        boqItemId: boq.id,
        mbNumber: 'MB-CONC-001',
        measurementDate: new Date(),
        location: 'Concurrency Grid',
        status: 'APPROVED',
        createdById: ownerAId,
        approvedById: ownerAId,
        currentQuantity: new Prisma.Decimal(50),
        cumulativeQuantity: new Prisma.Decimal(50),
      },
    });

    const context = {
      tenantId: tenantAId,
      user: { id: ownerAId },
    };

    // Attempt 5 simultaneous RA bill creations for the same vendor/project
    const attempts = Array.from({ length: 5 }, () =>
      raBillService.createRaBill(context, {
        projectId: projectAId,
        vendorId: vendorAId,
        billDate: '2026-09-11',
        periodStartDate: '2026-09-01',
        periodEndDate: '2026-09-10',
        deductions: [],
        items: [
          {
            boqItemId: boq.id,
            description: 'Concurrent creation attempt',
            uom: 'CUM',
            contractQuantity: 100,
            previousCumulativeQuantity: 0,
            currentBillQuantity: 10,
            unitRate: 1000,
            measurementAllocations: [{ digitalMbRecordId: mb.id, allocatedQuantity: 10 }],
          },
        ],
      }).then(() => 'SUCCESS').catch(() => 'FAILED')
    );

    const outcomes = await Promise.all(attempts);
    const successes = outcomes.filter((o) => o === 'SUCCESS').length;
    const failures = outcomes.filter((o) => o === 'FAILED').length;

    assert.strictEqual(successes, 1, 'Exactly one concurrent RA bill creation must succeed');
    assert.strictEqual(failures, 4, 'All competing active bill attempts must fail due to partial unique index');
  });

  it('3. should serialize competing payment disbursements and prevent over-payment / double disbursement', async () => {
    // Create an Invoice with netPayable = 10,000
    const inv = await prisma.vendorInvoice.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        vendorId: vendorAId,
        invoiceNumber: 'INV-CONC-PAY-01',
        vendorInvoiceNumber: 'VEND-CONC-01',
        invoiceDate: new Date(),
        dueDate: new Date(),
        subtotalAmount: new Prisma.Decimal(10000),
        taxAmount: new Prisma.Decimal(0),
        grossTotal: new Prisma.Decimal(10000),
        netPayable: new Prisma.Decimal(10000),
        paidAmount: new Prisma.Decimal(0),
        outstandingBalance: new Prisma.Decimal(10000),
        status: 'APPROVED',
        createdById: user1Id,
      },
    });

    // Create a voucher for 10,000 in APPROVED status
    const voucher = await prisma.paymentVoucher.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        voucherNumber: 'PAY-CONC-0001',
        paymentDate: new Date(),
        paymentMode: 'BANK_TRANSFER',
        referenceNumber: 'CONC-PAY-UTR',
        totalAmount: new Prisma.Decimal(10000),
        status: 'APPROVED',
        createdById: user1Id,
        allocations: {
          create: [
            {
              tenantId: tenantAId,
              invoiceId: inv.id,
              allocatedAmount: new Prisma.Decimal(10000),
            },
          ],
        },
      },
    });

    const context = {
      tenantId: tenantAId,
      user: { id: ownerAId },
    };

    // Attempt 5 simultaneous disbursement calls on the same voucher
    const disburseAttempts = Array.from({ length: 5 }, () =>
      paymentService.disburseVoucher(context, voucher.id, { disbursementRemarks: 'Concurrent call' })
        .then(() => 'DISBURSED')
        .catch(() => 'REJECTED')
    );

    const disburseOutcomes = await Promise.all(disburseAttempts);
    const disburseSuccesses = disburseOutcomes.filter((o) => o === 'DISBURSED').length;
    const disburseRejections = disburseOutcomes.filter((o) => o === 'REJECTED').length;

    assert.strictEqual(disburseSuccesses, 1, 'Exactly one disbursement attempt must succeed');
    assert.strictEqual(disburseRejections, 4, 'All concurrent/duplicate disbursements must be rejected');

    const finalizedInv = await prisma.vendorInvoice.findUnique({ where: { id: inv.id } });
    assert.strictEqual(Number(finalizedInv!.paidAmount), 10000);
    assert.strictEqual(Number(finalizedInv!.outstandingBalance), 0);
    assert.strictEqual(finalizedInv!.status, 'PAID');
  });
});
