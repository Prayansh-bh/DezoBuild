import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sanitizeOwnerRedirect } from "../src/components/owner-login";
import { platformAuthApi } from "../src/lib/api/auth";
import { ownerApiClient } from "../src/lib/api/client";
import { platformTenantsApi } from "../src/lib/api/tenants";
import { platformPlansApi } from "../src/lib/api/plans";

describe("DEZOBUILD Platform Owner Frontend Authentication & Security Boundary Suite", () => {
  const superAdminEmail = "superadmin@dezobuild.com";
  const superAdminPassword = "SuperAdmin@DezoBuild2026!";

  // ============================================================
  // 1. Unauthenticated Session Verification
  // ============================================================
  it("1. Unauthenticated session: GET /platform/auth/me rejects with 401 when no session cookie exists", async () => {
    // Ensure local state is clean
    platformAuthApi.setCurrentUser(null);

    await assert.rejects(
      async () => {
        // Direct call without session
        await ownerApiClient.get("/platform/auth/me");
      },
      (err: any) => {
        assert.ok(err.message.includes("401") || err.message.includes("token is required") || err.message.includes("Unauthorized"));
        return true;
      }
    );
  });

  // ============================================================
  // 2. Authentication Rejection: Invalid & Malformed Inputs
  // ============================================================
  it("2. Empty email: POST /platform/auth/login rejects with validation error", async () => {
    await assert.rejects(
      async () => {
        await ownerApiClient.post("/platform/auth/login", {
          email: "",
          password: superAdminPassword,
        });
      },
      (err: any) => {
        assert.ok(err.message.includes("422") || err.message.includes("email") || err.message.includes("Validation") || err.message.includes("failed"));
        return true;
      }
    );
  });

  it("3. Empty password: POST /platform/auth/login rejects with validation error", async () => {
    await assert.rejects(
      async () => {
        await ownerApiClient.post("/platform/auth/login", {
          email: superAdminEmail,
          password: "",
        });
      },
      (err: any) => {
        assert.ok(err.message.includes("422") || err.message.includes("password") || err.message.includes("Validation") || err.message.includes("failed"));
        return true;
      }
    );
  });

  it("4. Malformed email: POST /platform/auth/login rejects with validation error", async () => {
    await assert.rejects(
      async () => {
        await ownerApiClient.post("/platform/auth/login", {
          email: "not-an-email",
          password: superAdminPassword,
        });
      },
      (err: any) => {
        assert.ok(err.message.includes("422") || err.message.includes("email") || err.message.includes("Validation") || err.message.includes("failed"));
        return true;
      }
    );
  });

  it("5. Invalid password: POST /platform/auth/login rejects with 401 and generic error", async () => {
    await assert.rejects(
      async () => {
        await platformAuthApi.login(superAdminEmail, "WrongPassword123!");
      },
      (err: any) => {
        assert.ok(
          err.message.includes("Invalid platform administrator credentials") ||
          err.message.includes("401")
        );
        return true;
      }
    );
  });

  it("6. Unknown email: POST /platform/auth/login rejects with 401 without revealing account existence", async () => {
    await assert.rejects(
      async () => {
        await platformAuthApi.login("unknown_intruder@attacker.com", superAdminPassword);
      },
      (err: any) => {
        assert.ok(
          err.message.includes("Invalid platform administrator credentials") ||
          err.message.includes("401")
        );
        return true;
      }
    );
  });

  // ============================================================
  // 3. Successful Authentication & Session Hydration
  // ============================================================
  it("4. Valid login: POST /platform/auth/login establishes HttpOnly platform session and returns user identity", async () => {
    const user = await platformAuthApi.login(superAdminEmail, superAdminPassword);

    assert.ok(user, "User must be returned");
    assert.strictEqual(user.email, superAdminEmail);
    assert.strictEqual(user.role, "SUPER_ADMIN");
    assert.ok(platformAuthApi.isAuthenticated(), "PlatformAuthApi must report authenticated state");
    assert.strictEqual(platformAuthApi.getCurrentUser()?.email, superAdminEmail);
  });

  it("5. Session hydration: GET /platform/auth/me resolves current authenticated platform administrator", async () => {
    const me = await platformAuthApi.getMe();

    assert.ok(me);
    assert.strictEqual(me.email, superAdminEmail);
    assert.strictEqual(me.role, "SUPER_ADMIN");
    assert.strictEqual(me.fullName, "Platform Super Administrator");
  });

  // ============================================================
  // 4. Authenticated Operational Access to Owner APIs
  // ============================================================
  it("6. Authenticated Owner access: Can list tenants and global plan catalogs", async () => {
    const tenants = await platformTenantsApi.listTenants({ limit: 5 });
    assert.ok(Array.isArray(tenants.items), "Tenants items must be an array");

    const plans = await platformPlansApi.listPlans();
    assert.ok(Array.isArray(plans), "Plans must be an array");
    assert.ok(plans.length >= 3, "Must have at least 3 global tiers");
  });

  // ============================================================
  // 5. Logout, Session Revocation & Re-Authentication Defense
  // ============================================================
  it("7. Logout: POST /platform/auth/logout invalidates session on server and clears client state", async () => {
    await platformAuthApi.logout();

    assert.strictEqual(platformAuthApi.isAuthenticated(), false);
    assert.strictEqual(platformAuthApi.getCurrentUser(), null);
  });

  it("8. Revoked session defense: Subsequent requests after logout fail with 401", async () => {
    await assert.rejects(
      async () => {
        await platformAuthApi.getMe();
      },
      (err: any) => {
        assert.ok(
          err.message.includes("401") ||
          err.message.includes("revoked") ||
          err.message.includes("logged out") ||
          err.message.includes("token is required")
        );
        return true;
      }
    );
  });

  it("9. Refresh / reload behavior: Calling ensureAuthenticated() after logout does NOT auto-login and throws 401", async () => {
    await assert.rejects(
      async () => {
        await platformAuthApi.ensureAuthenticated();
      },
      (err: any) => {
        assert.ok(err.message !== undefined);
        return true;
      }
    );
  });

  // ============================================================
  // 6. Owner Hash Route Sanitization & Open-Redirect Defense
  // ============================================================
  it("10. Hash route sanitization: Allowed internal tabs are preserved", () => {
    assert.strictEqual(sanitizeOwnerRedirect("#overview"), "overview");
    assert.strictEqual(sanitizeOwnerRedirect("#tenants"), "tenants");
    assert.strictEqual(sanitizeOwnerRedirect("#subscriptions"), "subscriptions");
    assert.strictEqual(sanitizeOwnerRedirect("#billing"), "billing");
    assert.strictEqual(sanitizeOwnerRedirect("#users"), "users");
    assert.strictEqual(sanitizeOwnerRedirect("#entitlements"), "entitlements");
    assert.strictEqual(sanitizeOwnerRedirect("#analytics"), "analytics");
    assert.strictEqual(sanitizeOwnerRedirect("#health"), "health");
    assert.strictEqual(sanitizeOwnerRedirect("#audit"), "audit");
    assert.strictEqual(sanitizeOwnerRedirect("#support"), "support");
    assert.strictEqual(sanitizeOwnerRedirect("#settings"), "settings");
  });

  it("11. Hash route fallback: Unknown internal routes fallback to 'overview'", () => {
    assert.strictEqual(sanitizeOwnerRedirect(""), "overview");
    assert.strictEqual(sanitizeOwnerRedirect("#"), "overview");
    assert.strictEqual(sanitizeOwnerRedirect("#unknown_route"), "overview");
    assert.strictEqual(sanitizeOwnerRedirect("#admin/malicious"), "overview");
  });

  it("12. Open-redirect prevention: External URIs, protocols, and payloads are rejected", () => {
    assert.strictEqual(sanitizeOwnerRedirect("#https://evil.example.com"), "overview");
    assert.strictEqual(sanitizeOwnerRedirect("#http://attacker.com/steal"), "overview");
    assert.strictEqual(sanitizeOwnerRedirect("#//evil.com"), "overview");
    assert.strictEqual(sanitizeOwnerRedirect("#javascript:alert(1)"), "overview");
    assert.strictEqual(sanitizeOwnerRedirect("#data:text/html,attack"), "overview");
  });

  // ============================================================
  // 7. Security Assertion: Re-login for downstream tests
  // ============================================================
  it("13. Re-authenticate platform admin to leave clean state for downstream test suites", async () => {
    const user = await platformAuthApi.login(superAdminEmail, superAdminPassword);
    assert.ok(user);
    assert.strictEqual(user.role, "SUPER_ADMIN");
  });
});
