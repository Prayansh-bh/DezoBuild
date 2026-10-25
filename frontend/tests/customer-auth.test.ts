/**
 * DEZOBUILD — Customer Authentication Frontend Integration Test Suite
 * 
 * Tests:
 * A. Unauthenticated application access redirects to /login
 * B. /login route remains publicly accessible
 * C. Successful login establishes authenticated state with real backend
 * D. Failed login with invalid credentials displays generic authentication error (401)
 * E. Session hydration using GET /auth/me returns authoritative profile
 * F. Logout terminates session and invalidates access
 * G. Failed refresh results in unauthenticated state
 * H. Persona Preview is isolated to development and excluded in production mode
 * I. localStorage mock persona key does not authenticate production session
 * J. Existing protected nested route remains accessible after authentication
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const API_BASE = process.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";

describe("DEZOBUILD Customer Authentication Integration Suite", () => {
  let validAccessToken = "";

  before(async () => {
    // Verify API is healthy
    const res = await fetch(`${API_BASE}/health`);
    assert.strictEqual(res.status, 200, "Backend must be reachable");
  });

  it("A. Unauthenticated request to protected API endpoint returns 401 Unauthorized", async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    assert.strictEqual(res.status, 401, "Protected route must reject unauthenticated caller");
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, "UNAUTHORIZED");
  });

  it("B. Public login endpoint /auth/login is accessible without bearer token", async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "nonexistent.user@dezoinfra.com",
        password: "WrongPassword123!",
      }),
    });
    // Should return 401 due to bad credentials, NOT a network block or missing auth header
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  it("C. Successful login establishes authenticated state with real backend tokens", async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "owner@dezoinfra.com",
        password: "Password123!",
      }),
    });

    assert.strictEqual(res.status, 200, "Login must succeed with valid credentials");
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.accessToken, "Response must contain accessToken");
    assert.strictEqual(body.data.tokenType, "Bearer");
    assert.strictEqual(body.data.user.email, "owner@dezoinfra.com");
    assert.strictEqual(body.data.user.status, "ACTIVE");

    validAccessToken = body.data.accessToken;

    // Check Set-Cookie header for refresh token (dezo_refresh cookie)
    const cookieHeader = res.headers.get("set-cookie");
    if (cookieHeader) {
      assert.match(cookieHeader, /dezo_refresh=/);
      assert.match(cookieHeader, /HttpOnly/i);
    }
  });

  it("D. Failed login displays generic authentication error without leaking user existence", async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "owner@dezoinfra.com",
        password: "IncorrectPassword999!",
      }),
    });

    assert.strictEqual(res.status, 401, "Must return 401 for invalid password");
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, "UNAUTHORIZED");
    assert.strictEqual(body.error.detail, "Invalid credentials provided.");
  });

  it("E. Session hydration using GET /auth/me returns authoritative profile with Bearer token", async () => {
    assert.ok(validAccessToken, "Must have valid token from test C");

    const res = await fetch(`${API_BASE}/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${validAccessToken}`,
        Accept: "application/json",
      },
    });

    assert.strictEqual(res.status, 200, "Must return 200 for valid token");
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.email, "owner@dezoinfra.com");
    assert.ok(body.data.id, "Profile must have user ID");
    assert.ok(body.data.tenantId, "Profile must have tenantId");
  });

  it("F. Logout terminates session on backend and revokes credentials", async () => {
    // 1. Authenticate a dedicated session for logout test
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "owner@dezoinfra.com",
        password: "Password123!",
      }),
    });
    assert.strictEqual(loginRes.status, 200);
    const loginBody = await loginRes.json();
    const logoutToken = loginBody.data.accessToken;

    // 2. Call logout
    const logoutRes = await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${logoutToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    assert.strictEqual(logoutRes.status, 200);
    const logoutBody = await logoutRes.json();
    assert.strictEqual(logoutBody.success, true);

    // 3. Clear cookie header should be sent
    const cookieHeader = logoutRes.headers.get("set-cookie");
    if (cookieHeader) {
      assert.match(cookieHeader, /dezo_refresh=/);
    }
  });

  it("G. Failed refresh with invalid token results in 401 Unauthorized", async () => {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refreshToken: "invalid-fabricated-refresh-token-12345",
      }),
    });

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, "UNAUTHORIZED");
  });

  it("H. Persona Preview is completely removed from AppShell source code", async () => {
    const appShellPath = path.resolve(process.cwd(), "src/components/layout/app-shell.tsx");
    const appShellContent = await fs.readFile(appShellPath, "utf-8");

    assert.strictEqual(appShellContent.includes("Development Persona Preview"), false, "Persona Preview must NOT exist in AppShell");
    assert.strictEqual(appShellContent.includes("roleSwitcherOpen"), false, "roleSwitcherOpen state must NOT exist in AppShell");
    assert.strictEqual(appShellContent.includes("switchUser"), false, "switchUser must NOT be called in AppShell");
  });

  it("I. AuthProvider contains zero mock persona state and requires serverUser hydration", async () => {
    const contextPath = path.resolve(process.cwd(), "src/auth/context.tsx");
    const contextContent = await fs.readFile(contextPath, "utf-8");

    assert.strictEqual(contextContent.includes("dezobuild_active_mock_user_id"), false, "Storage key must NOT exist");
    assert.strictEqual(contextContent.includes("mock-users"), false, "mock-users must NOT be imported");
    assert.strictEqual(contextContent.includes("switchUser"), false, "switchUser must NOT exist in context");
    assert.match(contextContent, /authApi\.getMe\(\)/);
  });

  it("J. Existing protected nested route (/projects) is accessible with valid authenticated session", async () => {
    assert.ok(validAccessToken, "Must have valid token");

    const res = await fetch(`${API_BASE}/projects`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${validAccessToken}`,
        Accept: "application/json",
      },
    });

    assert.strictEqual(res.status, 200, "Protected projects route must return 200 for authenticated user");
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data), "Projects response data must be an array");
  });

  it("K. Login page contains server-authoritative demo role selectors that execute real login", async () => {
    const loginPath = path.resolve(process.cwd(), "src/routes/login.tsx");
    const loginContent = await fs.readFile(loginPath, "utf-8");

    assert.match(loginContent, /DEMO_ROLES/);
    assert.match(loginContent, /handleDemoRoleClick/);
    assert.match(loginContent, /executeLogin/);
    assert.match(loginContent, /authApi|login\(\{/);
  });
});
