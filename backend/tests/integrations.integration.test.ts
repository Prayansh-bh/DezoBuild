import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { DatabaseService } from '../src/database/database.service.js';
import { SecretVaultService } from '../src/modules/integrations/security/secret-vault.service.js';
import { WebhookVerifier } from '../src/modules/integrations/providers/webhook-verifier.js';
import { IntegrationConnectionRepository } from '../src/modules/integrations/repositories/integration-connection.repository.js';
import { ExternalReferenceRepository } from '../src/modules/integrations/repositories/external-reference.repository.js';
import { IntegrationSyncJobRepository } from '../src/modules/integrations/repositories/integration-sync-job.repository.js';
import { WebhookEventRepository } from '../src/modules/integrations/repositories/webhook-event.repository.js';
import { IntegrationService } from '../src/modules/integrations/services/integration.service.js';
import { ExternalReferenceService } from '../src/modules/integrations/services/external-reference.service.js';
import { SyncService } from '../src/modules/integrations/services/sync.service.js';
import { WebhookService } from '../src/modules/integrations/services/webhook.service.js';
import { IntegrationProviderRegistry } from '../src/modules/integrations/providers/integration-provider.registry.js';
import { MockErpProvider } from '../src/modules/integrations/providers/mock-erp.provider.js';
import {
  IntegrationType,
  IntegrationConnectionStatus,
  IntegrationSyncDirection,
  IntegrationSyncJobStatus,
  WebhookEventStatus,
} from '../src/modules/integrations/constants/integration.constants.js';

