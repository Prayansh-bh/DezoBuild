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
import type { IncomingMessage } from 'node:http';

describe('DEZOBUILD Critical E2E Scenario & Seeder Safety Proof (Sections 30 & 31)', () => {
  let dbService: DatabaseService;
  let prisma: any;
  let tokenService: TokenService;
  let entitlementService: EntitlementService;
  let capacityService: CapacityService;
  let auditService: PlatformAuditService;
  let planService: PlatformPlanService;
  let provisioningService: PlatformProvisioningService;
  let controller: PlatformController;
  let seeder: SubscriptionSeederService;

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

  const tenantAId = 'aaaa1111-0000-0000-0000-000000000001';
  const tenantBId = 'bbbb2222-0000-0000-0000-000000000002';
  const tenantNewId = 'cccc3333-0000-0000-0000-000000000003';

  async function cleanupTenants() {
    const ids = [tenantAId, tenantBId, tenantNewId];
    await prisma.tenantEntitlementOverride.deleteMany({ where: { tenantId: { in: ids } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: ids } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: ids } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: ids } } });
    await prisma.department.deleteMany({ where: { tenantId: { in: ids } } });
    await prisma.branch.deleteMany({ where: { tenantId: { in: ids } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: ids } } });
    await prisma.tenant.deleteMany({ where: { id: { in: ids } } });
  }

  async function resetBaseline() {
    await cleanupTenants();
    const plans = await prisma.platformPlan.findMany({ include: { versions: true } });
    for (const plan of plans) {
      const v1 = plan.versions.find((v: any) => v.versionNumber === 1);
      if (v1) {
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
          data: {
            status: 'PUBLISHED',
            priceMonthly: plan.code === 'PROFESSIONAL' ? 149999 : v1.priceMonthly,
            priceAnnual: plan.code === 'PROFESSIONAL' ? 1499990 : v1.priceAnnual,
            maxProjects: plan.code === 'PROFESSIONAL' ? 10 : v1.maxProjects,
            maxSeats: plan.code === 'PROFESSIONAL' ? 15 : v1.maxSeats,
            maxStorageGb: plan.code === 'PROFESSIONAL' ? 200 : v1.maxStorageGb,
          },
        });
        await prisma.platformPlan.update({
          where: { id: plan.id },
          data: {
            activeVersionId: v1.id,
            priceMonthly: plan.code === 'PROFESSIONAL' ? 149999 : v1.priceMonthly,
            priceAnnual: plan.code === 'PROFESSIONAL' ? 1499990 : v1.priceAnnual,
            maxProjects: plan.code === 'PROFESSIONAL' ? 10 : v1.maxProjects,
            maxSeats: plan.code === 'PROFESSIONAL' ? 15 : v1.maxSeats,
            maxStorageGb: plan.code === 'PROFESSIONAL' ? 200 : v1.maxStorageGb,
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
    seeder = new SubscriptionSeederService(prisma);

    await new RbacSeederService(prisma).seedAll();
    await seeder.seedAll();
    await resetBaseline();
  });

  after(async () => {
    await resetBaseline();
  });

  it('Section 30: End-to-End Scenario Proof (Professional v1 -> Draft v2 -> Publish -> Pinning & Upgrade)', async () => {
    // Step 1: Initial State
    // Professional v1 (₹149,999/mo, 10 projects, 15 seats)
    const proPlan = await planService.getPlan('PROFESSIONAL');
    assert.ok(proPlan.publishedVersion);
    assert.equal(proPlan.publishedVersion.versionNumber, 1);
    assert.equal(Number(proPlan.publishedVersion.priceMonthly), 149999);
    assert.equal(proPlan.publishedVersion.maxProjects, 10);
    assert.equal(proPlan.publishedVersion.maxSeats, 15);

    // Create Tenant A and Tenant B on Professional v1
    await prisma.tenant.createMany({
      data: [
        { id: tenantAId, code: 'TENANT_A', name: 'Tenant A Infrastructure', planTier: 'PROFESSIONAL', status: 'ACTIVE' },
        { id: tenantBId, code: 'TENANT_B', name: 'Tenant B Infra Builders', planTier: 'PROFESSIONAL', status: 'ACTIVE' },
      ],
    });

    await entitlementService.provisionDefaultSubscription(tenantAId, 'PROFESSIONAL', 'MONTHLY');
    await entitlementService.provisionDefaultSubscription(tenantBId, 'PROFESSIONAL', 'MONTHLY');

    const subA1 = await entitlementService.getEffectiveSubscription(tenantAId);
    const subB1 = await entitlementService.getEffectiveSubscription(tenantBId);

    assert.equal(subA1.versionNumber, 1);
    assert.equal(subA1.versionStatus, 'PUBLISHED');
    assert.equal(subA1.quotas.activeProjects.max, 10);
    assert.equal(subA1.quotas.seats.max, 15);

    assert.equal(subB1.versionNumber, 1);
    assert.equal(subB1.versionStatus, 'PUBLISHED');
    assert.equal(subB1.quotas.activeProjects.max, 10);
    assert.equal(subB1.quotas.seats.max, 15);

    // Step 2: Owner saves Draft v2 with ₹179,999/mo, 20 projects, 25 seats
    const draftDto = {
      priceMonthly: 179999,
      priceAnnual: 1799990,
      maxProjects: 20,
      maxSeats: 25,
      maxStorageGb: 100,
      description: 'Expanded Professional Tier Rules',
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

    const draftReq = createSuperAdminRequest(draftDto, { id: proPlan.id });
    const draftRes = await controller.savePlanDraft(draftReq);
    assert.equal(draftRes.success, true);
    assert.ok(draftRes.data.draftVersion);
    assert.equal(draftRes.data.draftVersion.versionNumber, 2);
    assert.equal(draftRes.data.draftVersion.status, 'DRAFT');

    // Prove Tenant A and Tenant B are still on v1
    const subAAfterDraft = await entitlementService.getEffectiveSubscription(tenantAId);
    const subBAfterDraft = await entitlementService.getEffectiveSubscription(tenantBId);
    assert.equal(subAAfterDraft.versionNumber, 1);
    assert.equal(subAAfterDraft.quotas.activeProjects.max, 10);
    assert.equal(subBAfterDraft.versionNumber, 1);
    assert.equal(subBAfterDraft.quotas.activeProjects.max, 10);

    // Step 3: Owner clicks Publish
    const publishReq = createSuperAdminRequest(undefined, { id: proPlan.id });
    const publishRes = await controller.publishPlan(publishReq);
    assert.equal(publishRes.success, true);
    assert.equal(publishRes.data.publishedVersion?.versionNumber, 2);
    assert.equal(publishRes.data.publishedVersion?.status, 'PUBLISHED');
    assert.equal(publishRes.data.draftVersion, null);

    // Prove Tenant A and Tenant B remain pinned to v1 (now ARCHIVED)
    const subAAfterPublish = await entitlementService.getEffectiveSubscription(tenantAId);
    const subBAfterPublish = await entitlementService.getEffectiveSubscription(tenantBId);
    assert.equal(subAAfterPublish.versionNumber, 1);
    assert.equal(subAAfterPublish.versionStatus, 'ARCHIVED');
    assert.equal(subAAfterPublish.quotas.activeProjects.max, 10);
    assert.equal(subAAfterPublish.quotas.seats.max, 15);

    assert.equal(subBAfterPublish.versionNumber, 1);
    assert.equal(subBAfterPublish.versionStatus, 'ARCHIVED');
    assert.equal(subBAfterPublish.quotas.activeProjects.max, 10);
    assert.equal(subBAfterPublish.quotas.seats.max, 15);

    // Prove New Tenant receives v2 (PUBLISHED)
    await prisma.tenant.create({
      data: {
        id: tenantNewId,
        code: 'TENANT_NEW',
        name: 'New Tenant Enterprise EPC',
        planTier: 'PROFESSIONAL',
        status: 'ACTIVE',
      },
    });
    await entitlementService.provisionDefaultSubscription(tenantNewId, 'PROFESSIONAL', 'MONTHLY');
    const subNew = await entitlementService.getEffectiveSubscription(tenantNewId);
    assert.equal(subNew.versionNumber, 2);
    assert.equal(subNew.versionStatus, 'PUBLISHED');
    assert.equal(subNew.quotas.activeProjects.max, 20); // v2 quota
    assert.equal(subNew.quotas.seats.max, 25);         // v2 quota

    // Step 4: Super Admin explicitly upgrades Tenant A to current Professional version
    const upgradeReq = createSuperAdminRequest({ planCode: 'PROFESSIONAL' }, { tenantId: tenantAId });
    const upgradeRes = await controller.changePlan(upgradeReq);
    assert.equal(upgradeRes.success, true);
    assert.equal(upgradeRes.data.versionNumber, 2);
    assert.equal(upgradeRes.data.versionStatus, 'PUBLISHED');
    assert.equal(upgradeRes.data.quotas.activeProjects.max, 20);

    // Prove Tenant B is STILL on v1 (ARCHIVED)
    const subBFinal = await entitlementService.getEffectiveSubscription(tenantBId);
    assert.equal(subBFinal.versionNumber, 1);
    assert.equal(subBFinal.versionStatus, 'ARCHIVED');
    assert.equal(subBFinal.quotas.activeProjects.max, 10);
    assert.equal(subBFinal.quotas.seats.max, 15);
  });

  it('Section 31: Seeder Safety Proof (Owner Custom Price = 179999 Survives Re-seeding)', async () => {
    // 1. Read current published version for Professional (should be v2 at 179999 from previous test)
    const proBefore = await planService.getPlan('PROFESSIONAL');
    assert.ok(proBefore.publishedVersion);
    const publishedVersionNumber = proBefore.publishedVersion.versionNumber;
    const customPrice = Number(proBefore.publishedVersion.priceMonthly);
    assert.equal(customPrice, 179999);

    // 2. Re-run seed process multiple times
    await seeder.seedPlans();
    await seeder.seedAll();

    // 3. Read Professional published version after re-seeding
    const proAfter = await planService.getPlan('PROFESSIONAL');
    assert.ok(proAfter.publishedVersion);
    assert.equal(proAfter.publishedVersion.versionNumber, publishedVersionNumber);
    assert.equal(Number(proAfter.publishedVersion.priceMonthly), 179999, 'Custom Owner price of 179999 MUST remain intact and not revert to 149999');
    assert.equal(proAfter.publishedVersion.maxProjects, 20, 'Custom Owner maxProjects of 20 MUST remain intact and not revert to 10');
  });
});
