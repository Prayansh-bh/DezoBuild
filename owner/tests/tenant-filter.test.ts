import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapTenantFilterToStatus } from "../src/routes/tenants";

describe("Platform Owner Tenant Filter Contract Mapping", () => {
  it("should map 'all' filter to undefined (no status query parameter)", () => {
    const result = mapTenantFilterToStatus("all");
    assert.strictEqual(result, undefined);
  });

  it("should map 'active' filter to 'ACTIVE'", () => {
    const result = mapTenantFilterToStatus("active");
    assert.strictEqual(result, "ACTIVE");
  });

  it("should map 'delinquent' filter to 'DELINQUENT'", () => {
    const result = mapTenantFilterToStatus("delinquent");
    assert.strictEqual(result, "DELINQUENT");
  });

  it("should map 'suspended' filter to 'SUSPENDED'", () => {
    const result = mapTenantFilterToStatus("suspended");
    assert.strictEqual(result, "SUSPENDED");
  });

  it("should map 'trialing' filter strictly to 'TRIAL' (never TRIALING)", () => {
    const result = mapTenantFilterToStatus("trialing");
    assert.strictEqual(result, "TRIAL");
    assert.notStrictEqual(result, "TRIALING");
  });

  it("should construct valid query strings for all UI filter buttons", () => {
    const filters = ["all", "active", "trialing", "delinquent", "suspended"] as const;
    const expectedQueryStrings: Record<string, string> = {
      all: "",
      active: "?status=ACTIVE",
      trialing: "?status=TRIAL",
      delinquent: "?status=DELINQUENT",
      suspended: "?status=SUSPENDED",
    };

    for (const filter of filters) {
      const status = mapTenantFilterToStatus(filter);
      const query = new URLSearchParams();
      if (status) query.set("status", status);
      const queryString = query.toString() ? `?${query.toString()}` : "";
      assert.strictEqual(queryString, expectedQueryStrings[filter]);
    }
  });

  it("should verify live backend API accepts GET /api/v1/platform/tenants?status=TRIAL with HTTP 200", async () => {
    // 1. Authenticate to get session cookie
    const loginRes = await fetch("http://localhost:4000/api/v1/platform/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "superadmin@dezobuild.com",
        password: "SuperAdmin@DezoBuild2026!",
      }),
    });
    assert.strictEqual(loginRes.status, 200);
    const cookie = loginRes.headers.get("set-cookie") || "";

    // 2. Fetch with status=TRIAL (Expected: 200 OK, not 422)
    const trialRes = await fetch("http://localhost:4000/api/v1/platform/tenants?status=TRIAL", {
      headers: { Cookie: cookie },
    });
    assert.strictEqual(trialRes.status, 200, "status=TRIAL must return 200 OK");
    const trialData = await trialRes.json();
    assert.strictEqual(trialData.success, true);
    assert.ok(Array.isArray(trialData.data.items));

    // 3. Confirm that status=TRIALING would still be rejected with 422 by backend contract
    const invalidRes = await fetch("http://localhost:4000/api/v1/platform/tenants?status=TRIALING", {
      headers: { Cookie: cookie },
    });
    assert.strictEqual(invalidRes.status, 422, "status=TRIALING must be rejected by backend contract with 422");
  });
});
