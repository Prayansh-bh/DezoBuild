import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseService } from '../src/database/database.service.js';
import { OutboxRepository } from '../src/modules/alerts/repositories/outbox.repository.js';
import { AlertRepository } from '../src/modules/alerts/repositories/alert.repository.js';
import { NotificationRepository } from '../src/modules/alerts/repositories/notification.repository.js';
import { NotificationService } from '../src/modules/alerts/services/notification.service.js';
import { OutboxWorkerService } from '../src/modules/alerts/services/outbox-worker.service.js';
import { OutboxWriter } from '../src/modules/alerts/helpers/outbox-writer.js';
import { EventRegistry } from '../src/modules/alerts/helpers/event.registry.js';
import { OutboxEventStatus, DomainEventType } from '../src/modules/alerts/constants/outbox.constants.js';

describe('DEZOBUILD Phase 16 — Outbox Engine, Concurrency & Worker Retry Integration Suite', () => {
  const db = DatabaseService.getInstance();
  const prisma = db.getClient();

  let tenantAId: string;
  let tenantBId: string;
  let outboxRepo: OutboxRepository;
  let alertRepo: AlertRepository;
  let notifRepo: NotificationRepository;
  let notifService: NotificationService;
  let workerService: OutboxWorkerService;

  before(async () => {
    await db.connect();

    const timestamp = Date.now();
    const tA = await prisma.tenant.create({
      data: {
        code: `OB-TNA-${timestamp}`,
        name: 'Outbox Test Tenant A',
        planTier: 'ENTERPRISE',
      },
    });
    tenantAId = tA.id;

    const tB = await prisma.tenant.create({
      data: {
        code: `OB-TNB-${timestamp}`,
        name: 'Outbox Test Tenant B',
        planTier: 'ENTERPRISE',
      },
    });
    tenantBId = tB.id;

    outboxRepo = new OutboxRepository(prisma);
    alertRepo = new AlertRepository(prisma);
    notifRepo = new NotificationRepository(prisma);
    notifService = new NotificationService(notifRepo);
    workerService = new OutboxWorkerService(outboxRepo, alertRepo, notifService, prisma);

    await prisma.outboxEvent.deleteMany({
      where: { status: { in: ['PENDING', 'PROCESSING'] } },
    });
  });

  after(async () => {
    await prisma.notificationDelivery.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.alert.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.outboxEvent.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantAId, tenantBId] } },
    });
    await db.disconnect();
  });

  it('1. Domain mutation + Outbox atomicity in single transaction', async () => {
    const aggId = `AGG-${Date.now()}`;
    const idKey = `IDEM-ATOM-${Date.now()}`;

    const createdEvent = await prisma.$transaction(async (tx) => {
      // Simulate transactional write with OutboxWriter
      return OutboxWriter.recordEvent(tx, {
        tenantId: tenantAId,
        eventType: DomainEventType.MATERIAL_LOW_STOCK,
        aggregateType: 'MATERIAL',
        aggregateId: aggId,
        payload: { materialName: 'Cement OPC 53', currentStock: 10, minStockThreshold: 50 },
        idempotencyKey: idKey,
      });
    });

    assert.ok(createdEvent.id, 'OutboxEvent must have generated UUID');
    assert.strictEqual(createdEvent.tenantId, tenantAId);
    assert.strictEqual(createdEvent.status, OutboxEventStatus.PENDING);
    assert.strictEqual(createdEvent.attempts, 0);

    const retrieved = await outboxRepo.findById(createdEvent.id);
    assert.ok(retrieved, 'Persisted outbox event must exist in DB');
    assert.strictEqual(retrieved?.idempotencyKey, idKey);
  });

  it('2. Transaction rollback leaves ZERO orphan outbox events', async () => {
    const idKey = `IDEM-ROLLBACK-${Date.now()}`;

    await assert.rejects(
      async () => {
        await prisma.$transaction(async (tx) => {
          await OutboxWriter.recordEvent(tx, {
            tenantId: tenantAId,
            eventType: DomainEventType.PAYMENT_OVERDUE,
            aggregateType: 'VENDOR_INVOICE',
            aggregateId: 'INV-ROLLBACK',
            payload: { amountDue: 50000 },
            idempotencyKey: idKey,
          });

          // Force failure inside transaction
          throw new Error('Forced domain validation failure inside transaction');
        });
      },
      /Forced domain validation failure/
    );

    const orphan = await outboxRepo.findByIdempotencyKey(tenantAId, idKey);
    assert.strictEqual(orphan, null, 'Rolled back transaction must leave zero orphan outbox events');
  });

  it('3. Outbox idempotency enforces unique idempotencyKey per tenant', async () => {
    const idKey = `IDEM-DUP-${Date.now()}`;

    await outboxRepo.create({
      tenantId: tenantAId,
      eventType: DomainEventType.EQUIPMENT_BREAKDOWN,
      aggregateType: 'EQUIPMENT',
      aggregateId: 'EQ-001',
      payload: { equipmentCode: 'JCB-01' },
      idempotencyKey: idKey,
    });

    // Attempt duplicate insert with same tenant and idempotency key
    await assert.rejects(
      async () => {
        await outboxRepo.create({
          tenantId: tenantAId,
          eventType: DomainEventType.EQUIPMENT_BREAKDOWN,
          aggregateType: 'EQUIPMENT',
          aggregateId: 'EQ-001',
          payload: { equipmentCode: 'JCB-01' },
          idempotencyKey: idKey,
        });
      },
      /Unique constraint failed/
    );

    // Same idempotency key in different tenant B MUST succeed (Tenant isolation)
    const tenantBEvent = await outboxRepo.create({
      tenantId: tenantBId,
      eventType: DomainEventType.EQUIPMENT_BREAKDOWN,
      aggregateType: 'EQUIPMENT',
      aggregateId: 'EQ-001',
      payload: { equipmentCode: 'JCB-01' },
      idempotencyKey: idKey,
    });
    assert.ok(tenantBEvent.id, 'Tenant B can use same idempotencyKey independently');
  });

  it('4. Concurrent worker claiming (SELECT FOR UPDATE SKIP LOCKED) prevents double-processing', async () => {
    const timestamp = Date.now();
    const eventIds: string[] = [];

    // Create 10 pending events
    for (let i = 0; i < 10; i++) {
      const e = await outboxRepo.create({
        tenantId: tenantAId,
        eventType: 'TEST_CONCURRENT_EVENT',
        aggregateType: 'TEST',
        aggregateId: `CONC-${i}`,
        payload: { index: i },
        idempotencyKey: `IDEM-CONC-${timestamp}-${i}`,
      });
      eventIds.push(e.id);
    }

    // Spawn 3 concurrent workers claiming events simultaneously
    const [claimedWorker1, claimedWorker2, claimedWorker3] = await Promise.all([
      outboxRepo.claimPendingEvents(5),
      outboxRepo.claimPendingEvents(5),
      outboxRepo.claimPendingEvents(5),
    ]);

    const allClaimedIds = [
      ...claimedWorker1.map((e) => e.id),
      ...claimedWorker2.map((e) => e.id),
      ...claimedWorker3.map((e) => e.id),
    ];

    const uniqueClaimedIds = new Set(allClaimedIds);

    assert.strictEqual(
      allClaimedIds.length,
      uniqueClaimedIds.size,
      'Every claimed event must belong to exactly one worker (zero duplicate claims)'
    );

    const ourClaimedIds = allClaimedIds.filter((id) => eventIds.includes(id));
    assert.strictEqual(ourClaimedIds.length, 10, 'All 10 events must be claimed across the workers');
  });

  it('5. Worker retry with backoff upon handler failure', async () => {
    const testEventType = `TEST_RETRY_EVENT_${Date.now()}`;
    const idKey = `IDEM-RETRY-${Date.now()}`;

    // Register a failing handler for this test event type
    let attemptCounter = 0;
    EventRegistry.getInstance().register(testEventType, async () => {
      attemptCounter++;
      throw new Error(`Handler transient failure attempt ${attemptCounter}`);
    });

    const event = await outboxRepo.create({
      tenantId: tenantAId,
      eventType: testEventType,
      aggregateType: 'RETRY_TEST',
      aggregateId: 'AGG-RETRY-1',
      payload: { data: 'test' },
      idempotencyKey: idKey,
      maxAttempts: 3,
    });

    // Run batch processing
    const batchResult = await workerService.processBatch(10, 300, 30); // 30 sec retry delay
    assert.strictEqual(batchResult.retriedCount >= 1, true, 'Event must be scheduled for retry');

    const updated = await outboxRepo.findById(event.id);
    assert.strictEqual(updated?.status, OutboxEventStatus.PENDING, 'Failed event before max attempts returns to PENDING');
    assert.strictEqual(updated?.attempts, 1, 'Attempts counter incremented');
    assert.ok(updated?.availableAt && updated.availableAt.getTime() > Date.now(), 'availableAt pushed into future');
    assert.match(updated?.lastError || '', /Handler transient failure/);
  });

  it('6. Stale PROCESSING recovery claims stranded events past lease timeout', async () => {
    const idKey = `IDEM-STALE-${Date.now()}`;

    // Create an event directly in PROCESSING status with stale updatedAt
    const staleEvent = await prisma.outboxEvent.create({
      data: {
        tenantId: tenantAId,
        eventType: 'TEST_STALE_RECOVERY',
        aggregateType: 'STALE',
        aggregateId: 'STALE-1',
        payload: { test: true },
        idempotencyKey: idKey,
        status: OutboxEventStatus.PROCESSING,
        attempts: 1,
        maxAttempts: 5,
        updatedAt: new Date(Date.now() - 400 * 1000), // 400 seconds ago
      },
    });

    // Claim with lease timeout of 300 seconds
    const claimed = await outboxRepo.claimPendingEvents(10, 300);
    const reclaimed = claimed.find((e) => e.id === staleEvent.id);

    assert.ok(reclaimed, 'Stale PROCESSING event must be reclaimed by worker');
    assert.strictEqual(reclaimed?.attempts, 2, 'Attempts counter incremented on reclamation');
  });

  it('7. Permanent failure transition after max attempts exceeded', async () => {
    const testEventType = `TEST_MAX_FAIL_${Date.now()}`;
    const idKey = `IDEM-MAXFAIL-${Date.now()}`;

    EventRegistry.getInstance().register(testEventType, async () => {
      throw new Error('Fatal non-recoverable error');
    });

    const event = await outboxRepo.create({
      tenantId: tenantAId,
      eventType: testEventType,
      aggregateType: 'MAX_FAIL',
      aggregateId: 'AGG-MAX',
      payload: { data: 'test' },
      idempotencyKey: idKey,
      maxAttempts: 1,
    });

    await workerService.processBatch(10, 300, 10);

    const updated = await outboxRepo.findById(event.id);
    assert.strictEqual(updated?.status, OutboxEventStatus.FAILED, 'Event must transition to FAILED after max attempts');
    assert.ok(updated?.failedAt, 'failedAt timestamp must be recorded');
    assert.match(updated?.lastError || '', /Fatal non-recoverable error/);
  });
});
