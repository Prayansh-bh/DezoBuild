/**
 * DEZOBUILD — Role Hydration & Negative Safety Test Suite
 * 
 * Validates:
 * 1. Missing role -> safely resolves to CustomerRole.VIEWER (no privilege escalation)
 * 2. Unknown / spoofed role -> safely resolves to CustomerRole.VIEWER
 * 3. Invalid role values (null, empty, number, array) -> safely resolve to CustomerRole.VIEWER
 * 4. Valid roles (COMPANY_OWNER, COMPANY_ADMIN, PROJECT_MANAGER, SITE_ENGINEER, ACCOUNTANT)
 *    resolve to accurate role metadata and never throw ReferenceError: ROLE_DEFINITIONS is not defined.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CustomerRole, ROLE_DEFINITIONS } from "../src/authorization/roles";
import { mapUserToCurrentUser } from "../src/auth/context";

describe("DEZOBUILD Role Hydration & Negative Role Safety Gate", () => {
  it("1. Missing role in server payload resolves to least-privileged VIEWER (NOT COMPANY_OWNER)", () => {
    const apiUser = {
      id: "usr-001",
      email: "guest@dezoinfra.com",
      fullName: "Guest User",
      // role and roles omitted
    };

    const user = mapUserToCurrentUser(apiUser);
    assert.strictEqual(user.role, CustomerRole.VIEWER, "Missing role MUST default to VIEWER");
    assert.notStrictEqual(user.role, CustomerRole.COMPANY_OWNER, "Missing role MUST NOT escalate to COMPANY_OWNER");
    assert.strictEqual(user.title, ROLE_DEFINITIONS[CustomerRole.VIEWER].title);
  });

  it("2. Unknown / unrecognized role string resolves to least-privileged VIEWER", () => {
    const unknownRoles = ["SUPER_ADMIN", "ROOT", "HACKER", "RANDOM_ROLE", "admin", "owner"];

    for (const rawRole of unknownRoles) {
      const user = mapUserToCurrentUser({
        id: "usr-002",
        email: "test@dezoinfra.com",
        fullName: "Test User",
        role: rawRole,
      });

      assert.strictEqual(
        user.role,
        CustomerRole.VIEWER,
        `Unrecognized role '${rawRole}' must safely resolve to VIEWER`,
      );
      assert.notStrictEqual(user.role, CustomerRole.COMPANY_OWNER);
    }
  });

  it("3. Invalid role data types (null, undefined, empty string, empty array) resolve to VIEWER", () => {
    const invalidInputs = [
      { role: null },
      { role: undefined },
      { role: "" },
      { role: 12345 },
      { role: {} },
      { roles: [] },
      { roles: [null] },
      { roles: ["INVALID"] },
    ];

    for (const input of invalidInputs) {
      const user = mapUserToCurrentUser({
        id: "usr-003",
        email: "test@dezoinfra.com",
        fullName: "Test User",
        ...input,
      });

      assert.strictEqual(user.role, CustomerRole.VIEWER, "Invalid role data must safely resolve to VIEWER");
      assert.notStrictEqual(user.role, CustomerRole.COMPANY_OWNER);
    }
  });

  it("4. Valid demo personas resolve accurately with zero runtime exceptions", () => {
    const testMatrix = [
      {
        inputRole: "COMPANY_OWNER",
        expectedRole: CustomerRole.COMPANY_OWNER,
        expectedShortLabel: "OWNER",
        expectedDept: "Executive Leadership",
      },
      {
        inputRole: "COMPANY_ADMIN",
        expectedRole: CustomerRole.COMPANY_ADMIN,
        expectedShortLabel: "ADMIN",
        expectedDept: "Administration & Compliance",
      },
      {
        inputRole: "PROJECT_MANAGER",
        expectedRole: CustomerRole.PROJECT_MANAGER,
        expectedShortLabel: "PM",
        expectedDept: "Project Management",
      },
      {
        inputRole: "SITE_ENGINEER",
        expectedRole: CustomerRole.SITE_ENGINEER,
        expectedShortLabel: "SITE ENG",
        expectedDept: "Site Operations",
      },
      {
        inputRole: "ACCOUNTANT",
        expectedRole: CustomerRole.ACCOUNTANT,
        expectedShortLabel: "FINANCE",
        expectedDept: "Finance & Commercial",
      },
      {
        inputRole: "PROCUREMENT_STORE",
        expectedRole: CustomerRole.PROCUREMENT_STORE,
        expectedShortLabel: "STORE",
        expectedDept: "Procurement & Stores",
      },
      {
        inputRole: "HR",
        expectedRole: CustomerRole.HR,
        expectedShortLabel: "HR",
        expectedDept: "Operations",
      },
    ];

    for (const testCase of testMatrix) {
      const user = mapUserToCurrentUser({
        id: "usr-valid",
        email: "persona@dezoinfra.com",
        fullName: "Persona User",
        role: testCase.inputRole,
        roles: [testCase.inputRole],
      });

      assert.strictEqual(user.role, testCase.expectedRole);
      assert.strictEqual(user.department, testCase.expectedDept);
      
      const meta = ROLE_DEFINITIONS[user.role];
      assert.ok(meta, "ROLE_DEFINITIONS must have entry for resolved role");
      assert.strictEqual(meta.shortLabel, testCase.expectedShortLabel);
      assert.ok(user.title.length > 0);
    }
  });
});
