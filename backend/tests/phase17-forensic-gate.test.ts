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
import { AISafetyService } from '../src/modules/ai/security/ai-safety.service.js';
import { AIRequestRepository } from '../src/modules/ai/repositories/ai-request.repository.js';
import { AIInsightRepository } from '../src/modules/ai/repositories/ai-insight.repository.js';
import { AIProviderRegistry } from '../src/modules/ai/providers/ai-provider.registry.js';
import { RuleBasedAIProvider } from '../src/modules/ai/providers/rule-based-ai.provider.js';
import { AIService } from '../src/modules/ai/services/ai.service.js';
import { ControlTowerService } from '../src/modules/ai/services/control-tower.service.js';
import {
  IntegrationType,
  IntegrationSyncDirection,
  IntegrationSyncJobStatus,
  WebhookEventStatus,
} from '../src/modules/integrations/constants/integration.constants.js';
import {
  AIFeatureKey,
  AIOperationType,
  AIRequestStatus,
  AIInsightStatus,
} from '../src/modules/ai/constants/ai.constants.js';
import { ForbiddenError, RateLimitError } from '../src/common/errors/app-error.js';

describe('DEZOBUILD Phase 17 — Forensic Gate & Security Proof Suite', () => {
  const db = DatabaseService.getInstance();
  const prisma = db.getClient();

  let tenantAId: string;
  let tenantBId: string;
  let userAId: string;
  let userBId: string;
  let companyAId: string;
  let projectAId: string;

  let connectionRepo: IntegrationConnectionRepository;
  let refRepo: ExternalReferenceRepository;
  let syncJobRepo: IntegrationSyncJobRepository;
  let webhookRepo: WebhookEventRepository;
  let providerRegistry: IntegrationProviderRegistry;

  let integrationService: IntegrationService;
  let refService: ExternalReferenceService;
  let syncService: SyncService;
  let webhookService: WebhookService;

  let aiRequestRepo: AIRequestRepository;
  let aiInsightRepo: AIInsightRepository;
  let aiProviderRegistry: AIProviderRegistry;
  let ruleBasedAIProvider: RuleBasedAIProvider;
  let aiService: AIService;
  let controlTowerService: ControlTowerService;

  before(async () => {
    await db.connect();
    const timestamp = Date.now();

    // Tenant A
    const tA = await prisma.tenant.create({
      data: {
        code: `FOR-TNA-${timestamp}`,
        name: 'Forensic Tenant A',
        planTier: 'ENTERPRISE',
      },
    });
    tenantAId = tA.id;

    const uA = await prisma.user.create({
      data: {
        tenantId: tenantAId,
        email: `usera-${timestamp}@forensic.test`,
        fullName: 'Alice Auditor',
        passwordHash: 'dummy',
      },
    });
    userAId = uA.id;

    const cA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        code: `CMP-FOR-${timestamp}`,
        name: 'Forensic Construction Ltd',
        legalName: 'Forensic Construction Private Limited',
        panNumber: 'CCCCC0000C',
        gstin: '27CCCCC0000C1Z5',
        email: 'info@forensic.test',
        phone: '9876543212',
        address: 'Delhi',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
      },
    });
    companyAId = cA.id;

    const pA = await prisma.project.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        code: `PRJ-FOR-${timestamp}`,
        name: 'Forensic Project Alpha',
        plannedStartDate: new Date('2026-01-01'),
        plannedEndDate: new Date('2026-12-31'),
      },
    });
    projectAId = pA.id;

    // Tenant B
    const tB = await prisma.tenant.create({
      data: {
        code: `FOR-TNB-${timestamp}`,
        name: 'Forensic Tenant B',
        planTier: 'ENTERPRISE',
      },
    });
    tenantBId = tB.id;

    const uB = await prisma.user.create({
      data: {
        tenantId: tenantBId,
        email: `userb-${timestamp}@forensic.test`,
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
    const mockErp = new MockErpProvider('mock_erp');
    providerRegistry.register(mockErp);

    integrationService = new IntegrationService(connectionRepo, providerRegistry);
    refService = new ExternalReferenceService(refRepo);
    syncService = new SyncService(syncJobRepo, connectionRepo, refRepo, providerRegistry);
    webhookService = new WebhookService(webhookRepo, connectionRepo, providerRegistry);

    aiRequestRepo = new AIRequestRepository(prisma);
    aiInsightRepo = new AIInsightRepository(prisma);
    aiProviderRegistry = AIProviderRegistry.getInstance();
    ruleBasedAIProvider = new RuleBasedAIProvider();
    aiProviderRegistry.register(ruleBasedAIProvider);

    aiService = new AIService(prisma, aiRequestRepo, aiInsightRepo, aiProviderRegistry);
    controlTowerService = new ControlTowerService(prisma);
  });

  after(async () => {
    await prisma.aIInsight.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.aIRequest.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.webhookEvent.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.integrationSyncJob.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.externalReference.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.integrationConnection.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.requestForInformation.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.project.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
    await db.disconnect();
  });

  // 1. SECRET VAULT SECURITY
  it('GATE 1: SecretVaultService AES-256-GCM authentication tag tampering fails closed', () => {
    const rawSecret = 'CONFIDENTIAL_BANK_SECRET_2026';
    const encrypted = SecretVaultService.encrypt(rawSecret);

    const [ivHex, tagHex, cipherHex] = encrypted.split(':');
    assert.ok(ivHex && tagHex && cipherHex, 'Encrypted secret must contain iv:tag:ciphertext');

    // Tamper with ciphertext by flipping a full 2-character hex byte
    const flippedByte = cipherHex.endsWith('00') ? 'ff' : '00';
    const tamperedCipher = cipherHex.slice(0, -2) + flippedByte;
    const tamperedPayload = `${ivHex}:${tagHex}:${tamperedCipher}`;

    assert.throws(
      () => {
        SecretVaultService.decrypt(tamperedPayload);
      },
      /Unsupported state or unable to authenticate data/i,
      'Tampered ciphertext MUST cause GCM authentication tag verification failure'
    );

    // Tamper with auth tag by flipping a full 2-character hex byte
    const flippedTagByte = tagHex.endsWith('00') ? 'ff' : '00';
    const tamperedTag = tagHex.slice(0, -2) + flippedTagByte;
    const tamperedTagPayload = `${ivHex}:${tamperedTag}:${cipherHex}`;
    assert.throws(
      () => {
        SecretVaultService.decrypt(tamperedTagPayload);
      },
      /Unsupported state or unable to authenticate data/i,
      'Tampered auth tag MUST cause GCM authentication failure'
    );
  });

  // 2. EXTERNAL REFERENCE UNIQUENESS UNDER CONCURRENCY
  it('GATE 2: 10 concurrent attempts to map the exact same logical ExternalReference yield exactly 1 record', async () => {
    const conn = await integrationService.createConnection(tenantAId, userAId, {
      name: 'SAP Concurrency Test Gateway',
      providerKey: 'mock_erp',
      integrationType: IntegrationType.ERP,
      config: { url: 'https://sap.local' },
      secret: 'SAP_CONCURRENCY_SECRET',
    });

    const entityType = 'PURCHASE_ORDER';
    const entityId = `PO-CONCUR-${Date.now()}`;
    const extEntityType = 'SAP_PO';
    const extEntityId = `EXT-SAP-PO-999`;

    // Fire 10 concurrent mapping attempts
    const attempts = await Promise.all(
      Array.from({ length: 10 }).map(() =>
        refRepo.upsert(tenantAId, {
          integrationConnectionId: conn.id,
          entityType,
          entityId,
          externalEntityType: extEntityType,
          externalEntityId: extEntityId,
          syncStatus: 'SYNCED',
        })
      )
    );

    // Verify all returned mappings point to the same physical record
    const firstId = attempts[0].id;
    for (const res of attempts) {
      assert.equal(res.id, firstId, 'All concurrent upserts must converge on the exact same record');
    }

    // Direct database count check
    const totalCount = await prisma.externalReference.count({
      where: {
        tenantId: tenantAId,
        integrationConnectionId: conn.id,
        entityType,
        entityId,
      },
    });
    assert.equal(totalCount, 1, 'Exactly 1 logical mapping row must exist in PostgreSQL');
  });

  // 3. SYNC JOB IDEMPOTENCY & WORKER ISOLATION
  it('GATE 3: Concurrent workers claiming the same sync job guarantee single worker ownership', async () => {
    const connList = await connectionRepo.findMany(tenantAId, { limit: 1, offset: 0 });
    const connId = connList.items[0].id;
    const idempotencyKey = `SYNC-GATE3-${Date.now()}`;

    // Queue 1 job
    const job = await syncService.queueSyncJob(tenantAId, connId, {
      direction: IntegrationSyncDirection.OUTBOUND,
      entityType: 'VENDOR_INVOICE',
      idempotencyKey,
      scopeMetadata: { invoiceId: 'INV-101' },
    });

    // 5 concurrent workers attempt to claim the same pending job
    const [worker1, worker2, worker3, worker4, worker5] = await Promise.all([
      syncJobRepo.claimPendingJobs(1),
      syncJobRepo.claimPendingJobs(1),
      syncJobRepo.claimPendingJobs(1),
      syncJobRepo.claimPendingJobs(1),
      syncJobRepo.claimPendingJobs(1),
    ]);

    const allClaimed = [...worker1, ...worker2, ...worker3, ...worker4, ...worker5];
    const matchingClaimed = allClaimed.filter((j) => j.id === job.id);

    assert.equal(matchingClaimed.length, 1, 'Exactly 1 worker must obtain the claim lock via SKIP LOCKED');
  });

  // 4. WEBHOOK SECURITY & TIMING RESISTANCE
  it('GATE 4: Webhook HMAC signature verification rejects timing mismatch, wrong keys & replayed timestamps', async () => {
    const secret = 'VALID_SIGNING_SECRET_123';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const rawPayload = JSON.stringify({ event: 'INVOICE_PAID', amount: 5000 });

    const payloadToSign = `${timestamp}.${rawPayload}`;
    const validSignature = crypto.createHmac('sha256', secret).update(payloadToSign).digest('hex');

    // 1. Valid signature -> Passes
    const resValid = WebhookVerifier.verifyHmacSha256(
      { providerKey: 'mock_erp', signature: validSignature, timestamp, rawPayload },
      secret
    );
    assert.equal(resValid.valid, true);

    // 2. Wrong secret -> Fails
    const resWrongSecret = WebhookVerifier.verifyHmacSha256(
      { providerKey: 'mock_erp', signature: validSignature, timestamp, rawPayload },
      'WRONG_SIGNING_SECRET_999'
    );
    assert.equal(resWrongSecret.valid, false);

    // 3. Forged signature payload -> Fails
    const resForged = WebhookVerifier.verifyHmacSha256(
      { providerKey: 'mock_erp', signature: 'deadbeef'.repeat(8), timestamp, rawPayload },
      secret
    );
    assert.equal(resForged.valid, false);

    // 4. Replayed timestamp (>300s old) -> Fails
    const oldTimestamp = (Math.floor(Date.now() / 1000) - 350).toString();
    const oldSig = crypto.createHmac('sha256', secret).update(`${oldTimestamp}.${rawPayload}`).digest('hex');
    const resExpired = WebhookVerifier.verifyHmacSha256(
      { providerKey: 'mock_erp', signature: oldSig, timestamp: oldTimestamp, rawPayload },
      secret,
      300
    );
    assert.equal(resExpired.valid, false);
    assert.ok(resExpired.reason?.includes('expired'));
  });

  // 5. WEBHOOK TENANT RESOLUTION & FORGERY PREVENTION
  it('GATE 5: Inbound webhook rejects spoofed tenantId when signing secret does not match tenant connection', async () => {
    // Tenant A connection has secret 'SAP_CONCURRENCY_SECRET'
    // Attacker crafts payload declaring tenantId = tenantAId, but signs with Attacker Secret
    const attackerSecret = 'ATTACKER_MALICIOUS_KEY';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payloadObj = {
      tenantId: tenantAId,
      eventType: 'UNAUTHORIZED_MUTATION',
      externalEventId: `FORGED-EVT-${Date.now()}`,
      payload: { balance: 0 },
    };
    const rawPayload = JSON.stringify(payloadObj);
    const forgedSig = crypto.createHmac('sha256', attackerSecret).update(`${timestamp}.${rawPayload}`).digest('hex');

    // Ingestion must fail closed because WebhookService uses Tenant A's decrypted connection secret
    const ingestResult = await webhookService.ingestWebhook(
      'mock_erp',
      payloadObj,
      rawPayload,
      forgedSig,
      timestamp
    );

    assert.equal(ingestResult.accepted, false, 'Forged webhook signed with foreign key MUST be rejected');
    assert.equal(ingestResult.status, WebhookEventStatus.FAILED);
  });

  // 6. AI TENANT & SCOPE ISOLATION
  it('GATE 6: Cross-tenant AI execution is prevented and cannot leak tenant B data', async () => {
    // Tenant A user attempts to request AI forecast with context belonging to Tenant B
    assert.throws(
      () => {
        AISafetyService.assertTenantIsolation(tenantAId, tenantBId);
      },
      ForbiddenError,
      'Cross-tenant isolation check must throw ForbiddenError'
    );

    // Tenant B cannot retrieve Tenant A insight
    const aiRes = await aiService.execute(tenantAId, userAId, {
      featureKey: AIFeatureKey.SCHEDULE_FORECASTING,
      operation: AIOperationType.FORECAST,
      projectId: projectAId,
      parameters: {},
    });

    assert.ok(aiRes.insightId);

    await assert.rejects(
      async () => {
        const repo = new AIInsightRepository(prisma);
        const fetched = await repo.findById(tenantBId, aiRes.insightId);
        if (!fetched) throw new ForbiddenError('Tenant B cannot access Tenant A insight');
      },
      ForbiddenError,
      'Tenant B must be blocked from reading Tenant A AI Insight'
    );
  });

  // 7. AI NON-AUTHORITATIVE INVARIANT
  it('GATE 7: AI execution produces non-authoritative advisory insights with ZERO mutations to authoritative tables', async () => {
    const rfi = await prisma.requestForInformation.create({
      data: {
        tenantId: tenantAId,
        projectId: projectAId,
        rfiNumber: `RFI-GATE7-${Date.now()}`,
        subject: 'Structural Foundation Reinforcement',
        technicalQuery: 'Confirm footing depth for Grid C-4',
        status: 'SUBMITTED',
        raisedById: userAId,
      },
    });

    const aiResult = await aiService.execute(tenantAId, userAId, {
      featureKey: AIFeatureKey.RFI_SUMMARY,
      operation: AIOperationType.SUMMARIZE,
      projectId: projectAId,
      entityType: 'REQUEST_FOR_INFORMATION',
      entityId: rfi.id,
      parameters: {},
    });

    assert.ok(aiResult.requestId);
    assert.ok(aiResult.insightId);

    // Verify RFI in database is completely untouched
    const afterRfi = await prisma.requestForInformation.findUnique({
      where: { id: rfi.id },
    });
    assert.equal(afterRfi?.status, 'SUBMITTED');
    assert.equal(afterRfi?.officialResponse, null);
    assert.equal(afterRfi?.respondedById, null);
  });

  // 8. AI RATE LIMITING ATOMICTY
  it('GATE 8: AISafetyService rate limiter enforces 60 requests/min per tenant fail-closed', () => {
    const testTenantId = `RATE-TEST-${Date.now()}`;

    // Fire 60 allowed requests
    for (let i = 0; i < 60; i++) {
      assert.doesNotThrow(() => {
        AISafetyService.enforceRateLimit(testTenantId);
      });
    }

    // 61st request must trigger RateLimitError
    assert.throws(
      () => {
        AISafetyService.enforceRateLimit(testTenantId);
      },
      RateLimitError,
      '61st request in 1-minute window must be blocked by RateLimitError'
    );
  });
});
