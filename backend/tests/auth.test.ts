import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { AuthService } from "../src/modules/auth/auth.service";
import { PasswordService } from "../src/modules/auth/services/password.service";
import { TokenService } from "../src/modules/auth/services/token.service";
import { RateLimiterService } from "../src/modules/auth/services/rate-limiter.service";
import { InMemoryUserRepository } from "../src/modules/auth/repositories/in-memory-user.repository";
import { InMemorySessionRepository } from "../src/modules/auth/repositories/in-memory-session.repository";
import { AuthGuard } from "../src/modules/auth/auth.guard";
import { AuthController } from "../src/modules/auth/auth.controller";
import { ApplicationServer } from "../src/common/http/server";
import { UnauthorizedError, ValidationError, RateLimitError } from "../src/common/errors/app-error";
import type { IncomingMessage, ServerResponse } from "node:http";

describe("Phase 02 — Identity & Authentication Test Suite", () => {
  let userRepo: InMemoryUserRepository;
  let sessionRepo: InMemorySessionRepository;
  let passwordService: PasswordService;
  let tokenService: TokenService;
  let rateLimiter: RateLimiterService;
  let authService: AuthService;

  const testTenantId = "11111111-1111-1111-1111-111111111111";
  const testUserId = "22222222-2222-2222-2222-222222222222";
  const testEmail = "engineer.site@dezobuild.com";
  const testPassword = "SuperSecurePassword123!";

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    sessionRepo = new InMemorySessionRepository();
    passwordService = PasswordService.getInstance();
    tokenService = TokenService.getInstance();
    rateLimiter = new RateLimiterService(5, 15 * 60 * 1000);
    rateLimiter.resetAll();

    authService = new AuthService({
      userRepository: userRepo,
      sessionRepository: sessionRepo,
      passwordService,
      tokenService,
      rateLimiter,
    });
  });

  it("1. User creation with hashed password using bcrypt with random salt", async () => {
    const user = await authService.registerUser({
      id: testUserId,
      tenantId: testTenantId,
      email: testEmail,
      fullName: "Arun Kumar",
      password: testPassword,
    });

    assert.equal(user.id, testUserId);
    assert.equal(user.email, testEmail);
    assert.equal(user.sessionVersion, 1);
    assert.ok(user.passwordHash.startsWith("$2a$") || user.passwordHash.startsWith("$2b$"));
    assert.notEqual(user.passwordHash, testPassword);

    const isMatch = await passwordService.verifyPassword(testPassword, user.passwordHash);
    assert.equal(isMatch, true);
  });

  it("2. Password and sensitive hashes cannot be recovered from sanitized response", async () => {
    const user = await authService.registerUser({
      tenantId: testTenantId,
      email: testEmail,
      fullName: "Arun Kumar",
      password: testPassword,
    });

    const sanitized = authService.sanitizeUser(user);
    assert.equal((sanitized as any).password, undefined);
    assert.equal((sanitized as any).passwordHash, undefined);
    assert.equal(sanitized.email, testEmail);
    assert.equal(sanitized.fullName, "Arun Kumar");
  });

  it("3. Valid login issues valid access token and creates server session", async () => {
    await authService.registerUser({
      id: testUserId,
      tenantId: testTenantId,
      email: testEmail,
      fullName: "Arun Kumar",
      password: testPassword,
    });

    const loginResult = await authService.login({
      email: testEmail,
      password: testPassword,
    });

    assert.ok(loginResult.accessToken);
    assert.equal(loginResult.tokenType, "Bearer");
    assert.equal(loginResult.expiresIn, 900);
    assert.equal(loginResult.user.id, testUserId);
    assert.ok(loginResult.refreshToken);

    const sessions = await sessionRepo.findActiveByUserId(testUserId);
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0]?.userId, testUserId);
    assert.equal(sessions[0]?.version, 1);
  });

  it("4. Login with invalid password returns generic unauthorized error", async () => {
    await authService.registerUser({
      tenantId: testTenantId,
      email: testEmail,
      fullName: "Arun Kumar",
      password: testPassword,
    });

    await assert.rejects(
      async () => {
        await authService.login({
          email: testEmail,
          password: "WrongPassword999!",
        });
      },
      (err: any) => {
        assert.ok(err instanceof UnauthorizedError);
        assert.equal(err.message, "Invalid credentials provided.");
        return true;
      },
    );
  });

  it("5. Login with unknown email returns generic unauthorized error without leaking existence", async () => {
    await assert.rejects(
      async () => {
        await authService.login({
          email: "nonexistent.user@dezobuild.com",
          password: "AnyPassword123!",
        });
      },
      (err: any) => {
        assert.ok(err instanceof UnauthorizedError);
        assert.equal(err.message, "Invalid credentials provided.");
        return true;
      },
    );
  });

  it("6. Login for disabled or suspended account is rejected", async () => {
    const user = await authService.registerUser({
      tenantId: testTenantId,
      email: testEmail,
      fullName: "Arun Kumar",
      password: testPassword,
    });

    await userRepo.updateStatus(user.id, "SUSPENDED");

    await assert.rejects(
      async () => {
        await authService.login({
          email: testEmail,
          password: testPassword,
        });
      },
      (err: any) => {
        assert.ok(err instanceof UnauthorizedError);
        assert.equal(err.message, "Invalid credentials provided.");
        return true;
      },
    );
  });

  it("7. Access token claims contain mandatory security envelope (iss, aud, sub, tid, sid, ver)", async () => {
    const sessionId = "33333333-3333-3333-3333-333333333333";
    const token = tokenService.createAccessToken({
      userId: testUserId,
      tenantId: testTenantId,
      sessionId,
      sessionVersion: 2,
    });

    const payload = tokenService.verifyAccessToken(token);
    assert.equal(payload.iss, "dezobuild-api");
    assert.equal(payload.aud, "dezobuild-client");
    assert.equal(payload.sub, testUserId);
    assert.equal(payload.tid, testTenantId);
    assert.equal(payload.sid, sessionId);
    assert.equal(payload.ver, 2);
    assert.ok(payload.exp > payload.iat);
  });

  it("8. Access token expiry is strictly enforced", async () => {
    // Create token with -1 second expiration
    const expiredToken = tokenService.createAccessToken(
      {
        userId: testUserId,
        tenantId: testTenantId,
        sessionId: "sess-1",
        sessionVersion: 1,
      },
      -5,
    );

    assert.throws(
      () => tokenService.verifyAccessToken(expiredToken),
      (err: any) => {
        assert.ok(err instanceof UnauthorizedError);
        assert.match(err.message, /expired/i);
        return true;
      },
    );
  });

  it("9. Access token with tampered signature is rejected", async () => {
    const token = tokenService.createAccessToken({
      userId: testUserId,
      tenantId: testTenantId,
      sessionId: "sess-1",
      sessionVersion: 1,
    });

    const parts = token.split(".");
    // Tamper with signature
    const tamperedToken = `${parts[0]}.${parts[1]}.tamperedSignatureHere`;

    assert.throws(
      () => tokenService.verifyAccessToken(tamperedToken),
      (err: any) => {
        assert.ok(err instanceof UnauthorizedError);
        return true;
      },
    );
  });

  it("10. Access token with wrong issuer is rejected", async () => {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        iss: "fraudulent-issuer",
        aud: "dezobuild-client",
        sub: testUserId,
        tid: testTenantId,
        sid: "sess-1",
        ver: 1,
        iat: now,
        exp: now + 900,
      }),
    ).toString("base64url");

    const sig = crypto
      .createHmac("sha256", "dezobuild-access-secret-key-development-minimum-32-chars-ok!")
      .update(`${header}.${payload}`)
      .digest()
      .toString("base64url");

    const forgedToken = `${header}.${payload}.${sig}`;

    assert.throws(
      () => tokenService.verifyAccessToken(forgedToken),
      /Invalid token issuer/,
    );
  });

  it("11. Access token with wrong audience is rejected", async () => {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        iss: "dezobuild-api",
        aud: "wrong-audience",
        sub: testUserId,
        tid: testTenantId,
        sid: "sess-1",
        ver: 1,
        iat: now,
        exp: now + 900,
      }),
    ).toString("base64url");

    const sig = crypto
      .createHmac("sha256", "dezobuild-access-secret-key-development-minimum-32-chars-ok!")
      .update(`${header}.${payload}`)
      .digest()
      .toString("base64url");

    const forgedToken = `${header}.${payload}.${sig}`;

    assert.throws(
      () => tokenService.verifyAccessToken(forgedToken),
      /Invalid token audience/,
    );
  });

  it("12. Refresh token rotation issues new access and refresh tokens", async () => {
    await authService.registerUser({
      id: testUserId,
      tenantId: testTenantId,
      email: testEmail,
      fullName: "Arun Kumar",
      password: testPassword,
    });

    const login = await authService.login({
      email: testEmail,
      password: testPassword,
    });

    const firstRefreshToken = login.refreshToken;

    const refreshed = await authService.refresh(firstRefreshToken);
    assert.ok(refreshed.accessToken);
    assert.ok(refreshed.refreshToken);
    assert.notEqual(refreshed.refreshToken, firstRefreshToken);

    // Old refresh token must no longer match active session hash
    const oldHash = tokenService.hashRefreshToken(firstRefreshToken);
    const oldMatch = await sessionRepo.findByTokenHash(oldHash);
    assert.equal(oldMatch, null);
  });

  it("13. Refresh replay rejection invalidates all sessions for the compromised user", async () => {
    await authService.registerUser({
      id: testUserId,
      tenantId: testTenantId,
      email: testEmail,
      fullName: "Arun Kumar",
      password: testPassword,
    });

    const login = await authService.login({
      email: testEmail,
      password: testPassword,
    });

    // Valid rotation
    const refreshed = await authService.refresh(login.refreshToken);

    // Attacker attempts to replay the already-consumed / revoked firstRefreshToken
    // Create a fake revoked session matching firstRefreshToken to simulate detection
    const oldHash = tokenService.hashRefreshToken(login.refreshToken);
    await sessionRepo.create({
      tenantId: testTenantId,
      userId: testUserId,
      refreshTokenHash: oldHash,
      version: 1,
      expiresAt: new Date(Date.now() + 600000),
    });
    const oldSession = await sessionRepo.findByTokenHash(oldHash);
    if (oldSession) {
      await sessionRepo.revoke(oldSession.id);
    }

    await assert.rejects(
      async () => {
        await authService.refresh(login.refreshToken);
      },
      (err: any) => {
        assert.ok(err instanceof UnauthorizedError);
        assert.match(err.message, /reuse detected/i);
        return true;
      },
    );

    // Verify all active sessions were revoked
    const activeSessions = await sessionRepo.findActiveByUserId(testUserId);
    assert.equal(activeSessions.length, 0);
  });

  it("14. Revoked session is rejected on refresh", async () => {
    await authService.registerUser({
      id: testUserId,
      tenantId: testTenantId,
      email: testEmail,
      fullName: "Arun Kumar",
      password: testPassword,
    });

    const login = await authService.login({
      email: testEmail,
      password: testPassword,
    });

    const sessions = await sessionRepo.findActiveByUserId(testUserId);
    await sessionRepo.revoke(sessions[0]!.id);

    await assert.rejects(
      async () => {
        await authService.refresh(login.refreshToken);
      },
      (err: any) => {
        assert.ok(err instanceof UnauthorizedError);
        return true;
      },
    );
  });

  it("15. Logout terminates server session", async () => {
    await authService.registerUser({
      id: testUserId,
      tenantId: testTenantId,
      email: testEmail,
      fullName: "Arun Kumar",
      password: testPassword,
    });

    const login = await authService.login({
      email: testEmail,
      password: testPassword,
    });

    await authService.logout({ rawRefreshToken: login.refreshToken, userId: testUserId });

    const activeSessions = await sessionRepo.findActiveByUserId(testUserId);
    assert.equal(activeSessions.length, 0);
  });

  it("16. Logout cookie clearing header produces Max-Age=0", () => {
    const clearHeader = tokenService.serializeClearRefreshCookie();
    assert.match(clearHeader, /Max-Age=0/);
    assert.match(clearHeader, /HttpOnly/);
    assert.match(clearHeader, /SameSite=Strict/);
  });

  it("17. Session-version invalidation immediately invalidates active sessions and tokens", async () => {
    const user = await authService.registerUser({
      id: testUserId,
      tenantId: testTenantId,
      email: testEmail,
      fullName: "Arun Kumar",
      password: testPassword,
    });

    const login = await authService.login({
      email: testEmail,
      password: testPassword,
    });

    // Invalidate all user sessions (e.g. password reset or admin force logout)
    await authService.revokeAllSessions(user.id);

    // Old refresh token must now be rejected
    await assert.rejects(
      async () => {
        await authService.refresh(login.refreshToken);
      },
      (err: any) => {
        assert.ok(err instanceof UnauthorizedError);
        return true;
      },
    );
  });

  it("18. Refresh cookie configuration contains HttpOnly, SameSite, and Path attributes", () => {
    const cookieHeader = tokenService.serializeRefreshCookie("sample-token-value");
    assert.match(cookieHeader, /dezo_refresh=sample-token-value/);
    assert.match(cookieHeader, /Path=\/api\/v1\/auth/);
    assert.match(cookieHeader, /HttpOnly/);
    assert.match(cookieHeader, /SameSite=Strict/);
  });

  it("19. Malformed login request throws structured ValidationError with invalidParams", async () => {
    const controller = new AuthController(authService);
    const mockReq = {
      body: {
        email: "not-an-email",
        // missing password
      },
      headers: {},
      socket: {},
    } as unknown as IncomingMessage;

    const mockRes = {
      setHeader() {},
    } as unknown as ServerResponse;

    await assert.rejects(
      async () => {
        await controller.login(mockReq, mockRes);
      },
      (err: any) => {
        assert.ok(err instanceof ValidationError);
        assert.equal(err.statusCode, 422);
        assert.ok(Array.isArray(err.invalidParams));
        return true;
      },
    );
  });

  it("20. Brute-force rate limiting blocks repeated login failures after 5 attempts", async () => {
    const ip = "192.168.1.50";
    const attackEmail = "target@dezobuild.com";

    for (let i = 0; i < 5; i++) {
      try {
        await authService.login(
          { email: attackEmail, password: "WrongPassword!" },
          { clientIp: ip },
        );
      } catch (err) {
        // Expected failures
      }
    }

    // 6th attempt must be blocked by rate limiter with 429
    await assert.rejects(
      async () => {
        await authService.login(
          { email: attackEmail, password: "AnyPassword!" },
          { clientIp: ip },
        );
      },
      (err: any) => {
        assert.ok(err instanceof RateLimitError);
        assert.equal(err.statusCode, 429);
        assert.match(err.message, /Too many failed login attempts/);
        return true;
      },
    );
  });

  it("21. Negative security: Client-provided headers (X-User-Id, X-Tenant-Id, X-Role) are strictly rejected as identity", async () => {
    const forgedReq = {
      headers: {
        "x-user-id": "fake-admin-uuid",
        "x-tenant-id": "fake-tenant-uuid",
        "x-role": "COMPANY_OWNER",
        "x-permissions": "*",
        // No Authorization header
      },
    } as unknown as IncomingMessage;

    await assert.rejects(
      async () => {
        await AuthGuard.authenticate(forgedReq);
      },
      (err: any) => {
        assert.ok(err instanceof UnauthorizedError);
        assert.equal(err.message, "Authentication token is required.");
        return true;
      },
    );
  });

  it("22. Protected GET /api/v1/auth/me returns current user profile when authenticated", async () => {
    await authService.registerUser({
      id: testUserId,
      tenantId: testTenantId,
      email: testEmail,
      fullName: "Arun Kumar",
      password: testPassword,
    });

    const login = await authService.login({
      email: testEmail,
      password: testPassword,
    });

    const authReq = {
      headers: {
        authorization: `Bearer ${login.accessToken}`,
      },
    } as unknown as IncomingMessage;

    const controller = new AuthController(authService);
    const response = await controller.getMe(authReq);

    assert.equal(response.success, true);
    assert.equal(response.data.id, testUserId);
    assert.equal(response.data.email, testEmail);
    assert.equal(response.data.fullName, "Arun Kumar");
    assert.equal((response.data as any).passwordHash, undefined);
  });
});
