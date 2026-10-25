import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { DatabaseService } from "../src/database/database.service";
import { TenancyService } from "../src/modules/tenancy/services/tenancy.service";
import { TenancyController } from "../src/modules/tenancy/tenancy.controller";
import { TokenService } from "../src/modules/auth/services/token.service";
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from "../src/common/errors/app-error";
import type { IncomingMessage } from "node:http";

describe("Phase 03 — Tenancy, Company, Branch, Department Isolation Suite", () => {
  let dbService: DatabaseService;
  let tenancyService: TenancyService;
  let tenancyController: TenancyController;
  let tokenService: TokenService;

  // Tenant A Fixtures
  const tenantAId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const userAId = "aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa";
  let tokenA: string;

  // Tenant B Fixtures
  const tenantBId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  const userBId = "bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb";
  let tokenB: string;

  let companyAId: string;
  let companyBId: string;
  let branchAId: string;
  let deptAId: string;
  let deptBId: string;

  before(async () => {
    dbService = DatabaseService.getInstance();
    await dbService.connect();

    tenancyService = TenancyService.getInstance();
    tenancyController = new TenancyController(tenancyService);
    tokenService = TokenService.getInstance();

    const prisma = dbService.getClient();

    const newTenantId = "33333333-3333-3333-3333-333333333333";

    // Clean up any stale test fixtures
    await prisma.branch.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId, newTenantId] } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId, newTenantId] } } });
    await prisma.department.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId, newTenantId] } } });
    await prisma.session.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId, newTenantId] } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId, newTenantId] } } });
    await prisma.tenant.deleteMany({ where: { OR: [{ id: { in: [tenantAId, tenantBId, newTenantId] } }, { code: "PLATFORM-PROVISIONED" }] } });

    // 1. Create Tenant A & Tenant B in PostgreSQL
    await tenancyService.createTenant({
      id: tenantAId,
      code: "TENANT-A-CORP",
      name: "Tenant Alpha Construction Ltd",
    });

    await tenancyService.createTenant({
      id: tenantBId,
      code: "TENANT-B-INFRA",
      name: "Tenant Beta Infrastructure Ltd",
    });

    // Generate authenticated tokens for Tenant A and Tenant B users
    tokenA = tokenService.createAccessToken({
      userId: userAId,
      tenantId: tenantAId,
      sessionId: "session-a-1",
      sessionVersion: 1,
    });

    tokenB = tokenService.createAccessToken({
      userId: userBId,
      tenantId: tenantBId,
      sessionId: "session-b-1",
      sessionVersion: 1,
    });
  });

  after(async () => {
    try {
      const prisma = dbService.getClient();
      await prisma.branch.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.company.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.department.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.session.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
    } finally {
      await dbService.disconnect();
    }
  });

  // Helper to create mock authenticated request
  function createAuthReq(token: string, extra: Record<string, any> = {}): IncomingMessage {
    return {
      headers: {
        authorization: `Bearer ${token}`,
        ...extra.headers,
      },
      body: extra.body,
      params: extra.params,
      query: extra.query,
      socket: {},
    } as unknown as IncomingMessage;
  }

  // ==========================================
  // 1. TENANT MANAGEMENT & CONSTRAINTS
  // ==========================================

  it("1. Tenant retrieval returns own tenant details and rejects cross-tenant access", async () => {
    // Tenant A caller gets Tenant A
    const reqA = createAuthReq(tokenA, { params: { id: tenantAId } });
    const resA = await tenancyController.getTenant(reqA);
    assert.equal(resA.success, true);
    assert.equal(resA.data.id, tenantAId);
    assert.equal(resA.data.code, "TENANT-A-CORP");

    // Tenant A caller attempting to read Tenant B via ID is rejected with 403 Forbidden
    const crossReq = createAuthReq(tokenA, { params: { id: tenantBId } });
    await assert.rejects(
      async () => {
        await tenancyController.getTenant(crossReq);
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.match(err.message, /foreign tenant/i);
        return true;
      },
    );
  });

  it("2. Duplicate tenant code is strictly rejected with 409 Conflict", async () => {
    await assert.rejects(
      async () => {
        await tenancyService.createTenant({
          code: "TENANT-A-CORP", // Duplicate
          name: "Another Alpha Corp",
        });
      },
      (err: any) => {
        assert.ok(err instanceof ConflictError);
        assert.match(err.message, /already registered/i);
        return true;
      },
    );
  });

  // ==========================================
  // 2. COMPANY CREATION & TENANT SCOPING
  // ==========================================

  it("3. Creates companies under Tenant A and Tenant B with tenant-scoped uniqueness", async () => {
    // Create Company A under Tenant A
    const compA = await tenancyService.createCompany(tenantAId, {
      code: "CORP-HQ",
      name: "Alpha Projects Legal Ltd",
      legalName: "Alpha Projects Legal Limited",
      panNumber: "AAACA1234A",
      gstin: "29AAACA1234A1Z5",
      email: "finance@alpha.com",
      phone: "080-12345678",
      address: "100 MG Road, Central Mall",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
    });
    companyAId = compA.id;
    assert.equal(compA.tenantId, tenantAId);
    assert.equal(compA.code, "CORP-HQ");

    // Create Company B under Tenant B using the SAME code "CORP-HQ" (Allowed across different tenants)
    const compB = await tenancyService.createCompany(tenantBId, {
      code: "CORP-HQ", // Same code, different tenant
      name: "Beta Infra Legal Ltd",
      legalName: "Beta Infra Legal Limited",
      panNumber: "BBBCB1234B",
      gstin: "27BBBCB1234B1Z2",
      email: "finance@beta.com",
      phone: "022-87654321",
      address: "200 BKC Avenue",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400051",
    });
    companyBId = compB.id;
    assert.equal(compB.tenantId, tenantBId);
    assert.equal(compB.code, "CORP-HQ");

    // Attempting duplicate company code within the SAME tenant (Tenant A) must fail with 409
    await assert.rejects(
      async () => {
        await tenancyService.createCompany(tenantAId, {
          code: "CORP-HQ",
          name: "Duplicate Alpha Co",
          legalName: "Duplicate Alpha Company",
          panNumber: "AAACA9999Z",
          gstin: "29AAACA9999Z1Z5",
          email: "dup@alpha.com",
          phone: "080-99999999",
          address: "100 MG Road",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560001",
        });
      },
      (err: any) => {
        assert.ok(err instanceof ConflictError);
        assert.match(err.message, /already exists in this tenant/i);
        return true;
      },
    );
  });

  // ==========================================
  // 3. BRANCH & PARENT HIERARCHY INTEGRITY
  // ==========================================

  it("4. Creates branch under parent company and validates hierarchy integrity", async () => {
    // Valid branch under Tenant A's Company A
    const branch = await tenancyService.createBranch(tenantAId, {
      companyId: companyAId,
      code: "BR-BLR",
      name: "Bengaluru Regional Branch",
      gstin: "29AAACA1234A1Z5",
      city: "Bengaluru",
      state: "Karnataka",
    });
    branchAId = branch.id;
    assert.equal(branch.tenantId, tenantAId);
    assert.equal(branch.companyId, companyAId);
    assert.equal(branch.code, "BR-BLR");

    // Attempting to attach a branch to a Company belonging to Tenant B while authenticated as Tenant A must fail
    await assert.rejects(
      async () => {
        await tenancyService.createBranch(tenantAId, {
          companyId: companyBId, // Foreign company belonging to Tenant B
          code: "BR-HIJACK",
          name: "Hijacked Branch",
          gstin: "29AAACA1234A1Z5",
          city: "Bengaluru",
          state: "Karnataka",
        });
      },
      (err: any) => {
        assert.ok(err instanceof NotFoundError);
        assert.match(err.message, /Parent company not found in this tenant/i);
        return true;
      },
    );
  });

  // ==========================================
  // 4. DEPARTMENT SCOPED UNIQUENESS
  // ==========================================

  it("5. Department allows same code across tenants, rejects duplicates within same tenant", async () => {
    // Dept under Tenant A
    const deptA = await tenancyService.createDepartment(tenantAId, {
      code: "CIVIL",
      name: "Civil Engineering & Structural",
      description: "Concrete and masonry operations",
    });
    deptAId = deptA.id;
    assert.equal(deptA.tenantId, tenantAId);
    assert.equal(deptA.code, "CIVIL");

    // Dept under Tenant B with SAME code "CIVIL" (Allowed)
    const deptB = await tenancyService.createDepartment(tenantBId, {
      code: "CIVIL",
      name: "Civil Operations Beta",
    });
    deptBId = deptB.id;
    assert.equal(deptB.tenantId, tenantBId);
    assert.equal(deptB.code, "CIVIL");

    // Duplicate within Tenant A (Rejected with 409)
    await assert.rejects(
      async () => {
        await tenancyService.createDepartment(tenantAId, {
          code: "CIVIL",
          name: "Duplicate Civil Dept",
        });
      },
      (err: any) => {
        assert.ok(err instanceof ConflictError);
        assert.match(err.message, /already exists in this tenant/i);
        return true;
      },
    );
  });

  // ==========================================
  // 5. CROSS-TENANT READ ISOLATION (IDOR)
  // ==========================================

  it("6. Tenant A caller CANNOT read Tenant B company (IDOR protected)", async () => {
    // Tenant A reads own company: Success
    const reqA = createAuthReq(tokenA, { params: { id: companyAId } });
    const resA = await tenancyController.getCompany(reqA);
    assert.equal(resA.data.id, companyAId);

    // Tenant A caller passes valid UUID of Tenant B company: 404 Not Found
    const reqCross = createAuthReq(tokenA, { params: { id: companyBId } });
    await assert.rejects(
      async () => {
        await tenancyController.getCompany(reqCross);
      },
      (err: any) => {
        assert.ok(err instanceof NotFoundError);
        assert.equal(err.message, "Company not found.");
        return true;
      },
    );
  });

  it("7. Tenant A caller CANNOT read Tenant B department (IDOR protected)", async () => {
    const reqCross = createAuthReq(tokenA, { params: { id: deptBId } });
    await assert.rejects(
      async () => {
        await tenancyController.getDepartment(reqCross);
      },
      (err: any) => {
        assert.ok(err instanceof NotFoundError);
        assert.equal(err.message, "Department not found.");
        return true;
      },
    );
  });

  // ==========================================
  // 6. CROSS-TENANT WRITE & DELETE ISOLATION
  // ==========================================

  it("8. Tenant A caller CANNOT update Tenant B company", async () => {
    const reqCross = createAuthReq(tokenA, {
      params: { id: companyBId },
      body: { name: "Maliciously Modified Name" },
    });

    await assert.rejects(
      async () => {
        await tenancyController.updateCompany(reqCross);
      },
      (err: any) => {
        assert.ok(err instanceof NotFoundError);
        assert.equal(err.message, "Company not found.");
        return true;
      },
    );
  });

  it("9. Tenant A caller CANNOT delete Tenant B company", async () => {
    const reqCross = createAuthReq(tokenA, { params: { id: companyBId } });

    await assert.rejects(
      async () => {
        await tenancyController.deleteCompany(reqCross);
      },
      (err: any) => {
        assert.ok(err instanceof NotFoundError);
        assert.equal(err.message, "Company not found.");
        return true;
      },
    );
  });

  // ==========================================
  // 7. BRANCH & DEPARTMENT CROSS-TENANT IDOR
  // ==========================================

  it("10. Tenant A caller CANNOT read/update/delete Tenant B branch (IDOR protected)", async () => {
    // Create Branch B under Tenant B
    const branchB = await tenancyService.createBranch(tenantBId, {
      companyId: companyBId,
      code: "BR-MUM",
      name: "Mumbai Branch",
      gstin: "27BBBCB1234B1Z2",
      city: "Mumbai",
      state: "Maharashtra",
    });

    // Read Branch B as Tenant A -> 404
    const reqRead = createAuthReq(tokenA, { params: { id: branchB.id } });
    await assert.rejects(
      async () => {
        await tenancyController.getBranch(reqRead);
      },
      (err: any) => {
        assert.ok(err instanceof NotFoundError);
        assert.equal(err.message, "Branch not found.");
        return true;
      },
    );

    // Update Branch B as Tenant A -> 404
    const reqUpdate = createAuthReq(tokenA, {
      params: { id: branchB.id },
      body: { name: "Hacked Branch" },
    });
    await assert.rejects(
      async () => {
        await tenancyController.updateBranch(reqUpdate);
      },
      (err: any) => {
        assert.ok(err instanceof NotFoundError);
        assert.equal(err.message, "Branch not found.");
        return true;
      },
    );

    // Delete Branch B as Tenant A -> 404
    const reqDelete = createAuthReq(tokenA, { params: { id: branchB.id } });
    await assert.rejects(
      async () => {
        await tenancyController.deleteBranch(reqDelete);
      },
      (err: any) => {
        assert.ok(err instanceof NotFoundError);
        assert.equal(err.message, "Branch not found.");
        return true;
      },
    );
  });

  it("11. Tenant A caller CANNOT update/delete Tenant B department (IDOR protected)", async () => {
    // Update Department B as Tenant A -> 404
    const reqUpdate = createAuthReq(tokenA, {
      params: { id: deptBId },
      body: { name: "Hacked Dept" },
    });
    await assert.rejects(
      async () => {
        await tenancyController.updateDepartment(reqUpdate);
      },
      (err: any) => {
        assert.ok(err instanceof NotFoundError);
        assert.equal(err.message, "Department not found.");
        return true;
      },
    );

    // Delete Department B as Tenant A -> 404
    const reqDelete = createAuthReq(tokenA, { params: { id: deptBId } });
    await assert.rejects(
      async () => {
        await tenancyController.deleteDepartment(reqDelete);
      },
      (err: any) => {
        assert.ok(err instanceof NotFoundError);
        assert.equal(err.message, "Department not found.");
        return true;
      },
    );
  });

  it("12. Tenant A caller CANNOT update Tenant B details (403 Forbidden)", async () => {
    const reqCross = createAuthReq(tokenA, {
      params: { id: tenantBId },
      body: { name: "Hacked Tenant Name" },
    });

    await assert.rejects(
      async () => {
        await tenancyController.updateTenant(reqCross);
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.match(err.message, /foreign tenant/i);
        return true;
      },
    );
  });

  // ==========================================
  // 8. TENANT CREATION PLATFORM BOUNDARY
  // ==========================================

  it("13. Ordinary customer user CANNOT create arbitrary tenants via API (403 Forbidden)", async () => {
    const reqCustomer = createAuthReq(tokenA, {
      body: {
        code: "ROGUE-TENANT",
        name: "Rogue Tenant Corp",
      },
    });

    await assert.rejects(
      async () => {
        await tenancyController.createTenant(reqCustomer);
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.match(err.message, /Tenant provisioning is strictly restricted/i);
        return true;
      },
    );
  });

  it("14. Platform administrator context CAN provision a new tenant", async () => {
    const platformToken = tokenService.createAccessToken({
      userId: "platform-admin-uuid",
      tenantId: "PLATFORM",
      sessionId: "platform-session-1",
      sessionVersion: 1,
    });

    const newTenantId = "33333333-3333-3333-3333-333333333333";
    const reqPlatform = createAuthReq(platformToken, {
      body: {
        id: newTenantId,
        code: "PLATFORM-PROVISIONED",
        name: "Platform Provisioned Tenant",
      },
    });

    const res = await tenancyController.createTenant(reqPlatform);
    assert.equal(res.success, true);
    assert.equal(res.data.id, newTenantId);
    assert.equal(res.data.code, "PLATFORM-PROVISIONED");

    // Clean up created fixture
    const prisma = dbService.getClient();
    await prisma.tenant.delete({ where: { id: newTenantId } });
  });

  it("15. Unauthenticated request to create tenant fails with 401 Unauthorized", async () => {
    const unauthReq = {
      headers: {},
      body: { code: "UNAUTH-TENANT", name: "Unauth Corp" },
    } as unknown as IncomingMessage;

    await assert.rejects(
      async () => {
        await tenancyController.createTenant(unauthReq);
      },
      (err: any) => {
        assert.ok(err instanceof UnauthorizedError);
        assert.equal(err.message, "Authentication token is required.");
        return true;
      },
    );
  });

  // ==========================================
  // 9. LIST QUERIES STRICT REPOSITORY SCOPING
  // ==========================================

  it("16. List endpoints return ONLY the caller's tenant resources", async () => {
    const reqA = createAuthReq(tokenA);
    const resA = await tenancyController.listCompanies(reqA);
    assert.equal(resA.data.length, 1);
    assert.equal(resA.data[0]!.id, companyAId);
    assert.equal(resA.data[0]!.tenantId, tenantAId);

    const reqB = createAuthReq(tokenB);
    const resB = await tenancyController.listCompanies(reqB);
    assert.equal(resB.data.length, 1);
    assert.equal(resB.data[0]!.id, companyBId);
    assert.equal(resB.data[0]!.tenantId, tenantBId);
  });

  // ==========================================
  // 10. NEGATIVE SECURITY & SPOOFING
  // ==========================================

  it("17. Client-provided spoofed X-Tenant-Id header is strictly ignored", async () => {
    // Tenant A caller passes X-Tenant-Id pointing to Tenant B
    const spoofedReq = createAuthReq(tokenA, {
      headers: { "x-tenant-id": tenantBId },
    });

    // The list endpoint must STILL return Tenant A's companies, NOT Tenant B's
    const res = await tenancyController.listCompanies(spoofedReq);
    assert.equal(res.data.length, 1);
    assert.equal(res.data[0]!.tenantId, tenantAId);
    assert.notEqual(res.data[0]!.tenantId, tenantBId);
  });

  it("18. Unauthenticated request to tenancy endpoints fails with 401 Unauthorized", async () => {
    const unauthReq = {
      headers: {},
      params: { id: companyAId },
    } as unknown as IncomingMessage;

    await assert.rejects(
      async () => {
        await tenancyController.getCompany(unauthReq);
      },
      (err: any) => {
        assert.ok(err instanceof UnauthorizedError);
        assert.equal(err.message, "Authentication token is required.");
        return true;
      },
    );
  });
});
