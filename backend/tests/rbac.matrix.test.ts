import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_PERMISSIONS,
  ALL_CANONICAL_PERMISSION_NAMES,
} from '../src/modules/rbac/constants/permissions.catalog';
import {
  AUTHORITATIVE_CUSTOMER_ROLES,
  PLATFORM_ROLE,
  ROLE_DEFINITIONS,
  ROLE_PERMISSION_MATRIX,
} from '../src/modules/rbac/constants/role-permission.matrix';

describe('DEZOBUILD Phase 04 — RBAC Canonical Matrix & Invariants', () => {
  it('should define exactly the 9 authoritative customer roles', () => {
    const expectedRoles = [
      'COMPANY_OWNER',
      'COMPANY_ADMIN',
      'PROJECT_MANAGER',
      'SITE_ENGINEER',
      'PROCUREMENT_STORE',
      'ACCOUNTANT',
      'HR',
      'EMPLOYEE',
      'VIEWER',
    ];

    assert.equal(AUTHORITATIVE_CUSTOMER_ROLES.length, 9);
    assert.deepEqual(Array.from(AUTHORITATIVE_CUSTOMER_ROLES).sort(), expectedRoles.sort());
    assert.equal(PLATFORM_ROLE, 'SUPER_ADMIN');
  });

  it('should not contain any forbidden legacy role names', () => {
    const forbiddenRoles = [
      'TENANT_OWNER',
      'BILLING_ENGINEER',
      'PURCHASE_MANAGER',
      'STORE_KEEPER',
      'QUALITY_ENGINEER',
      'SAFETY_OFFICER',
    ];

    for (const forbidden of forbiddenRoles) {
      assert.equal(
        (AUTHORITATIVE_CUSTOMER_ROLES as readonly string[]).includes(forbidden),
        false,
        `Forbidden legacy role '${forbidden}' must not exist in AUTHORITATIVE_CUSTOMER_ROLES`
      );
      assert.equal(
        ROLE_DEFINITIONS.some((r) => r.name === (forbidden as any)),
        false,
        `Forbidden legacy role '${forbidden}' must not exist in ROLE_DEFINITIONS`
      );
      assert.equal(
        forbidden in ROLE_PERMISSION_MATRIX,
        false,
        `Forbidden legacy role '${forbidden}' must not exist in ROLE_PERMISSION_MATRIX`
      );
    }
  });

  it('should define unique canonical permissions following domain:entity:action taxonomy', () => {
    assert.ok(CANONICAL_PERMISSIONS.length >= 40, 'Must define at least 40 canonical permissions');
    const names = CANONICAL_PERMISSIONS.map((p) => p.name);
    const uniqueNames = new Set(names);
    assert.equal(names.length, uniqueNames.size, 'All permission names must be unique');

    for (const perm of CANONICAL_PERMISSIONS) {
      assert.match(
        perm.name,
        /^[a-z]+:[a-z]+(:[a-z]+)?$/,
        `Permission '${perm.name}' must follow domain:entity:action taxonomy`
      );
      assert.ok(perm.module.length > 0, `Permission '${perm.name}' must have a module`);
      assert.ok(perm.description.length > 0, `Permission '${perm.name}' must have a description`);
    }
  });

  it('should ensure all permissions referenced in the matrix exist in the canonical catalog', () => {
    const validPermsSet = new Set(ALL_CANONICAL_PERMISSION_NAMES);

    for (const role of AUTHORITATIVE_CUSTOMER_ROLES) {
      const assignedPerms = ROLE_PERMISSION_MATRIX[role];
      assert.ok(Array.isArray(assignedPerms), `Role ${role} must have an array of permissions`);

      for (const perm of assignedPerms) {
        assert.ok(
          validPermsSet.has(perm),
          `Role '${role}' references undefined permission '${perm}'`
        );
      }
    }
  });

  it('should enforce specific role-permission matrix invariants', () => {
    // COMPANY_OWNER has ALL canonical permissions
    assert.equal(
      ROLE_PERMISSION_MATRIX.COMPANY_OWNER.length,
      ALL_CANONICAL_PERMISSION_NAMES.length,
      'COMPANY_OWNER must possess all canonical permissions'
    );

    // COMPANY_ADMIN has all EXCEPT final disbursement
    assert.equal(
      ROLE_PERMISSION_MATRIX.COMPANY_ADMIN.includes('finance:payment:disburse'),
      false,
      'COMPANY_ADMIN must not possess finance:payment:disburse'
    );
    assert.ok(
      ROLE_PERMISSION_MATRIX.COMPANY_ADMIN.includes('settings:manage'),
      'COMPANY_ADMIN must possess settings:manage'
    );
    assert.ok(
      ROLE_PERMISSION_MATRIX.COMPANY_ADMIN.includes('settings:rbac:manage'),
      'COMPANY_ADMIN must possess settings:rbac:manage'
    );

    // PROJECT_MANAGER has DPR approval and WBS edit
    assert.ok(
      ROLE_PERMISSION_MATRIX.PROJECT_MANAGER.includes('projects:dpr:approve'),
      'PROJECT_MANAGER must possess projects:dpr:approve'
    );
    assert.ok(
      ROLE_PERMISSION_MATRIX.PROJECT_MANAGER.includes('projects:wbs:edit'),
      'PROJECT_MANAGER must possess projects:wbs:edit'
    );

    // SITE_ENGINEER has DPR creation/submission but not approval
    assert.ok(
      ROLE_PERMISSION_MATRIX.SITE_ENGINEER.includes('projects:dpr:create'),
      'SITE_ENGINEER must possess projects:dpr:create'
    );
    assert.ok(
      ROLE_PERMISSION_MATRIX.SITE_ENGINEER.includes('projects:dpr:submit'),
      'SITE_ENGINEER must possess projects:dpr:submit'
    );
    assert.equal(
      ROLE_PERMISSION_MATRIX.SITE_ENGINEER.includes('projects:dpr:approve'),
      false,
      'SITE_ENGINEER must not possess projects:dpr:approve'
    );

    // PROCUREMENT_STORE has store issue & PO create
    assert.ok(
      ROLE_PERMISSION_MATRIX.PROCUREMENT_STORE.includes('materials:stock:issue'),
      'PROCUREMENT_STORE must possess materials:stock:issue'
    );
    assert.ok(
      ROLE_PERMISSION_MATRIX.PROCUREMENT_STORE.includes('materials:po:create'),
      'PROCUREMENT_STORE must possess materials:po:create'
    );

    // VIEWER has read-only view permissions
    for (const perm of ROLE_PERMISSION_MATRIX.VIEWER) {
      assert.ok(
        perm.endsWith(':view') || perm.endsWith(':export'),
        `VIEWER role should only contain view/export permissions, found '${perm}'`
      );
    }
  });
});
