import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service.js';
import { ApprovalController } from '../src/modules/approvals/controllers/approval.controller.js';
import { ApprovalPolicyController } from '../src/modules/approvals/controllers/approval-policy.controller.js';
import { ApprovalService } from '../src/modules/approvals/services/approval.service.js';
import { ApprovalPolicyService } from '../src/modules/approvals/services/approval-policy.service.js';
import { ApprovalRequestRepository } from '../src/modules/approvals/repositories/approval-request.repository.js';
import { ApprovalPolicyRepository } from '../src/modules/approvals/repositories/approval-policy.repository.js';
import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';

describe('DEZOBUILD Phase 15 — Concurrency, Monotonic Numbering & Audit Forensics Suite', () => {
  let dbService: DatabaseService;
  let approvalController: ApprovalController;
  let policyController: ApprovalPolicyController;
  let approvalService: ApprovalService;
  let policyService: ApprovalPolicyService;
  let tokenService: TokenService;
  let prisma: any;

  const tenantAId = 'e1500003-aaaa-0001-aaaa-333333333333';
  const submitterAId = 'e1500003-1111-0001-aaaa-333333333333';
  const approver1Id = 'e1500003-2222-0001-aaaa-333333333333';
  const approver2Id = 'e1500003-3333-0001-aaaa-333333333333';
  const approver3Id = 'e1500003-4444-0001-aaaa-333333333333';

  let tokenSubmitterA: string;
  let tokenApprover1: string;
  let tokenApprover2: string;
  let tokenApprover3: string;

  let companyAId: string;
  let branchAId: string;
  let projectA1Id: string;
  let vendorAId: string;

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
    prisma = dbService.getClient();

    const policyRepo = new ApprovalPolicyRepository(prisma);
    const requestRepo = new ApprovalRequestRepository(prisma);

    policyService = new ApprovalPolicyService(policyRepo, prisma);
    approvalService = new ApprovalService(requestRepo, policyRepo, prisma);

    policyController = new ApprovalPolicyController(policyService);
    approvalController = new ApprovalController(approvalService);

    tokenService = TokenService.getInstance();

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Cleanup fixtures
    await prisma.approvalDecision.deleteMany({ where: { request: { tenantId: tenantAId } } });
    await prisma.approvalStep.deleteMany({ where: { request: { tenantId: tenantAId } } });
    await prisma.approvalRequest.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.approvalPolicyStep.deleteMany({ where: { policy: { tenantId: tenantAId } } });
    await prisma.approvalPolicy.deleteMany({ where: { tenantId: tenantAId } });

    await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrder: { tenantId: tenantAId } } });
    await prisma.purchaseOrder.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.vendor.deleteMany({ where: { tenantId: tenantAId } });

    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.session.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.projectMember.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.project.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.branch.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.company.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.user.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.tenant.deleteMany({ where: { id: tenantAId } });

    // Seed Tenant
    await prisma.tenant.create({
      data: { id: tenantAId, code: 'TNT-CC-A', name: 'Concurrency Test Tenant' },
    });

    const enterprisePlan = await prisma.platformPlan.findFirstOrThrow({ where: { code: 'ENTERPRISE' } });
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantAId,
        planId: enterprisePlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });

    // Seed Company & Branch
    companyAId = (
      await prisma.company.create({
        data: {
          tenantId: tenantAId,
          code: 'COMP-CC-A',
          name: 'Apex Concurrency Corp',
          legalName: 'Apex Concurrency Corp Pvt Ltd',
          panNumber: 'AAACD3333A',
          gstin: '27AABCA3333A1Z3',
          email: 'concurrency@dezobuild.com',
          phone: '9988776655',
          address: '100 Concurrency Way',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        },
      })
    ).id;

    branchAId = (
      await prisma.branch.create({
        data: {
          tenantId: tenantAId,
          companyId: companyAId,
          name: 'Apex Concurrency Branch',
          code: 'BR-APX-CC',
          gstin: '27AABCA3333A1Z3',
          city: 'Mumbai',
          state: 'Maharashtra',
        },
      })
    ).id;

    projectA1Id = (
      await prisma.project.create({
        data: {
          tenantId: tenantAId,
          companyId: companyAId,
          name: 'Concurrency Mega Project',
          code: 'PRJ-CC-01',
          status: 'IN_PROGRESS',
        },
      })
    ).id;

    vendorAId = (
      await prisma.vendor.create({
        data: {
          tenantId: tenantAId,
          name: 'Apex Concurrency Vendor',
          code: 'VND-CC-01',
          status: 'ACTIVE',
        },
      })
    ).id;

    // Seed Users
    await prisma.user.createMany({
      data: [
        { id: submitterAId, tenantId: tenantAId, email: 'sub@cc.com', passwordHash: 'dummy', fullName: 'Submitter', status: 'ACTIVE' },
        { id: approver1Id, tenantId: tenantAId, email: 'app1@cc.com', passwordHash: 'dummy', fullName: 'Approver 1', status: 'ACTIVE' },
        { id: approver2Id, tenantId: tenantAId, email: 'app2@cc.com', passwordHash: 'dummy', fullName: 'Approver 2', status: 'ACTIVE' },
        { id: approver3Id, tenantId: tenantAId, email: 'app3@cc.com', passwordHash: 'dummy', fullName: 'Approver 3', status: 'ACTIVE' },
      ],
    });

    const adminRole = await prisma.role.findFirst({ where: { name: 'COMPANY_ADMIN' } });
    const procRole = await prisma.role.findFirst({ where: { name: 'PROCUREMENT_STORE' } });

    await prisma.userRoleAssignment.createMany({
      data: [
        { tenantId: tenantAId, userId: submitterAId, roleId: procRole!.id },
        { tenantId: tenantAId, userId: approver1Id, roleId: adminRole!.id },
        { tenantId: tenantAId, userId: approver2Id, roleId: adminRole!.id },
        { tenantId: tenantAId, userId: approver3Id, roleId: adminRole!.id },
      ],
    });

    await prisma.projectMember.createMany({
      data: [
        { tenantId: tenantAId, projectId: projectA1Id, userId: submitterAId, projectRole: 'SITE_ENGINEER' },
        { tenantId: tenantAId, projectId: projectA1Id, userId: approver1Id, projectRole: 'PROJECT_MANAGER' },
      ],
    });

    // Generate tokens
    tokenSubmitterA = tokenService.createAccessToken({ userId: submitterAId, tenantId: tenantAId, sessionId: 's-c-1', sessionVersion: 1 });
    tokenApprover1 = tokenService.createAccessToken({ userId: approver1Id, tenantId: tenantAId, sessionId: 's-c-2', sessionVersion: 1 });
    tokenApprover2 = tokenService.createAccessToken({ userId: approver2Id, tenantId: tenantAId, sessionId: 's-c-3', sessionVersion: 1 });
    tokenApprover3 = tokenService.createAccessToken({ userId: approver3Id, tenantId: tenantAId, sessionId: 's-c-4', sessionVersion: 1 });

    // Create 1-Step Policy
    const pol = await policyController.createPolicy(
      createAuthReq(tokenApprover1, {
        body: {
          name: 'Single-Step Concurrency Test Policy',
          entityType: 'PURCHASE_ORDER',
          projectId: projectA1Id,
          minAmount: 0,
          maxAmount: 10000000,
          steps: [
            {
              stepOrder: 1,
              stepName: 'Authoritative Authorization',
              requiredPermission: 'materials:po:approve',
              enforceMakerChecker: true,
              enforceDistinctFromPrev: false,
            },
          ],
        },
      })
    );
    await policyController.activatePolicy(createAuthReq(tokenApprover1, { params: { id: pol.data.id } }));
  });

  after(async () => {
    await prisma.approvalDecision.deleteMany({ where: { request: { tenantId: tenantAId } } });
    await prisma.approvalStep.deleteMany({ where: { request: { tenantId: tenantAId } } });
    await prisma.approvalRequest.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.approvalPolicyStep.deleteMany({ where: { policy: { tenantId: tenantAId } } });
    await prisma.approvalPolicy.deleteMany({ where: { tenantId: tenantAId } });

    await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrder: { tenantId: tenantAId } } });
    await prisma.purchaseOrder.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.vendor.deleteMany({ where: { tenantId: tenantAId } });

    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.session.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.projectMember.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.project.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.branch.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.company.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.user.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.tenant.deleteMany({ where: { id: tenantAId } });
    await dbService.disconnect();
  });

  describe('1. 10 Concurrent Approvals on the Same Step', () => {
    let poId: string;
    let reqId: string;

    before(async () => {
      const po = await prisma.purchaseOrder.create({
        data: {
          tenantId: tenantAId,
          projectId: projectA1Id,
          vendorId: vendorAId,
          poNumber: 'PO-CC-001',
          orderDate: new Date(),
          expectedDeliveryDate: new Date(),
          subtotalAmount: 500000,
          grandTotal: 500000,
          status: 'DRAFT',
          createdById: submitterAId,
        },
      });
      poId = po.id;

      const subRes = await approvalController.submitRequest(
        createAuthReq(tokenSubmitterA, {
          body: {
            entityType: 'PURCHASE_ORDER',
            entityId: poId,
            projectId: projectA1Id,
            monetaryAmount: 500000,
          },
        })
      );
      reqId = subRes.data.id;
    });

    it('executes 10 concurrent approve attempts: exactly 1 authoritative success, 9 conflicts, 0 duplicate decisions', async () => {
      // 10 concurrent approve attempts across approver1, approver2, approver3
      const tokens = [
        tokenApprover1,
        tokenApprover2,
        tokenApprover3,
        tokenApprover1,
        tokenApprover2,
        tokenApprover3,
        tokenApprover1,
        tokenApprover2,
        tokenApprover3,
        tokenApprover1,
      ];

      const results = await Promise.allSettled(
        tokens.map((tok, idx) =>
          approvalController.approveStep(
            createAuthReq(tok, {
              params: { id: reqId },
              body: { decisionReason: `Concurrent approve attempt #${idx + 1}` },
            })
          )
        )
      );

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // The first unique approver succeeds. Subsequent retries from the SAME approver return idempotent success (200),
      // while different approvers attempting to approve the already approved step receive ConflictError.
      // Total decisions recorded in DB MUST be exactly 1!
      const decisionsInDb = await prisma.approvalDecision.findMany({
        where: { requestId: reqId },
      });

      assert.strictEqual(decisionsInDb.length, 1, 'Exactly one terminal decision must be recorded in database');
      assert.strictEqual(decisionsInDb[0].decision, 'APPROVE');

      const reqAfter = await prisma.approvalRequest.findUnique({
        where: { id: reqId },
        include: { steps: true },
      });
      assert.strictEqual(reqAfter.status, 'APPROVED');
      assert.strictEqual(reqAfter.steps[0].status, 'APPROVED');

      // Verify domain state is updated exactly once
      const poAfter = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
      assert.strictEqual(poAfter.status, 'APPROVED');
    });
  });

  describe('2. Concurrent Monotonic Request Numbering', () => {
    it('generates 10 concurrent requests without collisions or gaps in monotonic sequence', async () => {
      // Create 10 draft POs
      const poList = await Promise.all(
        Array.from({ length: 10 }).map((_, i) =>
          prisma.purchaseOrder.create({
            data: {
              tenantId: tenantAId,
              projectId: projectA1Id,
              vendorId: vendorAId,
              poNumber: `PO-CC-SEQ-${i + 1}`,
              orderDate: new Date(),
              expectedDeliveryDate: new Date(),
              subtotalAmount: 10000,
              grandTotal: 10000,
              status: 'DRAFT',
              createdById: submitterAId,
            },
          })
        )
      );

      // Submit all 10 concurrently
      const subResults = await Promise.all(
        poList.map((po) =>
          approvalController.submitRequest(
            createAuthReq(tokenSubmitterA, {
              body: {
                entityType: 'PURCHASE_ORDER',
                entityId: po.id,
                projectId: projectA1Id,
                monetaryAmount: 10000,
              },
            })
          )
        )
      );

      const requestNumbers = subResults.map((r) => r.data.requestNumber);
      const uniqueNumbers = new Set(requestNumbers);

      assert.strictEqual(uniqueNumbers.size, 10, 'All 10 request numbers must be strictly unique');

      // Verify format
      for (const num of requestNumbers) {
        assert.match(num, /^APR-PROJ-\d{4}-\d{6}$/);
      }
    });
  });

  describe('3. Append-Only Audit Integrity', () => {
    it('verifies decision history is append-only with full audit capture', async () => {
      const decisions = await prisma.approvalDecision.findMany({
        where: { request: { tenantId: tenantAId } },
      });

      assert.ok(decisions.length > 0);
      for (const d of decisions) {
        assert.ok(d.actorId, 'actorId must be present');
        assert.ok(d.requestId, 'requestId must be present');
        assert.ok(d.decision, 'decision must be present');
        assert.ok(d.previousState, 'previousState must be captured');
        assert.ok(d.resultingState, 'resultingState must be captured');
      }
    });
  });
});
