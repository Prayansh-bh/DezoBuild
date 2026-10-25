import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseService } from '../src/database/database.service.js';
import { NotificationRepository } from '../src/modules/alerts/repositories/notification.repository.js';
import { NotificationService } from '../src/modules/alerts/services/notification.service.js';
import { NotificationChannel, NotificationDeliveryStatus } from '../src/modules/alerts/constants/alert.constants.js';

describe('DEZOBUILD Phase 16 — In-App Notifications, Read/Unread & Recipient Isolation Suite', () => {
  const db = DatabaseService.getInstance();
  const prisma = db.getClient();

  let tenantAId: string;
  let tenantBId: string;
  let userA1Id: string;
  let userA2Id: string;
  let userBId: string;

  let notifRepo: NotificationRepository;
  let notifService: NotificationService;

  before(async () => {
    await db.connect();

    const timestamp = Date.now();

    // Tenant A
    const tA = await prisma.tenant.create({
      data: {
        code: `NTF-TNA-${timestamp}`,
        name: 'Notifications Test Tenant A',
        planTier: 'ENTERPRISE',
      },
    });
    tenantAId = tA.id;

    const uA1 = await prisma.user.create({
      data: {
        tenantId: tenantAId,
        email: `usera1-${timestamp}@dezobuild.test`,
        fullName: 'Alice PM',
        passwordHash: 'dummy',
      },
    });
    userA1Id = uA1.id;

    const uA2 = await prisma.user.create({
      data: {
        tenantId: tenantAId,
        email: `usera2-${timestamp}@dezobuild.test`,
        fullName: 'Andrew Engineer',
        passwordHash: 'dummy',
      },
    });
    userA2Id = uA2.id;

    // Tenant B
    const tB = await prisma.tenant.create({
      data: {
        code: `NTF-TNB-${timestamp}`,
        name: 'Notifications Test Tenant B',
        planTier: 'ENTERPRISE',
      },
    });
    tenantBId = tB.id;

    const uB = await prisma.user.create({
      data: {
        tenantId: tenantBId,
        email: `userb-${timestamp}@dezobuild.test`,
        fullName: 'Bob Competitor',
        passwordHash: 'dummy',
      },
    });
    userBId = uB.id;

    notifRepo = new NotificationRepository(prisma);
    notifService = new NotificationService(notifRepo);
  });

  after(async () => {
    await prisma.notificationDelivery.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.alert.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.user.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantAId, tenantBId] } },
    });
    await db.disconnect();
  });

  it('1. In-App notification delivery and persistence', async () => {
    const result = await notifService.send({
      tenantId: tenantAId,
      recipientUserId: userA1Id,
      title: 'PO #1001 Approved',
      body: 'Purchase Order #1001 for ₹500,000 has been approved.',
      metadata: { poId: 'PO-1001' },
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.channel, NotificationChannel.IN_APP);
    assert.ok(result.deliveryId);

    const list = await notifService.listForRecipient(tenantAId, userA1Id, {});
    assert.strictEqual(list.total, 1);
    assert.strictEqual(list.items[0]?.title, 'PO #1001 Approved');
    assert.strictEqual(list.items[0]?.readAt, null);
    assert.strictEqual(list.items[0]?.status, NotificationDeliveryStatus.SENT);
  });

  it('2. Duplicate notification prevention for same alert and recipient', async () => {
    const realAlert = await prisma.alert.create({
      data: {
        tenantId: tenantAId,
        alertType: 'MATERIAL_LOW_STOCK',
        severity: 'CRITICAL',
        title: 'Low Stock Alert',
        message: 'Cement stock is below threshold',
      },
    });

    // First delivery attempt
    const result1 = await notifService.send({
      tenantId: tenantAId,
      recipientUserId: userA1Id,
      alertId: realAlert.id,
      title: 'Low Stock Alert',
      body: 'Cement stock is below threshold',
    });
    assert.strictEqual(result1.success, true);

    // Second delivery attempt with same alertId and recipient
    const result2 = await notifService.send({
      tenantId: tenantAId,
      recipientUserId: userA1Id,
      alertId: realAlert.id,
      title: 'Low Stock Alert',
      body: 'Cement stock is below threshold',
    });
    assert.strictEqual(result2.success, true);
    assert.strictEqual(
      result2.deliveryId,
      result1.deliveryId,
      'Duplicate send must return existing delivery ID without inserting new row'
    );
  });

  it('3. Unread count and mark single notification read', async () => {
    // Add 2 more notifications for user A2
    await notifService.send({
      tenantId: tenantAId,
      recipientUserId: userA2Id,
      title: 'Task Assigned',
      body: 'Task #101 assigned to you',
    });

    await notifService.send({
      tenantId: tenantAId,
      recipientUserId: userA2Id,
      title: 'Inspection Scheduled',
      body: 'Inspection #502 scheduled for tomorrow',
    });

    const unreadCountBefore = await notifService.getUnreadCount(tenantAId, userA2Id);
    assert.strictEqual(unreadCountBefore, 2);

    const list = await notifService.listForRecipient(tenantAId, userA2Id, {});
    const firstNotifId = list.items[0]!.id;

    // Mark 1 read
    await notifService.markRead(tenantAId, userA2Id, firstNotifId);

    const unreadCountAfter = await notifService.getUnreadCount(tenantAId, userA2Id);
    assert.strictEqual(unreadCountAfter, 1);
  });

  it('4. Mark all notifications as read in bulk', async () => {
    const unreadCountBefore = await notifService.getUnreadCount(tenantAId, userA2Id);
    assert.strictEqual(unreadCountBefore, 1);

    const markResult = await notifService.markAllRead(tenantAId, userA2Id);
    assert.strictEqual(markResult.count, 1);

    const unreadCountAfter = await notifService.getUnreadCount(tenantAId, userA2Id);
    assert.strictEqual(unreadCountAfter, 0);
  });

  it('5. Tenant and recipient isolation: User B cannot view User A notifications', async () => {
    const listB = await notifService.listForRecipient(tenantBId, userBId, {});
    assert.strictEqual(listB.total, 0, 'User B in Tenant B has 0 notifications');

    // Attempting to query with Tenant A ID for User B returns 0
    const listCross = await notifService.listForRecipient(tenantAId, userBId, {});
    assert.strictEqual(listCross.total, 0);
  });

  it('6. Concurrent Notification Delivery Idempotency: Worker A and Worker B race simultaneously', async () => {
    const alert = await prisma.alert.create({
      data: {
        tenantId: tenantAId,
        alertType: 'MATERIAL_LOW_STOCK',
        severity: 'CRITICAL',
        title: 'Concurrent Notification Race Alert',
        message: 'Concurrency test for notification delivery',
      },
    });

    const payload = {
      tenantId: tenantAId,
      recipientUserId: userA1Id,
      alertId: alert.id,
      title: 'Low Rebar Stock Alert',
      body: 'Critical threshold breached',
      channel: NotificationChannel.IN_APP,
    };

    // Spawn 10 simultaneous workers attempting to deliver the exact same logical notification
    const deliveryPromises = Array.from({ length: 10 }, () =>
      notifService.send(payload, NotificationChannel.IN_APP)
    );

    const results = await Promise.all(deliveryPromises);

    // All workers must report successful delivery
    for (const res of results) {
      assert.strictEqual(res.success, true, 'Delivery attempt must succeed');
      assert.strictEqual(res.channel, NotificationChannel.IN_APP);
    }

    // All workers must resolve to the identical deliveryId
    const firstDeliveryId = results[0]!.deliveryId;
    assert.ok(firstDeliveryId, 'Delivery ID must be present');
    for (const res of results) {
      assert.strictEqual(
        res.deliveryId,
        firstDeliveryId,
        'All concurrent workers must resolve to the same delivery ID'
      );
    }

    // Live DB check: Exactly 1 NotificationDelivery record in PostgreSQL
    const deliveriesInDb = await prisma.notificationDelivery.findMany({
      where: {
        tenantId: tenantAId,
        alertId: alert.id,
        recipientUserId: userA1Id,
        channel: NotificationChannel.IN_APP,
      },
    });

    assert.strictEqual(
      deliveriesInDb.length,
      1,
      'Exactly 1 NotificationDelivery record must exist in PostgreSQL database'
    );
  });
});
