import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { DatabaseService } from '../src/database/database.service.js';
import { ApprovalPolicyController } from '../src/modules/approvals/controllers/approval-policy.controller.js';
import { ApprovalPolicyService } from '../src/modules/approvals/services/approval-policy.service.js';
import { ApprovalPolicyRepository } from '../src/modules/approvals/repositories/approval-policy.repository.js';
import { TokenService } from '../src/modules/auth/services/token.service.js';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service.js';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service.js';

describe('DEZOBUILD Phase 15 — Approval Policy & Governance Integration Suite', () => {
  let dbService: DatabaseService;
  let policyController: ApprovalPolicyController;
  let policyService: ApprovalPolicyService;
  let tokenService: TokenService;
  let prisma: any;

  const tenantAId = 'e1500001-aaaa-0001-aaaa-111111111111';
  const ownerAId = 'e1500001-1111-0001-aaaa-111111111111';
  const adminAId = 'e1500001-2222-0001-aaaa-111111111111';
  const pmAId = 'e1500001-3333-0001-aaaa-111111111111';
  const viewerAId = 'e1500001-4444-0001-aaaa-111111111111';

  const tenantBId = 'e1500001-bbbb-0001-bbbb-111111111111';
  const ownerBId = 'e1500001-1111-0001-bbbb-111111111111';

  let tokenOwnerA: string;
  let tokenAdminA: string;
  let tokenPmA: string;
  let tokenViewerA: string;
  let tokenOwnerB: string;

  let companyAId: string;
  let branchAId: string;
  let projectA1Id: string;
  let projectA2Id: string;

  let companyBId: string;
  let projectBId: string;

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
    policyService = new ApprovalPolicyService(policyRepo, prisma);
    policyController = new ApprovalPolicyController(policyService);

    tokenService = TokenService.getInstance();

    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Cleanup existing Phase 15 fixtures
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
        { id: tenantAId, code: 'TNT-POL-A', name: 'Tenant A Apex Construction' },
        { id: tenantBId, code: 'TNT-POL-B', name: 'Tenant B Horizon Infra' },
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
          code: 'COMP-APX-A',
          name: 'Apex Builders Corp',
          legalName: 'Apex Builders Corp Pvt Ltd',
          panNumber: 'AAACD1111A',
          gstin: '27AABCA1111A1Z1',
          email: 'apex@dezobuild.com',
          phone: '9988776655',
          address: '100 Apex Way',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        },
      })
    ).id;
    companyBId = (
      await prisma.company.create({
        data: {
          tenantId: tenantBId,
          code: 'COMP-HRZ-B',
          name: 'Horizon Infra Corp',
          legalName: 'Horizon Infra Corp Pvt Ltd',
          panNumber: 'AAACD2222B',
          gstin: '27AABCB2222B1Z2',
          email: 'horizon@dezobuild.com',
          phone: '9988776644',
          address: '200 Horizon Way',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411001',
        },
      })
    ).id;

    // Seed Branches
    branchAId = (
      await prisma.branch.create({
        data: {
          tenantId: tenantAId,
          companyId: companyAId,
          name: 'Apex Mumbai Branch',
          code: 'BR-APX-MUM',
          gstin: '27AABCA1111A1Z1',
          city: 'Mumbai',
          state: 'Maharashtra',
        },
      })
    ).id;

    // Seed Projects
    projectA1Id = (
      await prisma.project.create({
        data: {
          tenantId: tenantAId,
          companyId: companyAId,
          name: 'Apex Tower 1',
          code: 'PRJ-APX-01',
          status: 'IN_PROGRESS',
        },
      })
    ).id;
    projectA2Id = (
      await prisma.project.create({
        data: {
          tenantId: tenantAId,
          companyId: companyAId,
          name: 'Apex Highway Flyover',
          code: 'PRJ-APX-02',
          status: 'IN_PROGRESS',
        },
      })
    ).id;
    projectBId = (
      await prisma.project.create({
        data: {
          tenantId: tenantBId,
          companyId: companyBId,
          name: 'Horizon Bridge',
          code: 'PRJ-HRZ-01',
          status: 'IN_PROGRESS',
        },
      })
    ).id;

    // Seed Users
    await prisma.user.createMany({
      data: [
        { id: ownerAId, tenantId: tenantAId, email: 'owner@apex.com', passwordHash: 'dummy', fullName: 'Apex Owner', status: 'ACTIVE' },
        { id: adminAId, tenantId: tenantAId, email: 'admin@apex.com', passwordHash: 'dummy', fullName: 'Apex Admin', status: 'ACTIVE' },
        { id: pmAId, tenantId: tenantAId, email: 'pm@apex.com', passwordHash: 'dummy', fullName: 'Apex PM', status: 'ACTIVE' },
        { id: viewerAId, tenantId: tenantAId, email: 'viewer@apex.com', passwordHash: 'dummy', fullName: 'Apex Viewer', status: 'ACTIVE' },
        { id: ownerBId, tenantId: tenantBId, email: 'owner@horizon.com', passwordHash: 'dummy', fullName: 'Horizon Owner', status: 'ACTIVE' },
      ],
    });

    // Assign Roles
    const ownerRole = await prisma.role.findFirst({ where: { name: 'COMPANY_OWNER' } });
    const adminRole = await prisma.role.findFirst({ where: { name: 'COMPANY_ADMIN' } });
    const pmRole = await prisma.role.findFirst({ where: { name: 'PROJECT_MANAGER' } });
    const viewerRole = await prisma.role.findFirst({ where: { name: 'VIEWER' } });

    await prisma.userRoleAssignment.createMany({
      data: [
        { tenantId: tenantAId, userId: ownerAId, roleId: ownerRole!.id },
        { tenantId: tenantAId, userId: adminAId, roleId: adminRole!.id },
        { tenantId: tenantAId, userId: pmAId, roleId: pmRole!.id },
        { tenantId: tenantAId, userId: viewerAId, roleId: viewerRole!.id },
        { tenantId: tenantBId, userId: ownerBId, roleId: ownerRole!.id },
      ],
    });

    await prisma.projectMember.createMany({
      data: [
        { tenantId: tenantAId, projectId: projectA1Id, userId: pmAId, projectRole: 'PROJECT_MANAGER' },
        { tenantId: tenantAId, projectId: projectA2Id, userId: pmAId, projectRole: 'PROJECT_MANAGER' },
      ],
    });

    // Generate tokens
    tokenOwnerA = tokenService.createAccessToken({ userId: ownerAId, tenantId: tenantAId, sessionId: 's-p-1', sessionVersion: 1 });
    tokenAdminA = tokenService.createAccessToken({ userId: adminAId, tenantId: tenantAId, sessionId: 's-p-2', sessionVersion: 1 });
    tokenPmA = tokenService.createAccessToken({ userId: pmAId, tenantId: tenantAId, sessionId: 's-p-3', sessionVersion: 1 });
    tokenViewerA = tokenService.createAccessToken({ userId: viewerAId, tenantId: tenantAId, sessionId: 's-p-4', sessionVersion: 1 });
    tokenOwnerB = tokenService.createAccessToken({ userId: ownerBId, tenantId: tenantBId, sessionId: 's-p-5', sessionVersion: 1 });
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

  describe('1. Policy Creation and DRAFT State', () => {
    it('creates a DRAFT approval policy with valid canonical steps', async () => {
      const req = createAuthReq(tokenAdminA, {
        body: {
          name: 'PO Standard Approval (< 5 Lakhs)',
          description: 'Standard 2-tier approval for purchase orders under 500,000 INR',
          entityType: 'PURCHASE_ORDER',
          projectId: projectA1Id,
          minAmount: 0,
          maxAmount: 500000,
          currency: 'INR',
          steps: [
            {
              stepOrder: 1,
              stepName: 'Site Commercial Review',
              requiredRoleHint: 'PROJECT_MANAGER',
              requiredPermission: 'materials:po:create',
              enforceMakerChecker: true,
              enforceDistinctFromPrev: false,
              timeoutHours: 24,
            },
            {
              stepOrder: 2,
              stepName: 'Authoritative Authorization',
              requiredRoleHint: 'COMPANY_ADMIN',
              requiredPermission: 'materials:po:approve',
              enforceMakerChecker: true,
              enforceDistinctFromPrev: true,
              timeoutHours: 48,
            },
          ],
        },
      });

      const res = await policyController.createPolicy(req);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.data.status, 'DRAFT');
      assert.strictEqual(res.data.version, 1);
      assert.strictEqual(res.data.steps.length, 2);
      assert.strictEqual(res.data.steps[0].stepOrder, 1);
      assert.strictEqual(res.data.steps[1].stepOrder, 2);
    });

    it('rejects policy creation with non-canonical permission', async () => {
      const req = createAuthReq(tokenAdminA, {
        body: {
          name: 'Invalid Policy',
          entityType: 'PURCHASE_ORDER',
          minAmount: 0,
          maxAmount: 100000,
          steps: [
            {
              stepOrder: 1,
              stepName: 'Invalid Step',
              requiredPermission: 'fake:permission:not_exists',
            },
          ],
        },
      });

      await assert.rejects(
        async () => policyController.createPolicy(req),
        (err: any) => {
          assert.strictEqual(err.errorCode, 'VALIDATION_ERROR');
          const details = JSON.stringify(err.invalidParams);
          return details.includes('valid Phase 04 canonical permission');
        }
      );
    });

    it('rejects policy creation with non-sequential step orders', async () => {
      const req = createAuthReq(tokenAdminA, {
        body: {
          name: 'Non Sequential Policy',
          entityType: 'PURCHASE_ORDER',
          minAmount: 0,
          maxAmount: 100000,
          steps: [
            {
              stepOrder: 1,
              stepName: 'Step 1',
              requiredPermission: 'materials:po:create',
            },
            {
              stepOrder: 3,
              stepName: 'Step 3',
              requiredPermission: 'materials:po:approve',
            },
          ],
        },
      });

      await assert.rejects(
        async () => policyController.createPolicy(req),
        (err: any) => {
          assert.strictEqual(err.errorCode, 'VALIDATION_ERROR');
          const details = JSON.stringify(err.invalidParams);
          return details.includes('strictly sequential starting from 1');
        }
      );
    });
  });

  describe('2. Policy Activation and Bracket Overlap Conflict Prevention', () => {
    let policy1Id: string;
    let policy2Id: string;

    it('activates policy 1 (0 - 500,000 INR)', async () => {
      const createReq = createAuthReq(tokenAdminA, {
        body: {
          name: 'Tier 1 PO Policy',
          entityType: 'PURCHASE_ORDER',
          projectId: projectA1Id,
          minAmount: 0,
          maxAmount: 500000,
          steps: [
            {
              stepOrder: 1,
              stepName: 'PM Verification',
              requiredPermission: 'materials:po:approve',
            },
          ],
        },
      });
      const createRes = await policyController.createPolicy(createReq);
      policy1Id = createRes.data.id;

      const actReq = createAuthReq(tokenAdminA, { params: { id: policy1Id } });
      const actRes = await policyController.activatePolicy(actReq);

      assert.strictEqual(actRes.success, true);
      assert.strictEqual(actRes.data.status, 'ACTIVE');
    });

    it('rejects activation of overlapping policy 2 (400,000 - 1,000,000 INR)', async () => {
      const createReq = createAuthReq(tokenAdminA, {
        body: {
          name: 'Overlapping PO Policy',
          entityType: 'PURCHASE_ORDER',
          projectId: projectA1Id,
          minAmount: 400000,
          maxAmount: 1000000,
          steps: [
            {
              stepOrder: 1,
              stepName: 'Admin Verification',
              requiredPermission: 'materials:po:approve',
            },
          ],
        },
      });
      const createRes = await policyController.createPolicy(createReq);
      policy2Id = createRes.data.id;

      const actReq = createAuthReq(tokenAdminA, { params: { id: policy2Id } });
      await assert.rejects(async () => policyController.activatePolicy(actReq), /Overlaps with existing active policy/);
    });

    it('successfully activates non-overlapping tier 2 policy (500,000.01 - 2,500,000 INR)', async () => {
      const createReq = createAuthReq(tokenAdminA, {
        body: {
          name: 'Tier 2 PO Policy',
          entityType: 'PURCHASE_ORDER',
          projectId: projectA1Id,
          minAmount: 500000.01,
          maxAmount: 2500000,
          steps: [
            {
              stepOrder: 1,
              stepName: 'Admin Verification',
              requiredPermission: 'materials:po:approve',
            },
          ],
        },
      });
      const createRes = await policyController.createPolicy(createReq);
      const actReq = createAuthReq(tokenAdminA, { params: { id: createRes.data.id } });
      const actRes = await policyController.activatePolicy(actReq);

      assert.strictEqual(actRes.success, true);
      assert.strictEqual(actRes.data.status, 'ACTIVE');
    });
  });

  describe('3. Policy Versioning Lineage and Superseding', () => {
    let activeV1PolicyId: string;
    let newDraftV2PolicyId: string;

    before(async () => {
      // Create and activate RA Bill policy v1
      const createV1 = await policyController.createPolicy(
        createAuthReq(tokenAdminA, {
          body: {
            name: 'RA Bill Policy v1',
            entityType: 'RA_BILL',
            projectId: projectA1Id,
            minAmount: 0,
            maxAmount: 10000000,
            steps: [
              {
                stepOrder: 1,
                stepName: 'Commercial Verification',
                requiredPermission: 'finance:bill:verify',
              },
              {
                stepOrder: 2,
                stepName: 'Authoritative Approval',
                requiredPermission: 'finance:bill:approve',
              },
            ],
          },
        })
      );
      activeV1PolicyId = createV1.data.id;
      await policyController.activatePolicy(createAuthReq(tokenAdminA, { params: { id: activeV1PolicyId } }));

      // Create draft v2 policy
      const createV2 = await policyController.createPolicy(
        createAuthReq(tokenAdminA, {
          body: {
            name: 'RA Bill Policy v2 (Enhanced)',
            entityType: 'RA_BILL',
            projectId: projectA1Id,
            minAmount: 0,
            maxAmount: 10000000,
            steps: [
              {
                stepOrder: 1,
                stepName: 'Site QS Check',
                requiredPermission: 'finance:bill:verify',
              },
              {
                stepOrder: 2,
                stepName: 'Head Office Audit',
                requiredPermission: 'finance:bill:verify',
              },
              {
                stepOrder: 3,
                stepName: 'Director Authorization',
                requiredPermission: 'finance:bill:approve',
              },
            ],
          },
        })
      );
      newDraftV2PolicyId = createV2.data.id;
    });

    it('supersedes v1 policy with v2 draft: marks v1 SUPERSEDED and links previousPolicyId', async () => {
      const req = createAuthReq(tokenAdminA, {
        params: { id: activeV1PolicyId },
        body: { newDraftPolicyId: newDraftV2PolicyId },
      });

      const res = await policyController.supersedePolicy(req);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.data.status, 'ACTIVE');
      assert.strictEqual(res.data.version, 2);
      assert.strictEqual(res.data.previousPolicyId, activeV1PolicyId);

      // Verify v1 is now SUPERSEDED
      const v1Fetch = await policyController.getPolicy(
        createAuthReq(tokenAdminA, { params: { id: activeV1PolicyId } })
      );
      assert.strictEqual(v1Fetch.data.status, 'SUPERSEDED');
    });

    it('prohibits reactivating a SUPERSEDED policy', async () => {
      const req = createAuthReq(tokenAdminA, { params: { id: activeV1PolicyId } });
      await assert.rejects(async () => policyController.activatePolicy(req), /Cannot activate a SUPERSEDED policy version/);
    });

    it('prohibits deactivating non-active policies', async () => {
      const req = createAuthReq(tokenAdminA, { params: { id: activeV1PolicyId } });
      await assert.rejects(async () => policyController.deactivatePolicy(req), /Only ACTIVE policies can be deactivated/);
    });

    it('deactivates an ACTIVE policy cleanly', async () => {
      const req = createAuthReq(tokenAdminA, { params: { id: newDraftV2PolicyId } });
      const res = await policyController.deactivatePolicy(req);

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.data.status, 'INACTIVE');
    });
  });

  describe('4. Multi-Tenant Isolation for Policies', () => {
    let tenantAPolicyId: string;

    before(async () => {
      const res = await policyController.createPolicy(
        createAuthReq(tokenAdminA, {
          body: {
            name: 'Tenant A Private Policy',
            entityType: 'MATERIAL_INDENT',
            steps: [
              {
                stepOrder: 1,
                stepName: 'Indent Verification',
                requiredPermission: 'materials:indent:approve',
              },
            ],
          },
        })
      );
      tenantAPolicyId = res.data.id;
    });

    it('prevents Tenant B from viewing Tenant A policy (404 NotFound)', async () => {
      const req = createAuthReq(tokenOwnerB, { params: { id: tenantAPolicyId } });
      await assert.rejects(async () => policyController.getPolicy(req), /not found/);
    });

    it('prevents Tenant B from activating Tenant A policy', async () => {
      const req = createAuthReq(tokenOwnerB, { params: { id: tenantAPolicyId } });
      await assert.rejects(async () => policyController.activatePolicy(req), /not found/);
    });
  });

  describe('5. RBAC Protection for Policy Governance', () => {
    it('denies policy creation to user lacking settings:manage permission (e.g. VIEWER)', async () => {
      const req = createAuthReq(tokenViewerA, {
        body: {
          name: 'Unauthorized Policy',
          entityType: 'PURCHASE_ORDER',
          steps: [
            {
              stepOrder: 1,
              stepName: 'Step 1',
              requiredPermission: 'materials:po:approve',
            },
          ],
        },
      });

      await assert.rejects(async () => policyController.createPolicy(req), /Forbidden/);
    });
  });
});
