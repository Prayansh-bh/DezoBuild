import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseService } from '../src/database/database.service';
import { InvitationService } from '../src/modules/auth/services/invitation.service';
import { TokenService } from '../src/modules/auth/services/token.service';
import { PasswordService } from '../src/modules/auth/services/password.service';
import { CapacityService } from '../src/modules/subscriptions/services/capacity.service';
import { RbacService } from '../src/modules/rbac/services/rbac.service';
import { PrismaUserRepository } from '../src/modules/auth/repositories/prisma-user.repository';
import { PrismaUserRoleRepository } from '../src/modules/rbac/repositories/prisma-user-role.repository';
import { PrismaRoleRepository } from '../src/modules/rbac/repositories/prisma-role.repository';
import { PrismaProjectMemberRepository } from '../src/modules/rbac/repositories/prisma-project-member.repository';
import { PrismaStoreAccessRepository } from '../src/modules/rbac/repositories/prisma-store-access.repository';
import { OutboxRepository } from '../src/modules/alerts/repositories/outbox.repository';
import { ApplicationServer } from '../src/common/http/server';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from '../src/common/errors/app-error';
import type { AuthenticatedPrincipal } from '../src/modules/auth/auth.guard';
import crypto from 'node:crypto';
import http from 'node:http';

describe('DEZOBUILD User Invitation Backend Lifecycle Integration Suite', () => {
  let dbService: DatabaseService;
  let prisma: any;
  let invitationService: InvitationService;
  let tokenService: TokenService;
  let passwordService: PasswordService;
  let capacityService: CapacityService;
  let appServer: ApplicationServer;
  let httpServer: http.Server;
  let httpPort: number;

  // Test Tenant IDs
  const tenantAId = 'ffff0001-aaaa-aaaa-aaaa-aaaaaaaaaa99';
  const tenantBId = 'ffff0002-bbbb-bbbb-bbbb-bbbbbbbbbb99';

  // Test Users in Tenant A
  const ownerAId = 'ffff0010-0000-0000-0000-000000000091';
  const adminAId = 'ffff0010-0000-0000-0000-000000000092';
  const pmAId = 'ffff0010-0000-0000-0000-000000000093';
  const viewerAId = 'ffff0010-0000-0000-0000-000000000094';

  // Test User in Tenant B
  const ownerBId = 'ffff0020-0000-0000-0000-000000000091';

  let ownerRoleId: string;
  let adminRoleId: string;
  let pmRoleId: string;
  let siteEngRoleId: string;
  let viewerRoleId: string;

  let planId: string;
  let planVersionId: string;

  // Principals
  const ownerAPrincipal: AuthenticatedPrincipal = {
    userId: ownerAId,
    tenantId: tenantAId,
    sessionId: 'session-owner-a',
    sessionVersion: 1,
  };

  const adminAPrincipal: AuthenticatedPrincipal = {
    userId: adminAId,
    tenantId: tenantAId,
    sessionId: 'session-admin-a',
    sessionVersion: 1,
  };

  const pmAPrincipal: AuthenticatedPrincipal = {
    userId: pmAId,
    tenantId: tenantAId,
    sessionId: 'session-pm-a',
    sessionVersion: 1,
  };

  const viewerAPrincipal: AuthenticatedPrincipal = {
    userId: viewerAId,
    tenantId: tenantAId,
    sessionId: 'session-viewer-a',
    sessionVersion: 1,
  };

  const ownerBPrincipal: AuthenticatedPrincipal = {
    userId: ownerBId,
    tenantId: tenantBId,
    sessionId: 'session-owner-b',
    sessionVersion: 1,
  };

  before(async () => {
    dbService = DatabaseService.getInstance();
    prisma = dbService.getClient();
    await dbService.connect();

    tokenService = TokenService.getInstance();
    passwordService = PasswordService.getInstance();
    capacityService = new CapacityService(prisma);
    invitationService = new InvitationService({
      prisma,
      capacityService,
    });
    appServer = new ApplicationServer();

    // Clean up test data
    await prisma.userInvitation.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.outboxEvent.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.session.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenantEntitlementOverride.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });

    // Seed tenants
    await prisma.tenant.create({
      data: { id: tenantAId, code: 'TENANT-LIFECYCLE-A', name: 'Tenant A for Invitation Lifecycle' },
    });
    await prisma.tenant.create({
      data: { id: tenantBId, code: 'TENANT-LIFECYCLE-B', name: 'Tenant B for Invitation Lifecycle' },
    });

    // Ensure roles
    const ownerRole = await prisma.role.findFirst({ where: { name: 'COMPANY_OWNER' } });
    const adminRole = await prisma.role.findFirst({ where: { name: 'COMPANY_ADMIN' } });
    const pmRole = await prisma.role.findFirst({ where: { name: 'PROJECT_MANAGER' } });
    const siteEngRole = await prisma.role.findFirst({ where: { name: 'SITE_ENGINEER' } });
    const viewerRole = await prisma.role.findFirst({ where: { name: 'VIEWER' } });

    ownerRoleId = ownerRole!.id;
    adminRoleId = adminRole!.id;
    pmRoleId = pmRole!.id;
    siteEngRoleId = siteEngRole!.id;
    viewerRoleId = viewerRole!.id;

    // Seed test users in Tenant A
    const dummyHash = await passwordService.hashPassword('Password@123');

    await prisma.user.create({
      data: {
        id: ownerAId,
        tenantId: tenantAId,
        email: 'owner.a@dezobuild.com',
        fullName: 'Owner Tenant A',
        passwordHash: dummyHash,
        status: 'ACTIVE',
      },
    });
    await prisma.userRoleAssignment.create({
      data: { tenantId: tenantAId, userId: ownerAId, roleId: ownerRoleId, scopeType: 'TENANT' },
    });

    await prisma.user.create({
      data: {
        id: adminAId,
        tenantId: tenantAId,
        email: 'admin.a@dezobuild.com',
        fullName: 'Admin Tenant A',
        passwordHash: dummyHash,
        status: 'ACTIVE',
      },
    });
    await prisma.userRoleAssignment.create({
      data: { tenantId: tenantAId, userId: adminAId, roleId: adminRoleId, scopeType: 'TENANT' },
    });

    await prisma.user.create({
      data: {
        id: pmAId,
        tenantId: tenantAId,
        email: 'pm.a@dezobuild.com',
        fullName: 'PM Tenant A',
        passwordHash: dummyHash,
        status: 'ACTIVE',
      },
    });
    await prisma.userRoleAssignment.create({
      data: { tenantId: tenantAId, userId: pmAId, roleId: pmRoleId, scopeType: 'TENANT' },
    });

    await prisma.user.create({
      data: {
        id: viewerAId,
        tenantId: tenantAId,
        email: 'viewer.a@dezobuild.com',
        fullName: 'Viewer Tenant A',
        passwordHash: dummyHash,
        status: 'ACTIVE',
      },
    });
    await prisma.userRoleAssignment.create({
      data: { tenantId: tenantAId, userId: viewerAId, roleId: viewerRoleId, scopeType: 'TENANT' },
    });

    // Seed test user in Tenant B
    await prisma.user.create({
      data: {
        id: ownerBId,
        tenantId: tenantBId,
        email: 'owner.b@dezobuild.com',
        fullName: 'Owner Tenant B',
        passwordHash: dummyHash,
        status: 'ACTIVE',
      },
    });
    await prisma.userRoleAssignment.create({
      data: { tenantId: tenantBId, userId: ownerBId, roleId: ownerRoleId, scopeType: 'TENANT' },
    });

    // Seed Platform Plan with maxSeats = 100 (ample for all suite tests)
    const plan = await prisma.platformPlan.upsert({
      where: { code: 'TEST_INVITATION_LIFECYCLE_PLAN' },
      create: {
        code: 'TEST_INVITATION_LIFECYCLE_PLAN',
        name: 'Invitation Lifecycle Test Plan',
        maxSeats: 100,
        maxProjects: 100,
        isActive: true,
      },
      update: { maxSeats: 100 },
    });
    planId = plan.id;

    const planVersion = await prisma.platformPlanVersion.upsert({
      where: {
        planId_versionNumber: {
          planId,
          versionNumber: 1,
        },
      },
      create: {
        planId,
        versionNumber: 1,
        status: 'PUBLISHED',
        maxSeats: 100,
        maxProjects: 100,
      },
      update: { maxSeats: 100 },
    });
    planVersionId = planVersion.id;

    // Seed Active Subscriptions
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantAId,
        planId,
        planVersionId,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantBId,
        planId,
        planVersionId,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Start HTTP server on ephemeral port
    httpServer = http.createServer((req, res) => appServer.getRouter().handleRequest(req, res));
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        httpPort = (httpServer.address() as any).port;
        resolve();
      });
    });
  });

  after(async () => {
    if (httpServer) {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    }

    // Cleanup fixtures
    await prisma.userInvitation.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.outboxEvent.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.session.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
    await dbService.disconnect();
  });

  // ==========================================
  // 1. INVITATION CREATION TESTS
  // ==========================================
  describe('Phase 19.1 - 19.13: Invitation Creation Tests', () => {
    it('1. Owner creates invitation -> success with INVITED user, PENDING invitation, and Outbox event', async () => {
      const email = 'new-invitee-1@dezobuild.com';
      const result = await invitationService.inviteUser(ownerAPrincipal, {
        email,
        fullName: 'New Invitee 1',
        roleId: siteEngRoleId,
      });

      assert.ok(result.id, 'Invitation ID must be returned');
      assert.equal(result.email, email);
      assert.equal(result.status, 'PENDING');
      assert.equal(result.roleName, 'SITE_ENGINEER');

      // Assert User record in DB
      const user = await prisma.user.findFirst({ where: { tenantId: tenantAId, email } });
      assert.ok(user, 'User must exist in DB');
      assert.equal(user.status, 'INVITED');
      assert.equal(user.fullName, 'New Invitee 1');

      // Assert UserInvitation record in DB
      const invitation = await prisma.userInvitation.findUnique({ where: { id: result.id } });
      assert.ok(invitation, 'UserInvitation must exist in DB');
      assert.equal(invitation.status, 'PENDING');
      assert.ok(invitation.tokenHash, 'tokenHash must be persisted');

      // Assert Outbox event created
      const outbox = await prisma.outboxEvent.findFirst({
        where: { tenantId: tenantAId, eventType: 'user.invited', aggregateId: result.id },
      });
      assert.ok(outbox, 'Outbox event user.invited must exist');
      const payload = outbox.payload as any;
      assert.ok(payload.token, 'Transient outbox payload must contain raw token for email worker');
      assert.equal(payload.email, email);
    });

    it('2. Admin creates allowed invitation (SITE_ENGINEER) -> success', async () => {
      const email = 'admin-invited-site-eng@dezobuild.com';
      const result = await invitationService.inviteUser(adminAPrincipal, {
        email,
        fullName: 'Site Engineer by Admin',
        roleId: siteEngRoleId,
      });

      assert.ok(result.id);
      assert.equal(result.status, 'PENDING');
    });

    it('3. Project Manager attempts to invite -> ForbiddenError', async () => {
      await assert.rejects(
        async () => {
          await invitationService.inviteUser(pmAPrincipal, {
            email: 'pm-forbidden@dezobuild.com',
            fullName: 'PM Forbidden',
            roleId: siteEngRoleId,
          });
        },
        (err: any) => {
          assert.ok(err instanceof ForbiddenError);
          return true;
        }
      );
    });

    it('4. Viewer attempts to invite -> ForbiddenError', async () => {
      await assert.rejects(
        async () => {
          await invitationService.inviteUser(viewerAPrincipal, {
            email: 'viewer-forbidden@dezobuild.com',
            fullName: 'Viewer Forbidden',
            roleId: siteEngRoleId,
          });
        },
        (err: any) => {
          assert.ok(err instanceof ForbiddenError);
          return true;
        }
      );
    });

    it('5. Admin attempts forbidden higher/equal role (COMPANY_OWNER, COMPANY_ADMIN) -> ForbiddenError', async () => {
      await assert.rejects(
        async () => {
          await invitationService.inviteUser(adminAPrincipal, {
            email: 'admin-elevated-owner@dezobuild.com',
            fullName: 'Elevated Owner',
            roleId: ownerRoleId,
          });
        },
        (err: any) => {
          assert.ok(err instanceof ForbiddenError);
          return true;
        }
      );

      await assert.rejects(
        async () => {
          await invitationService.inviteUser(adminAPrincipal, {
            email: 'admin-elevated-admin@dezobuild.com',
            fullName: 'Elevated Admin',
            roleId: adminRoleId,
          });
        },
        (err: any) => {
          assert.ok(err instanceof ForbiddenError);
          return true;
        }
      );
    });

    it('6. Foreign or non-existent role ID -> NotFoundError', async () => {
      await assert.rejects(
        async () => {
          await invitationService.inviteUser(ownerAPrincipal, {
            email: 'fake-role@dezobuild.com',
            fullName: 'Fake Role User',
            roleId: '00000000-0000-0000-0000-000000000000',
          });
        },
        (err: any) => {
          assert.ok(err instanceof NotFoundError);
          return true;
        }
      );
    });

    it('7. Duplicate ACTIVE email -> ConflictError', async () => {
      await assert.rejects(
        async () => {
          await invitationService.inviteUser(ownerAPrincipal, {
            email: 'owner.a@dezobuild.com', // Already ACTIVE user
            fullName: 'Duplicate Active Email',
            roleId: siteEngRoleId,
          });
        },
        (err: any) => {
          assert.ok(err instanceof ConflictError);
          assert.match(err.message, /already exists/i);
          return true;
        }
      );
    });

    it('8. Duplicate INVITED email -> ConflictError', async () => {
      const email = 'duplicate-invited@dezobuild.com';
      await invitationService.inviteUser(ownerAPrincipal, {
        email,
        fullName: 'First Invitation',
        roleId: siteEngRoleId,
      });

      // Second attempt
      await assert.rejects(
        async () => {
          await invitationService.inviteUser(ownerAPrincipal, {
            email,
            fullName: 'Second Invitation Same Email',
            roleId: siteEngRoleId,
          });
        },
        (err: any) => {
          assert.ok(err instanceof ConflictError);
          assert.match(err.message, /active invitation already exists/i);
          return true;
        }
      );
    });

    it('9. Capacity full -> ConflictError (counts ACTIVE + INVITED seats)', async () => {
      // Create dedicated limited plan with maxSeats = 1
      const limitedPlan = await prisma.platformPlan.upsert({
        where: { code: 'SEAT_LIMIT_ONE_INVITE' },
        create: {
          code: 'SEAT_LIMIT_ONE_INVITE',
          name: 'Seat Limit One Plan',
          maxSeats: 1,
          maxProjects: 1,
          isActive: true,
        },
        update: { maxSeats: 1 },
      });

      // Temporarily set Tenant A's subscription to the 1-seat plan
      const sub = await prisma.tenantSubscription.findFirst({
        where: { tenantId: tenantAId },
        orderBy: { createdAt: 'desc' },
      });

      await prisma.tenantSubscription.update({
        where: { id: sub.id },
        data: { planId: limitedPlan.id, planVersionId: null },
      });

      // Tenant A already has 4 ACTIVE users + several INVITED users -> exceeds 1 seat!
      await assert.rejects(
        async () => {
          await invitationService.inviteUser(ownerAPrincipal, {
            email: 'seat-overflow@dezobuild.com',
            fullName: 'Seat Overflow User',
            roleId: siteEngRoleId,
          });
        },
        (err: any) => {
          assert.ok(err instanceof ConflictError);
          assert.match(err.message, /capacity limit reached/i);
          return true;
        }
      );

      // Restore ample 10-seat plan
      await prisma.tenantSubscription.update({
        where: { id: sub.id },
        data: { planId, planVersionId },
      });
    });

    it('10. Expired subscription -> ConflictError', async () => {
      const sub = await prisma.tenantSubscription.findFirst({
        where: { tenantId: tenantAId },
        orderBy: { createdAt: 'desc' },
      });

      await prisma.tenantSubscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' },
      });

      await assert.rejects(
        async () => {
          await invitationService.inviteUser(ownerAPrincipal, {
            email: 'sub-expired@dezobuild.com',
            fullName: 'Sub Expired User',
            roleId: siteEngRoleId,
          });
        },
        (err: any) => {
          assert.ok(err instanceof ConflictError);
          assert.match(err.message, /EXPIRED/i);
          return true;
        }
      );

      // Restore ACTIVE status
      await prisma.tenantSubscription.update({
        where: { id: sub.id },
        data: { status: 'ACTIVE' },
      });
    });

    it('11. Suspended subscription -> ConflictError', async () => {
      const sub = await prisma.tenantSubscription.findFirst({
        where: { tenantId: tenantAId },
        orderBy: { createdAt: 'desc' },
      });

      await prisma.tenantSubscription.update({
        where: { id: sub.id },
        data: { status: 'SUSPENDED' },
      });

      await assert.rejects(
        async () => {
          await invitationService.inviteUser(ownerAPrincipal, {
            email: 'sub-suspended@dezobuild.com',
            fullName: 'Sub Suspended User',
            roleId: siteEngRoleId,
          });
        },
        (err: any) => {
          assert.ok(err instanceof ConflictError);
          assert.match(err.message, /SUSPENDED/i);
          return true;
        }
      );

      // Restore ACTIVE status
      await prisma.tenantSubscription.update({
        where: { id: sub.id },
        data: { status: 'ACTIVE' },
      });
    });

    it('12. Past-due within 7-day grace period -> allows invitation', async () => {
      const sub = await prisma.tenantSubscription.findFirst({
        where: { tenantId: tenantAId },
        orderBy: { createdAt: 'desc' },
      });

      // Period ended 2 days ago (within 7 day grace)
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      await prisma.tenantSubscription.update({
        where: { id: sub.id },
        data: { status: 'PAST_DUE', currentPeriodEnd: twoDaysAgo },
      });

      const email = 'past-due-grace-allowed@dezobuild.com';
      const result = await invitationService.inviteUser(ownerAPrincipal, {
        email,
        fullName: 'Past Due Grace Allowed',
        roleId: siteEngRoleId,
      });

      assert.ok(result.id);
      assert.equal(result.email, email);

      // Restore ACTIVE status
      await prisma.tenantSubscription.update({
        where: { id: sub.id },
        data: { status: 'ACTIVE', currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      });
    });

    it('13. Past-due after 7-day grace period -> ConflictError', async () => {
      const sub = await prisma.tenantSubscription.findFirst({
        where: { tenantId: tenantAId },
        orderBy: { createdAt: 'desc' },
      });

      // Period ended 10 days ago (grace period expired)
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      await prisma.tenantSubscription.update({
        where: { id: sub.id },
        data: { status: 'PAST_DUE', currentPeriodEnd: tenDaysAgo },
      });

      await assert.rejects(
        async () => {
          await invitationService.inviteUser(ownerAPrincipal, {
            email: 'past-due-expired@dezobuild.com',
            fullName: 'Past Due Expired',
            roleId: siteEngRoleId,
          });
        },
        (err: any) => {
          assert.ok(err instanceof ConflictError);
          assert.match(err.message, /grace period has expired/i);
          return true;
        }
      );

      // Restore ACTIVE status
      await prisma.tenantSubscription.update({
        where: { id: sub.id },
        data: { status: 'ACTIVE', currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      });
    });
  });

  // ==========================================
  // 2. TRANSACTION ROLLBACK TESTS
  // ==========================================
  describe('Phase 19.14 - 19.18: Transaction Rollback & Atomicity Tests', () => {
    it('14-17. Simulated failure inside invitation transaction -> rolls back User, Role, Invitation, and Outbox', async () => {
      const email = 'rollback-test@dezobuild.com';

      // Instantiate InvitationService with a failing outboxRepo to test rollback
      const failingOutboxRepo = {
        create: async () => {
          throw new Error('Simulated Outbox Failure during invitation transaction');
        },
      } as unknown as OutboxRepository;

      const failingService = new InvitationService({
        prisma,
        outboxRepository: failingOutboxRepo,
      });

      await assert.rejects(
        async () => {
          await failingService.inviteUser(ownerAPrincipal, {
            email,
            fullName: 'Rollback Test User',
            roleId: siteEngRoleId,
          });
        },
        (err: any) => {
          assert.match(err.message, /Simulated Outbox Failure/);
          return true;
        }
      );

      // Assert: User does not exist
      const user = await prisma.user.findFirst({ where: { tenantId: tenantAId, email } });
      assert.equal(user, null, 'User must not exist after rollback');

      // Assert: Invitation does not exist
      const invitation = await prisma.userInvitation.findFirst({ where: { tenantId: tenantAId, email } });
      assert.equal(invitation, null, 'Invitation must not exist after rollback');

      // Assert: Outbox event does not exist
      const outbox = await prisma.outboxEvent.findFirst({ where: { tenantId: tenantAId, aggregateId: email } });
      assert.equal(outbox, null, 'Outbox event must not exist after rollback');
    });

    it('18. Successful transaction -> atomically commits User + Role + Invitation + OutboxEvent', async () => {
      const email = 'atomic-success@dezobuild.com';
      const result = await invitationService.inviteUser(ownerAPrincipal, {
        email,
        fullName: 'Atomic Success User',
        roleId: siteEngRoleId,
      });

      const user = await prisma.user.findFirst({ where: { tenantId: tenantAId, email } });
      const assignment = await prisma.userRoleAssignment.findFirst({
        where: { tenantId: tenantAId, userId: user!.id, roleId: siteEngRoleId },
      });
      const invitation = await prisma.userInvitation.findUnique({ where: { id: result.id } });
      const outbox = await prisma.outboxEvent.findFirst({
        where: { tenantId: tenantAId, aggregateId: result.id },
      });

      assert.ok(user, 'User must exist');
      assert.ok(assignment, 'Role assignment must exist');
      assert.ok(invitation, 'Invitation must exist');
      assert.ok(outbox, 'Outbox event must exist');
    });
  });

  // ==========================================
  // 3. INVITATION ACCEPTANCE LIFECYCLE
  // ==========================================
  describe('Phase 19.19 - 19.27: Acceptance Lifecycle & Concurrency Race Tests', () => {
    let acceptToken: string;
    let acceptInvitationId: string;
    const acceptEmail = 'accept-test-user@dezobuild.com';

    before(async () => {
      // Create fresh invitation to test acceptance
      const inv = await invitationService.inviteUser(ownerAPrincipal, {
        email: acceptEmail,
        fullName: 'Accept Test Invitee',
        roleId: siteEngRoleId,
      });
      acceptInvitationId = inv.id;

      // Extract raw token from outbox payload
      const outbox = await prisma.outboxEvent.findFirst({
        where: { tenantId: tenantAId, eventType: 'user.invited', aggregateId: inv.id },
      });
      acceptToken = (outbox!.payload as any).token;
    });

    it('19-20. Valid invitation acceptance -> transitions to ACTIVE, sets password, creates session & JWT', async () => {
      const newPassword = 'SecurePassword@2026!';
      const result = await invitationService.acceptInvitation({
        token: acceptToken,
        password: newPassword,
        fullName: 'Accept Test Invitee (Confirmed)',
      });

      assert.ok(result.accessToken, 'Access token must be returned');
      assert.ok(result.refreshToken, 'Refresh token must be returned');
      assert.equal(result.tokenType, 'Bearer');
      assert.equal(result.user.status, 'ACTIVE');
      assert.equal(result.user.email, acceptEmail);
      assert.equal(result.user.fullName, 'Accept Test Invitee (Confirmed)');

      // Verify DB User record
      const dbUser = await prisma.user.findFirst({ where: { tenantId: tenantAId, email: acceptEmail } });
      assert.equal(dbUser!.status, 'ACTIVE');
      const isPasswordValid = await passwordService.verifyPassword(newPassword, dbUser!.passwordHash);
      assert.equal(isPasswordValid, true, 'User passwordHash must match new password');

      // Verify DB Invitation record
      const dbInvite = await prisma.userInvitation.findUnique({ where: { id: acceptInvitationId } });
      assert.equal(dbInvite!.status, 'ACCEPTED');
      assert.ok(dbInvite!.acceptedAt, 'acceptedAt must be timestamped');

      // Verify Outbox event
      const acceptOutbox = await prisma.outboxEvent.findFirst({
        where: { tenantId: tenantAId, eventType: 'invitation.accepted', aggregateId: acceptInvitationId },
      });
      assert.ok(acceptOutbox, 'invitation.accepted outbox event must exist');
    });

    it('21. Invalid token -> NotFoundError', async () => {
      await assert.rejects(
        async () => {
          await invitationService.acceptInvitation({
            token: 'invalid-non-existent-token-1234567890',
            password: 'Password@123',
          });
        },
        (err: any) => {
          assert.ok(err instanceof NotFoundError);
          return true;
        }
      );
    });

    it('22. Expired token -> BadRequestError', async () => {
      const email = 'expired-token-user@dezobuild.com';
      const inv = await invitationService.inviteUser(ownerAPrincipal, {
        email,
        fullName: 'Expired Token User',
        roleId: siteEngRoleId,
      });

      const outbox = await prisma.outboxEvent.findFirst({
        where: { tenantId: tenantAId, aggregateId: inv.id },
      });
      const token = (outbox!.payload as any).token;

      // Set expiresAt to the past
      await prisma.userInvitation.update({
        where: { id: inv.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await assert.rejects(
        async () => {
          await invitationService.acceptInvitation({
            token,
            password: 'Password@123',
          });
        },
        (err: any) => {
          assert.ok(err instanceof BadRequestError);
          assert.match(err.message, /expired/i);
          return true;
        }
      );
    });

    it('23. Revoked token -> ConflictError', async () => {
      const email = 'revoked-token-user@dezobuild.com';
      const inv = await invitationService.inviteUser(ownerAPrincipal, {
        email,
        fullName: 'Revoked Token User',
        roleId: siteEngRoleId,
      });

      const outbox = await prisma.outboxEvent.findFirst({
        where: { tenantId: tenantAId, aggregateId: inv.id },
      });
      const token = (outbox!.payload as any).token;

      // Revoke the invitation
      await invitationService.revokeInvitation(ownerAPrincipal, inv.id);

      await assert.rejects(
        async () => {
          await invitationService.acceptInvitation({
            token,
            password: 'Password@123',
          });
        },
        (err: any) => {
          assert.ok(err instanceof ConflictError);
          assert.match(err.message, /revoked/i);
          return true;
        }
      );
    });

    it('24. Already accepted token -> ConflictError', async () => {
      // acceptToken was already accepted in test 19-20
      await assert.rejects(
        async () => {
          await invitationService.acceptInvitation({
            token: acceptToken,
            password: 'AnotherPassword@123',
          });
        },
        (err: any) => {
          assert.ok(err instanceof ConflictError);
          assert.match(err.message, /already been accepted/i);
          return true;
        }
      );
    });

    it('27. Concurrent acceptance race -> exactly one succeeds, one fails with ConflictError', async () => {
      const email = 'concurrent-race@dezobuild.com';
      const inv = await invitationService.inviteUser(ownerAPrincipal, {
        email,
        fullName: 'Concurrent Race User',
        roleId: siteEngRoleId,
      });

      const outbox = await prisma.outboxEvent.findFirst({
        where: { tenantId: tenantAId, aggregateId: inv.id },
      });
      const token = (outbox!.payload as any).token;

      // Launch two concurrent acceptance requests with the exact same token
      const [reqA, reqB] = await Promise.allSettled([
        invitationService.acceptInvitation({
          token,
          password: 'PasswordRaceA@123',
        }),
        invitationService.acceptInvitation({
          token,
          password: 'PasswordRaceB@123',
        }),
      ]);

      const fulfilled = [reqA, reqB].filter((r) => r.status === 'fulfilled');
      const rejected = [reqA, reqB].filter((r) => r.status === 'rejected');

      assert.equal(fulfilled.length, 1, 'Exactly ONE acceptance request must succeed');
      assert.equal(rejected.length, 1, 'Exactly ONE acceptance request must be rejected');

      const rejectedError = (rejected[0] as PromiseRejectedResult).reason;
      assert.ok(rejectedError instanceof ConflictError);
      assert.match(rejectedError.message, /already been accepted/i);

      // Verify invitation is ACCEPTED
      const dbInvite = await prisma.userInvitation.findUnique({ where: { id: inv.id } });
      assert.equal(dbInvite!.status, 'ACCEPTED');
    });
  });

  // ==========================================
  // 4. INVITATION REVOCATION TESTS
  // ==========================================
  describe('Phase 19.28 - 19.32: Revocation Lifecycle Tests', () => {
    it('28-30. Revoking a pending invitation transitions status to REVOKED and releases seat capacity', async () => {
      // Count currently allocated seats (ACTIVE + INVITED)
      const initialCount = await prisma.user.count({
        where: { tenantId: tenantAId, status: { in: ['ACTIVE', 'INVITED'] } },
      });

      // Invite a user
      const email = 'user-to-revoke@dezobuild.com';
      const inv = await invitationService.inviteUser(ownerAPrincipal, {
        email,
        fullName: 'User To Revoke',
        roleId: siteEngRoleId,
      });

      const countWithInvite = await prisma.user.count({
        where: { tenantId: tenantAId, status: { in: ['ACTIVE', 'INVITED'] } },
      });
      assert.equal(countWithInvite, initialCount + 1, 'Invited user must consume 1 seat');

      // Revoke the invitation
      const revokeResult = await invitationService.revokeInvitation(ownerAPrincipal, inv.id);
      assert.equal(revokeResult.success, true);

      // Assert User and UserInvitation in DB are REVOKED
      const dbInvite = await prisma.userInvitation.findUnique({ where: { id: inv.id } });
      assert.equal(dbInvite!.status, 'REVOKED');
      assert.ok(dbInvite!.revokedAt, 'revokedAt must be set');

      const dbUser = await prisma.user.findFirst({ where: { tenantId: tenantAId, email } });
      assert.equal(dbUser!.status, 'REVOKED');

      // Assert seat capacity was released
      const countAfterRevoke = await prisma.user.count({
        where: { tenantId: tenantAId, status: { in: ['ACTIVE', 'INVITED'] } },
      });
      assert.equal(countAfterRevoke, initialCount, 'Revocation must immediately release the reserved seat');
    });

    it('31. Unauthorized revocation (PM / Viewer) -> ForbiddenError', async () => {
      const email = 'unauthorized-revoke@dezobuild.com';
      const inv = await invitationService.inviteUser(ownerAPrincipal, {
        email,
        fullName: 'Unauthorized Revoke User',
        roleId: siteEngRoleId,
      });

      await assert.rejects(
        async () => {
          await invitationService.revokeInvitation(pmAPrincipal, inv.id);
        },
        (err: any) => {
          assert.ok(err instanceof ForbiddenError);
          return true;
        }
      );
    });

    it('32. Cross-tenant revocation -> NotFoundError', async () => {
      // Tenant A creates invitation
      const email = 'tenant-a-only@dezobuild.com';
      const inv = await invitationService.inviteUser(ownerAPrincipal, {
        email,
        fullName: 'Tenant A User',
        roleId: siteEngRoleId,
      });

      // Tenant B owner attempts to revoke Tenant A invitation
      await assert.rejects(
        async () => {
          await invitationService.revokeInvitation(ownerBPrincipal, inv.id);
        },
        (err: any) => {
          assert.ok(err instanceof NotFoundError);
          return true;
        }
      );
    });
  });

  // ==========================================
  // 5. TOKEN SECURITY & TENANT ISOLATION
  // ==========================================
  describe('Phase 19.33 - 19.41: Token Security & Tenant Isolation', () => {
    it('33-36. Raw token is never stored in DB and absent from public API response', async () => {
      const email = 'token-security-test@dezobuild.com';
      const result = await invitationService.inviteUser(ownerAPrincipal, {
        email,
        fullName: 'Token Security User',
        roleId: siteEngRoleId,
      });

      // Assert raw token NOT in response
      assert.equal((result as any).token, undefined);
      assert.equal((result as any).rawToken, undefined);

      // Assert DB stores only 64-char hex SHA-256 hash
      const dbInvite = await prisma.userInvitation.findUnique({ where: { id: result.id } });
      assert.equal(dbInvite!.tokenHash.length, 64, 'tokenHash must be a 64-character SHA-256 hex string');
      assert.match(dbInvite!.tokenHash, /^[a-f0-9]{64}$/);
    });

    it('39-41. Cross-tenant isolation: Tenant A cannot invite into Tenant B, and cannot use Tenant B roles', async () => {
      // Create role exclusive to Tenant B
      const tenantBRole = await prisma.role.create({
        data: {
          tenantId: tenantBId,
          name: 'TENANT_B_EXCLUSIVE_ROLE',
          description: 'Role belonging only to Tenant B',
          isSystemRole: false,
        },
      });

      // Tenant A owner attempts to assign Tenant B's role
      await assert.rejects(
        async () => {
          await invitationService.inviteUser(ownerAPrincipal, {
            email: 'cross-tenant-role@dezobuild.com',
            fullName: 'Cross Tenant Role User',
            roleId: tenantBRole.id,
          });
        },
        (err: any) => {
          assert.ok(err instanceof NotFoundError);
          return true;
        }
      );
    });
  });

  // ==========================================
  // 6. FULL HTTP PIPELINE VALIDATION
  // ==========================================
  describe('Phase 23: Final Full HTTP Pipeline Tests', () => {
    it('Full HTTP Pipeline: POST /api/v1/tenants/users/invite -> HTTP 201', async () => {
      const router = appServer.getRouter();

      // Issue valid access token for Owner A
      const authHeader = `Bearer ${tokenService.createAccessToken({
        userId: ownerAId,
        tenantId: tenantAId,
        sessionId: 'test-session-http',
        sessionVersion: 1,
      })}`;

      const email = 'http-pipeline-invite@dezobuild.com';
      const requestPayload = {
        email,
        fullName: 'HTTP Pipeline Invitee',
        roleId: siteEngRoleId,
      };

      const res = await fetch(`http://localhost:${httpPort}/api/v1/tenants/users/invite`, {
        method: 'POST',
        headers: {
          authorization: authHeader,
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      const responseBody = (await res.json()) as any;

      assert.equal(res.status, 201, 'Must return HTTP 201 Created');
      assert.equal(responseBody.success, true);
      assert.equal(responseBody.data.email, email);
      assert.equal(responseBody.data.status, 'PENDING');
      assert.equal(responseBody.data.token, undefined, 'Must not leak token in HTTP response');
    });

    it('Full HTTP Pipeline: POST /api/v1/auth/accept-invite -> HTTP 200 with Set-Cookie', async () => {
      // First create invitation
      const email = 'http-pipeline-accept@dezobuild.com';
      const inv = await invitationService.inviteUser(ownerAPrincipal, {
        email,
        fullName: 'HTTP Pipeline Accept User',
        roleId: siteEngRoleId,
      });

      const outbox = await prisma.outboxEvent.findFirst({
        where: { tenantId: tenantAId, aggregateId: inv.id },
      });
      const rawToken = (outbox!.payload as any).token;

      const acceptPayload = {
        token: rawToken,
        password: 'SuperSecurePassword@2026!',
        fullName: 'HTTP Pipeline Accept User (Updated)',
      };

      const res = await fetch(`http://localhost:${httpPort}/api/v1/auth/accept-invite`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(acceptPayload),
      });

      const responseBody = (await res.json()) as any;
      const setCookieHeader = res.headers.get('set-cookie');

      assert.equal(res.status, 200, 'Must return HTTP 200 OK');
      assert.equal(responseBody.success, true);
      assert.ok(responseBody.data.accessToken, 'Access token must be in response');
      assert.equal(responseBody.data.user.status, 'ACTIVE');
      assert.ok(setCookieHeader, 'Set-Cookie header must be present');
      assert.match(setCookieHeader, /dezo_refresh=/);
      assert.match(setCookieHeader, /HttpOnly/i);
    });

    it('Full HTTP Pipeline: POST /api/v1/tenants/users/invitations/:id/revoke -> HTTP 200', async () => {
      const authHeader = `Bearer ${tokenService.createAccessToken({
        userId: ownerAId,
        tenantId: tenantAId,
        sessionId: 'test-session-http-revoke',
        sessionVersion: 1,
      })}`;

      const email = 'http-pipeline-revoke@dezobuild.com';
      const inv = await invitationService.inviteUser(ownerAPrincipal, {
        email,
        fullName: 'HTTP Pipeline Revoke User',
        roleId: siteEngRoleId,
      });

      const res = await fetch(`http://localhost:${httpPort}/api/v1/tenants/users/invitations/${inv.id}/revoke`, {
        method: 'POST',
        headers: {
          authorization: authHeader,
          'content-type': 'application/json',
        },
      });

      const responseBody = (await res.json()) as any;

      assert.equal(res.status, 200, 'Must return HTTP 200 OK');
      assert.equal(responseBody.success, true);
      assert.match(responseBody.data.message, /revoked successfully/i);
    });
  });
});
