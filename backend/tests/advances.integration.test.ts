import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../src/database/database.service.js';
import { AdvancesController } from '../src/modules/finance/controllers/advances.controller.js';
import { AdvanceService } from '../src/modules/finance/services/advance.service.js';
import { AdvanceRepository } from '../src/modules/finance/repositories/advance.repository.js';
import { FinanceSequenceRepository } from '../src/modules/finance/repositories/finance-sequence.repository.js';
import { FinanceAuditRepository } from '../src/modules/finance/repositories/finance-audit.repository.js';
import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../src/common/errors/app-error.js';

describe('DEZOBUILD Phase 10 — Advances & Recovery Integration Suite', () => {
  let dbService: DatabaseService;
  let advancesController: AdvancesController;
  let advanceService: AdvanceService;
  let advanceRepo: AdvanceRepository;
  let tokenService: TokenService;
  let prisma: any;

  const tenantAId = 'bbbb8888-aaaa-4444-aaaa-888888888888';
  const ownerAId = 'bbbb8888-1111-4444-aaaa-888888888888';
  const empAId = 'bbbb8888-2222-4444-aaaa-888888888888';

  let tokenOwnerA: string;
  let projectAId: string;
  let vendorAId: string;

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
    advanceRepo = new AdvanceRepository(prisma);

    advanceService = new AdvanceService(prisma, advanceRepo, sequenceRepo, auditRepo);
    advancesController = new AdvancesController(advanceService);
    tokenService = TokenService.getInstance();

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Clean fixtures
    await prisma.financeAuditLog.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.advanceRecoveryAllocation.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.advanceRecord.deleteMany({ where: { tenantId: tenantAId } });
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
      data: { id: tenantAId, name: 'Advance Infra Ltd', code: 'AIL_FIN', status: 'ACTIVE' },
    });
    const entPlan = await prisma.platformPlan.findFirstOrThrow({ where: { code: 'ENTERPRISE' } });
    await prisma.tenantSubscription.create({
      data: { tenantId: tenantAId, planId: entPlan.id, status: 'ACTIVE', billingCycle: 'MONTHLY', currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
    });

    // Company
    const compA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        code: 'AIL_C1',
        name: 'Advance Infra Corp',
        legalName: 'Advance Infra Corp Ltd',
        panNumber: 'AAACA1234A',
        gstin: '29AAACA1234A1Z5',
        email: 'info@ail.com',
        phone: '+919876543210',
        address: '100 Advance Way',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
      },
    });

    // Users
    const ownerRole = await prisma.role.findFirstOrThrow({ where: { name: 'COMPANY_OWNER' } });
    const empRole = await prisma.role.findFirstOrThrow({ where: { name: 'EMPLOYEE' } });

    await prisma.user.create({
      data: { id: ownerAId, tenantId: tenantAId, email: 'owner.adv@ail.com', fullName: 'Oliver Owner', passwordHash: 'hash' },
    });
    await prisma.userRoleAssignment.create({
      data: { userId: ownerAId, roleId: ownerRole.id, tenantId: tenantAId },
    });

    await prisma.user.create({
      data: { id: empAId, tenantId: tenantAId, email: 'emp.adv@ail.com', fullName: 'Edward Employee', passwordHash: 'hash' },
    });
    await prisma.userRoleAssignment.create({
      data: { userId: empAId, roleId: empRole.id, tenantId: tenantAId },
    });

    // Project & Vendor
    const project = await prisma.project.create({
      data: { tenantId: tenantAId, companyId: compA.id, name: 'Advance Highway Sec-1', code: 'AHS1', status: 'ACTIVE' },
    });
    projectAId = project.id;

    const vendor = await prisma.vendor.create({
      data: {
        tenantId: tenantAId,
        name: 'Prime Civil Contractors',
        code: 'VEND_PCC',
        status: 'ACTIVE',
      },
    });
    vendorAId = vendor.id;

    tokenOwnerA = tokenService.createAccessToken({ userId: ownerAId, tenantId: tenantAId, sessionId: 's-own', sessionVersion: 1 });
  });

  after(async () => {
    if (prisma) {
      await prisma.financeAuditLog.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.advanceRecoveryAllocation.deleteMany({ where: { tenantId: tenantAId } });
      await prisma.advanceRecord.deleteMany({ where: { tenantId: tenantAId } });
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

  it('1. should create a valid Vendor Mobilization Advance in DISBURSED status', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        projectId: projectAId,
        advanceType: 'CONTRACTOR_MOBILIZATION_ADVANCE',
        vendorId: vendorAId,
        advanceDate: '2026-09-11',
        amount: 100000.0,
        notes: '10% Mobilization advance for earthworks package',
      },
    });
    const res = await advancesController.createAdvance(req);
    assert.strictEqual(res.success, true);
    const advance = res.data as any;
    assert.strictEqual(advance.status, 'DISBURSED');
    assert.match(advance.advanceNumber, /^ADV-\d{4}-\d{6}$/);
    assert.strictEqual(Number(advance.amount), 100000);
    assert.strictEqual(Number(advance.recoveredAmount), 0);
    assert.strictEqual(Number(advance.outstandingAmount), 100000);
  });

  it('2. should reject Advance creation with mismatching beneficiary type (e.g. employeeId for Vendor Advance)', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        projectId: projectAId,
        advanceType: 'VENDOR_MATERIAL_ADVANCE',
        employeeId: empAId, // Invalid: must provide vendorId!
        advanceDate: '2026-09-11',
        amount: 25000.0,
      },
    });
    await assert.rejects(async () => advancesController.createAdvance(req), ValidationError);
  });

  it('3. should create a valid Employee Imprest Advance', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        projectId: projectAId,
        advanceType: 'EMPLOYEE_IMPREST',
        employeeId: empAId,
        advanceDate: '2026-09-11',
        amount: 15000.0,
        notes: 'Site petty imprest float',
      },
    });
    const res = await advancesController.createAdvance(req);
    assert.strictEqual(res.success, true);
    const advance = res.data as any;
    assert.strictEqual(advance.status, 'DISBURSED');
    assert.strictEqual(advance.employeeId, empAId);
    assert.strictEqual(Number(advance.amount), 15000);
  });

  it('4. should track partial recovery and update advance status to PARTIALLY_RECOVERED', async () => {
    const listRes = await advancesController.listAdvances(createAuthReq(tokenOwnerA, { query: { projectId: projectAId, vendorId: vendorAId } }));
    const advanceId = (listRes.data as any).items[0].id;

    // Simulate recovery of 40,000 against a temporary invoice
    const inv = await prisma.vendorInvoice.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        vendorId: vendorAId,
        invoiceNumber: 'INV-2026-REC01',
        vendorInvoiceNumber: 'PCC-REC-01',
        invoiceDate: new Date(),
        dueDate: new Date(),
        subtotalAmount: new Prisma.Decimal(40000),
        taxAmount: new Prisma.Decimal(0),
        grossTotal: new Prisma.Decimal(40000),
        netPayable: new Prisma.Decimal(40000),
        paidAmount: new Prisma.Decimal(0),
        outstandingBalance: new Prisma.Decimal(40000),
        status: 'APPROVED',
        createdById: ownerAId,
      },
    });

    const alloc = await advanceRepo.createRecoveryAllocation(
      tenantAId,
      advanceId,
      ownerAId,
      new Prisma.Decimal(40000),
      { invoiceId: inv.id }
    );
    assert.ok(alloc);

    const updated = await advanceRepo.findAdvanceById(tenantAId, advanceId);
    assert.strictEqual(Number(updated!.recoveredAmount), 40000);
    assert.strictEqual(Number(updated!.outstandingAmount), 60000);
    assert.strictEqual(updated!.status, 'PARTIALLY_RECOVERED');
  });

  it('5. should transition advance to FULLY_RECOVERED when remaining balance is 0', async () => {
    const listRes = await advancesController.listAdvances(createAuthReq(tokenOwnerA, { query: { projectId: projectAId, vendorId: vendorAId } }));
    const advanceId = (listRes.data as any).items[0].id;

    // Recover remaining 60,000
    const inv = await prisma.vendorInvoice.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        vendorId: vendorAId,
        invoiceNumber: 'INV-2026-REC02',
        vendorInvoiceNumber: 'PCC-REC-02',
        invoiceDate: new Date(),
        dueDate: new Date(),
        subtotalAmount: new Prisma.Decimal(60000),
        taxAmount: new Prisma.Decimal(0),
        grossTotal: new Prisma.Decimal(60000),
        netPayable: new Prisma.Decimal(60000),
        paidAmount: new Prisma.Decimal(0),
        outstandingBalance: new Prisma.Decimal(60000),
        status: 'APPROVED',
        createdById: ownerAId,
      },
    });

    await advanceRepo.createRecoveryAllocation(
      tenantAId,
      advanceId,
      ownerAId,
      new Prisma.Decimal(60000),
      { invoiceId: inv.id }
    );

    const updated = await advanceRepo.findAdvanceById(tenantAId, advanceId);
    assert.strictEqual(Number(updated!.recoveredAmount), 100000);
    assert.strictEqual(Number(updated!.outstandingAmount), 0);
    assert.strictEqual(updated!.status, 'FULLY_RECOVERED');
  });
});
