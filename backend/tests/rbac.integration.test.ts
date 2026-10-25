import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseService } from '../src/database/database.service';
import { TokenService } from '../src/modules/auth/services/token.service';
import { RbacSeederService } from '../src/modules/rbac/services/rbac-seeder.service';
import { RbacService } from '../src/modules/rbac/services/rbac.service';
import { AuthorizationService } from '../src/modules/rbac/services/authorization.service';
import { PrismaRoleRepository } from '../src/modules/rbac/repositories/prisma-role.repository';
import { PrismaPermissionRepository } from '../src/modules/rbac/repositories/prisma-permission.repository';
import { PrismaUserRoleRepository } from '../src/modules/rbac/repositories/prisma-user-role.repository';
import { PrismaProjectMemberRepository } from '../src/modules/rbac/repositories/prisma-project-member.repository';
import { PrismaStoreAccessRepository } from '../src/modules/rbac/repositories/prisma-store-access.repository';
import { RbacController } from '../src/modules/rbac/rbac.controller';
import { ForbiddenError, NotFoundError } from '../src/common/errors/app-error';
import type { IncomingMessage } from 'node:http';

describe('DEZOBUILD Phase 04 — RBAC, Permissions, Project Scope & Store Scope Integration Suite', () => {
  let dbService: DatabaseService;
  let prisma: any;
  let tokenService: TokenService;
  let rbacService: RbacService;
  let authService: AuthorizationService;
  let rbacController: RbacController;
  let userRoleRepo: PrismaUserRoleRepository;

  // Tenant Fixtures
  const tenantAId = 'cccccccc-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const tenantBId = 'cccccccc-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  // Users in Tenant A
  const ownerAId = 'aaaa0001-0000-0000-0000-000000000001';
  const adminAId = 'aaaa0002-0000-0000-0000-000000000002';
  const pmAId = 'aaaa0003-0000-0000-0000-000000000003';
  const seAId = 'aaaa0004-0000-0000-0000-000000000004';
  const storeAId = 'aaaa0005-0000-0000-0000-000000000005';
  const viewerAId = 'aaaa0006-0000-0000-0000-000000000006';
  const empAId = 'aaaa0007-0000-0000-0000-000000000007';

  // Users in Tenant B
  const ownerBId = 'bbbb0001-0000-0000-0000-000000000001';

  // JWT Tokens
  let tokenOwnerA: string;
  let tokenAdminA: string;
  let tokenPmA: string;
  let tokenSeA: string;
  let tokenStoreA: string;
  let tokenViewerA: string;
  let tokenEmpA: string;
  let tokenOwnerB: string;

  // Role IDs
  let roleOwnerId: string;
  let roleAdminId: string;
  let rolePmId: string;
  let roleSeId: string;
  let roleStoreId: string;
  let roleViewerId: string;
  let roleEmpId: string;

  // Resource IDs
  let companyAId: string;
  let project1Id: string;
  let project2Id: string;
  let store1Id: string;
  let store2Id: string;

  function mockRequest(token: string, body?: any, params?: any, headers?: Record<string, string>): IncomingMessage {
    return {
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        ...headers,
      },
      body,
      params,
    } as unknown as IncomingMessage;
  }

  before(async () => {
    dbService = DatabaseService.getInstance();
    await dbService.connect();
    prisma = dbService.getClient();
    tokenService = TokenService.getInstance();

    const roleRepo = new PrismaRoleRepository(prisma);
    const permRepo = new PrismaPermissionRepository(prisma);
    userRoleRepo = new PrismaUserRoleRepository(prisma);
    const projectMemberRepo = new PrismaProjectMemberRepository(prisma);
    const storeAccessRepo = new PrismaStoreAccessRepository(prisma);

    rbacService = new RbacService(prisma, userRoleRepo, roleRepo, projectMemberRepo, storeAccessRepo);
    authService = new AuthorizationService(prisma, userRoleRepo, projectMemberRepo, storeAccessRepo);
    rbacController = new RbacController(rbacService, authService, roleRepo, permRepo);

    // Clean up test data
    await prisma.storeAccessAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.store.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.projectMember.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.project.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.session.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.branch.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.department.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });

    // Seed system RBAC permissions & roles
    const seeder = new RbacSeederService(prisma);
    await seeder.seedAll();

    // Fetch seeded role IDs
    const roles = await prisma.role.findMany({ where: { tenantId: null, isSystemRole: true } });
    roleOwnerId = roles.find((r: any) => r.name === 'COMPANY_OWNER')!.id;
    roleAdminId = roles.find((r: any) => r.name === 'COMPANY_ADMIN')!.id;
    rolePmId = roles.find((r: any) => r.name === 'PROJECT_MANAGER')!.id;
    roleSeId = roles.find((r: any) => r.name === 'SITE_ENGINEER')!.id;
    roleStoreId = roles.find((r: any) => r.name === 'PROCUREMENT_STORE')!.id;
    roleViewerId = roles.find((r: any) => r.name === 'VIEWER')!.id;
    roleEmpId = roles.find((r: any) => r.name === 'EMPLOYEE')!.id;

    // Create Tenants
    await prisma.tenant.create({
      data: {
        id: tenantAId,
        code: 'TENANT_RBAC_A',
        name: 'RBAC Tenant Alpha Corp',
        status: 'ACTIVE',
      },
    });

    await prisma.tenant.create({
      data: {
        id: tenantBId,
        code: 'TENANT_RBAC_B',
        name: 'RBAC Tenant Beta Ltd',
        status: 'ACTIVE',
      },
    });

    // Create Company for Tenant A
    const companyA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        code: 'COMP_A',
        name: 'Alpha Infra Buildcon Pvt Ltd',
        legalName: 'Alpha Infra Buildcon Private Limited',
        panNumber: 'AAACA0000A',
        gstin: '27AAACA0000A1Z5',
        email: 'info@alphabuildcon.com',
        phone: '+91 9999900001',
        address: '100 Construction Way',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    });
    companyAId = companyA.id;

    // Create Users in Tenant A
    const passHash = '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEF';
    await prisma.user.createMany({
      data: [
        { id: ownerAId, tenantId: tenantAId, email: 'owner@alpha.com', fullName: 'Alice Owner', passwordHash: passHash },
        { id: adminAId, tenantId: tenantAId, email: 'admin@alpha.com', fullName: 'Bob Admin', passwordHash: passHash },
        { id: pmAId, tenantId: tenantAId, email: 'pm@alpha.com', fullName: 'Charlie PM', passwordHash: passHash },
        { id: seAId, tenantId: tenantAId, email: 'se@alpha.com', fullName: 'Dave Engineer', passwordHash: passHash },
        { id: storeAId, tenantId: tenantAId, email: 'store@alpha.com', fullName: 'Eve Storekeeper', passwordHash: passHash },
        { id: viewerAId, tenantId: tenantAId, email: 'viewer@alpha.com', fullName: 'Frank Viewer', passwordHash: passHash },
        { id: empAId, tenantId: tenantAId, email: 'emp@alpha.com', fullName: 'George Employee', passwordHash: passHash },
      ],
    });

    // Create User in Tenant B
    await prisma.user.create({
      data: {
        id: ownerBId,
        tenantId: tenantBId,
        email: 'owner@beta.com',
        fullName: 'Zara Beta Owner',
        passwordHash: passHash,
      },
    });

    // Assign Initial Roles
    await userRoleRepo.assignRole({ tenantId: tenantAId, userId: ownerAId, roleId: roleOwnerId });
    await userRoleRepo.assignRole({ tenantId: tenantAId, userId: adminAId, roleId: roleAdminId });
    await userRoleRepo.assignRole({ tenantId: tenantAId, userId: pmAId, roleId: rolePmId });
    await userRoleRepo.assignRole({ tenantId: tenantAId, userId: seAId, roleId: roleSeId });
    await userRoleRepo.assignRole({ tenantId: tenantAId, userId: storeAId, roleId: roleStoreId });
    await userRoleRepo.assignRole({ tenantId: tenantAId, userId: viewerAId, roleId: roleViewerId });
    await userRoleRepo.assignRole({ tenantId: tenantAId, userId: empAId, roleId: roleEmpId });
    await userRoleRepo.assignRole({ tenantId: tenantBId, userId: ownerBId, roleId: roleOwnerId });

    // Generate JWT Tokens
    tokenOwnerA = tokenService.createAccessToken({ userId: ownerAId, tenantId: tenantAId, sessionId: 's-owner-a', sessionVersion: 1 });
    tokenAdminA = tokenService.createAccessToken({ userId: adminAId, tenantId: tenantAId, sessionId: 's-admin-a', sessionVersion: 1 });
    tokenPmA = tokenService.createAccessToken({ userId: pmAId, tenantId: tenantAId, sessionId: 's-pm-a', sessionVersion: 1 });
    tokenSeA = tokenService.createAccessToken({ userId: seAId, tenantId: tenantAId, sessionId: 's-se-a', sessionVersion: 1 });
    tokenStoreA = tokenService.createAccessToken({ userId: storeAId, tenantId: tenantAId, sessionId: 's-store-a', sessionVersion: 1 });
    tokenViewerA = tokenService.createAccessToken({ userId: viewerAId, tenantId: tenantAId, sessionId: 's-viewer-a', sessionVersion: 1 });
    tokenEmpA = tokenService.createAccessToken({ userId: empAId, tenantId: tenantAId, sessionId: 's-emp-a', sessionVersion: 1 });
    tokenOwnerB = tokenService.createAccessToken({ userId: ownerBId, tenantId: tenantBId, sessionId: 's-owner-b', sessionVersion: 1 });

    // Create Projects in Tenant A
    const p1 = await prisma.project.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        code: 'PRJ-ALPHA-101',
        name: 'Skyline Commercial Towers',
        status: 'ACTIVE',
      },
    });
    project1Id = p1.id;

    const p2 = await prisma.project.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        code: 'PRJ-ALPHA-102',
        name: 'Metro Line Overpass Bridge',
        status: 'ACTIVE',
      },
    });
    project2Id = p2.id;

    // Create Stores in Tenant A
    const s1 = await prisma.store.create({
      data: {
        tenantId: tenantAId,
        code: 'STORE-CENTRAL-01',
        name: 'Central Yard Warehouse',
        isCentralWarehouse: true,
        status: 'ACTIVE',
      },
    });
    store1Id = s1.id;

    const s2 = await prisma.store.create({
      data: {
        tenantId: tenantAId,
        projectId: project1Id,
        code: 'STORE-SITE-101',
        name: 'Skyline Site Store',
        isCentralWarehouse: false,
        status: 'ACTIVE',
      },
    });
    store2Id = s2.id;
  });

  after(async () => {
    if (prisma) {
      await prisma.storeAccessAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.store.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.projectMember.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.project.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.session.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.branch.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.company.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.department.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
    }
    if (dbService) {
      await dbService.disconnect();
    }
  });

  // ========================================================
  // 1. LIVE DATABASE PERMISSION RESOLUTION & MATRIX AUDIT
  // ========================================================

  it('should resolve live database permissions for COMPANY_OWNER with full authority', async () => {
    const permissions = await authService.getUserPermissions(tenantAId, ownerAId);
    assert.ok(permissions.length >= 40, 'Owner should have at least 40 permissions');
    assert.ok(permissions.includes('finance:payment:disburse'), 'Owner should have final disburse authority');
    assert.ok(permissions.includes('projects:dpr:approve'), 'Owner should have DPR approval');
    assert.ok(permissions.includes('settings:rbac:manage'), 'Owner should have RBAC manage');
  });

  it('should resolve permissions for COMPANY_ADMIN excluding finance:payment:disburse', async () => {
    const permissions = await authService.getUserPermissions(tenantAId, adminAId);
    assert.equal(permissions.includes('finance:payment:disburse'), false, 'Admin must not have disburse');
    assert.ok(permissions.includes('settings:rbac:manage'), 'Admin should have RBAC manage');
    assert.ok(permissions.includes('settings:manage'), 'Admin should have settings:manage');
  });

  it('should resolve permissions for SITE_ENGINEER with DPR submission but without DPR approval', async () => {
    const permissions = await authService.getUserPermissions(tenantAId, seAId);
    assert.ok(permissions.includes('projects:dpr:create'));
    assert.ok(permissions.includes('projects:dpr:submit'));
    assert.equal(permissions.includes('projects:dpr:approve'), false, 'Site Engineer cannot approve DPR');
    assert.equal(permissions.includes('settings:rbac:manage'), false, 'Site Engineer cannot manage RBAC');
  });

  it('should strictly ignore client-supplied role or permission headers and resolve from database', async () => {
    const req = mockRequest(tokenSeA, undefined, undefined, {
      'x-role': 'COMPANY_OWNER',
      'x-permissions': 'finance:payment:disburse,projects:dpr:approve',
    });

    const res = await rbacController.getMyPermissions(req);
    assert.equal(res.success, true);
    assert.deepEqual(res.data.roles, ['SITE_ENGINEER']);
    assert.equal(res.data.permissions.includes('finance:payment:disburse'), false);
    assert.equal(res.data.permissions.includes('projects:dpr:approve'), false);
  });

  // ========================================================
  // 2. PRIVILEGE ESCALATION PREVENTION
  // ========================================================

  it('should prevent non-admin user (Site Engineer) from assigning any role', async () => {
    await assert.rejects(
      async () => {
        await rbacService.assignRole({
          tenantId: tenantAId,
          assignerUserId: seAId,
          targetUserId: viewerAId,
          roleId: roleAdminId,
        });
      },
      {
        message: /Unauthorized: Only COMPANY_OWNER or COMPANY_ADMIN can assign roles/,
      }
    );
  });

  it('should prevent EMPLOYEE from assigning or becoming COMPANY_OWNER', async () => {
    await assert.rejects(
      async () => {
        await rbacService.assignRole({
          tenantId: tenantAId,
          assignerUserId: empAId,
          targetUserId: empAId,
          roleId: roleOwnerId,
        });
      },
      {
        message: /Unauthorized: Only COMPANY_OWNER or COMPANY_ADMIN can assign roles/,
      }
    );
  });

  it('should prevent COMPANY_ADMIN from assigning COMPANY_OWNER or COMPANY_ADMIN roles', async () => {
    await assert.rejects(
      async () => {
        await rbacService.assignRole({
          tenantId: tenantAId,
          assignerUserId: adminAId,
          targetUserId: viewerAId,
          roleId: roleOwnerId,
        });
      },
      {
        message: /Unauthorized: COMPANY_ADMIN cannot assign COMPANY_OWNER or COMPANY_ADMIN roles/,
      }
    );
  });

  it('should allow COMPANY_OWNER to assign COMPANY_ADMIN role to a user', async () => {
    const assignment = await rbacService.assignRole({
      tenantId: tenantAId,
      assignerUserId: ownerAId,
      targetUserId: pmAId,
      roleId: roleAdminId,
    });

    assert.ok(assignment.id);
    assert.equal(assignment.userId, pmAId);
    assert.equal(assignment.roleId, roleAdminId);

    const userRoles = await rbacService.getUserRoles(tenantAId, pmAId);
    assert.ok(userRoles.some((r) => r.role?.name === 'COMPANY_ADMIN'));

    // Revert assignment
    await rbacService.removeRole({
      tenantId: tenantAId,
      assignerUserId: ownerAId,
      targetUserId: pmAId,
      roleId: roleAdminId,
    });
  });

  it('should prevent cross-tenant role assignment', async () => {
    await assert.rejects(
      async () => {
        await rbacService.assignRole({
          tenantId: tenantAId,
          assignerUserId: ownerAId,
          targetUserId: ownerBId,
          roleId: roleAdminId,
        });
      },
      {
        message: /does not exist in tenant/,
      }
    );
  });

  it('should prevent removing the last COMPANY_OWNER from a tenant', async () => {
    await assert.rejects(
      async () => {
        await rbacService.removeRole({
          tenantId: tenantAId,
          assignerUserId: ownerAId,
          targetUserId: ownerAId,
          roleId: roleOwnerId,
        });
      },
      {
        message: /Cannot remove the last COMPANY_OWNER/,
      }
    );
  });

  // ========================================================
  // 3. ORGANIZATION-WIDE ADMIN SCOPE & PERMISSION CHECK
  // ========================================================

  it('should enforce that organization-wide admin scope does NOT bypass permission requirements', async () => {
    // COMPANY_ADMIN has organization-wide scope, but lacks finance:payment:disburse
    const disburseAccess = await authService.hasProjectAccess(
      tenantAId,
      adminAId,
      project1Id,
      'finance:payment:disburse'
    );
    assert.equal(disburseAccess.granted, false, 'Admin must be DENIED when lacking required permission');
    assert.match(disburseAccess.reason!, /Missing required permission: finance:payment:disburse/);

    // COMPANY_ADMIN with a permission they possess (projects:dpr:submit) -> ALLOW
    const allowedAccess = await authService.hasProjectAccess(
      tenantAId,
      adminAId,
      project1Id,
      'projects:dpr:submit'
    );
    assert.equal(allowedAccess.granted, true, 'Admin must be GRANTED when possessing required permission');
  });

  // ========================================================
  // 4. PROJECT SCOPING & MEMBERSHIP
  // ========================================================

  it('should grant organization-wide project access to COMPANY_OWNER and COMPANY_ADMIN without membership', async () => {
    const accessOwner1 = await authService.hasProjectAccess(tenantAId, ownerAId, project1Id);
    const accessOwner2 = await authService.hasProjectAccess(tenantAId, ownerAId, project2Id);
    assert.equal(accessOwner1.granted, true);
    assert.equal(accessOwner2.granted, true);

    const accessAdmin1 = await authService.hasProjectAccess(tenantAId, adminAId, project1Id);
    const accessAdmin2 = await authService.hasProjectAccess(tenantAId, adminAId, project2Id);
    assert.equal(accessAdmin1.granted, true);
    assert.equal(accessAdmin2.granted, true);
  });

  it('should enforce strict project membership: Permission + Project A -> ALLOW, Permission + Project B -> DENY', async () => {
    await rbacService.addProjectMember({
      tenantId: tenantAId,
      projectId: project1Id,
      userId: pmAId,
      projectRole: 'PROJECT_MANAGER',
      isLead: true,
    });

    // PM has permission + Project 1 -> ALLOW
    const accessPm1 = await authService.hasProjectAccess(tenantAId, pmAId, project1Id, 'projects:dpr:approve');
    assert.equal(accessPm1.granted, true);

    // PM has permission + Project 2 (not member) -> DENY
    const accessPm2 = await authService.hasProjectAccess(tenantAId, pmAId, project2Id, 'projects:dpr:approve');
    assert.equal(accessPm2.granted, false);
    assert.match(accessPm2.reason!, /not a member of this project/);

    // User without permission + Project 1 -> DENY
    const noPermAccess = await authService.hasProjectAccess(tenantAId, pmAId, project1Id, 'finance:payment:disburse');
    assert.equal(noPermAccess.granted, false);
    assert.match(noPermAccess.reason!, /Missing required permission/);
  });

  // ========================================================
  // 5. STORE SCOPING & ACCESS ASSIGNMENTS
  // ========================================================

  it('should grant organization-wide store access to COMPANY_OWNER and COMPANY_ADMIN', async () => {
    const accessOwnerStore1 = await authService.hasStoreAccess(tenantAId, ownerAId, store1Id);
    const accessOwnerStore2 = await authService.hasStoreAccess(tenantAId, ownerAId, store2Id);
    assert.equal(accessOwnerStore1.granted, true);
    assert.equal(accessOwnerStore2.granted, true);
  });

  it('should enforce strict store membership: Permission + Store A -> ALLOW, Permission + Store B -> DENY', async () => {
    await rbacService.grantStoreAccess({
      tenantId: tenantAId,
      storeId: store1Id,
      userId: storeAId,
      accessLevel: 'FULL',
    });

    // Store keeper has permission + Store 1 -> ALLOW
    const accessStore1 = await authService.hasStoreAccess(tenantAId, storeAId, store1Id, 'materials:stock:issue');
    assert.equal(accessStore1.granted, true);

    // Store keeper has permission + Store 2 (not assigned) -> DENY
    const accessStore2 = await authService.hasStoreAccess(tenantAId, storeAId, store2Id, 'materials:stock:issue');
    assert.equal(accessStore2.granted, false);
    assert.match(accessStore2.reason!, /does not have access to this store/);

    // Store keeper without permission + Store 1 -> DENY
    const noPermStoreAccess = await authService.hasStoreAccess(tenantAId, storeAId, store1Id, 'finance:payment:disburse');
    assert.equal(noPermStoreAccess.granted, false);
    assert.match(noPermStoreAccess.reason!, /Missing required permission/);
  });

  // ========================================================
  // 6. LIVE AUTHORITY & IMMEDIATE ROLE CHANGE REFLECTION
  // ========================================================

  it('should immediately reflect role changes in live authority without relying on JWT claims', async () => {
    // Initial: Viewer has only view permissions
    let hasDprSubmit = await authService.hasPermission(tenantAId, viewerAId, 'projects:dpr:submit');
    assert.equal(hasDprSubmit, false);

    // Assign Site Engineer role to Viewer in database
    await userRoleRepo.assignRole({ tenantId: tenantAId, userId: viewerAId, roleId: roleSeId });

    // Live check using the same user: immediately sees new permissions
    hasDprSubmit = await authService.hasPermission(tenantAId, viewerAId, 'projects:dpr:submit');
    assert.equal(hasDprSubmit, true, 'Live database authority must immediately grant newly assigned permissions');

    // Remove Site Engineer role
    await userRoleRepo.removeRole(tenantAId, viewerAId, roleSeId);

    // Live check: immediately revoked
    hasDprSubmit = await authService.hasPermission(tenantAId, viewerAId, 'projects:dpr:submit');
    assert.equal(hasDprSubmit, false, 'Live database authority must immediately revoke removed permissions');
  });

  // ========================================================
  // 7. HTTP ENDPOINTS & CONTROLLER AUDIT
  // ========================================================

  it('GET /api/v1/rbac/permissions should return all canonical permissions', async () => {
    const req = mockRequest(tokenOwnerA);
    const res = await rbacController.listPermissions(req);
    assert.equal(res.success, true);
    assert.ok(res.data.length >= 40);
  });

  it('GET /api/v1/rbac/roles should return available system roles', async () => {
    const req = mockRequest(tokenOwnerA);
    const res = await rbacController.listRoles(req);
    assert.equal(res.success, true);
    assert.equal(res.data.length, 9);
  });

  it('POST & DELETE /api/v1/rbac/projects/:projectId/members through controller', async () => {
    const addReq = mockRequest(
      tokenAdminA,
      { userId: seAId, projectRole: 'SITE_ENGINEER', isLead: false },
      { projectId: project1Id }
    );
    const addRes = await rbacController.addProjectMember(addReq);
    assert.equal(addRes.success, true);
    assert.equal(addRes.data.userId, seAId);

    const listReq = mockRequest(tokenAdminA, undefined, { projectId: project1Id });
    const listRes = await rbacController.listProjectMembers(listReq);
    assert.equal(listRes.success, true);
    assert.ok(listRes.data.some((m: any) => m.userId === seAId));

    const delReq = mockRequest(tokenAdminA, undefined, { projectId: project1Id, userId: seAId });
    const delRes = await rbacController.removeProjectMember(delReq);
    assert.equal(delRes.success, true);
    assert.equal(delRes.data.success, true);
  });

  it('POST & DELETE /api/v1/rbac/stores/:storeId/access through controller', async () => {
    const grantReq = mockRequest(
      tokenAdminA,
      { userId: seAId, accessLevel: 'READ_ONLY' },
      { storeId: store2Id }
    );
    const grantRes = await rbacController.grantStoreAccess(grantReq);
    assert.equal(grantRes.success, true);
    assert.equal(grantRes.data.userId, seAId);

    const listReq = mockRequest(tokenAdminA, undefined, { storeId: store2Id });
    const listRes = await rbacController.listStoreUsers(listReq);
    assert.equal(listRes.success, true);
    assert.ok(listRes.data.some((u: any) => u.userId === seAId));

    const revokeReq = mockRequest(tokenAdminA, undefined, { storeId: store2Id, userId: seAId });
    const revokeRes = await rbacController.revokeStoreAccess(revokeReq);
    assert.equal(revokeRes.success, true);
    assert.equal(revokeRes.data.success, true);
  });
});
