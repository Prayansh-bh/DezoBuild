import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseService } from '../src/database/database.service';
import { TokenService } from '../src/modules/auth/services/token.service';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service';
import { EntitlementService } from '../src/modules/subscriptions/services/entitlement.service';
import { WorkspaceModuleService } from '../src/modules/subscriptions/services/workspace-module.service';
import { EntitlementGuard } from '../src/modules/subscriptions/guards/entitlement.guard';
import { SubscriptionsController } from '../src/modules/subscriptions/subscriptions.controller';
import {
  ForbiddenError,
  FeatureNotEntitledError,
  FeatureDisabledError,
  BadRequestError,
} from '../src/common/errors/app-error';
import type { IncomingMessage } from 'node:http';

describe('DEZOBUILD Tier 2 — Tenant Workspace Module Activation Integration Suite', () => {
  let dbService: DatabaseService;
  let prisma: any;
  let tokenService: TokenService;
  let entitlementService: EntitlementService;
  let workspaceModuleService: WorkspaceModuleService;
  let controller: SubscriptionsController;

  // Tenant Fixtures
  const tenantAlphaId = 'aaaa1111-0000-0000-0000-aaaaaaaaaaaa';
  const tenantBetaId = 'bbbb2222-0000-0000-0000-bbbbbbbbbbbb';

  // User Fixtures (Tenant Alpha)
  const ownerAlphaId = '11110001-0000-0000-0000-000000000001';
  const adminAlphaId = '11110002-0000-0000-0000-000000000002';
  const employeeAlphaId = '11110003-0000-0000-0000-000000000003';
  const viewerAlphaId = '11110004-0000-0000-0000-000000000004';

  // User Fixtures (Tenant Beta)
  const ownerBetaId = '22220001-0000-0000-0000-000000000001';

  let tokenOwnerAlpha: string;
  let tokenAdminAlpha: string;
  let tokenEmployeeAlpha: string;
  let tokenViewerAlpha: string;
  let tokenOwnerBeta: string;

  before(async () => {
    dbService = DatabaseService.getInstance();
    prisma = dbService.getClient();
    await dbService.connect();

    tokenService = TokenService.getInstance();
    entitlementService = new EntitlementService(prisma);
    workspaceModuleService = new WorkspaceModuleService(prisma, entitlementService);
    EntitlementGuard.setEntitlementService(entitlementService);
    EntitlementGuard.setWorkspaceModuleService(workspaceModuleService);
    controller = new SubscriptionsController(entitlementService, workspaceModuleService, prisma);

    // Seed RBAC and Subscriptions
    const rbacSeeder = new RbacSeederService(prisma);
    await rbacSeeder.seedAll();

    const subSeeder = new SubscriptionSeederService(prisma);
    await subSeeder.seedAll();

    // Clean up test tenants
    const testTenantIds = [tenantAlphaId, tenantBetaId];
    await prisma.tenantWorkspaceModule.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.tenantEntitlementOverride.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.session.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.tenant.deleteMany({ where: { id: { in: testTenantIds } } });

    // 1. Create Tenant Alpha (STARTER Tier)
    await prisma.tenant.create({
      data: {
        id: tenantAlphaId,
        code: 'TENANT_ALPHA',
        name: 'Alpha Infra Developers',
        status: 'ACTIVE',
        planTier: 'STARTER',
      },
    });

    // 2. Create Tenant Beta (ENTERPRISE Tier)
    await prisma.tenant.create({
      data: {
        id: tenantBetaId,
        code: 'TENANT_BETA',
        name: 'Beta Global Conglomerate',
        status: 'ACTIVE',
        planTier: 'ENTERPRISE',
      },
    });

    // Provision Subscriptions
    await entitlementService.provisionDefaultSubscription(tenantAlphaId, 'STARTER');
    await entitlementService.provisionDefaultSubscription(tenantBetaId, 'ENTERPRISE');

    // Create Company Records
    await prisma.company.createMany({
      data: [
        {
          id: 'cccc1111-0000-0000-0000-000000000001',
          tenantId: tenantAlphaId,
          code: 'ALPHA_CO',
          name: 'Alpha Infra Ltd',
          legalName: 'Alpha Infrastructure Ltd',
          gstin: '29AAAAA0000A1Z5',
          panNumber: 'AAAAA0000A',
          email: 'admin@alphainfra.com',
          phone: '+919876543210',
          address: 'Alpha Tower',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560001',
        },
        {
          id: 'cccc2222-0000-0000-0000-000000000001',
          tenantId: tenantBetaId,
          code: 'BETA_CO',
          name: 'Beta Global Ltd',
          legalName: 'Beta Global Enterprises Ltd',
          gstin: '27BBBBB0000B1Z5',
          panNumber: 'BBBBB0000B',
          email: 'admin@betaglobal.com',
          phone: '+919876543211',
          address: 'Beta Tower',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        },
      ],
    });

    // Create Users for Tenant Alpha
    await prisma.user.createMany({
      data: [
        {
          id: ownerAlphaId,
          tenantId: tenantAlphaId,
          email: 'owner@alphainfra.com',
          fullName: 'Alpha Owner',
          passwordHash: 'hash',
          status: 'ACTIVE',
        },
        {
          id: adminAlphaId,
          tenantId: tenantAlphaId,
          email: 'admin@alphainfra.com',
          fullName: 'Alpha Admin',
          passwordHash: 'hash',
          status: 'ACTIVE',
        },
        {
          id: employeeAlphaId,
          tenantId: tenantAlphaId,
          email: 'engineer@alphainfra.com',
          fullName: 'Alpha Site Engineer',
          passwordHash: 'hash',
          status: 'ACTIVE',
        },
        {
          id: viewerAlphaId,
          tenantId: tenantAlphaId,
          email: 'viewer@alphainfra.com',
          fullName: 'Alpha Viewer',
          passwordHash: 'hash',
          status: 'ACTIVE',
        },
      ],
    });

    // Create User for Tenant Beta
    await prisma.user.create({
      data: {
        id: ownerBetaId,
        tenantId: tenantBetaId,
        email: 'owner@betaglobal.com',
        fullName: 'Beta Owner',
        passwordHash: 'hash',
        status: 'ACTIVE',
      },
    });

    // Assign Roles
    const roles = await prisma.role.findMany();
    const roleMap = new Map(roles.map((r: any) => [r.name, r.id]));

    await prisma.userRoleAssignment.createMany({
      data: [
        {
          id: 'aaaa0001-0000-0000-0000-000000000001',
          tenantId: tenantAlphaId,
          userId: ownerAlphaId,
          roleId: roleMap.get('COMPANY_OWNER')!,
        },
        {
          id: 'aaaa0002-0000-0000-0000-000000000002',
          tenantId: tenantAlphaId,
          userId: adminAlphaId,
          roleId: roleMap.get('COMPANY_ADMIN')!,
        },
        {
          id: 'aaaa0003-0000-0000-0000-000000000003',
          tenantId: tenantAlphaId,
          userId: employeeAlphaId,
          roleId: roleMap.get('SITE_ENGINEER')!,
        },
        {
          id: 'aaaa0004-0000-0000-0000-000000000004',
          tenantId: tenantAlphaId,
          userId: viewerAlphaId,
          roleId: roleMap.get('VIEWER')!,
        },
        {
          id: 'bbbb0001-0000-0000-0000-000000000001',
          tenantId: tenantBetaId,
          userId: ownerBetaId,
          roleId: roleMap.get('COMPANY_OWNER')!,
        },
      ],
    });

    // Generate JWTs
    tokenOwnerAlpha = tokenService.createAccessToken({
      userId: ownerAlphaId,
      tenantId: tenantAlphaId,
      sessionId: 'sess-alpha-owner',
      sessionVersion: 1,
    });

    tokenAdminAlpha = tokenService.createAccessToken({
      userId: adminAlphaId,
      tenantId: tenantAlphaId,
      sessionId: 'sess-alpha-admin',
      sessionVersion: 1,
    });

    tokenEmployeeAlpha = tokenService.createAccessToken({
      userId: employeeAlphaId,
      tenantId: tenantAlphaId,
      sessionId: 'sess-alpha-emp',
      sessionVersion: 1,
    });

    tokenViewerAlpha = tokenService.createAccessToken({
      userId: viewerAlphaId,
      tenantId: tenantAlphaId,
      sessionId: 'sess-alpha-view',
      sessionVersion: 1,
    });

    tokenOwnerBeta = tokenService.createAccessToken({
      userId: ownerBetaId,
      tenantId: tenantBetaId,
      sessionId: 'sess-beta-owner',
      sessionVersion: 1,
    });
  });

  after(async () => {
    const testTenantIds = [tenantAlphaId, tenantBetaId];
    await prisma.tenantWorkspaceModule.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.tenantEntitlementOverride.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.session.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: testTenantIds } } });
    await prisma.tenant.deleteMany({ where: { id: { in: testTenantIds } } });
  });

  const makeReq = (token: string, body?: unknown): IncomingMessage => {
    return {
      headers: {
        authorization: `Bearer ${token}`,
      },
      body,
    } as any;
  };

  // ============================================================
  // SCENARIO 1 & 4: Default Lazy Semantics (No Workspace Row)
  // ============================================================

  it('1. should resolve an entitled feature as ACTIVE when no workspace row exists (lazy default)', async () => {
    // projects:core is entitled on STARTER
    const isEntitled = await entitlementService.isFeatureEntitled(tenantAlphaId, 'projects:core');
    const isEnabled = await workspaceModuleService.isWorkspaceModuleEnabled(tenantAlphaId, 'projects:core');
    const isActive = await entitlementService.isFeatureActive(tenantAlphaId, 'projects:core');

    assert.strictEqual(isEntitled, true, 'Starter must entitle projects:core');
    assert.strictEqual(isEnabled, true, 'Default workspace state must be enabled');
    assert.strictEqual(isActive, true, 'Effective state must be active');
  });

  it('4. should resolve an unentitled feature as INACTIVE even with no workspace row', async () => {
    // bim:3d_viewer is NOT entitled on STARTER
    const isEntitled = await entitlementService.isFeatureEntitled(tenantAlphaId, 'bim:3d_viewer');
    const isActive = await entitlementService.isFeatureActive(tenantAlphaId, 'bim:3d_viewer');

    assert.strictEqual(isEntitled, false, 'Starter must NOT entitle bim:3d_viewer');
    assert.strictEqual(isActive, false, 'Unentitled feature must be effectively inactive');
  });

  // ============================================================
  // SCENARIO 2 & 3: Explicit Workspace Activation / Deactivation
  // ============================================================

  it('2 & 3. should allow Company Owner to disable and re-enable an entitled feature in workspace', async () => {
    // Disable projects:core for Tenant Alpha
    const reqDisable = makeReq(tokenOwnerAlpha, {
      featureKey: 'projects:core',
      isEnabled: false,
    });
    const resDisable = await controller.updateWorkspaceModule(reqDisable);
    assert.strictEqual(resDisable.success, true);
    assert.strictEqual(resDisable.data.workspaceEnabled, false);
    assert.strictEqual(resDisable.data.effectiveActive, false);

    // Verify in service
    const isNowActive = await entitlementService.isFeatureActive(tenantAlphaId, 'projects:core');
    assert.strictEqual(isNowActive, false, 'Feature must be effectively inactive when disabled');

    // Re-enable projects:core for Tenant Alpha
    const reqEnable = makeReq(tokenOwnerAlpha, {
      featureKey: 'projects:core',
      isEnabled: true,
    });
    const resEnable = await controller.updateWorkspaceModule(reqEnable);
    assert.strictEqual(resEnable.success, true);
    assert.strictEqual(resEnable.data.workspaceEnabled, true);
    assert.strictEqual(resEnable.data.effectiveActive, true);

    const isReactivated = await entitlementService.isFeatureActive(tenantAlphaId, 'projects:core');
    assert.strictEqual(isReactivated, true, 'Feature must be active after re-enabling');
  });

  // ============================================================
  // SCENARIO 5: Block Activation Outside Platform Entitlement
  // ============================================================

  it('5. should reject activation of an unentitled feature with 403 FEATURE_NOT_ENTITLED', async () => {
    // Tenant Alpha (Starter) attempts to enable bim:3d_viewer
    const req = makeReq(tokenOwnerAlpha, {
      featureKey: 'bim:3d_viewer',
      isEnabled: true,
    });

    await assert.rejects(
      async () => controller.updateWorkspaceModule(req),
      (err: any) => {
        assert.strictEqual(err.statusCode, 403);
        assert.strictEqual(err.errorCode, 'FEATURE_NOT_ENTITLED');
        return true;
      }
    );
  });

  // ============================================================
  // SCENARIOS 6, 7, 8, 9, 10: Role Authorization Checks
  // ============================================================

  it('8. should allow Company Admin to toggle an entitled workspace feature', async () => {
    const req = makeReq(tokenAdminAlpha, {
      featureKey: 'materials:core',
      isEnabled: false,
    });
    const res = await controller.updateWorkspaceModule(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.workspaceEnabled, false);

    // Restore to enabled
    await controller.updateWorkspaceModule(
      makeReq(tokenAdminAlpha, { featureKey: 'materials:core', isEnabled: true })
    );
  });

  it('9. should reject workspace module toggle by Employee with 403 FORBIDDEN', async () => {
    const req = makeReq(tokenEmployeeAlpha, {
      featureKey: 'projects:core',
      isEnabled: false,
    });

    await assert.rejects(
      async () => controller.updateWorkspaceModule(req),
      (err: any) => {
        assert.strictEqual(err.statusCode, 403);
        assert.strictEqual(err.errorCode, 'FORBIDDEN');
        return true;
      }
    );
  });

  it('10. should reject workspace module toggle by Viewer with 403 FORBIDDEN', async () => {
    const req = makeReq(tokenViewerAlpha, {
      featureKey: 'projects:core',
      isEnabled: false,
    });

    await assert.rejects(
      async () => controller.updateWorkspaceModule(req),
      (err: any) => {
        assert.strictEqual(err.statusCode, 403);
        assert.strictEqual(err.errorCode, 'FORBIDDEN');
        return true;
      }
    );
  });

  // ============================================================
  // SCENARIO 11: Cross-Tenant Isolation
  // ============================================================

  it('11. should enforce strict tenant isolation: Tenant A mutations cannot affect Tenant B', async () => {
    // Tenant Beta (Enterprise) has bim:3d_viewer enabled by default
    const betaInitial = await entitlementService.isFeatureActive(tenantBetaId, 'bim:3d_viewer');
    assert.strictEqual(betaInitial, true);

    // Tenant Beta disables bim:3d_viewer
    await controller.updateWorkspaceModule(
      makeReq(tokenOwnerBeta, { featureKey: 'bim:3d_viewer', isEnabled: false })
    );

    const betaAfter = await entitlementService.isFeatureActive(tenantBetaId, 'bim:3d_viewer');
    assert.strictEqual(betaAfter, false, 'Tenant Beta should have bim:3d_viewer disabled');

    // Tenant Alpha list modules should NOT see Beta state
    const alphaModules = await controller.getWorkspaceModules(makeReq(tokenOwnerAlpha));
    const alphaBim = alphaModules.data.find((m) => m.featureKey === 'bim:3d_viewer');
    assert.strictEqual(alphaBim?.platformEntitled, false);

    // Restore Beta
    await controller.updateWorkspaceModule(
      makeReq(tokenOwnerBeta, { featureKey: 'bim:3d_viewer', isEnabled: true })
    );
  });

  // ============================================================
  // SCENARIO 12: Unknown / Malformed Feature Keys Fail-Closed
  // ============================================================

  it('12. should reject unknown feature keys with 400 Bad Request', async () => {
    const req = makeReq(tokenOwnerAlpha, {
      featureKey: 'invalid:unknown_feature_key',
      isEnabled: true,
    });

    await assert.rejects(
      async () => controller.updateWorkspaceModule(req),
      (err: any) => {
        assert.strictEqual(err.statusCode, 422); // Validation error
        return true;
      }
    );

    const isUnknownActive = await entitlementService.isFeatureActive(
      tenantAlphaId,
      'invalid:unknown_feature_key'
    );
    assert.strictEqual(isUnknownActive, false, 'Unknown feature keys must fail-closed');
  });

  // ============================================================
  // SCENARIO 13: Platform Force-Disable Overrides Workspace Activation
  // ============================================================

  it('13. should ensure platform force-disable prevents workspace from making feature active', async () => {
    // Platform Super Admin force-disables projects:core on Starter tenant
    await entitlementService.setOverride({
      tenantId: tenantAlphaId,
      featureKey: 'projects:core',
      isEnabled: false,
    });

    // Platform entitlement is now false
    const isEntitled = await entitlementService.isFeatureEntitled(tenantAlphaId, 'projects:core');
    assert.strictEqual(isEntitled, false, 'Platform force-disable must override plan');

    // Effective active must be false
    const isActive = await entitlementService.isFeatureActive(tenantAlphaId, 'projects:core');
    assert.strictEqual(isActive, false, 'Feature must be inactive when platform force-disabled');

    // Workspace attempting to set enabled = true should be rejected by 403 FEATURE_NOT_ENTITLED
    const req = makeReq(tokenOwnerAlpha, {
      featureKey: 'projects:core',
      isEnabled: true,
    });

    await assert.rejects(
      async () => controller.updateWorkspaceModule(req),
      (err: any) => {
        assert.strictEqual(err.statusCode, 403);
        assert.strictEqual(err.errorCode, 'FEATURE_NOT_ENTITLED');
        return true;
      }
    );

    // Clean up override
    await prisma.tenantEntitlementOverride.deleteMany({
      where: { tenantId: tenantAlphaId, featureKey: 'projects:core' },
    });
  });

  // ============================================================
  // SCENARIOS 15 & 16: Guard Enforcement on Protected Endpoints
  // ============================================================

  it('15. should throw FeatureDisabledError (403 FEATURE_DISABLED) when protected endpoint is called with disabled workspace feature', async () => {
    // Disable projects:core for Tenant Alpha
    await controller.updateWorkspaceModule(
      makeReq(tokenOwnerAlpha, { featureKey: 'projects:core', isEnabled: false })
    );

    const req = makeReq(tokenOwnerAlpha);

    await assert.rejects(
      async () => EntitlementGuard.requireFeature(req, 'projects:core'),
      (err: any) => {
        assert.strictEqual(err.statusCode, 403);
        assert.strictEqual(err.errorCode, 'FEATURE_DISABLED');
        return true;
      }
    );

    // Restore
    await controller.updateWorkspaceModule(
      makeReq(tokenOwnerAlpha, { featureKey: 'projects:core', isEnabled: true })
    );
  });

  it('16. should allow protected endpoint when feature is entitled and enabled in workspace', async () => {
    const req = makeReq(tokenOwnerAlpha);
    const principal = await EntitlementGuard.requireFeature(req, 'projects:core');
    assert.strictEqual(principal.userId, ownerAlphaId);
    assert.strictEqual(principal.tenantId, tenantAlphaId);
  });

  it('17. should throw FeatureNotEntitledError (403 FEATURE_NOT_ENTITLED) when feature is unentitled', async () => {
    const req = makeReq(tokenOwnerAlpha);

    await assert.rejects(
      async () => EntitlementGuard.requireFeature(req, 'bim:3d_viewer'),
      (err: any) => {
        assert.strictEqual(err.statusCode, 403);
        assert.strictEqual(err.errorCode, 'FEATURE_NOT_ENTITLED');
        return true;
      }
    );
  });
});