describe('DEZOBUILD Phase 17 — Integrations Domain, Webhook Verification & Concurrency Suite', () => {
  const db = DatabaseService.getInstance();
  const prisma = db.getClient();

  let tenantAId: string;
  let tenantBId: string;
  let userAId: string;
  let userBId: string;

  let connectionRepo: IntegrationConnectionRepository;
  let refRepo: ExternalReferenceRepository;
  let syncJobRepo: IntegrationSyncJobRepository;
  let webhookRepo: WebhookEventRepository;
  let providerRegistry: IntegrationProviderRegistry;
  let mockErpProvider: MockErpProvider;

  let integrationService: IntegrationService;
  let refService: ExternalReferenceService;
  let syncService: SyncService;
  let webhookService: WebhookService;

  before(async () => {
    await db.connect();

    const timestamp = Date.now();

    // Tenant A
    const tA = await prisma.tenant.create({
      data: {
        code: `INT-TNA-${timestamp}`,
        name: 'Integrations Tenant A',
        planTier: 'ENTERPRISE',
      },
    });
    tenantAId = tA.id;

    // User A
    const uA = await prisma.user.create({
      data: {
        tenantId: tenantAId,
        email: `usera-${timestamp}@integ.test`,
        fullName: 'Alice Integrator',
        passwordHash: 'dummy',
      },
    });
    userAId = uA.id;

    // Tenant B
    const tB = await prisma.tenant.create({
      data: {
        code: `INT-TNB-${timestamp}`,
        name: 'Integrations Tenant B',
        planTier: 'ENTERPRISE',
      },
    });
    tenantBId = tB.id;

    // User B
    const uB = await prisma.user.create({
      data: {
        tenantId: tenantBId,
        email: `userb-${timestamp}@integ.test`,
        fullName: 'Bob Competitor',
        passwordHash: 'dummy',
      },
    });
    userBId = uB.id;

    connectionRepo = new IntegrationConnectionRepository(prisma);
    refRepo = new ExternalReferenceRepository(prisma);
    syncJobRepo = new IntegrationSyncJobRepository(prisma);
    webhookRepo = new WebhookEventRepository(prisma);

    providerRegistry = IntegrationProviderRegistry.getInstance();
    mockErpProvider = new MockErpProvider();
    providerRegistry.register(mockErpProvider);

    integrationService = new IntegrationService(connectionRepo, providerRegistry);
    refService = new ExternalReferenceService(refRepo);
    syncService = new SyncService(syncJobRepo, connectionRepo, refRepo, providerRegistry);
    webhookService = new WebhookService(webhookRepo, connectionRepo, providerRegistry);
  });

  after(async () => {
    await prisma.webhookEvent.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.integrationSyncJob.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.externalReference.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.integrationConnection.deleteMany({
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

  it('1. SecretVaultService securely encrypts AES-256-GCM and redacts sensitive configs', () => {
    const rawSecret = 'SUPER_SECRET_API_KEY_12345';
    const encrypted = SecretVaultService.encrypt(rawSecret);

    assert.ok(encrypted.includes(':'), 'Encrypted secret must contain iv:tag:ciphertext');
    assert.notEqual(encrypted, rawSecret, 'Encrypted secret must not be plaintext');

    const decrypted = SecretVaultService.decrypt(encrypted);
    assert.equal(decrypted, rawSecret, 'Decrypted secret must match original plaintext');

    const redacted = SecretVaultService.redactConfig({ apiKey: rawSecret, otherConfig: 'public_val' });
    assert.equal(redacted['apiKey'], '********', 'Sensitive config key must be redacted');
    assert.equal(redacted['otherConfig'], 'public_val', 'Non-sensitive config key must be preserved');
  });

  it('2. Connection Lifecycle: Create with encryption, test, and retrieve with redacted secrets', async () => {
    const rawApiKey = 'SAP_PROD_API_KEY_SECRET_9999';
    const created = await integrationService.createConnection(tenantAId, userAId, {
      name: 'SAP Enterprise ERP',
      providerKey: 'mock_erp',
      integrationType: IntegrationType.ERP,
      config: {
        baseUrl: 'https://sap.dezobuild.local/api',
        apiKey: rawApiKey,
      },
      secret: rawApiKey,
    });

    assert.ok(created.id, 'Connection should have generated ID');

    // Retrieve via service (should be redacted)
    const fetched = await integrationService.getConnectionById(tenantAId, created.id);
    assert.equal((fetched.config as any)?.apiKey, '********', 'Secret in config must be redacted on read');
    assert.equal(fetched.hasSecret, true, 'hasSecret flag should be true');

    // Verify in raw DB that secret is stored encrypted
    const rawDbRow = await prisma.integrationConnection.findUnique({
      where: { id: created.id },
    });
    assert.notEqual(rawDbRow?.encryptedSecret, rawApiKey, 'Raw DB must not contain plaintext secret');
    assert.ok(rawDbRow?.encryptedSecret?.includes(':'), 'Raw DB must store iv:tag:ciphertext');

    // Test connection via provider
    const testResult = await integrationService.testConnection(tenantAId, created.id);
    assert.equal(testResult.success, true, 'Provider testConnection should succeed');

    // Tenant Isolation: Tenant B cannot access Tenant A connection
    await assert.rejects(
      async () => {
        await integrationService.getConnectionById(tenantBId, created.id);
      },
      /not found/i,
      'Tenant B must not be able to retrieve Tenant A connection'
    );
  });

  it('3. ExternalReference mapping: Bidirectional resolution and unique constraints', async () => {
    const connList = await connectionRepo.findMany(tenantAId, { limit: 10, offset: 0 });
    const connId = connList.items[0].id;

    const ref = await refService.mapReference(tenantAId, {
      integrationConnectionId: connId,
      entityType: 'VENDOR_INVOICE',
      entityId: 'INV-DEZO-1001',
      externalEntityType: 'SAP_INVOICE',
      externalEntityId: 'SAP-INV-8888',
      syncStatus: 'SYNCED',
    });

    assert.ok(ref.id);
    assert.equal(ref.externalEntityId, 'SAP-INV-8888');

    // Resolve external from internal
    const resolvedExt = await refService.getByInternalEntity(
      tenantAId,
      connId,
      'VENDOR_INVOICE',
      'INV-DEZO-1001'
    );
    assert.equal(resolvedExt?.externalEntityId, 'SAP-INV-8888');

    // Resolve internal from external
    const resolvedInternal = await refService.getByExternalEntity(
      tenantAId,
      connId,
      'SAP_INVOICE',
      'SAP-INV-8888'
    );
    assert.equal(resolvedInternal?.entityId, 'INV-DEZO-1001');

    // Cross-tenant isolation
    const bResolved = await refService.getByInternalEntity(
      tenantBId,
      connId,
      'VENDOR_INVOICE',
      'INV-DEZO-1001'
    );
    assert.equal(bResolved, null, 'Tenant B must not resolve Tenant A reference');
  });

  it('4. Sync Job Lifecycle: Queue job, transactional worker claim & execution', async () => {
    const connList = await connectionRepo.findMany(tenantAId, { limit: 10, offset: 0 });
    const connId = connList.items[0].id;
    const idempotencyKey = `SYNC-${Date.now()}-UNIQUE-1`;

    const job = await syncService.queueSyncJob(tenantAId, connId, {
      direction: IntegrationSyncDirection.OUTBOUND,
      entityType: 'VENDOR_INVOICE',
      idempotencyKey,
      scopeMetadata: { entityId: 'INV-DEZO-2002', amount: 50000 },
    });

    assert.equal(job.status, IntegrationSyncJobStatus.PENDING);
    assert.equal(job.idempotencyKey, idempotencyKey);

    // Re-queue with exact same idempotencyKey returns existing job (idempotency)
    const duplicateJob = await syncService.queueSyncJob(tenantAId, connId, {
      direction: IntegrationSyncDirection.OUTBOUND,
      entityType: 'VENDOR_INVOICE',
      idempotencyKey,
      scopeMetadata: { entityId: 'INV-DEZO-2002', amount: 50000 },
    });
    assert.equal(duplicateJob.id, job.id, 'Idempotent queue request must return same job ID');

    // Execute job
    const execResult = await syncService.processSyncJob(job.id);
    assert.equal(execResult.success, true);
    assert.ok(execResult.externalEntityId);

    // Verify job is marked completed
    const completedJob = await syncJobRepo.findById(job.id);
    assert.equal(completedJob?.status, IntegrationSyncJobStatus.COMPLETED);
    assert.ok(completedJob?.completedAt);
  });

  it('5. Concurrency Invariant: Concurrent worker claims with FOR UPDATE SKIP LOCKED guarantee exact-once execution', async () => {
    const connList = await connectionRepo.findMany(tenantAId, { limit: 10, offset: 0 });
    const connId = connList.items[0].id;

    // Create 5 distinct sync jobs
    const jobs = await Promise.all(
      Array.from({ length: 5 }).map((_, i) =>
        syncJobRepo.create({
          tenantId: tenantAId,
          integrationConnectionId: connId,
          direction: IntegrationSyncDirection.OUTBOUND,
          entityType: 'PAYMENT',
          idempotencyKey: `RACE-CLAIM-${Date.now()}-${i}`,
        })
      )
    );

    // Simulate 3 concurrent worker loops claiming jobs simultaneously
    const [claimedByWorker1, claimedByWorker2, claimedByWorker3] = await Promise.all([
      syncJobRepo.claimPendingJobs(10),
      syncJobRepo.claimPendingJobs(10),
      syncJobRepo.claimPendingJobs(10),
    ]);

    const allClaimedIds = [
      ...claimedByWorker1.map((j) => j.id),
      ...claimedByWorker2.map((j) => j.id),
      ...claimedByWorker3.map((j) => j.id),
    ];

    // Verify no job ID was claimed by more than 1 worker (zero overlap)
    const uniqueClaimedIds = new Set(allClaimedIds);
    assert.equal(
      allClaimedIds.length,
      uniqueClaimedIds.size,
      'Concurrent workers with SKIP LOCKED must never claim the same job twice'
    );
  });

  it('6. Inbound Webhook: HMAC verification, replay protection and ingestion', async () => {
    const secret = 'SAP_PROD_API_KEY_SECRET_9999';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payloadObj = {
      tenantId: tenantAId,
      eventType: 'ERP_INVOICE_PAID',
      externalEventId: `EVT-${Date.now()}-001`,
      payload: { invoiceNumber: 'INV-99', paidAmount: 12000 },
    };
    const rawPayload = JSON.stringify(payloadObj);

    // Generate valid HMAC signature: payloadToSign is timestamp.rawPayload
    const payloadToSign = `${timestamp}.${rawPayload}`;
    const signature = crypto.createHmac('sha256', secret).update(payloadToSign).digest('hex');

    // Verify signature check passes
    const verifyResult = WebhookVerifier.verifyHmacSha256(
      { providerKey: 'mock_erp', signature, timestamp, rawPayload },
      secret
    );
    assert.equal(verifyResult.valid, true, 'HMAC signature verification must pass for valid secret');

    // Replay protection: Expired timestamp (>5 min) must be rejected
    const expiredTimestamp = (Math.floor(Date.now() / 1000) - 400).toString();
    const expiredPayloadToSign = `${expiredTimestamp}.${rawPayload}`;
    const expiredSig = crypto.createHmac('sha256', secret).update(expiredPayloadToSign).digest('hex');
    const expiredResult = WebhookVerifier.verifyHmacSha256(
      { providerKey: 'mock_erp', signature: expiredSig, timestamp: expiredTimestamp, rawPayload },
      secret,
      300
    );
    assert.equal(expiredResult.valid, false, 'Expired timestamp must be rejected');
    assert.ok(expiredResult.reason?.includes('expired'));

    // Ingestion via WebhookService
    const ingestResult = await webhookService.ingestWebhook(
      'mock_erp',
      payloadObj,
      rawPayload,
      signature,
      timestamp
    );

    assert.equal(ingestResult.accepted, true);
    assert.ok(ingestResult.eventId);

    const savedEvent = await webhookRepo.findByExternalId('mock_erp', payloadObj.externalEventId);
    assert.equal(savedEvent?.status, WebhookEventStatus.VERIFIED);
  });

  it('7. Concurrency Invariant: Duplicate concurrent webhooks are rejected by database unique constraint', async () => {
    const secret = 'SAP_PROD_API_KEY_SECRET_9999';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const sharedExternalEventId = `RACE-WEBHOOK-${Date.now()}`;
    const payloadObj = {
      tenantId: tenantAId,
      eventType: 'PO_STATUS_CHANGED',
      externalEventId: sharedExternalEventId,
      payload: { poNumber: 'PO-550', status: 'APPROVED' },
    };
    const rawPayload = JSON.stringify(payloadObj);
    const payloadToSign = `${timestamp}.${rawPayload}`;
    const signature = crypto.createHmac('sha256', secret).update(payloadToSign).digest('hex');

    // Fire 2 concurrent ingestion calls with identical externalEventId
    const [res1, res2] = await Promise.all([
      webhookService.ingestWebhook('mock_erp', payloadObj, rawPayload, signature, timestamp),
      webhookService.ingestWebhook('mock_erp', payloadObj, rawPayload, signature, timestamp),
    ]);

    // Exactly one should be accepted (or handled idempotently), total records in DB for this event is 1
    const count = await prisma.webhookEvent.count({
      where: {
        providerKey: 'mock_erp',
        externalEventId: sharedExternalEventId,
      },
    });

    assert.equal(count, 1, 'Database unique constraint must ensure exactly 1 webhook record exists');
    assert.ok(res1.accepted || res2.accepted, 'At least one webhook response must be accepted');
  });

  it('8. Unknown provider is safely rejected / quarantined', async () => {
    const payloadObj = {
      tenantId: tenantAId,
      eventType: 'UNKNOWN_EVENT',
      externalEventId: `UNKWN-${Date.now()}`,
      payload: {},
    };

    const result = await webhookService.ingestWebhook(
      'unregistered_provider_key',
      payloadObj,
      JSON.stringify(payloadObj)
    );

    assert.equal(result.accepted, false);
    assert.ok(result.message.includes('not supported') || result.message.includes('quarantined'));
  });
});
