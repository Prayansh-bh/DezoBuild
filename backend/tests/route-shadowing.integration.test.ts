/**
 * DEZOBUILD — HTTP Route Shadowing & Specificity Integration Test Suite
 *
 * Tests the real ApplicationServer HTTP route dispatch table to prove:
 * 1. GET /api/v1/tenants/workspace-modules dispatches to SubscriptionsController.getWorkspaceModules
 *    and does NOT get shadowed by TenancyController.getTenant (avoiding false foreign-tenant 403).
 * 2. GET /api/v1/tenants/:id dispatches to TenancyController.getTenant for legitimate tenant IDs.
 * 3. GET /api/v1/tenants/subscription dispatches to SubscriptionsController.getSubscription.
 * 4. Foreign tenant access continues to be rejected with 403 Forbidden.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http, { type Server } from 'node:http';
import { ApplicationServer } from '../src/common/http/server';
import { DatabaseService } from '../src/database/database.service';
import { TokenService } from '../src/modules/auth/services/token.service';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service';
import { SubscriptionSeederService } from '../src/modules/subscriptions/services/subscription-seeder.service';
import { EntitlementService } from '../src/modules/subscriptions/services/entitlement.service';

describe('DEZOBUILD Route Shadowing & Full HTTP Pipeline Integration Suite', () => {
  let appServer: ApplicationServer;
  let server: Server;
  let port: number;
  let dbService: DatabaseService;
  let prisma: any;
  let tokenService: TokenService;
  let entitlementService: EntitlementService;

  const tenantAlphaId = 'aaaa1111-0000-0000-0000-aaaaaaaaaaaa';
  const tenantBetaId = 'bbbb2222-0000-0000-0000-bbbbbbbbbbbb';
  const ownerAlphaId = '11110001-0000-0000-0000-000000000001';

  let tokenOwnerAlpha: string;

  before(async () => {
    dbService = DatabaseService.getInstance();
    prisma = dbService.getClient();
    await dbService.connect();

    tokenService = TokenService.getInstance();
    entitlementService = new EntitlementService(prisma);

    // Ensure seed data exists
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
        code: 'TENANT_ALPHA_ROUTER',
        name: 'Alpha Infra Developers',
        status: 'ACTIVE',
        planTier: 'STARTER',
      },
    });

    // 2. Create Tenant Beta (ENTERPRISE Tier)
    await prisma.tenant.create({
      data: {
        id: tenantBetaId,
        code: 'TENANT_BETA_ROUTER',
        name: 'Beta Global Conglomerate',
        status: 'ACTIVE',
        planTier: 'ENTERPRISE',
      },
    });

    // Provision Subscriptions
    await entitlementService.provisionDefaultSubscription(tenantAlphaId, 'STARTER');
    await entitlementService.provisionDefaultSubscription(tenantBetaId, 'ENTERPRISE');

    // Create User and Session for Token Auth
    await prisma.user.create({
      data: {
        id: ownerAlphaId,
        tenantId: tenantAlphaId,
        email: 'owner@alpha.com',
        fullName: 'Alpha Owner',
        passwordHash: 'dummy',
        status: 'ACTIVE',
      },
    });

    const sessionId = '33330001-0000-0000-0000-000000000001';
    await prisma.session.create({
      data: {
        id: sessionId,
        userId: ownerAlphaId,
        tenantId: tenantAlphaId,
        version: 1,
        refreshTokenHash: 'dummy_hash',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    // Assign Role
    const ownerRole = await prisma.role.findFirst({ where: { name: 'COMPANY_OWNER' } });
    if (ownerRole) {
      await prisma.userRoleAssignment.create({
        data: {
          tenantId: tenantAlphaId,
          userId: ownerAlphaId,
          roleId: ownerRole.id,
          scopeType: 'ORGANIZATION',
        },
      });
    }

    // Generate tokens
    tokenOwnerAlpha = tokenService.createAccessToken({
      userId: ownerAlphaId,
      tenantId: tenantAlphaId,
      sessionId: sessionId,
      sessionVersion: 1,
    });

    // Start HTTP server on ephemeral port using ApplicationServer router
    appServer = new ApplicationServer();
    server = http.createServer((req, res) => appServer.getRouter().handleRequest(req, res));
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        port = (server.address() as any).port;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await dbService.disconnect();
  });

  it('1. GET /api/v1/tenants/workspace-modules reaches workspace-modules endpoint (NOT shadowed by :id)', async () => {
    const res = await fetch(`http://localhost:${port}/api/v1/tenants/workspace-modules`, {
      headers: {
        Authorization: `Bearer ${tokenOwnerAlpha}`,
      },
    });

    const json = (await res.json()) as any;
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(json)}`);
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data), 'Expected array of workspace modules');
    assert.strictEqual(json.data.length, 12, 'Expected 12 canonical workspace features');

    const projectCore = json.data.find((m: any) => m.featureKey === 'projects:core');
    assert.ok(projectCore, 'projects:core module must exist in response');
    assert.strictEqual(typeof projectCore.effectiveActive, 'boolean');
  });

  it('2. GET /api/v1/tenants/subscription reaches subscription endpoint (NOT shadowed by :id)', async () => {
    const res = await fetch(`http://localhost:${port}/api/v1/tenants/subscription`, {
      headers: {
        Authorization: `Bearer ${tokenOwnerAlpha}`,
      },
    });

    const json = (await res.json()) as any;
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(json)}`);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.planCode, 'STARTER');
    assert.ok(json.data.quotas, 'Expected quotas in subscription response');
  });

  it('3. GET /api/v1/tenants/<own-tenant-id> reaches TenancyController.getTenant correctly', async () => {
    const res = await fetch(`http://localhost:${port}/api/v1/tenants/${tenantAlphaId}`, {
      headers: {
        Authorization: `Bearer ${tokenOwnerAlpha}`,
      },
    });

    const json = (await res.json()) as any;
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(json)}`);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.id, tenantAlphaId);
  });

  it('4. GET /api/v1/tenants/<foreign-tenant-id> rejects with 403 Forbidden (cross-tenant isolation)', async () => {
    const res = await fetch(`http://localhost:${port}/api/v1/tenants/${tenantBetaId}`, {
      headers: {
        Authorization: `Bearer ${tokenOwnerAlpha}`,
      },
    });

    const json = (await res.json()) as any;
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error.code, 'FORBIDDEN');
    assert.strictEqual(json.error.detail, 'Access to foreign tenant is strictly forbidden.');
  });
});
