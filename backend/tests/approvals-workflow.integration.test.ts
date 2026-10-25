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

describe('DEZOBUILD Phase 15 — Approval Workflow, SoD & Resubmission Integration Suite', () => {
  let dbService: DatabaseService;
  let approvalController: ApprovalController;
  let policyController: ApprovalPolicyController;
  let approvalService: ApprovalService;
  let policyService: ApprovalPolicyService;
  let tokenService: TokenService;
  let prisma: any;

  const tenantAId = 'e1500002-aaaa-0001-aaaa-222222222222';
  const ownerAId = 'e1500002-1111-0001-aaaa-222222222222';
  const adminAId = 'e1500002-2222-0001-aaaa-222222222222';
  const pmAId = 'e1500002-3333-0001-aaaa-222222222222';
  const siteEngAId = 'e1500002-4444-0001-aaaa-222222222222';
  const accountantAId = 'e1500002-5555-0001-aaaa-222222222222';

  const tenantBId = 'e1500002-bbbb-0001-bbbb-222222222222';
  const ownerBId = 'e1500002-1111-0001-bbbb-222222222222';

  let tokenOwnerA: string;
  let tokenAdminA: string;
  let tokenPmA: string;
  let tokenSiteEngA: string;
  let tokenAccountantA: string;
  let tokenOwnerB: string;

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

    // Cleanup existing fixtures
    await prisma.approvalDecision.deleteMany({
      where: { request: { tenantId: { in: [tenantAId, tenantBId] } } },
    });
    await prisma.approvalStep.deleteMany({
      where: { request: { tenantId: { in: [tenantAId, tenantBId] } } },
    });
    await prisma.approvalRequest.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.approvalPolicyStep.deleteMany({
      where: { policy: { tenantId: { in: [tenantAId, tenantBId] } } },
    });
    await prisma.approvalPolicy.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });

    await prisma.purchaseOrderLine.deleteMany({
      where: { purchaseOrder: { tenantId: { in: [tenantAId, tenantBId] } } },
    });
    await prisma.purchaseOrder.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.vendor.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });

    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.session.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.projectMember.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.project.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.branch.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });

    // Seed Tenants
    await prisma.tenant.createMany({
      data: [
        { id: tenantAId, code: 'TNT-WF-A', name: 'Tenant A Workflow Test' },
        { id: tenantBId, code: 'TNT-WF-B', name: 'Tenant B Workflow Test' },
      ],
    });

    const enterprisePlan = await prisma.platformPlan.findFirstOrThrow({ where: { code: 'ENTERPRISE' } });
    await prisma.tenantSubscription.createMany({
      data: [
        {
          tenantId: tenantAId,
          planId: enterprisePlan.id,
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
        {
          tenantId: tenantBId,
          planId: enterprisePlan.id,
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      ],
    });

    // Seed Companies
    companyAId = (
      await prisma.company.create({
        data: {
          tenantId: tenantAId,
          code: 'COMP-WF-A',
          name: 'Apex Workflow Corp',
          legalName: 'Apex Workflow Corp Pvt Ltd',
          panNumber: 'AAACD2222A',
          gstin: '27AABCA2222A1Z2',
          email: 'workflow@dezobuild.com',
          phone: '9988776655',
          address: '100 Workflow Way',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        },
      })
    ).id;

    // Seed Branch
    branchAId = (
      await prisma.branch.create({
        data: {
          tenantId: tenantAId,
          companyId: companyAId,
          name: 'Apex Workflow Branch',
          code: 'BR-APX-WF',
          gstin: '27AABCA2222A1Z2',
          city: 'Mumbai',
          state: 'Maharashtra',
        },
      })
    ).id;

    // Seed Project
    projectA1Id = (
      await prisma.project.create({
        data: {
          tenantId: tenantAId,
          companyId: companyAId,
          name: 'Apex Workflow Project 1',
          code: 'PRJ-WF-01',
          status: 'IN_PROGRESS',
        },
      })
    ).id;

    // Seed Vendor
    vendorAId = (
      await prisma.vendor.create({
        data: {
          tenantId: tenantAId,
          name: 'Supreme Steel Traders',
          code: 'VND-SUP-01',
          status: 'ACTIVE',
        },
      })
    ).id;

    // Seed Users
    await prisma.user.createMany({
      data: [
        { id: ownerAId, tenantId: tenantAId, email: 'owner@wf.com', passwordHash: 'dummy', fullName: 'WF Owner', status: 'ACTIVE' },
        { id: adminAId, tenantId: tenantAId, email: 'admin@wf.com', passwordHash: 'dummy', fullName: 'WF Admin', status: 'ACTIVE' },
        { id: pmAId, tenantId: tenantAId, email: 'pm@wf.com', passwordHash: 'dummy', fullName: 'WF PM', status: 'ACTIVE' },
        { id: siteEngAId, tenantId: tenantAId, email: 'site@wf.com', passwordHash: 'dummy', fullName: 'WF Site Eng', status: 'ACTIVE' },
        { id: accountantAId, tenantId: tenantAId, email: 'acc@wf.com', passwordHash: 'dummy', fullName: 'WF Accountant', status: 'ACTIVE' },
        { id: ownerBId, tenantId: tenantBId, email: 'owner@wfb.com', passwordHash: 'dummy', fullName: 'WF Tenant B', status: 'ACTIVE' },
      ],
    });

    // Assign Roles
    const ownerRole = await prisma.role.findFirst({ where: { name: 'COMPANY_OWNER' } });
    const adminRole = await prisma.role.findFirst({ where: { name: 'COMPANY_ADMIN' } });
    const pmRole = await prisma.role.findFirst({ where: { name: 'PROJECT_MANAGER' } });
    const procRole = await prisma.role.findFirst({ where: { name: 'PROCUREMENT_STORE' } });
    const accountantRole = await prisma.role.findFirst({ where: { name: 'ACCOUNTANT' } });

    await prisma.userRoleAssignment.createMany({
      data: [
        { tenantId: tenantAId, userId: ownerAId, roleId: ownerRole!.id },
        { tenantId: tenantAId, userId: adminAId, roleId: adminRole!.id },
        { tenantId: tenantAId, userId: pmAId, roleId: pmRole!.id },
        { tenantId: tenantAId, userId: siteEngAId, roleId: procRole!.id },
        { tenantId: tenantAId, userId: accountantAId, roleId: accountantRole!.id },
        { tenantId: tenantBId, userId: ownerBId, roleId: ownerRole!.id },
      ],
    });

    await prisma.projectMember.createMany({
      data: [
        { tenantId: tenantAId, projectId: projectA1Id, userId: pmAId, projectRole: 'PROJECT_MANAGER' },
        { tenantId: tenantAId, projectId: projectA1Id, userId: siteEngAId, projectRole: 'SITE_ENGINEER' },
      ],
    });

    // Generate tokens
    tokenOwnerA = tokenService.createAccessToken({ userId: ownerAId, tenantId: tenantAId, sessionId: 's-w-1', sessionVersion: 1 });
    tokenAdminA = tokenService.createAccessToken({ userId: adminAId, tenantId: tenantAId, sessionId: 's-w-2', sessionVersion: 1 });
    tokenPmA = tokenService.createAccessToken({ userId: pmAId, tenantId: tenantAId, sessionId: 's-w-3', sessionVersion: 1 });
    tokenSiteEngA = tokenService.createAccessToken({ userId: siteEngAId, tenantId: tenantAId, sessionId: 's-w-4', sessionVersion: 1 });
    tokenAccountantA = tokenService.createAccessToken({ userId: accountantAId, tenantId: tenantAId, sessionId: 's-w-5', sessionVersion: 1 });
    tokenOwnerB = tokenService.createAccessToken({ userId: ownerBId, tenantId: tenantBId, sessionId: 's-w-6', sessionVersion: 1 });

    // Create and Activate 2-Step Purchase Order Policy with enforceDistinctFromPrev: true
    const policy = await policyController.createPolicy(
      createAuthReq(tokenAdminA, {
        body: {
          name: 'PO Multi-Step Governance Policy',
          entityType: 'PURCHASE_ORDER',
          projectId: projectA1Id,
          minAmount: 0,
          maxAmount: 2000000,
          steps: [
            {
              stepOrder: 1,
              stepName: 'PM Verification',
              requiredPermission: 'materials:po:create',
              enforceMakerChecker: true,
              enforceDistinctFromPrev: false,
            },
            {
              stepOrder: 2,
              stepName: 'Admin Authoritative Approval',
              requiredPermission: 'materials:po:approve',
              enforceMakerChecker: true,
              enforceDistinctFromPrev: true,
            },
          ],
        },
      })
    );
    await policyController.activatePolicy(createAuthReq(tokenAdminA, { params: { id: policy.data.id } }));
  });

  after(async () => {
    await prisma.approvalDecision.deleteMany({
      where: { request: { tenantId: { in: [tenantAId, tenantBId] } } },
    });
    await prisma.approvalStep.deleteMany({
      where: { request: { tenantId: { in: [tenantAId, tenantBId] } } },
    });
    await prisma.approvalRequest.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.approvalPolicyStep.deleteMany({
      where: { policy: { tenantId: { in: [tenantAId, tenantBId] } } },
    });
    await prisma.approvalPolicy.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });

    await prisma.purchaseOrderLine.deleteMany({
      where: { purchaseOrder: { tenantId: { in: [tenantAId, tenantBId] } } },
    });
    await prisma.purchaseOrder.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.vendor.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });

    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.session.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.projectMember.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.project.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.branch.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
    await dbService.disconnect();
  });

  describe('1. Submission, Sequence Numbering & Active Entity Conflict', () => {
    let poId: string;

    before(async () => {
      // Create a draft Purchase Order
      const po = await prisma.purchaseOrder.create({
        data: {
          tenantId: tenantAId,
          projectId: projectA1Id,
          vendorId: vendorAId,
          poNumber: 'PO-WF-001',
          orderDate: new Date(),
          expectedDeliveryDate: new Date(),
          subtotalAmount: 150000,
          grandTotal: 150000,
          status: 'DRAFT',
          createdById: siteEngAId,
        },
      });
      poId = po.id;
    });

    it('submits PO for approval atomically creating ApprovalRequest and ApprovalSteps', async () => {
      const submitReq = createAuthReq(tokenSiteEngA, {
        body: {
          entityType: 'PURCHASE_ORDER',
          entityId: poId,
          projectId: projectA1Id,
          monetaryAmount: 150000,
          submissionRemarks: 'Initial site procurement for TMT bars',
        },
      });

      const res = await approvalController.submitRequest(submitReq);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.data.status, 'SUBMITTED');
      assert.strictEqual(res.data.currentStepOrder, 1);
      assert.strictEqual(res.data.totalSteps, 2);
      assert.match(res.data.requestNumber, /^APR-PROJ-\d{4}-\d{6}$/);
      assert.strictEqual(res.data.steps.length, 2);
      assert.strictEqual(res.data.steps[0].status, 'PENDING');
      assert.strictEqual(res.data.steps[1].status, 'PENDING');
    });

    it('rejects duplicate submission for the same entity while request is active (ConflictError)', async () => {
      const submitReq = createAuthReq(tokenSiteEngA, {
        body: {
          entityType: 'PURCHASE_ORDER',
          entityId: poId,
          projectId: projectA1Id,
          monetaryAmount: 150000,
        },
      });

      await assert.rejects(async () => approvalController.submitRequest(submitReq), /already exists for this entity/);
    });
  });

  describe('2. Maker-Checker Segregation of Duties (SoD) & Step Progression', () => {
    let po2Id: string;
    let req2Id: string;

    before(async () => {
      const po = await prisma.purchaseOrder.create({
        data: {
          tenantId: tenantAId,
          projectId: projectA1Id,
          vendorId: vendorAId,
          poNumber: 'PO-WF-002',
          orderDate: new Date(),
          expectedDeliveryDate: new Date(),
          subtotalAmount: 250000,
          grandTotal: 250000,
          status: 'DRAFT',
          createdById: siteEngAId,
        },
      });
      po2Id = po.id;

      const submitRes = await approvalController.submitRequest(
        createAuthReq(tokenSiteEngA, {
          body: {
            entityType: 'PURCHASE_ORDER',
            entityId: po2Id,
            projectId: projectA1Id,
            monetaryAmount: 250000,
          },
        })
      );
      req2Id = submitRes.data.id;
    });

    it('blocks the original submitter from approving their own request (Universal Maker-Checker)', async () => {
      const approveReq = createAuthReq(tokenSiteEngA, {
        params: { id: req2Id },
        body: { decisionReason: 'Self approval attempt' },
      });

      await assert.rejects(async () => approvalController.approveStep(approveReq), /Segregation of Duties violation/);
    });

    it('allows PM (different user with materials:po:create permission) to approve Step 1', async () => {
      const approveReq = createAuthReq(tokenPmA, {
        params: { id: req2Id },
        body: { decisionReason: 'PM verification passed' },
      });

      const res = await approvalController.approveStep(approveReq);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.data.status, 'IN_REVIEW');
      assert.strictEqual(res.data.currentStepOrder, 2);
      assert.strictEqual(res.data.steps[0].status, 'APPROVED');
      assert.strictEqual(res.data.steps[1].status, 'PENDING');
      assert.strictEqual(res.data.decisions.length, 1);
      assert.strictEqual(res.data.decisions[0].decision, 'APPROVE');
      assert.strictEqual(res.data.decisions[0].actorId, pmAId);
    });

    it('enforces distinctness from previous approver: blocks PM from also approving Step 2', async () => {
      // PM has materials:po:approve? Even if PM had it, distinctness rule blocks PM from approving Step 2
      const approveReq = createAuthReq(tokenPmA, {
        params: { id: req2Id },
        body: { decisionReason: 'PM trying to approve Step 2' },
      });

      await assert.rejects(async () => approvalController.approveStep(approveReq), /Forbidden/);
    });

    it('allows Admin to approve final Step 2 -> Request marked APPROVED and PO marked APPROVED via adapter', async () => {
      const approveReq = createAuthReq(tokenAdminA, {
        params: { id: req2Id },
        body: { decisionReason: 'Director final approval granted' },
      });

      const res = await approvalController.approveStep(approveReq);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.data.status, 'APPROVED');
      assert.strictEqual(res.data.currentStepOrder, 2);
      assert.strictEqual(res.data.steps[1].status, 'APPROVED');
      assert.strictEqual(res.data.decisions.length, 2);

      // Verify domain adapter updated PurchaseOrder
      const poAfter = await prisma.purchaseOrder.findUnique({ where: { id: po2Id } });
      assert.strictEqual(poAfter.status, 'APPROVED');
      assert.strictEqual(poAfter.approvedById, adminAId);
    });
  });

  describe('3. Decision Idempotency', () => {
    let po3Id: string;
    let req3Id: string;

    before(async () => {
      const po = await prisma.purchaseOrder.create({
        data: {
          tenantId: tenantAId,
          projectId: projectA1Id,
          vendorId: vendorAId,
          poNumber: 'PO-WF-003',
          orderDate: new Date(),
          expectedDeliveryDate: new Date(),
          subtotalAmount: 100000,
          grandTotal: 100000,
          status: 'DRAFT',
          createdById: siteEngAId,
        },
      });
      po3Id = po.id;

      const submitRes = await approvalController.submitRequest(
        createAuthReq(tokenSiteEngA, {
          body: {
            entityType: 'PURCHASE_ORDER',
            entityId: po3Id,
            projectId: projectA1Id,
            monetaryAmount: 100000,
          },
        })
      );
      req3Id = submitRes.data.id;

      // PM approves Step 1
      await approvalController.approveStep(
        createAuthReq(tokenPmA, {
          params: { id: req3Id },
          body: { decisionReason: 'First approve' },
        })
      );
    });

    it('returns existing decision gracefully on identical retry from same actor', async () => {
      const retryReq = createAuthReq(tokenPmA, {
        params: { id: req3Id },
        body: { stepOrder: 1, decisionReason: 'First approve' },
      });

      const res = await approvalController.approveStep(retryReq);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.data.id, req3Id);
    });

    it('rejects conflicting decision from same actor on already decided step', async () => {
      const conflictReq = createAuthReq(tokenPmA, {
        params: { id: req3Id },
        body: { stepOrder: 1, decisionReason: 'Changed my mind' },
      });

      // Rejecting when already approved returns conflict
      await assert.rejects(async () => approvalController.rejectRequest(conflictReq), /Conflict/);
    });
  });

  describe('4. Return for Correction and Resubmission Lineage', () => {
    let po4Id: string;
    let req4Id: string;
    let resubmittedReqId: string;

    before(async () => {
      const po = await prisma.purchaseOrder.create({
        data: {
          tenantId: tenantAId,
          projectId: projectA1Id,
          vendorId: vendorAId,
          poNumber: 'PO-WF-004',
          orderDate: new Date(),
          expectedDeliveryDate: new Date(),
          subtotalAmount: 300000,
          grandTotal: 300000,
          status: 'DRAFT',
          createdById: siteEngAId,
        },
      });
      po4Id = po.id;

      const submitRes = await approvalController.submitRequest(
        createAuthReq(tokenSiteEngA, {
          body: {
            entityType: 'PURCHASE_ORDER',
            entityId: po4Id,
            projectId: projectA1Id,
            monetaryAmount: 300000,
          },
        })
      );
      req4Id = submitRes.data.id;
    });

    it('returns request for correction: status becomes RETURNED and domain adapter sets PO to DRAFT', async () => {
      const returnReq = createAuthReq(tokenPmA, {
        params: { id: req4Id },
        body: { decisionReason: 'Please attach 3 competitive vendor quotations' },
      });

      const res = await approvalController.returnRequest(returnReq);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.data.status, 'RETURNED');
      assert.strictEqual(res.data.decisions.length, 1);
      assert.strictEqual(res.data.decisions[0].decision, 'RETURN');

      // Verify domain state
      const poAfter = await prisma.purchaseOrder.findUnique({ where: { id: po4Id } });
      assert.strictEqual(poAfter.status, 'DRAFT');
    });

    it('resubmits corrected entity with previousRequestId linkage', async () => {
      const resubmitReq = createAuthReq(tokenSiteEngA, {
        body: {
          entityType: 'PURCHASE_ORDER',
          entityId: po4Id,
          projectId: projectA1Id,
          monetaryAmount: 300000,
          previousRequestId: req4Id,
          submissionRemarks: 'Quotations attached as requested',
        },
      });

      const res = await approvalController.submitRequest(resubmitReq);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.data.status, 'SUBMITTED');
      assert.strictEqual(res.data.previousRequestId, req4Id);
      resubmittedReqId = res.data.id;

      // Verify old request remains immutable and RETURNED
      const oldReq = await approvalController.getRequest(
        createAuthReq(tokenSiteEngA, { params: { id: req4Id } })
      );
      assert.strictEqual(oldReq.data.status, 'RETURNED');
      assert.strictEqual(oldReq.data.decisions.length, 1);
    });
  });

  describe('5. Cancellation Lifecycle', () => {
    let po5Id: string;
    let req5Id: string;

    before(async () => {
      const po = await prisma.purchaseOrder.create({
        data: {
          tenantId: tenantAId,
          projectId: projectA1Id,
          vendorId: vendorAId,
          poNumber: 'PO-WF-005',
          orderDate: new Date(),
          expectedDeliveryDate: new Date(),
          subtotalAmount: 180000,
          grandTotal: 180000,
          status: 'DRAFT',
          createdById: siteEngAId,
        },
      });
      po5Id = po.id;

      const submitRes = await approvalController.submitRequest(
        createAuthReq(tokenSiteEngA, {
          body: {
            entityType: 'PURCHASE_ORDER',
            entityId: po5Id,
            projectId: projectA1Id,
            monetaryAmount: 180000,
          },
        })
      );
      req5Id = submitRes.data.id;
    });

    it('allows submitter to cancel active request: status CANCELLED and PO cancelled', async () => {
      const cancelReq = createAuthReq(tokenSiteEngA, {
        params: { id: req5Id },
        body: { decisionReason: 'Requirement changed by client' },
      });

      const res = await approvalController.cancelRequest(cancelReq);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.data.status, 'CANCELLED');

      const poAfter = await prisma.purchaseOrder.findUnique({ where: { id: po5Id } });
      assert.strictEqual(poAfter.status, 'CANCELLED');
    });
  });
});
