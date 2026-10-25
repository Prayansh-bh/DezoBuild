import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseService } from '../src/database/database.service';
import { TokenService } from '../src/modules/auth/services/token.service';
import { PasswordService } from '../src/modules/auth/services/password.service';
import { ApplicationServer } from '../src/common/http/server';
import type { AuthenticatedPrincipal } from '../src/modules/auth/auth.guard';
import http from 'node:http';

describe('DEZOBUILD Tenant Users Directory Integration Suite', () => {
  let dbService: DatabaseService;
  let prisma: any;
  let tokenService: TokenService;
  let passwordService: PasswordService;
  let appServer: ApplicationServer;
  let httpServer: http.Server;
  let httpPort: number;

  const tenantAId = 'ffff0001-aaaa-aaaa-aaaa-111111111111';
  const tenantBId = 'ffff0002-bbbb-bbbb-bbbb-222222222222';

  const ownerAId = 'ffff0010-0000-0000-0000-111111111111';
  const adminAId = 'ffff0010-0000-0000-0000-111111111112';
  const viewerAId = 'ffff0010-0000-0000-0000-111111111113';
  const multiRoleAId = 'ffff0010-0000-0000-0000-111111111114';
  const invitedAId = 'ffff0010-0000-0000-0000-111111111115';
  const expiredAId = 'ffff0010-0000-0000-0000-111111111116';
  const revokedAId = 'ffff0010-0000-0000-0000-111111111117';
  
  const ownerBId = 'ffff0020-0000-0000-0000-222222222221';

  let ownerRoleId: string;
  let adminRoleId: string;
  let siteEngRoleId: string;
  let viewerRoleId: string;

  const ownerAPrincipal: AuthenticatedPrincipal = { userId: ownerAId, tenantId: tenantAId, sessionId: 's-o-a', sessionVersion: 1 };
  const adminAPrincipal: AuthenticatedPrincipal = { userId: adminAId, tenantId: tenantAId, sessionId: 's-a-a', sessionVersion: 1 };
  const viewerAPrincipal: AuthenticatedPrincipal = { userId: viewerAId, tenantId: tenantAId, sessionId: 's-v-a', sessionVersion: 1 };
  const ownerBPrincipal: AuthenticatedPrincipal = { userId: ownerBId, tenantId: tenantBId, sessionId: 's-o-b', sessionVersion: 1 };

  let ownerAToken: string;
  let adminAToken: string;
  let viewerAToken: string;
  let ownerBToken: string;

  before(async () => {
    dbService = DatabaseService.getInstance();
    prisma = dbService.getClient();
    await dbService.connect();

    tokenService = TokenService.getInstance();
    passwordService = PasswordService.getInstance();
    appServer = new ApplicationServer();

    // Clean up test data
    await prisma.userInvitation.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.projectMember.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.project.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.employee.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.department.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });

    // Seed tenants
    await prisma.tenant.create({ data: { id: tenantAId, code: 'TU-TENANT-A', name: 'Tenant Users A' } });
    await prisma.tenant.create({ data: { id: tenantBId, code: 'TU-TENANT-B', name: 'Tenant Users B' } });

    // Ensure roles
    const ownerRole = await prisma.role.findFirst({ where: { name: 'COMPANY_OWNER' } });
    const adminRole = await prisma.role.findFirst({ where: { name: 'COMPANY_ADMIN' } });
    const siteEngRole = await prisma.role.findFirst({ where: { name: 'SITE_ENGINEER' } });
    const viewerRole = await prisma.role.findFirst({ where: { name: 'VIEWER' } });

    ownerRoleId = ownerRole!.id;
    adminRoleId = adminRole!.id;
    siteEngRoleId = siteEngRole!.id;
    viewerRoleId = viewerRole!.id;

    const dummyHash = await passwordService.hashPassword('Password@123');

    // Tenant A - Owner
    await prisma.user.create({
      data: { id: ownerAId, tenantId: tenantAId, email: 'owner.a@tu.com', fullName: 'Owner A', passwordHash: dummyHash, status: 'ACTIVE' },
    });
    await prisma.userRoleAssignment.create({ data: { tenantId: tenantAId, userId: ownerAId, roleId: ownerRoleId, scopeType: 'TENANT' } });

    // Tenant A - Admin
    await prisma.user.create({
      data: { id: adminAId, tenantId: tenantAId, email: 'admin.a@tu.com', fullName: 'Admin A', passwordHash: dummyHash, status: 'ACTIVE' },
    });
    await prisma.userRoleAssignment.create({ data: { tenantId: tenantAId, userId: adminAId, roleId: adminRoleId, scopeType: 'TENANT' } });

    // Tenant A - Viewer
    await prisma.user.create({
      data: { id: viewerAId, tenantId: tenantAId, email: 'viewer.a@tu.com', fullName: 'Viewer A', passwordHash: dummyHash, status: 'ACTIVE' },
    });
    await prisma.userRoleAssignment.create({ data: { tenantId: tenantAId, userId: viewerAId, roleId: viewerRoleId, scopeType: 'TENANT' } });

    // Tenant A - Multiple Roles, Employee, Projects
    await prisma.user.create({
      data: { id: multiRoleAId, tenantId: tenantAId, email: 'multi.a@tu.com', fullName: 'Multi A', passwordHash: dummyHash, status: 'ACTIVE' },
    });
    // Multi-role assignment
    await prisma.userRoleAssignment.create({ data: { tenantId: tenantAId, userId: multiRoleAId, roleId: siteEngRoleId, scopeType: 'TENANT' } });
    await prisma.userRoleAssignment.create({ data: { tenantId: tenantAId, userId: multiRoleAId, roleId: viewerRoleId, scopeType: 'TENANT' } });

    // Tenant A - Invited (Pending)
    await prisma.user.create({
      data: { id: invitedAId, tenantId: tenantAId, email: 'inv.a@tu.com', fullName: 'Invited A', status: 'INVITED', passwordHash: dummyHash },
    });
    await prisma.userInvitation.create({
      data: { tenant: { connect: { id: tenantAId } }, user: { connect: { id: invitedAId } }, role: { connect: { id: viewerRoleId } }, invitedBy: { connect: { id: ownerAId } }, email: 'inv.a@tu.com', tokenHash: 'dummy1', status: 'PENDING', expiresAt: new Date(Date.now() + 86400000) }
    });

    // Tenant A - Expired
    await prisma.user.create({
      data: { id: expiredAId, tenantId: tenantAId, email: 'exp.a@tu.com', fullName: 'Expired A', status: 'INVITED', passwordHash: dummyHash },
    });
    await prisma.userInvitation.create({
      data: { tenant: { connect: { id: tenantAId } }, user: { connect: { id: expiredAId } }, role: { connect: { id: viewerRoleId } }, invitedBy: { connect: { id: ownerAId } }, email: 'exp.a@tu.com', tokenHash: 'dummy2', status: 'PENDING', expiresAt: new Date(Date.now() - 86400000) }
    });

    // Tenant A - Revoked
    await prisma.user.create({
      data: { id: revokedAId, tenantId: tenantAId, email: 'rev.a@tu.com', fullName: 'Revoked A', status: 'REVOKED', passwordHash: dummyHash },
    });
    await prisma.userInvitation.create({
      data: { tenant: { connect: { id: tenantAId } }, user: { connect: { id: revokedAId } }, role: { connect: { id: viewerRoleId } }, invitedBy: { connect: { id: ownerAId } }, email: 'rev.a@tu.com', tokenHash: 'dummy3', status: 'REVOKED', expiresAt: new Date(Date.now() + 86400000) }
    });

    // Tenant B - Owner
    await prisma.user.create({
      data: { id: ownerBId, tenantId: tenantBId, email: 'owner.b@tu.com', fullName: 'Owner B', passwordHash: dummyHash, status: 'ACTIVE' },
    });
    await prisma.userRoleAssignment.create({ data: { tenantId: tenantBId, userId: ownerBId, roleId: ownerRoleId, scopeType: 'TENANT' } });


    ownerAToken = tokenService.createAccessToken(ownerAPrincipal);
    adminAToken = tokenService.createAccessToken(adminAPrincipal);
    viewerAToken = tokenService.createAccessToken(viewerAPrincipal);
    ownerBToken = tokenService.createAccessToken(ownerBPrincipal);

    httpServer = http.createServer((req, res) => appServer.getRouter().handleRequest(req, res));
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        httpPort = (httpServer.address() as any).port;
        resolve();
      });
    });
  });

  after(async () => {
    if (httpServer) await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await appServer.stop();
    await prisma.userInvitation.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.projectMember.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.project.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.employee.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.department.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
  });

  const request = async (path: string, token?: string, method = 'GET') => {
    return new Promise<{ status: number; body: any }>((resolve) => {
      const options: http.RequestOptions = {
        hostname: 'localhost',
        port: httpPort,
        path,
        method,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      };
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          let body = data;
          try { body = JSON.parse(data); } catch (e) {}
          resolve({ status: res.statusCode || 500, body });
        });
      });
      req.end();
    });
  };

  it('Authentication: 401 unauthenticated', async () => {
    const { status } = await request('/api/v1/tenants/users');
    assert.equal(status, 401);
  });

  it('Authorization: 403 unauthorized tenant user', async () => {
    const { status, body } = await request('/api/v1/tenants/users', viewerAToken);
    assert.equal(status, 403);
    assert.equal(body.error.code, 'FORBIDDEN');
  });

  it('Authorization: 200 for COMPANY_OWNER', async () => {
    const { status, body } = await request('/api/v1/tenants/users', ownerAToken);
    assert.equal(status, 200);
    assert.equal(body.success, true);
  });

  it('Authorization: 200 for COMPANY_ADMIN', async () => {
    const { status, body } = await request('/api/v1/tenants/users', adminAToken);
    assert.equal(status, 200);
    assert.equal(body.success, true);
  });

  it('Tenant Isolation: returns ONLY authenticated tenant users', async () => {
    const { body: bodyA } = await request('/api/v1/tenants/users', ownerAToken);
    const usersA: any[] = bodyA.data.users;
    assert.ok(usersA.length >= 7);
    assert.ok(usersA.every(u => u.email.endsWith('.a@tu.com')));

    const { body: bodyB } = await request('/api/v1/tenants/users', ownerBToken);
    const usersB: any[] = bodyB.data.users;
    assert.equal(usersB.length, 1);
    assert.equal(usersB[0].email, 'owner.b@tu.com');
  });

  it('Client tenant override: ignores query params', async () => {
    // Attempt to request Tenant B users using Tenant A token
    const { body } = await request(`/api/v1/tenants/users?tenantId=${tenantBId}`, ownerAToken);
    const users: any[] = body.data.users;
    // Should still return Tenant A users
    assert.ok(users.some(u => u.id === ownerAId));
    assert.ok(!users.some(u => u.id === ownerBId));
  });

  it('Multi-role semantics: precedence rule and no truncation', async () => {
    const { body } = await request('/api/v1/tenants/users', ownerAToken);
    const users: any[] = body.data.users;
    const multiUser = users.find(u => u.id === multiRoleAId);
    
    assert.ok(multiUser);
    assert.equal(multiUser.roles.length, 2);
    assert.ok(multiUser.roles.some((r: any) => r.name === 'SITE_ENGINEER'));
    assert.ok(multiUser.roles.some((r: any) => r.name === 'VIEWER'));
    
    // SITE_ENGINEER should be primary because it outranks VIEWER and is TENANT scoped
    assert.equal(multiUser.primaryRole, 'SITE_ENGINEER');
  });

  it('Invitation states: ACTIVE, INVITED, REVOKED, EXPIRED', async () => {
    const { body } = await request('/api/v1/tenants/users', ownerAToken);
    const users: any[] = body.data.users;

    const invited = users.find(u => u.id === invitedAId);
    assert.equal(invited.status, 'INVITED');
    assert.equal(invited.invitation.status, 'PENDING');

    const expired = users.find(u => u.id === expiredAId);
    assert.equal(expired.status, 'EXPIRED');
    assert.equal(expired.invitation.status, 'EXPIRED');

    const revoked = users.find(u => u.id === revokedAId);
    assert.equal(revoked.status, 'REVOKED');
    assert.ok(!revoked.invitation); // REVOKED invites are filtered out in prisma where clause (in: ['PENDING', 'EXPIRED'])
  });



  it('Security projection: validates absence of secrets', async () => {
    const { body } = await request('/api/v1/tenants/users', ownerAToken);
    const users: any[] = body.data.users;
    const user = users[0];

    assert.ok(!user.passwordHash);
    assert.ok(!user.password_hash);
    assert.ok(!user.tokenHash);
    assert.ok(!user.token_hash);
    assert.ok(!user.refreshToken);
    assert.ok(!user.sessionVersion);
    
    if (user.invitation) {
      assert.ok(!user.invitation.tokenHash);
    }
  });

  it('Route collision: /tenants/users does not hit /tenants/:id', async () => {
    // We already hit /api/v1/tenants/users and got users array, instead of a tenant object
    const { body, status } = await request('/api/v1/tenants/users', ownerAToken);
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data.users));
    assert.equal(body.data.code, undefined); // /tenants/:id would return tenant code
  });

});
