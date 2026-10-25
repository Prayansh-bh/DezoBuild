import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseService } from '../src/database/database.service';
import { PrismaUserRepository } from '../src/modules/auth/repositories/prisma-user.repository';
import { PrismaUserRoleRepository } from '../src/modules/rbac/repositories/prisma-user-role.repository';
import { RbacService } from '../src/modules/rbac/services/rbac.service';
import { CapacityService } from '../src/modules/subscriptions/services/capacity.service';
import { OutboxRepository } from '../src/modules/alerts/repositories/outbox.repository';
import { PrismaRoleRepository } from '../src/modules/rbac/repositories/prisma-role.repository';
import { PrismaProjectMemberRepository } from '../src/modules/rbac/repositories/prisma-project-member.repository';
import { PrismaStoreAccessRepository } from '../src/modules/rbac/repositories/prisma-store-access.repository';
import { ConflictError } from '../src/common/errors/app-error';

describe('DEZOBUILD Pre-Invitation Backend Hardening Suite', () => {
  let dbService: DatabaseService;
  let prisma: any;
  let userRepo: PrismaUserRepository;
  let userRoleRepo: PrismaUserRoleRepository;
  let rbacService: RbacService;
  let capacityService: CapacityService;
  let outboxRepo: OutboxRepository;

  const tenantAId = 'ffff0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const tenantBId = 'ffff0002-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const ownerUserId = 'ffff0010-0000-0000-0000-000000000001';
  let planId: string;
  let planVersionId: string;
  let ownerRoleId: string;
  let siteEngRoleId: string;

  before(async () => {
    dbService = DatabaseService.getInstance();
    prisma = dbService.getClient();
    await dbService.connect();

    userRepo = new PrismaUserRepository();
    userRoleRepo = new PrismaUserRoleRepository(prisma);
    rbacService = new RbacService(
      prisma,
      userRoleRepo,
      new PrismaRoleRepository(prisma),
      new PrismaProjectMemberRepository(prisma),
      new PrismaStoreAccessRepository(prisma)
    );
    capacityService = new CapacityService(prisma);
    outboxRepo = new OutboxRepository(prisma);

    // Clean up test fixtures
    await prisma.userInvitation.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.outboxEvent.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenantEntitlementOverride.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });

    // Seed tenants
    await prisma.tenant.create({
      data: { id: tenantAId, code: 'TENANT-INV-A', name: 'Tenant A for Invitation Hardening' },
    });
    await prisma.tenant.create({
      data: { id: tenantBId, code: 'TENANT-INV-B', name: 'Tenant B for Invitation Hardening' },
    });

    // Ensure system roles exist
    const ownerRole = await prisma.role.findFirst({ where: { name: 'COMPANY_OWNER' } });
    const siteEngRole = await prisma.role.findFirst({ where: { name: 'SITE_ENGINEER' } });
    ownerRoleId = ownerRole!.id;
    siteEngRoleId = siteEngRole!.id;

    // Create Owner user in Tenant A
    await userRepo.create({
      id: ownerUserId,
      tenantId: tenantAId,
      email: 'owner.tenantA@dezobuild.com',
      fullName: 'Owner Tenant A',
      passwordHash: 'dummy_hash_for_test',
      status: 'ACTIVE',
    });
    await userRoleRepo.assignRole({
      tenantId: tenantAId,
      userId: ownerUserId,
      roleId: ownerRoleId,
    });

    // Seed Plan with maxSeats = 2
    const plan = await prisma.platformPlan.upsert({
      where: { code: 'TEST_INVITE_PLAN' },
      create: {
        code: 'TEST_INVITE_PLAN',
        name: 'Test Invite Plan (2 Seats)',
        maxSeats: 2,
        maxProjects: 5,
        isActive: true,
      },
      update: { maxSeats: 2 },
    });
    planId = plan.id;

    const planVersion = await prisma.platformPlanVersion.upsert({
      where: { planId_versionNumber: { planId: plan.id, versionNumber: 1 } },
      create: {
        planId: plan.id,
        versionNumber: 1,
        status: 'PUBLISHED',
        maxSeats: 2,
        maxProjects: 5,
      },
      update: { maxSeats: 2 },
    });
    planVersionId = planVersion.id;

    // Create subscription for Tenant A
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantAId,
        planId,
        planVersionId,
        status: 'ACTIVE',
        billingCycle: 'ANNUAL',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });
  });

  after(async () => {
    try {
      await prisma.userInvitation.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.outboxEvent.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.tenantEntitlementOverride.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
      await dbService.disconnect();
    } catch {
      // ignore teardown errors
    }
  });

  // ==========================================
  // PHASE 11: TRANSACTION ROLLBACK TESTS
  // ==========================================

  it('Phase 11.A — should roll back user creation on transaction failure', async () => {
    const testEmail = 'rollback.user@dezobuild.com';

    await assert.rejects(
      async () => {
        await prisma.$transaction(async (tx: any) => {
          await userRepo.create(
            {
              tenantId: tenantAId,
              email: testEmail,
              fullName: 'Rollback User Test',
              passwordHash: 'dummy',
              status: 'INVITED',
            },
            tx
          );
          throw new Error('Forced transactional abort');
        });
      },
      /Forced transactional abort/
    );

    const userInDb = await prisma.user.findFirst({ where: { tenantId: tenantAId, email: testEmail } });
    assert.strictEqual(userInDb, null, 'User must not exist in database after transaction rollback');
  });

  it('Phase 11.B — should roll back user and role assignment together on failure', async () => {
    const testEmail = 'rollback.role@dezobuild.com';

    await assert.rejects(
      async () => {
        await prisma.$transaction(async (tx: any) => {
          const user = await userRepo.create(
            {
              tenantId: tenantAId,
              email: testEmail,
              fullName: 'Rollback Role Test',
              passwordHash: 'dummy',
              status: 'INVITED',
            },
            tx
          );

          await rbacService.assignRole(
            {
              tenantId: tenantAId,
              assignerUserId: ownerUserId,
              targetUserId: user.id,
              roleId: siteEngRoleId,
            },
            tx
          );

          throw new Error('Forced abort after role assignment');
        });
      },
      /Forced abort after role assignment/
    );

    const user = await prisma.user.findFirst({ where: { tenantId: tenantAId, email: testEmail } });
    assert.strictEqual(user, null, 'User must not exist');
    const assignment = await prisma.userRoleAssignment.findFirst({ where: { tenantId: tenantAId, roleId: siteEngRoleId } });
    assert.strictEqual(assignment, null, 'Role assignment must not exist');
  });

  it('Phase 11.C — should roll back capacity lock, user, role, and outbox event on failure', async () => {
    const testEmail = 'rollback.outbox@dezobuild.com';
    const idempotencyKey = `idemp-${Date.now()}`;

    await assert.rejects(
      async () => {
        await prisma.$transaction(async (tx: any) => {
          await capacityService.enforceSeatCapacity(tenantAId, tx);

          const user = await userRepo.create(
            {
              tenantId: tenantAId,
              email: testEmail,
              fullName: 'Rollback Outbox Test',
              passwordHash: 'dummy',
              status: 'INVITED',
            },
            tx
          );

          await rbacService.assignRole(
            {
              tenantId: tenantAId,
              assignerUserId: ownerUserId,
              targetUserId: user.id,
              roleId: siteEngRoleId,
            },
            tx
          );

          await outboxRepo.create(
            {
              tenantId: tenantAId,
              eventType: 'user.invited',
              aggregateType: 'user',
              aggregateId: user.id,
              payload: { email: testEmail },
              idempotencyKey,
            },
            tx
          );

          throw new Error('Forced abort after outbox create');
        });
      },
      /Forced abort after outbox create/
    );

    const user = await prisma.user.findFirst({ where: { tenantId: tenantAId, email: testEmail } });
    assert.strictEqual(user, null, 'User must not exist');
    const outbox = await prisma.outboxEvent.findFirst({ where: { tenantId: tenantAId, idempotencyKey } });
    assert.strictEqual(outbox, null, 'Outbox event must not exist');
  });

  it('Phase 11.D — should commit user, role assignment, and outbox event atomically', async () => {
    const testEmail = 'committed.invitation@dezobuild.com';
    const idempotencyKey = `idemp-commit-${Date.now()}`;
    let createdUserId = '';

    await prisma.$transaction(async (tx: any) => {
      await capacityService.enforceSeatCapacity(tenantAId, tx);

      const user = await userRepo.create(
        {
          tenantId: tenantAId,
          email: testEmail,
          fullName: 'Committed Invitation User',
          passwordHash: 'dummy',
          status: 'INVITED',
        },
        tx
      );
      createdUserId = user.id;

      await rbacService.assignRole(
        {
          tenantId: tenantAId,
          assignerUserId: ownerUserId,
          targetUserId: user.id,
          roleId: siteEngRoleId,
        },
        tx
      );

      await outboxRepo.create(
        {
          tenantId: tenantAId,
          eventType: 'user.invited',
          aggregateType: 'user',
          aggregateId: user.id,
          payload: { email: testEmail },
          idempotencyKey,
        },
        tx
      );
    });

    const user = await prisma.user.findUnique({ where: { id: createdUserId } });
    assert.ok(user, 'Committed user must exist');
    assert.strictEqual(user.status, 'INVITED');

    const assignment = await prisma.userRoleAssignment.findFirst({
      where: { tenantId: tenantAId, userId: createdUserId, roleId: siteEngRoleId },
    });
    assert.ok(assignment, 'Role assignment must exist');

    const outbox = await prisma.outboxEvent.findFirst({ where: { tenantId: tenantAId, idempotencyKey } });
    assert.ok(outbox, 'Outbox event must exist');
  });

  // ==========================================
  // PHASE 14: INVITED SEAT SEMANTICS
  // ==========================================

  it('Phase 14 — should count ACTIVE (1) + INVITED (1) = 2 seats and deny 3rd reservation (max=2)', async () => {
    // Current Tenant A has 1 ACTIVE (owner) + 1 INVITED (from Phase 11.D) = 2 allocated seats (max = 2)
    const check = await capacityService.checkSeatCapacity(tenantAId);
    assert.strictEqual(check.max, 2);
    assert.strictEqual(check.current, 2, 'Must count 1 ACTIVE + 1 INVITED = 2 allocated seats');
    assert.strictEqual(check.remaining, 0);
    assert.strictEqual(check.allowed, false, 'Capacity limit reached');

    await assert.rejects(
      async () => {
        await capacityService.enforceSeatCapacity(tenantAId);
      },
      (err: any) => {
        assert.strictEqual(err.name, 'ConflictError');
        assert.ok(err.message.includes('User seat capacity limit reached'));
        return true;
      }
    );
  });

  // ==========================================
  // PHASE 12: CONCURRENT SEAT RACE TEST
  // ==========================================

  it('Phase 12 — should serialize concurrent seat provisioning with FOR UPDATE and deny exceeding seats', async () => {
    // We will test Tenant B: maxSeats = 1, current = 0
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantBId,
        planId,
        planVersionId,
        status: 'ACTIVE',
        billingCycle: 'ANNUAL',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    // Override maxSeats on Tenant B to 1
    const subB = await prisma.tenantSubscription.findFirst({ where: { tenantId: tenantBId } });
    await prisma.tenantEntitlementOverride.create({
      data: {
        tenantId: tenantBId,
        subscriptionId: subB!.id,
        featureKey: 'custom:capacity',
        additionalSeats: -1, // 2 - 1 = 1 max seat
        isEnabled: true,
      },
    });

    // Check capacity for Tenant B
    const capB = await capacityService.checkSeatCapacity(tenantBId);
    assert.strictEqual(capB.max, 1, 'Tenant B maxSeats is 1');
    assert.strictEqual(capB.current, 0);

    // Run 2 concurrent provisioning transactions competing for the single seat
    const task1 = prisma.$transaction(async (tx: any) => {
      await capacityService.enforceSeatCapacity(tenantBId, tx);
      return userRepo.create(
        {
          tenantId: tenantBId,
          email: 'concurrent.user1@dezobuild.com',
          fullName: 'Concurrent User 1',
          passwordHash: 'dummy',
          status: 'INVITED',
        },
        tx
      );
    });

    const task2 = prisma.$transaction(async (tx: any) => {
      await capacityService.enforceSeatCapacity(tenantBId, tx);
      return userRepo.create(
        {
          tenantId: tenantBId,
          email: 'concurrent.user2@dezobuild.com',
          fullName: 'Concurrent User 2',
          passwordHash: 'dummy',
          status: 'INVITED',
        },
        tx
      );
    });

    const results = await Promise.allSettled([task1, task2]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.strictEqual(fulfilled.length, 1, 'Exactly ONE transaction must succeed');
    assert.strictEqual(rejected.length, 1, 'Exactly ONE transaction must fail with ConflictError');

    const countB = await prisma.user.count({ where: { tenantId: tenantBId } });
    assert.strictEqual(countB, 1, 'Database must contain exactly 1 user for Tenant B, never 2');
  });

  // ==========================================
  // PHASE 13: SUBSCRIPTION STATUS ALIGNMENT TESTS
  // ==========================================

  it('Phase 13.A — should DENY seat provisioning when subscription status is EXPIRED', async () => {
    const subB = await prisma.tenantSubscription.findFirst({ where: { tenantId: tenantBId } });
    await prisma.tenantSubscription.update({
      where: { id: subB!.id },
      data: { status: 'EXPIRED' },
    });

    const check = await capacityService.checkSeatCapacity(tenantBId);
    assert.strictEqual(check.allowed, false);
    assert.ok(check.reason?.includes('EXPIRED'));
  });

  it('Phase 13.B — should DENY seat provisioning when subscription status is SUSPENDED', async () => {
    const subB = await prisma.tenantSubscription.findFirst({ where: { tenantId: tenantBId } });
    await prisma.tenantSubscription.update({
      where: { id: subB!.id },
      data: { status: 'SUSPENDED' },
    });

    const check = await capacityService.checkSeatCapacity(tenantBId);
    assert.strictEqual(check.allowed, false);
    assert.ok(check.reason?.includes('SUSPENDED'));
  });

  it('Phase 13.C — should enforce PAST_DUE 7-day grace period for seat provisioning', async () => {
    const subB = await prisma.tenantSubscription.findFirst({ where: { tenantId: tenantBId } });
    const now = new Date();

    // 1. Within 7 days grace period: periodEnd was 2 days ago
    await prisma.tenantSubscription.update({
      where: { id: subB!.id },
      data: {
        status: 'PAST_DUE',
        currentPeriodEnd: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
    });
    // Remove override to have capacity
    await prisma.tenantEntitlementOverride.deleteMany({ where: { tenantId: tenantBId } });
    const checkGraceAllowed = await capacityService.checkSeatCapacity(tenantBId);
    assert.strictEqual(checkGraceAllowed.allowed, true, 'PAST_DUE within 7-day grace period is allowed');

    // 2. Beyond 7 days grace period: periodEnd was 10 days ago
    await prisma.tenantSubscription.update({
      where: { id: subB!.id },
      data: {
        status: 'PAST_DUE',
        currentPeriodEnd: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      },
    });
    const checkGraceExpired = await capacityService.checkSeatCapacity(tenantBId);
    assert.strictEqual(checkGraceExpired.allowed, false, 'PAST_DUE beyond 7-day grace period is denied');
    assert.ok(checkGraceExpired.reason?.includes('grace period has expired'));
  });

  // ==========================================
  // PHASE 15: TENANT ISOLATION TESTS
  // ==========================================

  it('Phase 15 — should prevent cross-tenant role assignment and capacity leakage', async () => {
    // Tenant B cannot assign role to Tenant A user
    await assert.rejects(
      async () => {
        await rbacService.assignRole({
          tenantId: tenantBId,
          assignerUserId: ownerUserId,
          targetUserId: ownerUserId, // belongs to Tenant A
          roleId: siteEngRoleId,
        });
      },
      (err: any) => {
        assert.ok(err.message.includes(`does not exist in tenant ${tenantBId}`));
        return true;
      }
    );
  });
});
