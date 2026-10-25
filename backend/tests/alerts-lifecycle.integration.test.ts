import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseService } from '../src/database/database.service.js';
import { OutboxRepository } from '../src/modules/alerts/repositories/outbox.repository.js';
import { AlertRepository } from '../src/modules/alerts/repositories/alert.repository.js';
import { NotificationRepository } from '../src/modules/alerts/repositories/notification.repository.js';
import { NotificationService } from '../src/modules/alerts/services/notification.service.js';
import { AlertService } from '../src/modules/alerts/services/alert.service.js';
import { OutboxWorkerService } from '../src/modules/alerts/services/outbox-worker.service.js';
import { AlertSeverity, AlertStatus } from '../src/modules/alerts/constants/alert.constants.js';
import { DomainEventType } from '../src/modules/alerts/constants/outbox.constants.js';
import { registerBuiltInDomainEventHandlers } from '../src/modules/alerts/helpers/domain-event.handlers.js';
import { NotFoundError } from '../src/common/errors/app-error.js';

describe('DEZOBUILD Phase 16 — Alerts Domain Lifecycle, Idempotency & Tenant Isolation Suite', () => {
  const db = DatabaseService.getInstance();
  const prisma = db.getClient();

  let tenantAId: string;
  let tenantBId: string;
  let userAId: string;
  let userBId: string;
  let projectAId: string;

  let outboxRepo: OutboxRepository;
  let alertRepo: AlertRepository;
  let notifRepo: NotificationRepository;
  let notifService: NotificationService;
  let alertService: AlertService;
  let workerService: OutboxWorkerService;

  before(async () => {
    await db.connect();
    registerBuiltInDomainEventHandlers();

    const timestamp = Date.now();

    // Tenant A
    const tA = await prisma.tenant.create({
      data: {
        code: `ALT-TNA-${timestamp}`,
        name: 'Alerts Test Tenant A',
        planTier: 'ENTERPRISE',
      },
    });
    tenantAId = tA.id;

    // User A
    const uA = await prisma.user.create({
      data: {
        tenantId: tenantAId,
        email: `usera-${timestamp}@dezobuild.test`,
        fullName: 'Alice Alert Manager',
        passwordHash: 'dummy',
      },
    });
    userAId = uA.id;

    // Company A
    const cA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        code: `CMP-A-${timestamp}`,
        name: 'Alerts Company A',
        legalName: 'Alerts Company A Pvt Ltd',
        panNumber: 'AAAAA0000A',
        gstin: '27AAAAA0000A1Z5',
        email: 'companyA@test.com',
        phone: '9876543210',
        address: 'Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    });

    // Project A
    const pA = await prisma.project.create({
      data: {
        tenantId: tenantAId,
        companyId: cA.id,
        code: `PRJ-A-${timestamp}`,
        name: 'Alerts Project Alpha',
        plannedStartDate: new Date('2026-01-01'),
        plannedEndDate: new Date('2026-12-31'),
      },
    });
    projectAId = pA.id;

    // Tenant B
    const tB = await prisma.tenant.create({
      data: {
        code: `ALT-TNB-${timestamp}`,
        name: 'Alerts Test Tenant B',
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

    outboxRepo = new OutboxRepository(prisma);
    alertRepo = new AlertRepository(prisma);
    notifRepo = new NotificationRepository(prisma);
    notifService = new NotificationService(notifRepo);
    alertService = new AlertService(alertRepo);
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
    await prisma.project.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.company.deleteMany({
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

  it('1. Event -> Alert generation for multiple domain events', async () => {
    const timestamp = Date.now();

    // 1. NCR Raised Event
    const ncrEvent = await outboxRepo.create({
      tenantId: tenantAId,
      projectId: projectAId,
      eventType: DomainEventType.NCR_RAISED,
      aggregateType: 'NON_CONFORMANCE_REPORT',
      aggregateId: `NCR-${timestamp}`,
      payload: {
        ncrNumber: `NCR-${timestamp}`,
        title: 'Concrete honeycombing in Column C4',
        severity: 'MAJOR',
        assignedToId: userAId,
        notifyUserId: userAId,
      },
      idempotencyKey: `IDEM-NCR-${timestamp}`,
    });

    // 2. Payment Overdue Event
    const paymentEvent = await outboxRepo.create({
      tenantId: tenantAId,
      projectId: projectAId,
      eventType: DomainEventType.PAYMENT_OVERDUE,
      aggregateType: 'VENDOR_INVOICE',
      aggregateId: `INV-${timestamp}`,
      payload: {
        invoiceOrBillNumber: `INV-${timestamp}`,
        amountDue: 125000,
        dueDate: '2026-09-01',
        notifyUserId: userAId,
      },
      idempotencyKey: `IDEM-PAY-${timestamp}`,
    });

    // Process outbox batch
    const batch = await workerService.processBatch(10);
    assert.strictEqual(batch.processedCount >= 2, true, 'Both events processed successfully');

    // Verify created Alerts
    const alerts = await alertRepo.findMany(tenantAId, { limit: 10 });
    const ncrAlert = alerts.items.find((a) => a.entityId === `NCR-${timestamp}`);
    const payAlert = alerts.items.find((a) => a.entityId === `INV-${timestamp}`);

    assert.ok(ncrAlert, 'NCR Alert must be generated');
    assert.strictEqual(ncrAlert?.severity, AlertSeverity.CRITICAL);
    assert.strictEqual(ncrAlert?.status, AlertStatus.OPEN);
    assert.strictEqual(ncrAlert?.sourceEventId, ncrEvent.id);

    assert.ok(payAlert, 'Payment Overdue Alert must be generated');
    assert.strictEqual(payAlert?.severity, AlertSeverity.CRITICAL);
    assert.strictEqual(payAlert?.sourceEventId, paymentEvent.id);
  });

  it('2. Alert Idempotency: duplicate domain events do not duplicate active alerts', async () => {
    const timestamp = Date.now();
    const materialId = `MAT-LOW-${timestamp}`;

    // Emit low stock event #1
    await outboxRepo.create({
      tenantId: tenantAId,
      projectId: projectAId,
      eventType: DomainEventType.MATERIAL_LOW_STOCK,
      aggregateType: 'MATERIAL',
      aggregateId: materialId,
      payload: {
        materialName: 'Structural Rebar 12mm',
        currentStock: 50,
        minStockThreshold: 200,
        notifyUserId: userAId,
      },
      idempotencyKey: `IDEM-LOW-1-${timestamp}`,
    });

    await workerService.processBatch(10);

    const alertsAfterFirst = await alertRepo.findMany(tenantAId, {
      entityId: materialId,
      alertType: 'MATERIAL_LOW_STOCK',
    });
    assert.strictEqual(alertsAfterFirst.items.length, 1, 'Exactly 1 active alert created');

    // Emit low stock event #2 for same material
    await outboxRepo.create({
      tenantId: tenantAId,
      projectId: projectAId,
      eventType: DomainEventType.MATERIAL_LOW_STOCK,
      aggregateType: 'MATERIAL',
      aggregateId: materialId,
      payload: {
        materialName: 'Structural Rebar 12mm',
        currentStock: 45,
        minStockThreshold: 200,
        notifyUserId: userAId,
      },
      idempotencyKey: `IDEM-LOW-2-${timestamp}`,
    });

    await workerService.processBatch(10);

    const alertsAfterSecond = await alertRepo.findMany(tenantAId, {
      entityId: materialId,
      alertType: 'MATERIAL_LOW_STOCK',
    });
    assert.strictEqual(
      alertsAfterSecond.items.length,
      1,
      'Active alert count remains 1 (no duplicate active alerts)'
    );
  });

  it('3. Alert status transitions: OPEN -> ACKNOWLEDGED -> RESOLVED', async () => {
    const alert = await alertRepo.create({
      tenantId: tenantAId,
      projectId: projectAId,
      alertType: 'EQUIPMENT_BREAKDOWN',
      severity: AlertSeverity.CRITICAL,
      title: 'Tower Crane Hydraulic Leak',
      message: 'Hydraulic pressure drop on TC-01',
      entityType: 'EQUIPMENT',
      entityId: 'TC-01',
    });

    assert.strictEqual(alert.status, AlertStatus.OPEN);

    // 1. Acknowledge
    const acknowledged = await alertService.acknowledgeAlert(
      tenantAId,
      alert.id,
      userAId,
      { note: 'Technician dispatched to inspection' }
    );
    assert.strictEqual(acknowledged.status, AlertStatus.ACKNOWLEDGED);
    assert.strictEqual(acknowledged.acknowledgedById, userAId);
    assert.ok(acknowledged.acknowledgedAt);

    // 2. Resolve
    const resolved = await alertService.resolveAlert(
      tenantAId,
      alert.id,
      userAId,
      { resolutionNote: 'Hydraulic hose replaced and pressure test passed' }
    );
    assert.strictEqual(resolved.status, AlertStatus.RESOLVED);
    assert.strictEqual(resolved.resolvedById, userAId);
    assert.ok(resolved.resolvedAt);
  });

  it('4. Dismiss alert lifecycle: OPEN -> DISMISSED', async () => {
    const alert = await alertRepo.create({
      tenantId: tenantAId,
      alertType: 'DPR_SUBMISSION_DELAY',
      severity: AlertSeverity.WARNING,
      title: 'DPR Pending for Sunday',
      message: 'Sunday was site holiday',
    });

    const dismissed = await alertService.dismissAlert(tenantAId, alert.id, {
      reason: 'Scheduled site holiday, no DPR required',
    });
    assert.strictEqual(dismissed.status, AlertStatus.DISMISSED);
  });

  it('5. Strict Multi-Tenant Isolation: Tenant B cannot access or mutate Tenant A alert', async () => {
    const alertA = await alertRepo.create({
      tenantId: tenantAId,
      alertType: 'FINANCIAL_RISK',
      severity: AlertSeverity.CRITICAL,
      title: 'Confidential Cost Overrun',
      message: 'Internal financial variance',
    });

    // Tenant B attempt to read Tenant A alert
    await assert.rejects(
      async () => {
        await alertService.getAlertById(tenantBId, alertA.id);
      },
      (err: any) => err instanceof NotFoundError
    );

    // Tenant B attempt to acknowledge Tenant A alert
    await assert.rejects(
      async () => {
        await alertService.acknowledgeAlert(tenantBId, alertA.id, userBId, {});
      },
      (err: any) => err instanceof NotFoundError
    );
  });

  it('6. Concurrent Alert Idempotency: Multiple workers concurrently processing duplicate events create max 1 active alert', async () => {
    const timestamp = Date.now();
    const equipmentId = `EQ-CONC-${timestamp}`;

    // Create 5 identical outbox events representing concurrent emissions
    const events = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        outboxRepo.create({
          tenantId: tenantAId,
          projectId: projectAId,
          eventType: DomainEventType.EQUIPMENT_BREAKDOWN,
          aggregateType: 'EQUIPMENT',
          aggregateId: equipmentId,
          payload: {
            equipmentCode: equipmentId,
            equipmentName: 'Excavator EX-200',
            workOrderNumber: `WO-${timestamp}-${i}`,
            plantManagerId: userAId,
            notifyUserId: userAId,
          },
          idempotencyKey: `IDEM-EQ-CONC-${timestamp}-${i}`,
        })
      )
    );

    // Run 5 concurrent worker dispatches simultaneously
    const results = await Promise.allSettled(
      events.map((event) => workerService.processSingleEvent(event.id))
    );

    for (const res of results) {
      assert.strictEqual(res.status, 'fulfilled', 'All concurrent dispatches should resolve');
    }

    // Live DB verification: exactly 1 active Alert for this entity in PostgreSQL
    const activeAlerts = await prisma.alert.findMany({
      where: {
        tenantId: tenantAId,
        alertType: 'EQUIPMENT_BREAKDOWN',
        entityType: 'EQUIPMENT',
        entityId: equipmentId,
        status: { in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED] },
      },
    });

    assert.strictEqual(
      activeAlerts.length,
      1,
      'Concurrent duplicate events must result in exactly 1 active Alert in PostgreSQL'
    );

    // Also verify NotificationDelivery idempotency for this alert
    const notifs = await prisma.notificationDelivery.findMany({
      where: {
        tenantId: tenantAId,
        alertId: activeAlerts[0]!.id,
        recipientUserId: userAId,
        channel: 'IN_APP',
      },
    });

    assert.strictEqual(
      notifs.length,
      1,
      'Concurrent events must result in exactly 1 NotificationDelivery record'
    );
  });

  it('7. Legitimate future alert lifecycle: Resolving active alert allows subsequent alert for same entity', async () => {
    const timestamp = Date.now();
    const ncrId = `NCR-RECUR-${timestamp}`;

    // 1. Create first active alert
    const alert1 = await alertRepo.create({
      tenantId: tenantAId,
      projectId: projectAId,
      alertType: 'NON_CONFORMANCE_REPORT',
      severity: AlertSeverity.CRITICAL,
      title: `NCR #1 for ${ncrId}`,
      message: 'Initial quality defect',
      entityType: 'NON_CONFORMANCE_REPORT',
      entityId: ncrId,
    });

    assert.strictEqual(alert1.status, AlertStatus.OPEN);

    // 2. Resolve the first alert
    const resolved = await alertService.resolveAlert(
      tenantAId,
      alert1.id,
      userAId,
      { resolutionNote: 'Defect rectified and reinspected' }
    );
    assert.strictEqual(resolved.status, AlertStatus.RESOLVED);

    // 3. Create a legitimate subsequent alert for the same entity
    const alert2 = await alertRepo.create({
      tenantId: tenantAId,
      projectId: projectAId,
      alertType: 'NON_CONFORMANCE_REPORT',
      severity: AlertSeverity.CRITICAL,
      title: `NCR #2 for ${ncrId}`,
      message: 'New separate quality issue on same component',
      entityType: 'NON_CONFORMANCE_REPORT',
      entityId: ncrId,
    });

    assert.strictEqual(alert2.status, AlertStatus.OPEN);
    assert.notStrictEqual(alert2.id, alert1.id, 'New alert has distinct UUID');

    // Total alerts for this entity: 2 (1 RESOLVED, 1 OPEN)
    const allAlerts = await prisma.alert.findMany({
      where: {
        tenantId: tenantAId,
        entityType: 'NON_CONFORMANCE_REPORT',
        entityId: ncrId,
      },
      orderBy: { createdAt: 'asc' },
    });

    assert.strictEqual(allAlerts.length, 2);
    assert.strictEqual(allAlerts[0]?.status, AlertStatus.RESOLVED);
    assert.strictEqual(allAlerts[1]?.status, AlertStatus.OPEN);
  });
});
