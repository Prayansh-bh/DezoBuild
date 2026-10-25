import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service.js';
import { ExpensesController } from '../src/modules/finance/controllers/expenses.controller.js';
import { ExpenseService } from '../src/modules/finance/services/expense.service.js';
import { ExpenseRepository } from '../src/modules/finance/repositories/expense.repository.js';
import { FinanceSequenceRepository } from '../src/modules/finance/repositories/finance-sequence.repository.js';
import { FinanceAuditRepository } from '../src/modules/finance/repositories/finance-audit.repository.js';
import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../src/common/errors/app-error.js';

describe('DEZOBUILD Phase 10 — Expenses & Site Claims Integration Suite', () => {
  let dbService: DatabaseService;
  let expensesController: ExpensesController;
  let expenseService: ExpenseService;
  let tokenService: TokenService;
  let prisma: any;

  // Tenant A: ENTERPRISE (has finance:commercial)
  const tenantAId = '88888888-aaaa-4444-aaaa-888888888888';
  const ownerAId = '88888888-1111-4444-aaaa-888888888888';
  const pmAId = '88888888-2222-4444-aaaa-888888888888';
  const seAId = '88888888-3333-4444-aaaa-888888888888';
  const empAId = '88888888-4444-4444-aaaa-888888888888';

  // Tenant B: STARTER (missing finance:commercial)
  const tenantBId = '88888888-bbbb-4444-bbbb-888888888888';
  const ownerBId = '88888888-1111-4444-bbbb-888888888888';

  let tokenOwnerA: string;
  let tokenPmA: string;
  let tokenSeA: string;
  let tokenEmpA: string;
  let tokenOwnerB: string;

  let projectAId: string;
  let projectBId: string;
  let categoryTravelId: string;
  let categoryFoodId: string;

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
    const expenseRepo = new ExpenseRepository(prisma);
    expenseService = new ExpenseService(prisma, expenseRepo, sequenceRepo, auditRepo);
    expensesController = new ExpensesController(expenseService);
    tokenService = TokenService.getInstance();

    // 1. Seed RBAC & Subscriptions
    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // 2. Clean test fixtures
    await prisma.financeAuditLog.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.expenseClaim.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.expenseCategory.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.financeSequence.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.projectMember.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.project.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });

    // 3. Setup Tenants
    await prisma.tenant.create({
      data: {
        id: tenantAId,
        name: 'Enterprise Builder Corp',
        code: 'EBC_FIN',
        status: 'ACTIVE',
      },
    });

    const entPlan = await prisma.platformPlan.findFirstOrThrow({ where: { code: 'ENTERPRISE' } });
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantAId,
        planId: entPlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.tenant.create({
      data: {
        id: tenantBId,
        name: 'Starter Builder Corp',
        code: 'SBC_FIN',
        status: 'ACTIVE',
      },
    });

    const strPlan = await prisma.platformPlan.findFirstOrThrow({ where: { code: 'STARTER' } });
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantBId,
        planId: strPlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // 4. Setup Companies
    const compA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        name: 'Enterprise Builder Corp Ltd',
        code: 'EBC_C1',
        legalName: 'Enterprise Builder Corp India Ltd',
        panNumber: 'AAACE1234A',
        gstin: '29AAACE1234A1Z5',
        email: 'info@ebc.com',
        phone: '+919876543210',
        address: '100 Enterprise Way',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
      },
    });

    const compB = await prisma.company.create({
      data: {
        tenantId: tenantBId,
        name: 'Starter Builder Corp Ltd',
        code: 'SBC_C1',
        legalName: 'Starter Builder Corp India Ltd',
        panNumber: 'AAACS1234B',
        gstin: '29AAACS1234B1Z5',
        email: 'info@sbc.com',
        phone: '+919876543211',
        address: '200 Starter Way',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
      },
    });

    // 5. Setup Users & Roles in Tenant A
    const ownerRole = await prisma.role.findFirstOrThrow({ where: { name: 'COMPANY_OWNER' } });
    const pmRole = await prisma.role.findFirstOrThrow({ where: { name: 'PROJECT_MANAGER' } });
    const seRole = await prisma.role.findFirstOrThrow({ where: { name: 'SITE_ENGINEER' } });
    const empRole = await prisma.role.findFirstOrThrow({ where: { name: 'EMPLOYEE' } });

    await prisma.user.create({
      data: { id: ownerAId, tenantId: tenantAId, email: 'owner.fin@ebc.com', fullName: 'Alice Owner', passwordHash: 'hash' },
    });
    await prisma.userRoleAssignment.create({
      data: { userId: ownerAId, roleId: ownerRole.id, tenantId: tenantAId },
    });

    await prisma.user.create({
      data: { id: pmAId, tenantId: tenantAId, email: 'pm.fin@ebc.com', fullName: 'Bob PM', passwordHash: 'hash' },
    });
    await prisma.userRoleAssignment.create({
      data: { userId: pmAId, roleId: pmRole.id, tenantId: tenantAId },
    });

    await prisma.user.create({
      data: { id: seAId, tenantId: tenantAId, email: 'se.fin@ebc.com', fullName: 'Charlie SE', passwordHash: 'hash' },
    });
    await prisma.userRoleAssignment.create({
      data: { userId: seAId, roleId: seRole.id, tenantId: tenantAId },
    });

    await prisma.user.create({
      data: { id: empAId, tenantId: tenantAId, email: 'emp.fin@ebc.com', fullName: 'Dave Emp', passwordHash: 'hash' },
    });
    await prisma.userRoleAssignment.create({
      data: { userId: empAId, roleId: empRole.id, tenantId: tenantAId },
    });

    // User in Tenant B
    await prisma.user.create({
      data: { id: ownerBId, tenantId: tenantBId, email: 'owner.fin@sbc.com', fullName: 'Eve Owner B', passwordHash: 'hash' },
    });
    await prisma.userRoleAssignment.create({
      data: { userId: ownerBId, roleId: ownerRole.id, tenantId: tenantBId },
    });

    // 6. Projects
    const projectA = await prisma.project.create({
      data: {
        tenantId: tenantAId,
        companyId: compA.id,
        name: 'Fin Tower A',
        code: 'FTA',
        status: 'ACTIVE',
      },
    });
    projectAId = projectA.id;

    const projectB = await prisma.project.create({
      data: {
        tenantId: tenantBId,
        companyId: compB.id,
        name: 'Starter Villa B',
        code: 'SVB',
        status: 'ACTIVE',
      },
    });
    projectBId = projectB.id;

    // Assign PM and SE to Project A
    await prisma.projectMember.createMany({
      data: [
        { tenantId: tenantAId, projectId: projectAId, userId: pmAId, projectRole: 'PROJECT_MANAGER' },
        { tenantId: tenantAId, projectId: projectAId, userId: seAId, projectRole: 'SITE_ENGINEER' },
      ],
    });

    // 7. Expense Categories in Tenant A
    const catTravel = await prisma.expenseCategory.create({
      data: {
        tenantId: tenantAId,
        name: 'Travel & Conveyance',
        code: 'EXP_TRAVEL',
        description: 'Site travel allowance',
        isActive: true,
      },
    });
    categoryTravelId = catTravel.id;

    const catFood = await prisma.expenseCategory.create({
      data: {
        tenantId: tenantAId,
        name: 'Site Refreshments',
        code: 'EXP_FOOD',
        description: 'Daily muster refreshments',
        isActive: true,
      },
    });
    categoryFoodId = catFood.id;

    // Tokens
    tokenOwnerA = tokenService.createAccessToken({ userId: ownerAId, tenantId: tenantAId, sessionId: 'session-own-a', sessionVersion: 1 });
    tokenPmA = tokenService.createAccessToken({ userId: pmAId, tenantId: tenantAId, sessionId: 'session-pm-a', sessionVersion: 1 });
    tokenSeA = tokenService.createAccessToken({ userId: seAId, tenantId: tenantAId, sessionId: 'session-se-a', sessionVersion: 1 });
    tokenEmpA = tokenService.createAccessToken({ userId: empAId, tenantId: tenantAId, sessionId: 'session-emp-a', sessionVersion: 1 });
    tokenOwnerB = tokenService.createAccessToken({ userId: ownerBId, tenantId: tenantBId, sessionId: 'session-own-b', sessionVersion: 1 });
  });

  after(async () => {
    if (prisma) {
      await prisma.financeAuditLog.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.expenseClaim.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.expenseCategory.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.financeSequence.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.projectMember.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.project.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.company.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
      await dbService.disconnect();
    }
  });

  it('1. should create an expense category successfully', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        name: 'Site Safety Equipment & PPE',
        code: 'EXP_PPE',
        description: 'Helmets, boots, vests',
        isActive: true,
      },
    });
    const res = await expensesController.createCategory(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual((res.data as any).code, 'EXP_PPE');
  });

  it('2. should reject duplicate category code in same tenant', async () => {
    const req = createAuthReq(tokenOwnerA, {
      body: {
        name: 'Duplicate Travel',
        code: 'EXP_TRAVEL',
      },
    });
    await assert.rejects(async () => expensesController.createCategory(req), ConflictError);
  });

  it('3. should create a valid expense claim in DRAFT status with monotonic sequence EXP-YYYY-000001', async () => {
    const req = createAuthReq(tokenSeA, {
      body: {
        projectId: projectAId,
        categoryId: categoryTravelId,
        amount: 2500.5,
        taxAmount: 450.0,
        claimDate: '2026-09-11',
        paidTo: 'Driver Union Transport',
        paymentMode: 'PETTY_CASH',
        invoiceNumber: 'INV-TRV-101',
        description: 'Material site inspection round-trip transport',
      },
    });
    const res = await expensesController.createExpense(req);
    assert.strictEqual(res.success, true);
    const claim = res.data as any;
    assert.strictEqual(claim.status, 'DRAFT');
    assert.match(claim.claimNumber, /^EXP-\d{4}-\d{6}$/);
    assert.strictEqual(Number(claim.amount), 2500.5);
    assert.strictEqual(Number(claim.taxAmount), 450.0);
    assert.strictEqual(Number(claim.paidAmount), 0);
  });

  it('4. should reject expense claim referencing inactive category', async () => {
    const inactiveCat = await prisma.expenseCategory.create({
      data: {
        tenantId: tenantAId,
        name: 'Deprecated Fuel',
        code: 'EXP_DEP_FUEL',
        isActive: false,
      },
    });

    const req = createAuthReq(tokenSeA, {
      body: {
        projectId: projectAId,
        categoryId: inactiveCat.id,
        amount: 500,
        claimDate: '2026-09-11',
        paidTo: 'Fuel Pump',
        paymentMode: 'PETTY_CASH',
        description: 'Testing inactive category',
      },
    });
    await assert.rejects(async () => expensesController.createExpense(req), ValidationError);
  });

  it('5. should reject expense claim for non-existent project', async () => {
    const req = createAuthReq(tokenSeA, {
      body: {
        projectId: '00000000-0000-0000-0000-000000000000',
        categoryId: categoryTravelId,
        amount: 500,
        claimDate: '2026-09-11',
        paidTo: 'Fuel Pump',
        paymentMode: 'PETTY_CASH',
        description: 'Invalid project',
      },
    });
    await assert.rejects(async () => expensesController.createExpense(req), NotFoundError);
  });

  it('6. should transition expense claim from DRAFT to SUBMITTED', async () => {
    const createReq = createAuthReq(tokenSeA, {
      body: {
        projectId: projectAId,
        categoryId: categoryFoodId,
        amount: 1200,
        claimDate: '2026-09-11',
        paidTo: 'Site Canteen Services',
        paymentMode: 'PETTY_CASH',
        description: 'Overtime crew dinner',
      },
    });
    const createRes = await expensesController.createExpense(createReq);
    const claimId = (createRes.data as any).id;

    const submitReq = createAuthReq(tokenSeA, { params: { id: claimId } });
    const submitRes = await expensesController.submitExpense(submitReq);
    assert.strictEqual(submitRes.success, true);
    assert.strictEqual((submitRes.data as any).status, 'SUBMITTED');
  });

  it('7. Segregation of Duties: Submitter CANNOT approve their own expense claim', async () => {
    const createReq = createAuthReq(tokenPmA, {
      body: {
        projectId: projectAId,
        categoryId: categoryFoodId,
        amount: 800,
        claimDate: '2026-09-11',
        paidTo: 'Coffee House',
        paymentMode: 'PETTY_CASH',
        description: 'Client site review tea',
      },
    });
    const createRes = await expensesController.createExpense(createReq);
    const claimId = (createRes.data as any).id;

    const submitReq = createAuthReq(tokenPmA, { params: { id: claimId } });
    await expensesController.submitExpense(submitReq);

    // Project Manager attempts to approve own claim
    const approveReq = createAuthReq(tokenPmA, {
      params: { id: claimId },
      body: { remarks: 'Self approval attempt' },
    });
    await assert.rejects(async () => expensesController.approveExpense(approveReq), ConflictError);
  });

  it('8. should allow authorized manager (PM) to approve submitted claim', async () => {
    const createReq = createAuthReq(tokenSeA, {
      body: {
        projectId: projectAId,
        categoryId: categoryTravelId,
        amount: 3200,
        claimDate: '2026-09-11',
        paidTo: 'Highway Toll & Fuel',
        paymentMode: 'PETTY_CASH',
        description: 'Heavy machinery transport escort',
      },
    });
    const createRes = await expensesController.createExpense(createReq);
    const claimId = (createRes.data as any).id;

    const submitReq = createAuthReq(tokenSeA, { params: { id: claimId } });
    await expensesController.submitExpense(submitReq);

    const approveReq = createAuthReq(tokenPmA, {
      params: { id: claimId },
      body: { remarks: 'Approved for disbursement' },
    });
    const approveRes = await expensesController.approveExpense(approveReq);
    assert.strictEqual(approveRes.success, true);
    assert.strictEqual((approveRes.data as any).status, 'APPROVED');
    assert.strictEqual((approveRes.data as any).approvedById, pmAId);
  });

  it('9. should allow rejecting a submitted expense claim with reason', async () => {
    const createReq = createAuthReq(tokenSeA, {
      body: {
        projectId: projectAId,
        categoryId: categoryFoodId,
        amount: 5000,
        claimDate: '2026-09-11',
        paidTo: 'Luxury Banquet',
        paymentMode: 'PETTY_CASH',
        description: 'Unauthorized team celebration',
      },
    });
    const createRes = await expensesController.createExpense(createReq);
    const claimId = (createRes.data as any).id;

    const submitReq = createAuthReq(tokenSeA, { params: { id: claimId } });
    await expensesController.submitExpense(submitReq);

    const rejectReq = createAuthReq(tokenPmA, {
      params: { id: claimId },
      body: { rejectionReason: 'Out of policy expense exceeds petty cash allowance' },
    });
    const rejectRes = await expensesController.rejectExpense(rejectReq);
    assert.strictEqual(rejectRes.success, true);
    assert.strictEqual((rejectRes.data as any).status, 'REJECTED');
    assert.strictEqual((rejectRes.data as any).rejectionReason, 'Out of policy expense exceeds petty cash allowance');
  });

  it('10. should DENY finance access for Starter tier tenant without finance:commercial entitlement', async () => {
    const req = createAuthReq(tokenOwnerB, {
      body: {
        projectId: projectBId,
        categoryId: categoryTravelId,
        amount: 500,
        claimDate: '2026-09-11',
        paidTo: 'Taxi',
        paymentMode: 'PETTY_CASH',
        description: 'Starter tier attempt',
      },
    });
    await assert.rejects(async () => expensesController.createExpense(req), ForbiddenError);
  });

  it('11. Multi-Tenant Isolation: Tenant B user cannot read Tenant A expense claim (IDOR protected)', async () => {
    const createReq = createAuthReq(tokenSeA, {
      body: {
        projectId: projectAId,
        categoryId: categoryTravelId,
        amount: 1500,
        claimDate: '2026-09-11',
        paidTo: 'Transport Corp',
        paymentMode: 'PETTY_CASH',
        description: 'Confidential site claim',
      },
    });
    const createRes = await expensesController.createExpense(createReq);
    const claimId = (createRes.data as any).id;

    // Elevate Tenant B to enterprise temporarily to test pure IDOR tenant isolation
    const entPlan = await prisma.platformPlan.findFirstOrThrow({ where: { code: 'ENTERPRISE' } });
    await prisma.tenantSubscription.updateMany({
      where: { tenantId: tenantBId },
      data: { planId: entPlan.id },
    });

    const getReq = createAuthReq(tokenOwnerB, { params: { id: claimId } });
    await assert.rejects(async () => expensesController.getExpense(getReq), NotFoundError);
  });

  it('12. should write append-only FinanceAuditLog on every state transition', async () => {
    const createReq = createAuthReq(tokenSeA, {
      body: {
        projectId: projectAId,
        categoryId: categoryTravelId,
        amount: 950,
        claimDate: '2026-09-11',
        paidTo: 'Local Courier',
        paymentMode: 'PETTY_CASH',
        description: 'Drawing blue-print dispatch',
      },
    });
    const createRes = await expensesController.createExpense(createReq);
    const claimId = (createRes.data as any).id;

    const submitReq = createAuthReq(tokenSeA, { params: { id: claimId } });
    await expensesController.submitExpense(submitReq);

    const approveReq = createAuthReq(tokenPmA, { params: { id: claimId } });
    await expensesController.approveExpense(approveReq);

    const logs = await prisma.financeAuditLog.findMany({
      where: { entityType: 'EXPENSE', entityId: claimId },
      orderBy: { createdAt: 'asc' },
    });

    assert.strictEqual(logs.length, 3);
    assert.strictEqual(logs[0].action, 'CREATED');
    assert.strictEqual(logs[0].newState, 'DRAFT');
    assert.strictEqual(logs[1].action, 'SUBMITTED');
    assert.strictEqual(logs[1].newState, 'SUBMITTED');
    assert.strictEqual(logs[2].action, 'APPROVED');
    assert.strictEqual(logs[2].newState, 'APPROVED');
  });
});
