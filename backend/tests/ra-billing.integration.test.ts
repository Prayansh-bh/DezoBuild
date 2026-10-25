import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../src/database/database.service.js';
import { RaBillsController } from '../src/modules/finance/controllers/ra-bills.controller.js';
import { RaBillService } from '../src/modules/finance/services/ra-bill.service.js';
import { RaBillRepository } from '../src/modules/finance/repositories/ra-bill.repository.js';
import { AdvanceRepository } from '../src/modules/finance/repositories/advance.repository.js';
import { RetentionRepository } from '../src/modules/finance/repositories/retention.repository.js';
import { FinanceSequenceRepository } from '../src/modules/finance/repositories/finance-sequence.repository.js';
import { FinanceAuditRepository } from '../src/modules/finance/repositories/finance-audit.repository.js';
import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../src/common/errors/app-error.js';

describe('DEZOBUILD Phase 10 — Contractor Running Account (RA) Billing Integration Suite', () => {
  let dbService: DatabaseService;
  let raBillsController: RaBillsController;
  let tokenService: TokenService;
  let prisma: any;

  const tenantAId = 'dddd8888-aaaa-4444-aaaa-888888888888';
  const ownerAId = 'dddd8888-1111-4444-aaaa-888888888888';
  const pmAId = 'dddd8888-2222-4444-aaaa-888888888888';
  const qsAId = 'dddd8888-3333-4444-aaaa-888888888888';

  let tokenOwnerA: string;
  let tokenPmA: string;
  let tokenQsA: string;

  let projectAId: string;
  let vendorAId: string;
  let boqItemAId: string;
  let mbRecord1Id: string;
  let mbRecord2Id: string;

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
    const raBillRepo = new RaBillRepository(prisma);
    const advanceRepo = new AdvanceRepository(prisma);
    const retentionRepo = new RetentionRepository(prisma);

    const raBillService = new RaBillService(prisma, raBillRepo, advanceRepo, retentionRepo, sequenceRepo, auditRepo);
    raBillsController = new RaBillsController(raBillService);
    tokenService = TokenService.getInstance();

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Clean fixtures
    await prisma.financeAuditLog.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.retentionReleaseAllocation.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.retentionRecord.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.raBillMeasurementAllocation.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.raBillDeduction.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.raBillItem.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.raBill.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.digitalMbRecord.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.boqItem.deleteMany({ where: { tenantId: tenantAId } });
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
      data: { id: tenantAId, name: 'RA Billing Infra Ltd', code: 'RBIL_FIN', status: 'ACTIVE' },
    });
    const entPlan = await prisma.platformPlan.findFirstOrThrow({ where: { code: 'ENTERPRISE' } });
    await prisma.tenantSubscription.create({
      data: { tenantId: tenantAId, planId: entPlan.id, status: 'ACTIVE', billingCycle: 'MONTHLY', currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
    });

    // Company
    const compA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        code: 'RBIL_C1',
        name: 'RA Billing Corp',
        legalName: 'RA Billing Infra Ltd',
        panNumber: 'AAACR1234B',
        gstin: '29AAACR1234B1Z5',
        email: 'info@rbil.com',
        phone: '+919876543210',
        address: '100 Billing Way',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
      },
    });

    // Users
    const ownerRole = await prisma.role.findFirstOrThrow({ where: { name: 'COMPANY_OWNER' } });
    const pmRole = await prisma.role.findFirstOrThrow({ where: { name: 'PROJECT_MANAGER' } });
    const acctRole = await prisma.role.findFirstOrThrow({ where: { name: 'ACCOUNTANT' } });

    await prisma.user.create({
      data: { id: ownerAId, tenantId: tenantAId, email: 'owner.ra@rbil.com', fullName: 'Raymond Owner', passwordHash: 'hash' },
    });
    await prisma.userRoleAssignment.create({
      data: { userId: ownerAId, roleId: ownerRole.id, tenantId: tenantAId },
    });

    await prisma.user.create({
      data: { id: pmAId, tenantId: tenantAId, email: 'pm.ra@rbil.com', fullName: 'Paul PM', passwordHash: 'hash' },
    });
    await prisma.userRoleAssignment.create({
      data: { userId: pmAId, roleId: pmRole.id, tenantId: tenantAId },
    });

    await prisma.user.create({
      data: { id: qsAId, tenantId: tenantAId, email: 'qs.ra@rbil.com', fullName: 'Quentin Quantity Surveyor', passwordHash: 'hash' },
    });
    await prisma.userRoleAssignment.create({
      data: { userId: qsAId, roleId: acctRole.id, tenantId: tenantAId },
    });

    // Project & Vendor
    const project = await prisma.project.create({
      data: { tenantId: tenantAId, companyId: compA.id, name: 'Commercial Tower Skybridge', code: 'CTS', status: 'ACTIVE' },
    });
    projectAId = project.id;

    const vendor = await prisma.vendor.create({
      data: {
        tenantId: tenantAId,
        name: 'Apex Structural Contractors',
        code: 'VEND_ASC',
        status: 'ACTIVE',
      },
    });
    vendorAId = vendor.id;

    // BOQ Item: RCC M30 Concrete, 1,000 CUM @ 6,000 = 6,000,000
    const boqItem = await prisma.boqItem.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        itemNumber: '1.01',
        description: 'Design Mix RCC Grade M30 for Superstructure Columns',
        uom: 'CUM',
        quantity: new Prisma.Decimal(1000),
        unitRate: new Prisma.Decimal(6000),
        totalAmount: new Prisma.Decimal(6000000),
        createdById: ownerAId,
      },
    });
    boqItemAId = boqItem.id;

    // Digital MB Record 1: 50 CUM approved (columns grid A1-A4)
    const mb1 = await prisma.digitalMbRecord.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        boqItemId: boqItemAId,
        mbNumber: 'MB-2026-0001',
        measurementDate: new Date('2026-09-01'),
        location: 'Grid A1-A4 Columns',
        status: 'APPROVED',
        createdById: qsAId,
        approvedById: pmAId,
        currentQuantity: new Prisma.Decimal(50),
        cumulativeQuantity: new Prisma.Decimal(50),
      },
    });
    mbRecord1Id = mb1.id;

    // Digital MB Record 2: 30 CUM approved (columns grid B1-B4)
    const mb2 = await prisma.digitalMbRecord.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        boqItemId: boqItemAId,
        mbNumber: 'MB-2026-0002',
        measurementDate: new Date('2026-09-05'),
        location: 'Grid B1-B4 Columns',
        status: 'APPROVED',
        createdById: qsAId,
        approvedById: pmAId,
        currentQuantity: new Prisma.Decimal(30),
        cumulativeQuantity: new Prisma.Decimal(80),
      },
    });
    mbRecord2Id = mb2.id;

    tokenOwnerA = tokenService.createAccessToken({ userId: ownerAId, tenantId: tenantAId, sessionId: 's-own', sessionVersion: 1 });
    tokenPmA = tokenService.createAccessToken({ userId: pmAId, tenantId: tenantAId, sessionId: 's-pm', sessionVersion: 1 });
    tokenQsA = tokenService.createAccessToken({ userId: qsAId, tenantId: tenantAId, sessionId: 's-qs', sessionVersion: 1 });
  });

  after(async () => {
    if (prisma) {
      await prisma.financeAuditLog.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.retentionReleaseAllocation.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.retentionRecord.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.raBillMeasurementAllocation.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.raBillDeduction.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.raBillItem.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.raBill.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.digitalMbRecord.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.boqItem.deleteMany({ where: { tenantId: tenantAId } });
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

  it('1. should create RA Bill #1 in DRAFT with exact Digital MB measurement allocations and structured deductions', async () => {
    const req = createAuthReq(tokenQsA, {
      body: {
        projectId: projectAId,
        vendorId: vendorAId,
        billDate: '2026-09-11',
        periodStartDate: '2026-09-01',
        periodEndDate: '2026-09-10',
        items: [
          {
            boqItemId: boqItemAId,
            description: 'RCC M30 Columns Execution',
            uom: 'CUM',
            contractQuantity: 1000,
            previousCumulativeQuantity: 0,
            currentBillQuantity: 80, // 50 from MB1 + 30 from MB2
            unitRate: 6000.0,
            measurementAllocations: [
              { digitalMbRecordId: mbRecord1Id, allocatedQuantity: 50 },
              { digitalMbRecordId: mbRecord2Id, allocatedQuantity: 30 },
            ],
          },
        ],
        deductions: [
          { deductionType: 'RETENTION', ratePercent: 5, amount: 24000, description: '5% Retention Money' },
          { deductionType: 'TDS_CONTRACTOR', ratePercent: 2, amount: 9600, description: '2% Section 194C TDS' },
          { deductionType: 'LABOUR_CESS', ratePercent: 1, amount: 4800, description: '1% Building & Other Construction Workers Cess' },
        ],
      },
    });

    const res = await raBillsController.createRaBill(req);
    assert.strictEqual(res.success, true);
    const bill = res.data as any;
    assert.strictEqual(bill.status, 'DRAFT');
    assert.strictEqual(bill.billSequence, 1);
    assert.match(bill.billNumber, /^RAB-\d{4}-\d{6}$/);
    assert.strictEqual(Number(bill.grossAmount), 480000); // 80 CUM * 6000 = 480,000
    assert.strictEqual(Number(bill.totalDeductions), 38400); // 24000 + 9600 + 4800 = 38,400
    assert.strictEqual(Number(bill.netPayable), 441600); // 480000 - 38400 = 441,600
    assert.strictEqual(Number(bill.outstandingBalance), 441600);
  });

  it('2. should reject concurrent active RA bill creation for same vendor and project (Partial Unique Index protection)', async () => {
    // Another draft creation while Bill #1 is unapproved must fail
    const req = createAuthReq(tokenQsA, {
      body: {
        projectId: projectAId,
        vendorId: vendorAId,
        billDate: '2026-09-11',
        periodStartDate: '2026-09-01',
        periodEndDate: '2026-09-10',
        items: [
          {
            boqItemId: boqItemAId,
            description: 'Attempting parallel active bill',
            uom: 'CUM',
            contractQuantity: 1000,
            previousCumulativeQuantity: 0,
            currentBillQuantity: 10,
            unitRate: 6000.0,
            measurementAllocations: [{ digitalMbRecordId: mbRecord1Id, allocatedQuantity: 10 }],
          },
        ],
      },
    });
    await assert.rejects(async () => raBillsController.createRaBill(req), ConflictError);
  });

  it('3. should verify RA bill measurement allocations and statutory deductions', async () => {
    const listRes = await raBillsController.listRaBills(createAuthReq(tokenQsA, { query: { projectId: projectAId } }));
    const billId = (listRes.data as any).items[0].id;

    const verifyReq = createAuthReq(tokenPmA, {
      params: { id: billId },
      body: { verificationRemarks: 'Physical measurements verified against certified MB records' },
    });
    const verifyRes = await raBillsController.verifyRaBill(verifyReq);
    assert.strictEqual(verifyRes.success, true);
    assert.strictEqual((verifyRes.data as any).status, 'VERIFIED');
  });

  it('4. Segregation of Duties: Preparer CANNOT approve their own RA bill', async () => {
    const listRes = await raBillsController.listRaBills(createAuthReq(tokenQsA, { query: { projectId: projectAId } }));
    const billId = (listRes.data as any).items[0].id;

    const approveReq = createAuthReq(tokenQsA, {
      params: { id: billId },
      body: { approvalRemarks: 'Self approval attempt' },
    });
    await assert.rejects(async () => raBillsController.approveRaBill(approveReq), ConflictError);
  });

  it('5. should approve RA bill, make it immutable, and automatically generate RetentionRecord', async () => {
    const listRes = await raBillsController.listRaBills(createAuthReq(tokenQsA, { query: { projectId: projectAId } }));
    const billId = (listRes.data as any).items[0].id;

    const approveReq = createAuthReq(tokenOwnerA, {
      params: { id: billId },
      body: { approvalRemarks: 'Contractor RA Bill #1 Approved for Commercial Payout' },
    });
    const approveRes = await raBillsController.approveRaBill(approveReq);
    assert.strictEqual(approveRes.success, true);
    assert.strictEqual((approveRes.data as any).status, 'APPROVED');

    // Verify RetentionRecord created from RA Bill
    const retention = await prisma.retentionRecord.findFirst({
      where: { tenantId: tenantAId, raBillId: billId },
    });
    assert.ok(retention);
    assert.strictEqual(Number(retention.retainedAmount), 24000);
    assert.strictEqual(Number(retention.balanceAmount), 24000);
    assert.strictEqual(retention.status, 'HELD');
  });

  it('6. should reject creating second RA bill attempting to consume already-billed MB quantities', async () => {
    // Bill #1 consumed 50 from MB1 and 30 from MB2. Both MBs have 0 remaining certified quantity!
    const req = createAuthReq(tokenQsA, {
      body: {
        projectId: projectAId,
        vendorId: vendorAId,
        billDate: '2026-09-12',
        periodStartDate: '2026-09-01',
        periodEndDate: '2026-09-10',
        items: [
          {
            boqItemId: boqItemAId,
            description: 'Consuming already billed MB record',
            uom: 'CUM',
            contractQuantity: 1000,
            previousCumulativeQuantity: 80,
            currentBillQuantity: 50,
            unitRate: 6000.0,
            measurementAllocations: [{ digitalMbRecordId: mbRecord1Id, allocatedQuantity: 50 }],
          },
        ],
      },
    });
    await assert.rejects(async () => raBillsController.createRaBill(req), ConflictError);
  });
});
