import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { DatabaseService } from "../src/database/database.service";
import { AuthService } from "../src/modules/auth/auth.service";
import { PrismaUserRepository } from "../src/modules/auth/repositories/prisma-user.repository";
import { PrismaSessionRepository } from "../src/modules/auth/repositories/prisma-session.repository";
import { PasswordService } from "../src/modules/auth/services/password.service";
import { TokenService } from "../src/modules/auth/services/token.service";
import { RateLimiterService } from "../src/modules/auth/services/rate-limiter.service";
import { UnauthorizedError } from "../src/common/errors/app-error";

describe("Phase 02 — Real PostgreSQL Persistence & Session Lifecycle Suite", () => {
  let dbService: DatabaseService;
  let prismaUserRepo: PrismaUserRepository;
  let prismaSessionRepo: PrismaSessionRepository;
  let authService: AuthService;
  let passwordService: PasswordService;
  let tokenService: TokenService;

  const testTenantId = "a0000000-0000-0000-0000-000000000001";
  const testUserId = "b0000000-0000-0000-0000-000000000002";
  const testEmail = "pg.persistence.test@dezobuild.com";
  const testPassword = "PgSuperPassword2026!";

  before(async () => {
    dbService = DatabaseService.getInstance();
    await dbService.connect();

    prismaUserRepo = new PrismaUserRepository();
    prismaSessionRepo = new PrismaSessionRepository();
    passwordService = PasswordService.getInstance();
    tokenService = TokenService.getInstance();

    // Production-identical runtime wiring using Prisma repositories
    authService = new AuthService({
      userRepository: prismaUserRepo,
      sessionRepository: prismaSessionRepo,
      passwordService,
      tokenService,
      rateLimiter: new RateLimiterService(10, 60000),
    });

    // Clean up any stale test records
    const prisma = dbService.getClient();
    await prisma.session.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.user.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenant.deleteMany({ where: { id: testTenantId } });

    // Seed test tenant for relational foreign key requirement
    await prisma.tenant.create({
      data: {
        id: testTenantId,
        code: "TEST-TENANT-PERSIST",
        name: "Test Tenant for Persistence Suite",
      },
    });
  });

  after(async () => {
    try {
      const prisma = dbService.getClient();
      await prisma.session.deleteMany({ where: { tenantId: testTenantId } });
      await prisma.user.deleteMany({ where: { tenantId: testTenantId } });
      await prisma.tenant.deleteMany({ where: { id: testTenantId } });
    } finally {
      await dbService.disconnect();
    }
  });

  it("1. Persists new User entity to real PostgreSQL dezobuild database with bcrypt hash", async () => {
    const user = await authService.registerUser({
      id: testUserId,
      tenantId: testTenantId,
      email: testEmail,
      fullName: "Postgres Test User",
      password: testPassword,
    });

    assert.equal(user.id, testUserId);
    assert.equal(user.email, testEmail);

    // Direct database verification
    const prisma = dbService.getClient();
    const rawUser = await prisma.user.findUnique({ where: { id: testUserId } });
    assert.ok(rawUser, "User record must exist in PostgreSQL users table");
    assert.equal(rawUser.email, testEmail);
    assert.equal(rawUser.tenantId, testTenantId);
    assert.ok(rawUser.passwordHash.startsWith("$2b$") || rawUser.passwordHash.startsWith("$2a$"));
    assert.notEqual(rawUser.passwordHash, testPassword, "Plaintext password must never be stored");
  });

  it("2. Real login creates persisted Session record in PostgreSQL dezobuild database", async () => {
    const loginResult = await authService.login({
      email: testEmail,
      password: testPassword,
    });

    assert.ok(loginResult.accessToken);
    assert.ok(loginResult.refreshToken);

    // Verify session in real PostgreSQL table
    const prisma = dbService.getClient();
    const activeSessions = await prisma.session.findMany({
      where: { userId: testUserId, revokedAt: null },
    });

    assert.equal(activeSessions.length, 1);
    const session = activeSessions[0]!;
    assert.equal(session.userId, testUserId);
    assert.equal(session.tenantId, testTenantId);
    assert.equal(session.version, 1);
    assert.ok(session.expiresAt > new Date());
    assert.notEqual(session.refreshTokenHash, loginResult.refreshToken, "Refresh token must be stored as hash only");
  });

  it("3. Refresh token rotation updates persisted Session in PostgreSQL", async () => {
    const loginResult = await authService.login({
      email: testEmail,
      password: testPassword,
    });

    const initialToken = loginResult.refreshToken;
    const initialHash = tokenService.hashRefreshToken(initialToken);

    // Rotate token
    const refreshResult = await authService.refresh(initialToken);
    assert.ok(refreshResult.accessToken);
    assert.ok(refreshResult.refreshToken);
    assert.notEqual(refreshResult.refreshToken, initialToken);

    // Verify database state updated
    const prisma = dbService.getClient();
    const oldSession = await prisma.session.findFirst({
      where: { refreshTokenHash: initialHash },
    });
    assert.equal(oldSession, null, "Old refresh token hash must no longer exist in active session");

    const newHash = tokenService.hashRefreshToken(refreshResult.refreshToken);
    const newSession = await prisma.session.findFirst({
      where: { refreshTokenHash: newHash },
    });
    assert.ok(newSession, "New rotated refresh token hash must be persisted in PostgreSQL");
  });

  it("4. Logout marks session as revoked with revoked_at timestamp in PostgreSQL", async () => {
    const loginResult = await authService.login({
      email: testEmail,
      password: testPassword,
    });

    await authService.logout({
      rawRefreshToken: loginResult.refreshToken,
      userId: testUserId,
    });

    // Verify in PostgreSQL that revokedAt is set
    const tokenHash = tokenService.hashRefreshToken(loginResult.refreshToken);
    const prisma = dbService.getClient();
    const session = await prisma.session.findFirst({
      where: { refreshTokenHash: tokenHash },
    });

    assert.ok(session, "Session row remains for audit");
    assert.ok(session.revokedAt !== null, "revoked_at timestamp must be populated in PostgreSQL");
  });

  it("5. Session-version increment in PostgreSQL invalidates all existing user tokens", async () => {
    const loginResult = await authService.login({
      email: testEmail,
      password: testPassword,
    });

    // Invalidate sessions via session_version increment
    await authService.revokeAllSessions(testUserId);

    // Verify user session_version was incremented in PostgreSQL
    const prisma = dbService.getClient();
    const updatedUser = await prisma.user.findUnique({ where: { id: testUserId } });
    assert.equal(updatedUser?.sessionVersion, 2);

    // Old refresh token must be rejected
    await assert.rejects(
      async () => {
        await authService.refresh(loginResult.refreshToken);
      },
      (err: any) => {
        assert.ok(err instanceof UnauthorizedError);
        return true;
      },
    );
  });

  it("6. Process restart persistence: Auth state survives process re-instantiation", async () => {
    // Process A: Create session
    const loginA = await authService.login({
      email: testEmail,
      password: testPassword,
    });

    // Simulate complete process restart (instantiating fresh AuthService with fresh repos)
    const freshUserRepo = new PrismaUserRepository();
    const freshSessionRepo = new PrismaSessionRepository();
    const restartedAuthService = new AuthService({
      userRepository: freshUserRepo,
      sessionRepository: freshSessionRepo,
      passwordService: PasswordService.getInstance(),
      tokenService: TokenService.getInstance(),
    });

    // Process B: Refresh and authenticate using persisted state from PostgreSQL
    const refreshB = await restartedAuthService.refresh(loginA.refreshToken);
    assert.ok(refreshB.accessToken, "Restarted service successfully issued access token from PostgreSQL session");
    assert.ok(refreshB.refreshToken, "Restarted service successfully rotated refresh token in PostgreSQL");

    // Process B: Verify profile retrieval from PostgreSQL
    const profile = await restartedAuthService.getMe(testUserId);
    assert.equal(profile.id, testUserId);
    assert.equal(profile.email, testEmail);
  });
});
