import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { DatabaseService } from "../src/database/database.service";
import { PlatformController } from "../src/modules/platform/platform.controller";
import { PlatformProvisioningService } from "../src/modules/platform/services/platform-provisioning.service";
import { PlatformAuditService } from "../src/modules/platform/services/platform-audit.service";
import { PlatformSessionService } from "../src/modules/platform/services/platform-session.service";
import { EntitlementService } from "../src/modules/subscriptions/services/entitlement.service";
import { TokenService } from "../src/modules/auth/services/token.service";
import { appConfig } from "../src/config/app.config";
import { ForbiddenError, UnauthorizedError, ConflictError } from "../src/common/errors/app-error";
import type { IncomingMessage, ServerResponse } from "node:http";

describe("Platform Governance & Super Admin Control Plane Test Suite", () => {
  let dbService: DatabaseService;
  let tokenService: TokenService;
  let sessionService: PlatformSessionService;
  let platformController: PlatformController;
  let provisioningService: PlatformProvisioningService;
  let entitlementService: EntitlementService;
  let auditService: PlatformAuditService;

  let platformSuperAdminToken: string;
  let customerUserToken: string;
  let platformSessionCookie: string;
  const testCustomerTenantId = "77777777-7777-7777-7777-777777777777";
  const testCustomerUserId = "88888888-8888-8888-8888-888888888888";

  const provisionedTenantCode = "TEST-PROV-CORP";
  let provisionedTenantId: string;

  async function cleanupFixtures(prisma: any) {
    const cleanupTenants = await prisma.tenant.findMany({
      where: { code: { in: [provisionedTenantCode, "CONCURRENT-CORP", "ROLLBACK-CORP"] } },
      select: { id: true },
    });
    const cleanupIds = cleanupTenants.map((t: any) => t.id);
    if (cleanupIds.length > 0) {
      await prisma.branch.deleteMany({ where: { tenantId: { in: cleanupIds } } });
      await prisma.company.deleteMany({ where: { tenantId: { in: cleanupIds } } });
      await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: cleanupIds } } });
      await prisma.session.deleteMany({ where: { tenantId: { in: cleanupIds } } });
      await prisma.user.deleteMany({ where: { tenantId: { in: cleanupIds } } });
      await prisma.tenantEntitlementOverride.deleteMany({ where: { tenantId: { in: cleanupIds } } });
      await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: cleanupIds } } });
      await prisma.tenant.deleteMany({ where: { id: { in: cleanupIds } } });
    }
  }

  function createMockResponse(): ServerResponse & { headers: Record<string, string | string[]> } {
    const headers: Record<string, string | string[]> = {};
    return {
      headers,
      setHeader(name: string, value: string | string[]) {
        headers[name.toLowerCase()] = value;
        return this;
      },
      getHeader(name: string) {
        return headers[name.toLowerCase()];
      },
    } as unknown as ServerResponse & { headers: Record<string, string | string[]> };
  }

  before(async () => {
    dbService = DatabaseService.getInstance();
    await dbService.connect();
    const prisma = dbService.getClient();

    tokenService = TokenService.getInstance();
    sessionService = PlatformSessionService.getInstance();
    auditService = PlatformAuditService.getInstance();
    entitlementService = new EntitlementService(prisma);
    provisioningService = PlatformProvisioningService.getInstance(prisma);
    platformController = new PlatformController(
      prisma,
      tokenService,
      entitlementService,
      provisioningService,
      auditService,
      sessionService
    );

    // Clean up test fixtures
    await cleanupFixtures(prisma);

    // Generate tokens
    platformSuperAdminToken = tokenService.createAccessToken({
      userId: "platform-super-admin",
      tenantId: "PLATFORM",
      sessionId: "platform-session-test",
      sessionVersion: 1,
    });

    platformSessionCookie = `dezo_platform_session=${platformSuperAdminToken}`;

    customerUserToken = tokenService.createAccessToken({
      userId: testCustomerUserId,
      tenantId: testCustomerTenantId,
      sessionId: "customer-session-test",
      sessionVersion: 1,
    });
  });

  after(async () => {
    try {
      const prisma = dbService.getClient();
      await cleanupFixtures(prisma);
    } finally {
      await dbService.disconnect();
    }
  });

  function makeMockRequest(
    token?: string,
    cookie?: string,
    body?: unknown,
    params?: any,
    query?: any
  ): IncomingMessage {
    const headers: Record<string, string> = {};
    if (token) {
      headers["authorization"] = `Bearer ${token}`;
    }
    if (cookie) {
      headers["cookie"] = cookie;
    }
    return {
      headers,
      body,
      params,
      query,
      socket: { remoteAddress: "127.0.0.1" },
    } as unknown as IncomingMessage;
  }

  // ============================================================
  // 1. Super Admin Authentication & Cookie Session
  // ============================================================
  it("1. Authenticates SUPER_ADMIN, sets HttpOnly session cookie, and does NOT leak raw token in JSON", async () => {
    const mockRes = createMockResponse();
    const req = makeMockRequest(undefined, undefined, {
      email: appConfig.security.platformAdminEmail,
      password: appConfig.security.platformAdminPassword,
    });

    const res = await platformController.login(req, mockRes);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.user.role, "SUPER_ADMIN");
    assert.strictEqual(res.data.user.email, appConfig.security.platformAdminEmail);
    assert.strictEqual((res.data as any).accessToken, undefined, "Raw token must NOT exist in JSON body");

    const setCookie = mockRes.getHeader("set-cookie") as string;
    assert.ok(setCookie, "Set-Cookie header must be sent");
    assert.ok(setCookie.includes("dezo_platform_session="));
    assert.ok(setCookie.includes("HttpOnly"));
    assert.ok(setCookie.includes("Path=/api/v1/platform"));

    // Extract token from cookie and verify claims
    const extractedToken = sessionService.extractPlatformTokenFromCookie(setCookie);
    assert.ok(extractedToken);
    const payload = tokenService.verifyAccessToken(extractedToken);
    assert.strictEqual(payload.tid, "PLATFORM");
    assert.strictEqual(payload.sub, "platform-super-admin");
  });

  // ============================================================
  // 2. Platform Profile (GET /auth/me) via Cookie Session
  // ============================================================
  it("2. Returns authenticated SUPER_ADMIN profile via HttpOnly session cookie", async () => {
    const req = makeMockRequest(undefined, platformSessionCookie);
    const res = await platformController.getMe(req);

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.id, "platform-super-admin");
    assert.strictEqual(res.data.role, "SUPER_ADMIN");
    assert.strictEqual(res.data.email, appConfig.security.platformAdminEmail);
  });

  // ============================================================
  // 3. Security Boundary: Rejection of Customer Users (403)
  // ============================================================
  it("3. Rejects normal customer user with 403 Forbidden on platform routes", async () => {
    const req = makeMockRequest(customerUserToken, undefined, undefined, {}, { page: 1, limit: 10 });
    await assert.rejects(
      async () => platformController.listTenants(req),
      (err: any) => err instanceof ForbiddenError
    );
  });

  // ============================================================
  // 4. Security Boundary: Spoofed Header Defense
  // ============================================================
  it("4. Manipulated/spoofed headers cannot elevate customer user privileges", async () => {
    const forgedReq = {
      headers: {
        authorization: `Bearer ${customerUserToken}`,
        "x-tenant-id": "PLATFORM",
        "x-role": "SUPER_ADMIN",
      },
    } as unknown as IncomingMessage;

    await assert.rejects(
      async () => platformController.listTenants(forgedReq),
      (err: any) => err instanceof ForbiddenError
    );
  });

  // ============================================================
  // 5. Security Boundary: Unauthenticated Requests (401)
  // ============================================================
  it("5. Tenant listing cannot be accessed by unauthenticated callers (401)", async () => {
    const unauthReq = makeMockRequest(undefined, undefined);
    await assert.rejects(
      async () => platformController.listTenants(unauthReq),
      (err: any) => err instanceof UnauthorizedError
    );
  });

  // ============================================================
  // 6. Platform Logout & Session Invalidation
  // ============================================================
  it("6. Platform logout clears HttpOnly cookie, revokes session, and denies subsequent requests (401)", async () => {
    // Generate a dedicated session token to log out
    const sessionToken = tokenService.createAccessToken({
      userId: "platform-super-admin",
      tenantId: "PLATFORM",
      sessionId: "session-to-logout-123",
      sessionVersion: 1,
    });
    const sessionCookie = `dezo_platform_session=${sessionToken}`;

    // Verify it works before logout
    const validReq = makeMockRequest(undefined, sessionCookie);
    const meBefore = await platformController.getMe(validReq);
    assert.strictEqual(meBefore.success, true);

    // Call logout
    const mockRes = createMockResponse();
    const logoutReq = makeMockRequest(undefined, sessionCookie);
    const logoutRes = await platformController.logout(logoutReq, mockRes);

    assert.strictEqual(logoutRes.success, true);
    assert.strictEqual(logoutRes.data.message, "Platform session terminated successfully.");

    // Verify Set-Cookie header cleared
    const clearCookie = mockRes.getHeader("set-cookie") as string;
    assert.ok(clearCookie.includes("Max-Age=0"));

    // Verify subsequent request with old session token fails with 401 Unauthorized
    const oldSessionReq = makeMockRequest(undefined, sessionCookie);
    await assert.rejects(
      async () => platformController.getMe(oldSessionReq),
      (err: any) => err instanceof UnauthorizedError
    );
  });

  // ============================================================
  // 7. Expired Session Returns 401
  // ============================================================
  it("7. Expired platform session token returns 401 Unauthorized", async () => {
    const expiredToken = tokenService.createAccessToken(
      {
        userId: "platform-super-admin",
        tenantId: "PLATFORM",
        sessionId: "expired-session-456",
        sessionVersion: 1,
      },
      -10 // Expired 10 seconds ago
    );

    const req = makeMockRequest(undefined, `dezo_platform_session=${expiredToken}`);
    await assert.rejects(
      async () => platformController.getMe(req),
      (err: any) => err instanceof UnauthorizedError
    );
  });

  // ============================================================
  // 8. Atomic Workspace Provisioning via Cookie Session
  // ============================================================
  it("8. Transactionally provisions complete tenant workspace using HttpOnly session cookie", async () => {
    const req = makeMockRequest(undefined, platformSessionCookie, {
      code: provisionedTenantCode,
      name: "Test Provisioned Enterprise Corp",
      planTier: "ENTERPRISE",
      currency: "INR",
      currencySymbol: "₹",
      timezone: "Asia/Kolkata",
      adminName: "Arjun Reddy",
      adminEmail: "arjun.owner@testprovcorp.com",
      adminPassword: "SecurePassword@123",
    });

    const res = await platformController.provisionTenant(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.code, provisionedTenantCode);
    assert.ok(res.data.id);
    assert.ok(res.data.companyId);
    assert.ok(res.data.branchId);
    assert.ok(res.data.adminUser?.id);
    assert.strictEqual(res.data.adminUser?.email, "arjun.owner@testprovcorp.com");

    provisionedTenantId = res.data.id;

    // Verify in database
    const prisma = dbService.getClient();
    const tenantInDb = await prisma.tenant.findUnique({
      where: { id: provisionedTenantId },
      include: {
        companies: { include: { branches: true } },
        users: { include: { roleAssignments: { include: { role: true } } } },
        subscriptions: { include: { plan: true } },
      },
    });

    assert.ok(tenantInDb);
    assert.strictEqual(tenantInDb.code, provisionedTenantCode);
    assert.strictEqual(tenantInDb.companies.length, 1);
    assert.strictEqual(tenantInDb.companies[0].branches.length, 1);
    assert.strictEqual(tenantInDb.users.length, 1);
    assert.strictEqual(tenantInDb.users[0].roleAssignments[0]?.role?.name, "COMPANY_OWNER");
    assert.strictEqual(tenantInDb.subscriptions[0]?.plan?.code, "ENTERPRISE");
  });

  // ============================================================
  // 9. Rollback on Error Test
  // ============================================================
  it("9. Provisioning failure cleanly rolls back leaving zero partial records", async () => {
    const duplicateCode = provisionedTenantCode; // Already exists, should trigger conflict

    const req = makeMockRequest(undefined, platformSessionCookie, {
      code: duplicateCode,
      name: "Failing Duplicate Workspace",
      planTier: "STARTER",
      adminEmail: "fail.user@example.com",
    });

    await assert.rejects(
      async () => platformController.provisionTenant(req),
      (err: any) => err instanceof ConflictError
    );

    // Verify fail user was not created
    const prisma = dbService.getClient();
    const userExists = await prisma.user.findFirst({
      where: { email: "fail.user@example.com" },
    });
    assert.strictEqual(userExists, null);
  });

  // ============================================================
  // 10. Concurrency Idempotency Test
  // ============================================================
  it("10. 10 simultaneous equivalent provisioning requests creates exactly 1 tenant", async () => {
    const concurrentCode = "CONCURRENT-CORP";
    const requests = Array.from({ length: 10 }).map((_, i) =>
      provisioningService.provisionTenant(
        {
          code: concurrentCode,
          name: `Concurrent Corp Batch ${i}`,
          planTier: "PROFESSIONAL",
          adminEmail: `owner.${i}@concurrentcorp.com`,
        },
        "platform-super-admin"
      ).then(
        (res) => ({ status: "fulfilled", res }),
        (err) => ({ status: "rejected", err })
      )
    );

    const results = await Promise.all(requests);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assert.strictEqual(fulfilled.length, 1, "Exactly one request must succeed");
    assert.strictEqual(rejected.length, 9, "Remaining 9 concurrent requests must be rejected with conflict");

    // Verify exactly one tenant exists in database
    const prisma = dbService.getClient();
    const count = await prisma.tenant.count({
      where: { code: concurrentCode },
    });
    assert.strictEqual(count, 1);
  });

  // ============================================================
  // 11. Entitlement Read for SUPER_ADMIN via Cookie Session
  // ============================================================
  it("11. Entitlement read works via HttpOnly cookie session and calculates live effective status", async () => {
    const req = makeMockRequest(undefined, platformSessionCookie, undefined, { tenantId: provisionedTenantId });
    const res = await platformController.getEntitlements(req);

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.tenantId, provisionedTenantId);
    assert.strictEqual(res.data.planCode, "ENTERPRISE");
    assert.ok(res.data.entitlements);
    assert.strictEqual(res.data.entitlements["bim:3d_viewer"], true);
  });

  // ============================================================
  // 12. Entitlement Override Update for SUPER_ADMIN
  // ============================================================
  it("12. Entitlement override update persists and updates effective entitlement status", async () => {
    const req = makeMockRequest(
      undefined,
      platformSessionCookie,
      {
        featureKey: "bim:3d_viewer",
        isEnabled: false, // Override disable Enterprise feature
      },
      { tenantId: provisionedTenantId }
    );

    const res = await platformController.updateEntitlements(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.entitlements["bim:3d_viewer"], false);

    // Verify in database
    const prisma = dbService.getClient();
    const override = await prisma.tenantEntitlementOverride.findFirst({
      where: { tenantId: provisionedTenantId, featureKey: "bim:3d_viewer" },
    });
    assert.ok(override);
    assert.strictEqual(override.isEnabled, false);
  });

  // ============================================================
  // 13. Plan Change for SUPER_ADMIN
  // ============================================================
  it("13. Plan change updates subscription tier and reflects in effective entitlements", async () => {
    const req = makeMockRequest(
      undefined,
      platformSessionCookie,
      { planCode: "STARTER" },
      { tenantId: provisionedTenantId }
    );

    const res = await platformController.changePlan(req);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.planCode, "STARTER");

    const prisma = dbService.getClient();
    const tenant = await prisma.tenant.findUnique({ where: { id: provisionedTenantId } });
    assert.strictEqual(tenant?.planTier, "STARTER");
  });

  // ============================================================
  // 14. Cross-Tenant Protection
  // ============================================================
  it("14. Customer tenant user cannot access platform governance or another tenant", async () => {
    const req = makeMockRequest(customerUserToken, undefined, undefined, { tenantId: provisionedTenantId });
    await assert.rejects(
      async () => platformController.getEntitlements(req),
      (err: any) => err instanceof ForbiddenError
    );
  });

  // ============================================================
  // 15. Platform Audit Records
  // ============================================================
  it("15. Platform administrative mutations write structured audit events", async () => {
    const logs = auditService.list(50);
    assert.ok(logs.length > 0);

    const loginEvent = logs.find((l) => l.action === "PLATFORM_LOGIN");
    assert.ok(loginEvent, "Platform login event must be recorded");

    const logoutEvent = logs.find((l) => l.action === "PLATFORM_LOGOUT");
    assert.ok(logoutEvent, "Platform logout event must be recorded");

    const provisionEvent = logs.find((l) => l.action === "TENANT_PROVISIONED" && l.targetTenantCode === provisionedTenantCode);
    assert.ok(provisionEvent, "Provisioning audit event must be recorded");

    const overrideEvent = logs.find((l) => l.action === "ENTITLEMENT_OVERRIDDEN" && l.targetTenantId === provisionedTenantId);
    assert.ok(overrideEvent, "Entitlement override audit event must be recorded");

    const planEvent = logs.find((l) => l.action === "PLAN_CHANGED" && l.targetTenantId === provisionedTenantId);
    assert.ok(planEvent, "Plan change audit event must be recorded");
  });

  // ============================================================
  // 16. Sensitive Credential Redaction in Responses & Logs
  // ============================================================
  it("16. Secrets and password hashes are never exposed in platform responses or logs", async () => {
    const req = makeMockRequest(undefined, platformSessionCookie, undefined, { id: provisionedTenantId });
    const res = await platformController.getTenant(req);

    const resJson = JSON.stringify(res);
    assert.strictEqual(resJson.includes("passwordHash"), false);
    assert.strictEqual(resJson.includes("refreshTokenHash"), false);
    assert.strictEqual(resJson.includes("jwtAccessSecret"), false);

    const logsJson = JSON.stringify(auditService.list());
    assert.strictEqual(logsJson.includes("SecurePassword@123"), false);
  });
});
