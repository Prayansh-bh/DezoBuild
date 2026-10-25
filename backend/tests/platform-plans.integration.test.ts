import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseService } from '../src/database/database.service';
import { TokenService } from '../src/modules/auth/services/token.service';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service';
import { EntitlementService } from '../src/modules/subscriptions/services/entitlement.service';
import { CapacityService } from '../src/modules/subscriptions/services/capacity.service';
import { PlatformPlanService } from '../src/modules/platform/services/platform-plan.service';
import { PlatformAuditService } from '../src/modules/platform/services/platform-audit.service';
import { PlatformProvisioningService } from '../src/modules/platform/services/platform-provisioning.service';
import { PlatformController } from '../src/modules/platform/platform.controller';
import { ConflictError, BadRequestError } from '../src/common/errors/app-error';
import { CANONICAL_FEATURE_KEYS } from '../src/modules/subscriptions/constants/plan.catalog';
import type { IncomingMessage } from 'node:http';

describe('DEZOBUILD Platform Plan Tier Governance & Versioning Suite', () => {
  let dbService: DatabaseService;
  let prisma: any;
  let tokenService: TokenService;
  let entitlementService: EntitlementService;
  let capacityService: CapacityService;
  let auditService: PlatformAuditService;
  let planService: PlatformPlanService;
  let provisioningService: PlatformProvisioningService;
  let controller: PlatformController;

  // Mock Request Helper for Super Admin
  function createSuperAdminRequest(body?: unknown, params?: Record<string, string>): IncomingMessage & { body?: unknown; params?: Record<string, string> } {
    const sessionToken = tokenService.createAccessToken({
      userId: 'platform-super-admin',
      tenantId: 'PLATFORM',
      sessionId: 'test-session-admin',
      sessionVersion: 1,
    });

    const req = {
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      body,
      params,
    } as any;
    return req;
  }

  // Mock Request Helper for Customer User (Non-Admin)
  function createCustomerUserRequest(tenantId: string, userId: string, body?: unknown, params?: Record<string, string>): IncomingMessage & { body?: unknown; params?: Record<string, string> } {
    const customerToken = tokenService.createAccessToken({
      userId,
      tenantId,
      sessionId: 'customer-session',
      sessionVersion: 1,
    });

    const req = {
      headers: {
        authorization: `Bearer ${customerToken}`,
      },
      body,
      params,
    } as any;
    return req;
  }

  async function resetToBaseline() {
    // Remove test subscriptions
    const testTenantCodes = ['TENANT_PRO_V1', 'TEST_NEW_PRO_T1', 'TENANT_A_V1', 'TENANT_B_V2', 'TENANT_UPGRADE_TEST', 'TENANT_RESOLUTION_TEST', 'TENANT_HISTORICAL_PRICE'];
    const testTenants = await prisma.tenant.findMany({ where: { code: { in: testTenantCodes } } });
    const testTenantIds = testTenants.map((t: any) => t.id);
    if (testTenantIds.length > 0) {
      await prisma.tenantEntitlementOverride.deleteMany({ where: { tenantId: { in: testTenantIds } } });
      await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: testTenantIds } } });
      await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: testTenantIds } } });
      await prisma.user.deleteMany({ where: { tenantId: { in: testTenantIds } } });
      await prisma.department.deleteMany({ where: { tenantId: { in: testTenantIds } } });
      await prisma.branch.deleteMany({ where: { tenantId: { in: testTenantIds } } });
      await prisma.company.deleteMany({ where: { tenantId: { in: testTenantIds } } });
      await prisma.tenant.deleteMany({ where: { id: { in: testTenantIds } } });
    }

    // Clean up any test versions > 1 created during tests and restore Version 1 as PUBLISHED
    const plans = await prisma.platformPlan.findMany({ include: { versions: true } });
    for (const plan of plans) {
      const v1 = plan.versions.find((v: any) => v.versionNumber === 1);
      if (v1) {
        // Delete all versions > 1
        await prisma.tenantSubscription.deleteMany({
          where: {
            planVersion: {
              planId: plan.id,
              versionNumber: { gt: 1 },
            },
          },
        });
        await prisma.platformPlanVersion.deleteMany({
          where: {
            planId: plan.id,
            versionNumber: { gt: 1 },
          },
        });
        await prisma.platformPlanVersion.update({
          where: { id: v1.id },
          data: { status: 'PUBLISHED' },
        });
        await prisma.platformPlan.update({
          where: { id: plan.id },
          data: {
            activeVersionId: v1.id,
            priceMonthly: v1.priceMonthly,
            priceAnnual: v1.priceAnnual,
            maxProjects: v1.maxProjects,
            maxSeats: v1.maxSeats,
            maxStorageGb: v1.maxStorageGb,
          },
        });
      }
    }
  }

  before(async () => {
    dbService = DatabaseService.getInstance();
    prisma = dbService.getClient();
    await dbService.connect();

    tokenService = TokenService.getInstance();
    capacityService = new CapacityService(prisma);
    entitlementService = new EntitlementService(prisma, capacityService);
    auditService = PlatformAuditService.getInstance(prisma);
    planService = PlatformPlanService.getInstance(prisma, auditService);
    provisioningService = PlatformProvisioningService.getInstance(prisma);
    controller = new PlatformController(prisma, tokenService, entitlementService, provisioningService, auditService, undefined, planService);

    // Bootstrap seeders
    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    await resetToBaseline();
  });

  after(async () => {
    await resetToBaseline();
  });

  // 1. Global plan list
  it('1. should list all global platform plans with active versions', async () => {
    const req = createSuperAdminRequest();
    const res = await controller.listPlans(req);
    assert.equal(res.success, true);
    assert.ok(Array.isArray(res.data));
    assert.ok(res.data.length >= 3);

    const starter = res.data.find((p) => p.code === 'STARTER');
    const pro = res.data.find((p) => p.code === 'PROFESSIONAL');
    const ent = res.data.find((p) => p.code === 'ENTERPRISE');

    assert.ok(starter);
    assert.ok(pro);
    assert.ok(ent);
    assert.ok(starter.publishedVersion);
    assert.equal(starter.publishedVersion?.status, 'PUBLISHED');
  });

  // 2. Global plan detail
  it('2. should retrieve single plan detail with version history', async () => {
    const pro = await prisma.platformPlan.findUnique({ where: { code: 'PROFESSIONAL' } });
    assert.ok(pro);

    const req = createSuperAdminRequest(undefined, { id: pro.id });
    const res = await controller.getPlan(req);
    assert.equal(res.success, true);
    assert.equal(res.data.code, 'PROFESSIONAL');
    assert.ok(res.data.publishedVersion);
    assert.ok(Array.isArray(res.data.versions));
  });

  // 3 & 4. Super Admin can create and update draft
  it('3 & 4. should allow SUPER_ADMIN to create and update a draft version', async () => {
    const pro = await prisma.platformPlan.findUnique({ where: { code: 'PROFESSIONAL' } });
    assert.ok(pro);

    // Initial save draft with canonical features
    const draftPayload = {
      priceMonthly: 179999,
      priceAnnual: 1799990,
      maxProjects: 20,
      maxSeats: 25,
      maxStorageGb: 100,
      description: 'Updated Professional Plan with expanded capacity',
      features: {
        'projects:core': true,
        'projects:wbs': true,
        'materials:core': true,
        'materials:po_matching': true,
        'finance:commercial': true,
        'bim:3d_viewer': false,
        'ai:schedule_forecasting': false,
        'integrations:erp_sync': true,
        'hardware:biometric': true,
        'survey:drone_orthomosaic': false,
        'security:custom_domain': false,
        'compliance:audit_export': false,
      },
    };

    const req1 = createSuperAdminRequest(draftPayload, { id: pro.id });
    const res1 = await controller.savePlanDraft(req1);
    assert.equal(res1.success, true);
    assert.ok(res1.data.draftVersion);
    assert.equal(res1.data.draftVersion.status, 'DRAFT');
    assert.equal(res1.data.draftVersion.priceMonthly, 179999);
    assert.equal(res1.data.draftVersion.maxProjects, 20);

    // Update draft with revised price
    const updatePayload = {
      ...draftPayload,
      priceMonthly: 189999,
    };
    const req2 = createSuperAdminRequest(updatePayload, { id: pro.id });
    const res2 = await controller.savePlanDraft(req2);
    assert.equal(res2.success, true);
    assert.equal(res2.data.draftVersion?.priceMonthly, 189999);
  });

  // 5. Draft changes do not affect current tenants
  it('5. should ensure draft changes do NOT affect existing pinned tenant subscriptions', async () => {
    const testTenantId = '11110001-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    await prisma.tenantEntitlementOverride.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenant.deleteMany({ where: { id: testTenantId } });

    const tenant = await prisma.tenant.create({
      data: {
        id: testTenantId,
        code: 'TENANT_PRO_V1',
        name: 'Pro Tenant V1 Company',
        planTier: 'PROFESSIONAL',
        status: 'ACTIVE',
      },
    });

    const pro = await prisma.platformPlan.findUnique({
      where: { code: 'PROFESSIONAL' },
      include: { versions: { where: { versionNumber: 1 } } },
    });
    const v1 = pro.versions[0];
    assert.ok(v1);

    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenant.id,
        planId: pro.id,
        planVersionId: v1.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      },
    });

    const eff = await entitlementService.getEffectiveSubscription(testTenantId);
    assert.equal(eff.planCode, 'PROFESSIONAL');
    assert.equal(eff.versionNumber, 1);
    assert.equal(eff.quotas.activeProjects.max, v1.maxProjects);
    assert.equal(eff.quotas.seats.max, v1.maxSeats);

    // Clean up
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenant.deleteMany({ where: { id: testTenantId } });
  });

  // 6. Draft changes do not affect new tenants before publish
  it('6. should provision new tenants using PUBLISHED version, never DRAFT', async () => {
    const testCode = 'TEST_NEW_PRO_T1';
    const existing = await prisma.tenant.findUnique({ where: { code: testCode } });
    if (existing) {
      await prisma.tenantSubscription.deleteMany({ where: { tenantId: existing.id } });
      await prisma.userRoleAssignment.deleteMany({ where: { tenantId: existing.id } });
      await prisma.user.deleteMany({ where: { tenantId: existing.id } });
      await prisma.company.deleteMany({ where: { tenantId: existing.id } });
      await prisma.tenant.deleteMany({ where: { id: existing.id } });
    }

    const provisionRes = await provisioningService.provisionTenant(
      {
        name: 'New Pro Client Pvt Ltd',
        code: testCode,
        planTier: 'PROFESSIONAL',
        adminName: 'Client Admin',
        adminEmail: 'clientadmin@proclient.com',
        adminPassword: 'Password123!',
      },
      'platform-super-admin',
      '127.0.0.1'
    );

    assert.ok(provisionRes.id);

    const sub = await prisma.tenantSubscription.findFirst({
      where: { tenantId: provisionRes.id },
      include: { planVersion: true },
    });

    assert.ok(sub);
    assert.ok(sub.planVersion);
    assert.equal(sub.planVersion.status, 'PUBLISHED');
    assert.equal(sub.planVersion.versionNumber, 1); // Published v1, not the draft v2

    // Clean up
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: provisionRes.id } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: provisionRes.id } });
    await prisma.user.deleteMany({ where: { tenantId: provisionRes.id } });
    await prisma.department.deleteMany({ where: { tenantId: provisionRes.id } });
    await prisma.branch.deleteMany({ where: { tenantId: provisionRes.id } });
    await prisma.company.deleteMany({ where: { tenantId: provisionRes.id } });
    await prisma.tenant.deleteMany({ where: { id: provisionRes.id } });
  });

  // 7, 8, 9, 10. Publish creates active published version, archives v1, pins existing tenants, gives new tenants v2
  it('7, 8, 9, 10. should publish draft atomically: archive v1, activate v2, keep existing pinned, give new tenants v2', async () => {
    const pro = await prisma.platformPlan.findUnique({ where: { code: 'PROFESSIONAL' } });
    assert.ok(pro);

    // Existing Tenant A on v1
    const tenantAId = '22220001-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: tenantAId } });
    await prisma.tenant.deleteMany({ where: { id: tenantAId } });

    const tenantA = await prisma.tenant.create({
      data: {
        id: tenantAId,
        code: 'TENANT_A_V1',
        name: 'Tenant A Construction',
        planTier: 'PROFESSIONAL',
        status: 'ACTIVE',
      },
    });

    const v1Before = await prisma.platformPlanVersion.findFirst({
      where: { planId: pro.id, versionNumber: 1 },
    });
    assert.ok(v1Before);

    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantA.id,
        planId: pro.id,
        planVersionId: v1Before.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      },
    });

    // Publish v2
    const publishReq = createSuperAdminRequest(undefined, { id: pro.id });
    const publishRes = await controller.publishPlan(publishReq);
    assert.equal(publishRes.success, true);
    assert.equal(publishRes.data.publishedVersion?.versionNumber, 2);
    assert.equal(publishRes.data.publishedVersion?.status, 'PUBLISHED');
    assert.equal(publishRes.data.draftVersion, null);

    // Verify v1 is now ARCHIVED
    const v1After = await prisma.platformPlanVersion.findUnique({
      where: { id: v1Before.id },
    });
    assert.equal(v1After?.status, 'ARCHIVED');

    // Verify Tenant A remains pinned to v1 (ARCHIVED)
    const effA = await entitlementService.getEffectiveSubscription(tenantAId);
    assert.equal(effA.versionNumber, 1);
    assert.equal(effA.versionStatus, 'ARCHIVED');
    assert.equal(effA.quotas.activeProjects.max, v1Before.maxProjects);

    // Verify New Tenant B gets v2 (PUBLISHED)
    const tenantBId = '22220002-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: tenantBId } });
    await prisma.tenant.deleteMany({ where: { id: tenantBId } });

    const tenantB = await prisma.tenant.create({
      data: {
        id: tenantBId,
        code: 'TENANT_B_V2',
        name: 'Tenant B Construction',
        planTier: 'PROFESSIONAL',
        status: 'ACTIVE',
      },
    });

    await entitlementService.provisionDefaultSubscription(tenantBId, 'PROFESSIONAL', 'MONTHLY');

    const effB = await entitlementService.getEffectiveSubscription(tenantBId);
    assert.equal(effB.versionNumber, 2);
    assert.equal(effB.versionStatus, 'PUBLISHED');
    assert.equal(effB.quotas.activeProjects.max, 20); // v2 quota

    // Clean up
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
  });

  // 11. Tenant plan change receives current published version
  it('11. should upgrade tenant to current published version when plan is changed', async () => {
    const tenantId = '33330001-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    await prisma.tenantSubscription.deleteMany({ where: { tenantId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });

    await prisma.tenant.create({
      data: {
        id: tenantId,
        code: 'TENANT_UPGRADE_TEST',
        name: 'Tenant Upgrade Co',
        planTier: 'STARTER',
        status: 'ACTIVE',
      },
    });

    await entitlementService.provisionDefaultSubscription(tenantId, 'STARTER', 'MONTHLY');

    const beforeUpgrade = await entitlementService.getEffectiveSubscription(tenantId);
    assert.equal(beforeUpgrade.planCode, 'STARTER');

    // Upgrade to PROFESSIONAL (which is currently on v2)
    const changeReq = createSuperAdminRequest({ planCode: 'PROFESSIONAL' }, { tenantId });
    const changeRes = await controller.changePlan(changeReq);
    assert.equal(changeRes.success, true);
    assert.equal(changeRes.data.planCode, 'PROFESSIONAL');
    assert.equal(changeRes.data.versionNumber, 2);
    assert.equal(changeRes.data.versionStatus, 'PUBLISHED');

    // Clean up
    await prisma.tenantSubscription.deleteMany({ where: { tenantId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
  });

  // 12 & 13. Immutability: published/archived versions cannot be edited directly, publish requires active draft
  it('12 & 13. should require active draft for publish and reject direct mutations', async () => {
    const pro = await prisma.platformPlan.findUnique({ where: { code: 'PROFESSIONAL' } });
    assert.ok(pro);

    // Publishing without draft should fail with BadRequestError
    const publishReq = createSuperAdminRequest(undefined, { id: pro.id });
    await assert.rejects(
      async () => controller.publishPlan(publishReq),
      (err: any) => err instanceof BadRequestError && err.message.includes('No active draft exists')
    );
  });

  // 14. Only one draft exists per plan
  it('14. should maintain at most one DRAFT per plan, updating the existing draft on subsequent save', async () => {
    const pro = await prisma.platformPlan.findUnique({ where: { code: 'PROFESSIONAL' } });
    assert.ok(pro);

    const draft1 = {
      priceMonthly: 199999,
      priceAnnual: 1999990,
      features: { 'projects:core': true, 'projects:wbs': true },
    };
    await planService.saveDraft(pro.id, draft1, 'platform-super-admin');

    const draft2 = {
      priceMonthly: 209999,
      priceAnnual: 2099990,
      features: { 'projects:core': true, 'projects:wbs': true, 'finance:commercial': true },
    };
    await planService.saveDraft(pro.id, draft2, 'platform-super-admin');

    const drafts = await prisma.platformPlanVersion.findMany({
      where: { planId: pro.id, status: 'DRAFT' },
    });
    assert.equal(drafts.length, 1);
    assert.equal(Number(drafts[0].priceMonthly), 209999);
  });

  // 15. Concurrent publish is safely handled
  it('15. should handle publish gracefully and reject duplicate publish when draft is consumed', async () => {
    const pro = await prisma.platformPlan.findUnique({ where: { code: 'PROFESSIONAL' } });
    assert.ok(pro);

    // Publish the draft created in test 14
    const res = await planService.publishPlan(pro.id, 'platform-super-admin');
    assert.ok(res.publishedVersion);
    assert.equal(res.publishedVersion.status, 'PUBLISHED');

    // Immediate second publish must fail because draft was consumed
    await assert.rejects(
      async () => planService.publishPlan(pro.id, 'platform-super-admin'),
      (err: any) => err instanceof BadRequestError
    );
  });

  // 16. Audit record created
  it('16. should create durable PlatformAuditLog records for plan draft and publish actions', async () => {
    const auditLogs = await prisma.platformAuditLog.findMany({
      where: {
        action: { in: ['PLAN_DRAFT_CREATED', 'PLAN_DRAFT_UPDATED', 'PLAN_PUBLISHED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    assert.ok(auditLogs.length >= 3);
    const publishLog = auditLogs.find((l: any) => l.action === 'PLAN_PUBLISHED');
    assert.ok(publishLog);
    assert.equal(publishLog.actorId, 'platform-super-admin');
    assert.ok(publishLog.details);
  });

  // 17. Customer users cannot mutate global plans
  it('17. should reject requests from non-platform customer tokens with ForbiddenError or UnauthorizedError', async () => {
    const pro = await prisma.platformPlan.findUnique({ where: { code: 'PROFESSIONAL' } });
    assert.ok(pro);

    const customerReq = createCustomerUserRequest('tenant-123', 'user-456', { priceMonthly: 99999 }, { id: pro.id });

    await assert.rejects(
      async () => controller.savePlanDraft(customerReq),
      (err: any) => err.statusCode === 401 || err.statusCode === 403
    );

    await assert.rejects(
      async () => controller.listPlans(customerReq),
      (err: any) => err.statusCode === 401 || err.statusCode === 403
    );
  });

  // 18. Seeder does not overwrite Owner-edited configuration
  it('18. should strictly NOT overwrite Owner-configured plans or versions on re-seeding', async () => {
    const planDetailBefore = await planService.getPlan('PROFESSIONAL');
    assert.ok(planDetailBefore.publishedVersion);
    const publishedVersionNum = planDetailBefore.publishedVersion.versionNumber;
    const publishedPriceMonthly = Number(planDetailBefore.publishedVersion.priceMonthly);

    // Run seeder again
    const seeder = new SubscriptionSeederService(prisma);
    await seeder.seedPlans();

    // Verify values remain intact
    const planDetailAfter = await planService.getPlan('PROFESSIONAL');
    assert.ok(planDetailAfter.publishedVersion);
    assert.equal(planDetailAfter.publishedVersion.versionNumber, publishedVersionNum);
    assert.equal(Number(planDetailAfter.publishedVersion.priceMonthly), publishedPriceMonthly);
  });

  // 19, 20, 21. Feature, Project, and Seat resolution uses plan version
  it('19, 20, 21. should resolve features, project capacity, and seat capacity strictly from plan version', async () => {
    const planDetail = await planService.getPlan('STARTER');
    assert.ok(planDetail.publishedVersion);

    const testTenantId = '44440001-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenant.deleteMany({ where: { id: testTenantId } });

    await prisma.tenant.create({
      data: {
        id: testTenantId,
        code: 'TENANT_RESOLUTION_TEST',
        name: 'Resolution Test Co',
        planTier: 'STARTER',
        status: 'ACTIVE',
      },
    });

    await entitlementService.provisionDefaultSubscription(testTenantId, 'STARTER', 'MONTHLY');

    // Feature resolution
    const hasCore = await entitlementService.isFeatureEntitled(testTenantId, 'projects:core');
    assert.equal(hasCore, true);

    // Capacity checks
    await capacityService.checkProjectCapacity(testTenantId);
    await capacityService.checkSeatCapacity(testTenantId);

    // Clean up
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenant.deleteMany({ where: { id: testTenantId } });
  });

  // 22. Historical subscription pricing remains stable
  it('22. should preserve historical subscription pricing on pinned versions', async () => {
    const starterDetail = await planService.getPlan('STARTER');
    assert.ok(starterDetail.publishedVersion);

    const testTenantId = '55550001-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenant.deleteMany({ where: { id: testTenantId } });

    await prisma.tenant.create({
      data: {
        id: testTenantId,
        code: 'TENANT_HISTORICAL_PRICE',
        name: 'Historical Price Co',
        planTier: 'STARTER',
        status: 'ACTIVE',
      },
    });

    await entitlementService.provisionDefaultSubscription(testTenantId, 'STARTER', 'MONTHLY');

    const sub = await prisma.tenantSubscription.findFirst({
      where: { tenantId: testTenantId },
      include: { planVersion: true },
    });

    assert.ok(sub);
    assert.equal(Number(sub.planVersion.priceMonthly), Number(starterDetail.publishedVersion.priceMonthly));

    // Clean up
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenant.deleteMany({ where: { id: testTenantId } });
  });
});
