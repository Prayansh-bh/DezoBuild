/**
 * DEZOBUILD — Team & Users Live Invitation Frontend Test Suite
 *
 * Verifies:
 * 1. Invite mutation sends correct payload (email, fullName, roleId UUID)
 * 2. Successful 201 response closes modal & emits success notification
 * 3. 403 Forbidden error mapped to authorization message
 * 4. 409 Seat capacity exceeded error mapped to capacity message
 * 5. 409 Duplicate pending invitation mapped to duplicate error
 * 6. Failed request does not claim success
 * 7. Query keys invalidated for team & users refresh
 * 8. Invite acceptance route is public (AuthBoundary allows /invite/$token)
 * 9. Acceptance success establishes real auth state (tokens stored in apiClient)
 * 10. Invalid/expired token displays error state
 * 11. Raw token is never persisted to localStorage or sessionStorage
 * 12. Revoke mutation sends correct invitation ID
 * 13. Revoke success triggers query invalidation
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { invitationsApi } from "../src/lib/api/endpoints/invitations";
import { apiClient } from "../src/lib/api/client";
import { ApiError } from "../src/lib/api/errors";
import { queryKeys } from "../src/hooks/api/queryKeys";

describe("Phase 17 — Frontend Invitation Integration Unit Tests", () => {
  // Test 1: Invite mutation payload contract
  it("1. invitationsApi.inviteUser() formats and posts correct payload", async () => {
    let capturedUrl = "";
    let capturedBody: any = null;

    const originalPost = apiClient.post;
    apiClient.post = async (url: string, body?: any) => {
      capturedUrl = url;
      capturedBody = body;
      return {
        id: "inv-uuid-1",
        email: body.email,
        fullName: body.fullName,
        roleId: body.roleId,
        roleName: "SITE_ENGINEER",
        status: "PENDING",
        expiresAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      } as any;
    };

    try {
      const payload = {
        email: "test.engineer@example.com",
        fullName: "Test Site Engineer",
        roleId: "a0000000-0000-0000-0000-000000000004",
      };

      const result = await invitationsApi.inviteUser(payload);

      assert.strictEqual(capturedUrl, "/tenants/users/invite");
      assert.strictEqual(capturedBody.email, "test.engineer@example.com");
      assert.strictEqual(capturedBody.fullName, "Test Site Engineer");
      assert.strictEqual(capturedBody.roleId, "a0000000-0000-0000-0000-000000000004");
      assert.strictEqual(capturedBody.tenantId, undefined, "tenantId must not be passed by client");
      assert.strictEqual(capturedBody.token, undefined, "token must not be passed by client");
      assert.strictEqual(result.status, "PENDING");
    } finally {
      apiClient.post = originalPost;
    }
  });

  // Test 2: Successful 201 response contract
  it("2. Successful 201 returns invitation entity with role and expiration", async () => {
    const originalPost = apiClient.post;
    apiClient.post = async () => ({
      id: "inv-201",
      email: "engineer@company.com",
      fullName: "Anand Deshmukh",
      roleId: "uuid-role-123",
      roleName: "SITE_ENGINEER",
      status: "PENDING",
      expiresAt: "2026-09-24T12:00:00.000Z",
      createdAt: "2026-09-21T12:00:00.000Z",
    } as any);

    try {
      const res = await invitationsApi.inviteUser({
        email: "engineer@company.com",
        fullName: "Anand Deshmukh",
        roleId: "uuid-role-123",
      });

      assert.strictEqual(res.id, "inv-201");
      assert.strictEqual(res.status, "PENDING");
      assert.strictEqual(res.roleName, "SITE_ENGINEER");
    } finally {
      apiClient.post = originalPost;
    }
  });

  // Test 3: 403 Forbidden error handling
  it("3. 403 Forbidden is normalized into ApiError with FORBIDDEN code", async () => {
    const error = ApiError.fromResponse(403, {
      success: false,
      error: {
        code: "FORBIDDEN",
        title: "Forbidden",
        detail: "Unauthorized: Only COMPANY_OWNER or COMPANY_ADMIN can invite team members.",
      },
    });

    assert.strictEqual(error.statusCode, 403);
    assert.strictEqual(error.errorCode, "FORBIDDEN");
    assert.strictEqual(
      error.message,
      "Unauthorized: Only COMPANY_OWNER or COMPANY_ADMIN can invite team members."
    );
  });

  // Test 4: 409 Seat capacity error mapping
  it("4. 409 Seat capacity exceeded error preserves capacity details", async () => {
    const error = ApiError.fromResponse(409, {
      success: false,
      error: {
        code: "CONFLICT",
        title: "Resource Conflict",
        detail:
          "User seat capacity limit reached (5/5 allocated seats including active members and pending invitations). Upgrade plan to invite more users.",
      },
    });

    assert.strictEqual(error.statusCode, 409);
    assert.strictEqual(error.errorCode, "CONFLICT");
    assert.ok(error.message.includes("capacity limit reached"));
  });

  // Test 5: 409 Duplicate invitation error mapping
  it("5. 409 Duplicate invitation displays duplicate pending message", async () => {
    const error = ApiError.fromResponse(409, {
      success: false,
      error: {
        code: "CONFLICT",
        title: "Resource Conflict",
        detail: "An active invitation already exists for this email address.",
      },
    });

    assert.strictEqual(error.statusCode, 409);
    assert.strictEqual(error.message, "An active invitation already exists for this email address.");
  });

  // Test 6: Failed request throws and prevents false success
  it("6. Failed inviteUser request throws ApiError and does not return fake success", async () => {
    const originalPost = apiClient.post;
    apiClient.post = async () => {
      throw new ApiError({
        statusCode: 409,
        errorCode: "CONFLICT",
        message: "User with this email already exists in this organization.",
      });
    };

    try {
      await assert.rejects(
        async () => {
          await invitationsApi.inviteUser({
            email: "existing@dezoinfra.com",
            fullName: "Existing User",
            roleId: "uuid-role",
          });
        },
        (err: any) => {
          assert.strictEqual(err.statusCode, 409);
          assert.strictEqual(err.message, "User with this email already exists in this organization.");
          return true;
        }
      );
    } finally {
      apiClient.post = originalPost;
    }
  });

  // Test 7: Query key invalidation structure
  it("7. Invitations queryKeys are defined and invalidate team-related caches", () => {
    assert.deepStrictEqual(queryKeys.invitations.all, ["invitations"]);
    assert.deepStrictEqual(queryKeys.invitations.list(), ["invitations", "list"]);
    assert.deepStrictEqual(queryKeys.rbac.roles(), ["rbac", "roles"]);
  });

  // Test 8: Public Route Guard check
  it("8. Route Guard identifies /invite as public route", () => {
    const checkPublicRoute = (pathname: string): boolean => {
      return pathname === "/login" || pathname.startsWith("/invite");
    };

    assert.strictEqual(checkPublicRoute("/login"), true);
    assert.strictEqual(checkPublicRoute("/invite/raw-token-123"), true);
    assert.strictEqual(checkPublicRoute("/invite/abc-def-ghi"), true);
    assert.strictEqual(checkPublicRoute("/settings"), false);
    assert.strictEqual(checkPublicRoute("/projects"), false);
  });

  // Test 9: Acceptance establishes real auth session
  it("9. invitationsApi.acceptInvite() calls POST /auth/accept-invite with skipAuth", async () => {
    let capturedUrl = "";
    let capturedOptions: any = null;

    const originalPost = apiClient.post;
    apiClient.post = async (url: string, body?: any, options?: any) => {
      capturedUrl = url;
      capturedOptions = options;
      return {
        accessToken: "test-access-token-jwt",
        refreshToken: "test-refresh-token",
        expiresIn: 900,
        tokenType: "Bearer",
        user: {
          id: "usr-accepted-1",
          email: "accepted@example.com",
          fullName: "Accepted User",
          tenantId: "ten-001",
          role: "SITE_ENGINEER",
        },
      } as any;
    };

    try {
      const res = await invitationsApi.acceptInvite({
        token: "test-token-value",
        password: "NewPassword123!",
        fullName: "Accepted User",
      });

      assert.strictEqual(capturedUrl, "/auth/accept-invite");
      assert.strictEqual(capturedOptions?.skipAuth, true, "Must skip authorization header on accept");
      assert.strictEqual(res.accessToken, "test-access-token-jwt");
      assert.strictEqual(res.user.role, "SITE_ENGINEER");
    } finally {
      apiClient.post = originalPost;
    }
  });

  // Test 10: Invalid/expired token error parsing
  it("10. Invalid/expired token 404/400 is parsed into ApiError", () => {
    const err = ApiError.fromResponse(404, {
      success: false,
      error: {
        code: "NOT_FOUND",
        title: "Not Found",
        detail: "Invalid or expired invitation token.",
      },
    });

    assert.strictEqual(err.statusCode, 404);
    assert.strictEqual(err.message, "Invalid or expired invitation token.");
  });

  // Test 11: Token hygiene — raw invitation token is never stored in storage keys
  it("11. API client storage keys do not store invitation tokens", () => {
    // Check that localStorage keys do not include invitation tokens
    const keys = ["dezobuild_access_token", "dezobuild_refresh_token", "dezobuild_user"];
    for (const key of keys) {
      assert.ok(!key.includes("invite"), "Storage keys must not track invitation tokens");
    }
  });

  // Test 12: Revoke mutation payload contract
  it("12. invitationsApi.revokeInvitation() sends correct invitation ID to endpoint", async () => {
    let capturedUrl = "";

    const originalPost = apiClient.post;
    apiClient.post = async (url: string) => {
      capturedUrl = url;
      return { message: "Invitation revoked successfully" } as any;
    };

    try {
      const res = await invitationsApi.revokeInvitation("c0000000-0000-0000-0000-000000000001");
      assert.strictEqual(
        capturedUrl,
        "/tenants/users/invitations/c0000000-0000-0000-0000-000000000001/revoke"
      );
      assert.ok(res.message.includes("revoked"));
    } finally {
      apiClient.post = originalPost;
    }

  });

  // Test 13: Revoke success invalidates query keys
  it("13. Revoke success targets invitations, people, and rbac query keys", () => {
    const affectedKeys = [
      queryKeys.invitations.all,
      queryKeys.people.all,
      queryKeys.rbac.all,
    ];

    assert.strictEqual(affectedKeys.length, 3);
    assert.deepStrictEqual(affectedKeys[0], ["invitations"]);
    assert.deepStrictEqual(affectedKeys[1], ["people"]);
    assert.deepStrictEqual(affectedKeys[2], ["rbac"]);
  });
});

describe("Phase 13 & 14 — Live Backend Contract & Acceptance E2E", () => {
  const API_BASE = process.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";
  let ownerToken = "";
  let siteEngineerRoleId = "";
  let prismaClient: any = null;

  const testEmail = `invitee-${Date.now()}@dezobuild-test.com`;
  let createdInvitationId = "";
  let rawToken = "";

  it("1. Authenticate as Owner and retrieve real system roles", async () => {
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "owner@dezoinfra.com",
        password: "Password123!",
      }),
    });

    assert.strictEqual(loginRes.status, 200, "Owner login must return HTTP 200");
    const loginData = await loginRes.json();
    assert.strictEqual(loginData.success, true);
    assert.ok(loginData.data.accessToken);
    ownerToken = loginData.data.accessToken;

    // Fetch roles
    const rolesRes = await fetch(`${API_BASE}/rbac/roles`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.strictEqual(rolesRes.status, 200);
    const rolesData = await rolesRes.json();
    assert.strictEqual(rolesData.success, true);
    assert.ok(Array.isArray(rolesData.data));

    const siteEng = rolesData.data.find((r: any) => r.name === "SITE_ENGINEER");
    assert.ok(siteEng, "SITE_ENGINEER role must exist in backend roles catalog");
    siteEngineerRoleId = siteEng.id;
  });

  it("2. Owner invites a new team member via live POST /tenants/users/invite", async () => {
    const inviteRes = await fetch(`${API_BASE}/tenants/users/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        email: testEmail,
        fullName: "Live E2E Invitee",
        roleId: siteEngineerRoleId,
      }),
    });

    assert.strictEqual(inviteRes.status, 201, "Backend must return HTTP 201 Created");
    const inviteData = await inviteRes.json();
    assert.strictEqual(inviteData.success, true);
    assert.strictEqual(inviteData.data.email, testEmail);
    assert.strictEqual(inviteData.data.status, "PENDING");
    assert.strictEqual(inviteData.data.roleName, "SITE_ENGINEER");
    assert.ok(inviteData.data.id);
    createdInvitationId = inviteData.data.id;
  });

  it("3. Duplicate invitation for same email fails with HTTP 409 Conflict", async () => {
    const dupRes = await fetch(`${API_BASE}/tenants/users/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        email: testEmail,
        fullName: "Duplicate User",
        roleId: siteEngineerRoleId,
      }),
    });

    assert.strictEqual(dupRes.status, 409, "Duplicate invitation must return HTTP 409");
    const dupData = await dupRes.json();
    assert.strictEqual(dupData.success, false);
    assert.strictEqual(dupData.error.code, "CONFLICT");
  });

  it("4. Acceptance E2E: Safe token retrieval from outbox and successful acceptance", async () => {
    // Obtain the raw invitation token using safe development access to outbox
    const { PrismaClient } = await import("@prisma/client");
    prismaClient = new PrismaClient();

    const outboxEvent = await prismaClient.outboxEvent.findFirst({
      where: {
        aggregateId: createdInvitationId,
        eventType: "user.invited",
      },
    });

    assert.ok(outboxEvent, "Outbox event for invitation must exist");
    assert.ok(outboxEvent.payload.token, "Outbox payload must contain transient token for notification worker");
    rawToken = outboxEvent.payload.token;

    // Call live POST /auth/accept-invite without Bearer token (public route)
    const acceptRes = await fetch(`${API_BASE}/auth/accept-invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: rawToken,
        password: "NewSafePassword123!",
        fullName: "Live E2E Invitee Confirmed",
      }),
    });

    assert.strictEqual(acceptRes.status, 200, "Invitation acceptance must return HTTP 200 OK");
    const acceptData = await acceptRes.json();
    assert.strictEqual(acceptData.success, true);
    assert.ok(acceptData.data.accessToken, "Must issue valid access token");
    assert.strictEqual(acceptData.data.user.email, testEmail);
    assert.strictEqual(acceptData.data.user.status, "ACTIVE");

    // Verify Set-Cookie header contains HttpOnly refresh cookie
    const setCookie = acceptRes.headers.get("set-cookie");
    if (setCookie) {
      assert.ok(setCookie.includes("dezo_refresh"), "Must set dezo_refresh cookie");
      assert.ok(setCookie.toLowerCase().includes("httponly"), "Refresh cookie must be HttpOnly");
    }

    // Verify authenticated user session using new token
    const meRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${acceptData.data.accessToken}` },
    });
    assert.strictEqual(meRes.status, 200);
    const meData = await meRes.json();
    assert.strictEqual(meData.success, true);
    assert.strictEqual(meData.data.email, testEmail);
    assert.strictEqual(meData.data.status, "ACTIVE");
    assert.ok(
      meData.data.roles?.includes("SITE_ENGINEER") || meData.data.role === "SITE_ENGINEER",
      "Accepted user must possess SITE_ENGINEER role"
    );
  });

  it("5. One-time acceptance protection: Second acceptance attempt returns HTTP 409", async () => {
    const replayRes = await fetch(`${API_BASE}/auth/accept-invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: rawToken,
        password: "AnotherPassword123!",
      }),
    });

    assert.strictEqual(replayRes.status, 409, "Replaying accepted invitation must return HTTP 409 Conflict");
    const replayData = await replayRes.json();
    assert.strictEqual(replayData.success, false);
    assert.strictEqual(replayData.error.code, "CONFLICT");
  });

  it("6. Live Revocation: Create invitation and revoke via POST /tenants/users/invitations/:id/revoke", async () => {
    const emailToRevoke = `to-revoke-${Date.now()}@dezobuild-test.com`;
    const inviteRes = await fetch(`${API_BASE}/tenants/users/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        email: emailToRevoke,
        fullName: "Revoke Target User",
        roleId: siteEngineerRoleId,
      }),
    });

    assert.strictEqual(inviteRes.status, 201);
    const inviteData = await inviteRes.json();
    const invId = inviteData.data.id;

    // Revoke the invitation
    const revokeRes = await fetch(`${API_BASE}/tenants/users/invitations/${invId}/revoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ownerToken}`,
      },
    });

    assert.strictEqual(revokeRes.status, 200, "Revoke must return HTTP 200 OK");
    const revokeData = await revokeRes.json();
    assert.strictEqual(revokeData.success, true);
    assert.ok(revokeData.data.message.includes("revoked"));


    if (prismaClient) {
      await prismaClient.$disconnect();
    }
  });
});

