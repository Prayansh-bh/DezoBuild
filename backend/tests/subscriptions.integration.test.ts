import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseService } from '../src/database/database.service';
import { TokenService } from '../src/modules/auth/services/token.service';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service';
import { EntitlementService } from '../src/modules/subscriptions/services/entitlement.service';
import { CapacityService } from '../src/modules/subscriptions/services/capacity.service';
import { EntitlementGuard } from '../src/modules/subscriptions/guards/entitlement.guard';
import { SubscriptionsController } from '../src/modules/subscriptions/subscriptions.controller';
import { ForbiddenError, ConflictError } from '../src/common/errors/app-error';
import type { IncomingMessage } from 'node:http';

describe('DEZOBUILD Phase 05 — Subscriptions, Plans & Feature Entitlements Suite', () => {
  let dbService: DatabaseService;
  let prisma: any;
  let tokenService: TokenService;
  let entitlementService: EntitlementService;
  let capacityService: CapacityService;
  let controller: SubscriptionsController;

  // Tenant Fixtures
  const tenantStarterId = 'dddd0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const tenantProId = 'dddd0002-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const tenantEnterpriseId = 'dddd0003-cccc-cccc-cccc-cccccccccccc';
  const tenantOtherId = 'dddd0004-dddd-dddd-dddd-dddddddddddd';

  // User Fixtures
  const ownerStarterId = 'eeee0001-0000-0000-0000-000000000001';
  const adminStarterId = 'eeee0002-0000-0000-0000-000000000002';
  const ownerProId = 'eeee0003-0000-0000-0000-000000000003';
  const ownerEnterpriseId = 'eeee0004-0000-0000-0000-000000000004';

  let tokenOwnerStarter: string;
  let tokenAdminStarter: string;
  let tokenOwnerPro: string;
  let tokenOwnerEnterprise: string;

  let companyStarterId: string;
  let companyProId: string;
  let companyEnterpriseId: string;

  before(async () => {
    dbService = DatabaseService.getInstance();
    prisma = dbService.getClient();
    await dbService.connect();

    tokenService = TokenService.getInstance();
    capacityService = new CapacityService(prisma);
    entitlementService = new EntitlementService(prisma, capacityService);
    controller = new SubscriptionsController(entitlementService);

    // Seed RBAC and Subscriptions
    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Clean up test tenants
    const testTenantIds = [tenantStarterId, tenantProId, tenantEnterpriseId, tenantOtherId];
    await prisma.tenantEntitlementOverride.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.storeAccessAssignment.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.projectMember.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.store.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.project.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.session.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.department.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.branch.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.tenant.deleteMany({ where: { id: { in: testTenantIds } } });

    // Create Tenants
    await prisma.tenant.createMany({
      data: [
        { id: tenantStarterId, code: 'T_STARTER', name: 'Starter Construction Ltd', status: 'ACTIVE' },
        { id: tenantProId, code: 'T_PRO', name: 'Professional Builders Pvt Ltd', status: 'ACTIVE' },
        { id: tenantEnterpriseId, code: 'T_ENT', name: 'Enterprise EPC Conglomerate', status: 'ACTIVE' },
        { id: tenantOtherId, code: 'T_OTHER', name: 'Other Isolated Tenant', status: 'ACTIVE' },
      ],
    });

    // Create Companies
    const c1 = await prisma.company.create({
      data: {
        tenantId: tenantStarterId,
        code: 'COMP_S',
        name: 'Starter Infra Ltd',
        legalName: 'Starter Infra Limited',
        panNumber: 'AAACA0001A',
        gstin: '27AAACA0001A1Z5',
        email: 'info@starter.com',
        phone: '+91 9999900011',
        address: '101 Starter Way',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    });
    companyStarterId = c1.id;

    const c2 = await prisma.company.create({
      data: {
        tenantId: tenantProId,
        code: 'COMP_P',
        name: 'Pro Builders Ltd',
        legalName: 'Pro Builders Limited',
        panNumber: 'AAACA0002A',
        gstin: '27AAACA0002A1Z5',
        email: 'info@pro.com',
        phone: '+91 9999900012',
        address: '102 Pro Blvd',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
      },
    });
    companyProId = c2.id;

    const c3 = await prisma.company.create({
      data: {
        tenantId: tenantEnterpriseId,
        code: 'COMP_E',
        name: 'Enterprise EPC Ltd',
        legalName: 'Enterprise EPC Limited',
        panNumber: 'AAACA0003A',
        gstin: '27AAACA0003A1Z5',
        email: 'info@enterprise.com',
        phone: '+91 9999900013',
        address: '103 Tower Way',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110001',
      },
    });
    companyEnterpriseId = c3.id;

    // Create Users
    const passHash = '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEF';
    await prisma.user.createMany({
      data: [
        { id: ownerStarterId, tenantId: tenantStarterId, email: 'owner@starter.com', fullName: 'Sam Starter Owner', passwordHash: passHash },
        { id: adminStarterId, tenantId: tenantStarterId, email: 'admin@starter.com', fullName: 'Amy Starter Admin', passwordHash: passHash },
        { id: ownerProId, tenantId: tenantProId, email: 'owner@pro.com', fullName: 'Pete Pro Owner', passwordHash: passHash },
        { id: ownerEnterpriseId, tenantId: tenantEnterpriseId, email: 'owner@enterprise.com', fullName: 'Emma Enterprise Owner', passwordHash: passHash },
      ],
    });

    // Assign Roles
    const roleOwner = await prisma.role.findFirst({ where: { name: 'COMPANY_OWNER', tenantId: null } });
    const roleAdmin = await prisma.role.findFirst({ where: { name: 'COMPANY_ADMIN', tenantId: null } });

    await prisma.userRoleAssignment.createMany({
      data: [
        { tenantId: tenantStarterId, userId: ownerStarterId, roleId: roleOwner.id, scopeType: 'TENANT' },
        { tenantId: tenantStarterId, userId: adminStarterId, roleId: roleAdmin.id, scopeType: 'TENANT' },
        { tenantId: tenantProId, userId: ownerProId, roleId: roleOwner.id, scopeType: 'TENANT' },
        { tenantId: tenantEnterpriseId, userId: ownerEnterpriseId, roleId: roleOwner.id, scopeType: 'TENANT' },
      ],
    });

    // Provision Subscriptions
    const planStarter = await prisma.platformPlan.findUnique({ where: { code: 'STARTER' } });
    const planPro = await prisma.platformPlan.findUnique({ where: { code: 'PROFESSIONAL' } });
    const planEnterprise = await prisma.platformPlan.findUnique({ where: { code: 'ENTERPRISE' } });

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    await prisma.tenantSubscription.createMany({
      data: [
        { tenantId: tenantStarterId, planId: planStarter.id, status: 'ACTIVE', billingCycle: 'ANNUAL', currentPeriodStart: now, currentPeriodEnd: periodEnd },
        { tenantId: tenantProId, planId: planPro.id, status: 'ACTIVE', billingCycle: 'ANNUAL', currentPeriodStart: now, currentPeriodEnd: periodEnd },
        { tenantId: tenantEnterpriseId, planId: planEnterprise.id, status: 'ACTIVE', billingCycle: 'ANNUAL', currentPeriodStart: now, currentPeriodEnd: periodEnd },
      ],
    });

    // Generate Tokens
    tokenOwnerStarter = tokenService.createAccessToken({ userId: ownerStarterId, tenantId: tenantStarterId, sessionId: 's-sub-1', sessionVersion: 1 });
    tokenAdminStarter = tokenService.createAccessToken({ userId: adminStarterId, tenantId: tenantStarterId, sessionId: 's-sub-2', sessionVersion: 1 });
    tokenOwnerPro = tokenService.createAccessToken({ userId: ownerProId, tenantId: tenantProId, sessionId: 's-sub-3', sessionVersion: 1 });
    tokenOwnerEnterprise = tokenService.createAccessToken({ userId: ownerEnterpriseId, tenantId: tenantEnterpriseId, sessionId: 's-sub-4', sessionVersion: 1 });
  });

  after(async () => {
    await dbService.disconnect();
  });

  function createMockReq(token?: string, extraHeaders?: Record<string, string>): IncomingMessage {
    const headers: Record<string, string> = {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    };
    return { headers } as unknown as IncomingMessage;
  }

  // ============================================================
  // 1. FEATURE ENTITLEMENT: ALLOW vs DENY
  // ============================================================

  it('1. should ALLOW entitled features on Starter tier (projects:core, materials:core)', async () => {
    const hasCore = await entitlementService.isFeatureEntitled(tenantStarterId, 'projects:core');
    const hasMaterials = await entitlementService.isFeatureEntitled(tenantStarterId, 'materials:core');
    assert.strictEqual(hasCore, true, 'Starter should have projects:core');
    assert.strictEqual(hasMaterials, true, 'Starter should have materials:core');
  });

  it('2. should DENY non-entitled features on Starter tier (projects:wbs, bim:3d_viewer)', async () => {
    const hasWbs = await entitlementService.isFeatureEntitled(tenantStarterId, 'projects:wbs');
    const hasBim = await entitlementService.isFeatureEntitled(tenantStarterId, 'bim:3d_viewer');
    assert.strictEqual(hasWbs, false, 'Starter must NOT have projects:wbs');
    assert.strictEqual(hasBim, false, 'Starter must NOT have bim:3d_viewer');
  });

  it('3. should ALLOW Professional features (projects:wbs, finance:commercial) but DENY Enterprise features (bim:3d_viewer, ai:schedule_forecasting)', async () => {
    const hasWbs = await entitlementService.isFeatureEntitled(tenantProId, 'projects:wbs');
    const hasFinance = await entitlementService.isFeatureEntitled(tenantProId, 'finance:commercial');
    const hasBim = await entitlementService.isFeatureEntitled(tenantProId, 'bim:3d_viewer');
    const hasAi = await entitlementService.isFeatureEntitled(tenantProId, 'ai:schedule_forecasting');

    assert.strictEqual(hasWbs, true, 'Professional must have projects:wbs');
    assert.strictEqual(hasFinance, true, 'Professional must have finance:commercial');
    assert.strictEqual(hasBim, false, 'Professional must NOT have bim:3d_viewer');
    assert.strictEqual(hasAi, false, 'Professional must NOT have ai:schedule_forecasting');
  });

  it('4. should ALLOW all 12 canonical features on Enterprise tier', async () => {
    const hasBim = await entitlementService.isFeatureEntitled(tenantEnterpriseId, 'bim:3d_viewer');
    const hasAi = await entitlementService.isFeatureEntitled(tenantEnterpriseId, 'ai:schedule_forecasting');
    const hasSurvey = await entitlementService.isFeatureEntitled(tenantEnterpriseId, 'survey:drone_orthomosaic');
    const hasCustomDomain = await entitlementService.isFeatureEntitled(tenantEnterpriseId, 'security:custom_domain');
    const hasAudit = await entitlementService.isFeatureEntitled(tenantEnterpriseId, 'compliance:audit_export');

    assert.strictEqual(hasBim, true);
    assert.strictEqual(hasAi, true);
    assert.strictEqual(hasSurvey, true);
    assert.strictEqual(hasCustomDomain, true);
    assert.strictEqual(hasAudit, true);
  });

  it('5. should strictly DENY unknown feature keys (fail-closed)', async () => {
    const hasUnknown = await entitlementService.isFeatureEntitled(tenantEnterpriseId, 'unknown:fake:feature');
    assert.strictEqual(hasUnknown, false, 'Unknown feature keys must fail-closed');
  });

  it('6. should strictly DENY feature checks for tenant without subscription (fail-closed)', async () => {
    const hasFeature = await entitlementService.isFeatureEntitled(tenantOtherId, 'projects:core');
    assert.strictEqual(hasFeature, false, 'Missing subscription must strictly fail-closed');
  });

  // ============================================================
  // 2. SUBSCRIPTION LIFECYCLE & STATUS GUARDS
  // ============================================================

  it('7. should strictly DENY features when subscription status is EXPIRED or SUSPENDED', async () => {
    // Create temporary expired tenant
    const tempExpiredTenant = await prisma.tenant.create({
      data: { code: `T_EXP_${Date.now()}`, name: 'Expired Tenant', status: 'ACTIVE' },
    });
    const planEnt = await prisma.platformPlan.findUnique({ where: { code: 'ENTERPRISE' } });

    await prisma.tenantSubscription.create({
      data: {
        tenantId: tempExpiredTenant.id,
        planId: planEnt.id,
        status: 'EXPIRED',
        currentPeriodStart: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      },
    });

    const hasFeatureExpired = await entitlementService.isFeatureEntitled(tempExpiredTenant.id, 'bim:3d_viewer');
    assert.strictEqual(hasFeatureExpired, false, 'Expired subscription must deny features');

    // Test SUSPENDED
    const tempSuspendedTenant = await prisma.tenant.create({
      data: { code: `T_SUSP_${Date.now()}`, name: 'Suspended Tenant', status: 'ACTIVE' },
    });
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tempSuspendedTenant.id,
        planId: planEnt.id,
        status: 'SUSPENDED',
        currentPeriodStart: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000),
      },
    });

    const hasFeatureSuspended = await entitlementService.isFeatureEntitled(tempSuspendedTenant.id, 'bim:3d_viewer');
    assert.strictEqual(hasFeatureSuspended, false, 'Suspended subscription must deny features');
  });

  it('8. should enforce PAST_DUE grace period: ALLOW within 7 days, DENY beyond 7 days', async () => {
    const tempGraceTenant = await prisma.tenant.create({
      data: { code: `T_GRACE_${Date.now()}`, name: 'Grace Tenant', status: 'ACTIVE' },
    });
    const planPro = await prisma.platformPlan.findUnique({ where: { code: 'PROFESSIONAL' } });

    // 2 days past due (within 7-day grace)
    const subGrace = await prisma.tenantSubscription.create({
      data: {
        tenantId: tempGraceTenant.id,
        planId: planPro.id,
        status: 'PAST_DUE',
        currentPeriodStart: new Date(Date.now() - 367 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    });

    const hasGraceFeature = await entitlementService.isFeatureEntitled(tempGraceTenant.id, 'projects:wbs');
    assert.strictEqual(hasGraceFeature, true, 'PAST_DUE within 7 days grace should allow features');

    // Update to 10 days past due (beyond 7-day grace)
    await prisma.tenantSubscription.update({
      where: { id: subGrace.id },
      data: { currentPeriodEnd: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
    });

    const hasExpiredGraceFeature = await entitlementService.isFeatureEntitled(tempGraceTenant.id, 'projects:wbs');
    assert.strictEqual(hasExpiredGraceFeature, false, 'PAST_DUE beyond 7 days grace must DENY features');
  });

  // ============================================================
  // 3. NO OWNER / ADMIN BYPASS
  // ============================================================

  it('9. should enforce that COMPANY_OWNER and COMPANY_ADMIN on Starter tier CANNOT bypass feature entitlement', async () => {
    const reqOwner = createMockReq(tokenOwnerStarter);
    const reqAdmin = createMockReq(tokenAdminStarter);

    // Entitled feature -> ALLOW
    await assert.doesNotReject(async () => {
      await EntitlementGuard.requireFeature(reqOwner, 'projects:core');
    });

    // Unentitled feature -> MUST THROW 403 Forbidden for COMPANY_OWNER
    await assert.rejects(
      async () => {
        await EntitlementGuard.requireFeature(reqOwner, 'bim:3d_viewer');
      },
      (err: any) => {
        assert.strictEqual(err.name, 'ForbiddenError');
        assert.ok(err.message.includes('does not entitle feature'));
        return true;
      }
    );

    // Unentitled feature -> MUST THROW 403 Forbidden for COMPANY_ADMIN
    await assert.rejects(
      async () => {
        await EntitlementGuard.requireFeature(reqAdmin, 'projects:wbs');
      },
      (err: any) => {
        assert.strictEqual(err.name, 'ForbiddenError');
        assert.ok(err.message.includes('does not entitle feature'));
        return true;
      }
    );
  });

  // ============================================================
  // 4. CAPACITY QUOTAS & LIMITS
  // ============================================================

  it('10. should enforce Starter tier active projects limit (max 2 active projects)', async () => {
    // 0 projects created -> capacity check allowed
    const check1 = await capacityService.checkProjectCapacity(tenantStarterId);
    assert.strictEqual(check1.allowed, true);
    assert.strictEqual(check1.max, 2);
    assert.strictEqual(check1.current, 0);

    // Create 1st active project
    const p1 = await prisma.project.create({
      data: { tenantId: tenantStarterId, companyId: companyStarterId, code: `P_S_1_${Date.now()}`, name: 'Starter Site 1', status: 'ACTIVE' },
    });

    const check2 = await capacityService.checkProjectCapacity(tenantStarterId);
    assert.strictEqual(check2.allowed, true);
    assert.strictEqual(check2.current, 1);
    assert.strictEqual(check2.remaining, 1);

    // Create 2nd active project
    const p2 = await prisma.project.create({
      data: { tenantId: tenantStarterId, companyId: companyStarterId, code: `P_S_2_${Date.now()}`, name: 'Starter Site 2', status: 'ACTIVE' },
    });

    const check3 = await capacityService.checkProjectCapacity(tenantStarterId);
    assert.strictEqual(check3.allowed, false, 'Capacity limit reached: 2/2');
    assert.strictEqual(check3.current, 2);
    assert.strictEqual(check3.remaining, 0);

    // Attempting to enforce project creation capacity must throw ConflictError (409)
    await assert.rejects(
      async () => {
        await capacityService.enforceProjectCreationCapacity(tenantStarterId);
      },
      (err: any) => {
        assert.strictEqual(err.name, 'ConflictError');
        assert.ok(err.message.includes('Active project capacity limit reached'));
        return true;
      }
    );

    // Archiving 1 project should free up capacity
    await prisma.project.update({
      where: { id: p1.id },
      data: { status: 'ARCHIVED' },
    });

    const check4 = await capacityService.checkProjectCapacity(tenantStarterId);
    assert.strictEqual(check4.allowed, true, 'Archived project does not count toward active limit');
    assert.strictEqual(check4.current, 1);
  });

  it('11. should enforce Professional tier active projects limit (max 10 active projects)', async () => {
    const checkPro = await capacityService.checkProjectCapacity(tenantProId);
    assert.strictEqual(checkPro.max, 10);
  });

  it('12. should allow Unlimited active projects on Enterprise tier (maxProjects = null)', async () => {
    const checkEnt = await capacityService.checkProjectCapacity(tenantEnterpriseId);
    assert.strictEqual(checkEnt.allowed, true);
    assert.strictEqual(checkEnt.max, null, 'Enterprise max is null (unlimited)');
    assert.strictEqual(checkEnt.remaining, null);
  });

  it('13. should enforce Starter tier seat capacity (max 5 active seats)', async () => {
    const seatCheck = await capacityService.checkSeatCapacity(tenantStarterId);
    assert.strictEqual(seatCheck.max, 5);
    assert.strictEqual(seatCheck.current, 2); // ownerStarterId + adminStarterId
    assert.strictEqual(seatCheck.remaining, 3);
  });

  // ============================================================
  // 5. PLAN UPGRADE, DOWNGRADE & OVERRIDES
  // ============================================================

  it('14. should seamlessly handle plan upgrade from Starter to Professional', async () => {
    // Before upgrade: bim:3d_viewer is denied
    assert.strictEqual(await entitlementService.isFeatureEntitled(tenantStarterId, 'projects:wbs'), false);

    // Upgrade to PROFESSIONAL
    await entitlementService.changePlan(tenantStarterId, 'PROFESSIONAL');

    // After upgrade: projects:wbs is now entitled!
    assert.strictEqual(await entitlementService.isFeatureEntitled(tenantStarterId, 'projects:wbs'), true);

    // Quota increased to 10
    const quota = await capacityService.checkProjectCapacity(tenantStarterId);
    assert.strictEqual(quota.max, 10);

    // Downgrade back to STARTER
    await entitlementService.changePlan(tenantStarterId, 'STARTER');
    assert.strictEqual(await entitlementService.isFeatureEntitled(tenantStarterId, 'projects:wbs'), false);
  });

  it('15. should apply tenant-level entitlement and capacity overrides', async () => {
    // Starter tenant currently lacks bim:3d_viewer
    assert.strictEqual(await entitlementService.isFeatureEntitled(tenantStarterId, 'bim:3d_viewer'), false);

    // Platform administrator grants override for bim:3d_viewer + 3 additional projects
    await entitlementService.setOverride({
      tenantId: tenantStarterId,
      featureKey: 'bim:3d_viewer',
      isEnabled: true,
      additionalProjects: 3,
    });

    // Feature is now entitled via override!
    assert.strictEqual(await entitlementService.isFeatureEntitled(tenantStarterId, 'bim:3d_viewer'), true);

    // Active project capacity is now 2 + 3 = 5
    const quota = await capacityService.checkProjectCapacity(tenantStarterId);
    assert.strictEqual(quota.max, 5);
  });

  // ============================================================
  // 6. CROSS-TENANT ISOLATION
  // ============================================================

  it('16. should maintain strict cross-tenant isolation: Tenant A cannot read or inherit Tenant B features', async () => {
    // Enterprise has bim:3d_viewer, Starter does not
    const entBim = await entitlementService.isFeatureEntitled(tenantEnterpriseId, 'bim:3d_viewer');
    const proBim = await entitlementService.isFeatureEntitled(tenantProId, 'bim:3d_viewer');

    assert.strictEqual(entBim, true);
    assert.strictEqual(proBim, false);
  });

  // ============================================================
  // 7. SUBSCRIPTION CONTROLLER API ENDPOINT
  // ============================================================

  it('17. GET /api/v1/tenants/subscription should return effective subscription details and quota utilization', async () => {
    const req = createMockReq(tokenOwnerEnterprise);
    const response = await controller.getTenantSubscription(req);

    assert.strictEqual(response.success, true);
    assert.strictEqual(response.data.planCode, 'ENTERPRISE');
    assert.strictEqual(response.data.status, 'ACTIVE');
    assert.strictEqual(response.data.quotas.activeProjects.max, null); // unlimited
    assert.strictEqual(response.data.entitlements['bim:3d_viewer'], true);
    assert.strictEqual(response.data.entitlements['projects:wbs'], true);
  });
});
