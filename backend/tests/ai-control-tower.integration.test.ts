import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseService } from '../src/database/database.service.js';
import { AIRequestRepository } from '../src/modules/ai/repositories/ai-request.repository.js';
import { AIInsightRepository } from '../src/modules/ai/repositories/ai-insight.repository.js';
import { AIProviderRegistry } from '../src/modules/ai/providers/ai-provider.registry.js';
import { RuleBasedAIProvider } from '../src/modules/ai/providers/rule-based-ai.provider.js';
import { AIService } from '../src/modules/ai/services/ai.service.js';
import { ControlTowerService } from '../src/modules/ai/services/control-tower.service.js';
import { AIInsightService } from '../src/modules/ai/services/ai-insight.service.js';
import { AISafetyService } from '../src/modules/ai/security/ai-safety.service.js';
import {
  AIFeatureKey,
  AIOperationType,
  AIRequestStatus,
  AIInsightStatus,
  AIInsightSeverity,
} from '../src/modules/ai/constants/ai.constants.js';
import { ForbiddenError, RateLimitError } from '../src/common/errors/app-error.js';

describe('DEZOBUILD Phase 17 — AI Control Tower, Context Safety & Non-Authoritative Invariant Suite', () => {
  const db = DatabaseService.getInstance();
  const prisma = db.getClient();

  let tenantAId: string;
  let tenantBId: string;
  let userAId: string;
  let userBId: string;
  let companyAId: string;
  let projectA1Id: string;
  let projectA2Id: string;

  let aiRequestRepo: AIRequestRepository;
  let aiInsightRepo: AIInsightRepository;
  let aiProviderRegistry: AIProviderRegistry;
  let ruleBasedProvider: RuleBasedAIProvider;

  let aiService: AIService;
  let controlTowerService: ControlTowerService;
  let insightService: AIInsightService;

  before(async () => {
    await db.connect();

    const timestamp = Date.now();

    // Tenant A
    const tA = await prisma.tenant.create({
      data: {
        code: `AI-TNA-${timestamp}`,
        name: 'AI Test Tenant Alpha',
        planTier: 'ENTERPRISE',
      },
    });
    tenantAId = tA.id;

    // User A
    const uA = await prisma.user.create({
      data: {
        tenantId: tenantAId,
        email: `usera-${timestamp}@ai.test`,
        fullName: 'Alice AI Lead',
        passwordHash: 'dummy',
      },
    });
    userAId = uA.id;

    // Company A
    const cA = await prisma.company.create({
      data: {
        tenantId: tenantAId,
        code: `CMP-AI-${timestamp}`,
        name: 'AI Construction Ltd',
        legalName: 'AI Construction Private Limited',
        panNumber: 'BBBBB0000B',
        gstin: '27BBBBB0000B1Z5',
        email: 'info@aiconstruction.test',
        phone: '9876543211',
        address: 'Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
      },
    });
    companyAId = cA.id;

    // Project A1
    const p1 = await prisma.project.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        code: `PRJ-AI1-${timestamp}`,
        name: 'Skyline Tower Alpha',
        plannedStartDate: new Date('2026-01-01'),
        plannedEndDate: new Date('2026-12-31'),
      },
    });
    projectA1Id = p1.id;

    // Project A2
    const p2 = await prisma.project.create({
      data: {
        tenantId: tenantAId,
        companyId: companyAId,
        code: `PRJ-AI2-${timestamp}`,
        name: 'Horizon Bridge Beta',
        plannedStartDate: new Date('2026-02-01'),
        plannedEndDate: new Date('2026-11-30'),
      },
    });
    projectA2Id = p2.id;

    // Tenant B
    const tB = await prisma.tenant.create({
      data: {
        code: `AI-TNB-${timestamp}`,
        name: 'AI Test Tenant Beta',
        planTier: 'ENTERPRISE',
      },
    });
    tenantBId = tB.id;

    // User B
    const uB = await prisma.user.create({
      data: {
        tenantId: tenantBId,
        email: `userb-${timestamp}@ai.test`,
        fullName: 'Bob Competitor',
        passwordHash: 'dummy',
      },
    });
    userBId = uB.id;

    // Repositories & Services
    aiRequestRepo = new AIRequestRepository(prisma);
    aiInsightRepo = new AIInsightRepository(prisma);

    aiProviderRegistry = AIProviderRegistry.getInstance();
    ruleBasedProvider = new RuleBasedAIProvider();
    aiProviderRegistry.register(ruleBasedProvider);

    aiService = new AIService(prisma, aiRequestRepo, aiInsightRepo, aiProviderRegistry);
    controlTowerService = new ControlTowerService(prisma);
    insightService = new AIInsightService(aiInsightRepo);
  });

  after(async () => {
    await prisma.aIInsight.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.aIRequest.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.alert.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.requestForInformation.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.nonConformanceReport.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.safetyIncident.deleteMany({
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

  it('1. AISafetyService enforces SHA256 input hashing, tenant isolation, and project scope assertion', () => {
    const payload = { tenantId: tenantAId, projectId: projectA1Id, feature: 'SCHEDULE' };
    const hash1 = AISafetyService.hashInput(payload);
    const hash2 = AISafetyService.hashInput(payload);

    assert.equal(hash1.length, 64, 'Input hash must be SHA256 hex string');
    assert.equal(hash1, hash2, 'Identical context data must generate identical hash');

    // Tenant Isolation check
    assert.doesNotThrow(() => {
      AISafetyService.assertTenantIsolation(tenantAId, tenantAId);
    });
    assert.throws(
      () => {
        AISafetyService.assertTenantIsolation(tenantAId, tenantBId);
      },
      ForbiddenError,
      'Cross-tenant access must throw ForbiddenError'
    );

    // Project Scope check
    assert.doesNotThrow(() => {
      AISafetyService.assertProjectAccess(projectA1Id, [projectA1Id, projectA2Id]);
    });
    assert.throws(
      () => {
        AISafetyService.assertProjectAccess(projectA1Id, [projectA2Id]);
      },
      ForbiddenError,
      'Unauthorized project access must throw ForbiddenError'
    );
  });

  it('2. AI Execution: Audit logging with tokens, cost, status & non-authoritative insight generation', async () => {
    const result = await aiService.execute(tenantAId, userAId, {
      featureKey: AIFeatureKey.SCHEDULE_FORECASTING,
      operation: AIOperationType.FORECAST,
      projectId: projectA1Id,
      parameters: {},
    });

    assert.ok(result.requestId, 'AI execution must generate an audit requestId');
    assert.ok(result.insightId, 'Schedule forecasting must produce non-authoritative insight ID');

    // Verify AI Request Audit Record in DB
    const auditRecord = await aiRequestRepo.findById(tenantAId, result.requestId);
    assert.ok(auditRecord);
    assert.equal(auditRecord?.featureKey, AIFeatureKey.SCHEDULE_FORECASTING);
    assert.equal(auditRecord?.status, AIRequestStatus.COMPLETED);
    assert.ok(auditRecord?.inputHash);
    assert.ok((auditRecord?.inputTokens || 0) > 0);
    assert.ok((auditRecord?.outputTokens || 0) > 0);
    assert.ok(auditRecord?.completedAt);

    // Verify AI Insight in DB
    const insightRecord = await aiInsightRepo.findById(tenantAId, result.insightId);
    assert.ok(insightRecord);
    assert.equal(insightRecord?.status, AIInsightStatus.ACTIVE);
    assert.equal(insightRecord?.projectId, projectA1Id);
  });

  it('3. Non-Authoritative Invariant: AI execution NEVER mutates authoritative domain records', async () => {
    // Create an RFI in DRAFT status
    const rfi = await prisma.requestForInformation.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        rfiNumber: `RFI-NONAUTH-${Date.now()}`,
        subject: 'Structural Beam Clarification',
        technicalQuery: 'What is the required reinforcement grade for Beam B-12?',
        status: 'DRAFT',
        raisedById: userAId,
      },
    });

    // Run AI RFI summarization feature
    const aiResult = await aiService.execute(tenantAId, userAId, {
      featureKey: AIFeatureKey.RFI_SUMMARY,
      operation: AIOperationType.SUMMARIZE,
      projectId: projectA1Id,
      entityType: 'REQUEST_FOR_INFORMATION',
      entityId: rfi.id,
      parameters: {},
    });

    assert.ok(aiResult.requestId);
    assert.ok(aiResult.insightId);

    // Assert that the authoritative RFI domain record remains untouched
    const unchangedRfi = await prisma.requestForInformation.findUnique({
      where: { id: rfi.id },
    });
    assert.equal(unchangedRfi?.status, 'DRAFT', 'AI execution must not change RFI status');
    assert.equal(unchangedRfi?.officialResponse, null, 'AI execution must not populate officialResponse');
  });

  it('4. Control Tower: Aggregates real-time signals from Phase 01–16 sources of truth', async () => {
    // Populate authoritative source data for Project A1
    await prisma.alert.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        alertType: 'SCHEDULE_DELAY',
        severity: 'CRITICAL',
        title: 'Concrete Curing Delay',
        message: 'Concrete curing delayed by 3 days',
        status: 'OPEN',
      },
    });

    await prisma.nonConformanceReport.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        ncrNumber: `NCR-${Date.now()}`,
        title: 'Rebar spacing deviation',
        description: 'Spacing is 250mm instead of 150mm',
        location: 'Block A, Level 3',
        category: 'WORKMANSHIP',
        severity: 'MAJOR',
        status: 'OPEN',
        raisedById: userAId,
        targetClosureDate: new Date(Date.now() + 7 * 86400000),
      },
    });

    await prisma.safetyIncident.create({
      data: {
        tenantId: tenantAId,
        projectId: projectA1Id,
        incidentNumber: `SAF-${Date.now()}`,
        incidentType: 'NEAR_MISS',
        description: 'Worker reported loose toe-board on level 4',
        occurredAt: new Date(),
        location: 'Tower 1 Sector B',
        severity: 'CRITICAL',
        status: 'REPORTED',
        reportedById: userAId,
      },
    });

    // Fetch Control Tower Overview for Tenant A
    const overview = await controlTowerService.getControlTowerSummary(tenantAId, {});
    assert.ok(overview.metrics.openAlerts >= 1);
    assert.ok(overview.metrics.criticalAlerts >= 1);
    assert.ok(overview.metrics.openNcrs >= 1);
    assert.ok(overview.metrics.criticalSafetyIncidents >= 1);
    assert.ok(overview.healthScore < 100);

    // Project-Scoped filtering check
    const p1Overview = await controlTowerService.getControlTowerSummary(tenantAId, {
      projectId: projectA1Id,
    });
    assert.equal(p1Overview.projectId, projectA1Id);

    const p2Overview = await controlTowerService.getControlTowerSummary(tenantAId, {
      projectId: projectA2Id,
    });
    assert.equal(p2Overview.metrics.openNcrs, 0, 'Project A2 has no NCRs');
  });

  it('5. AI Insight Lifecycle: Status transition from ACTIVE -> ACKNOWLEDGED and ACTIVE -> DISMISSED', async () => {
    const listBefore = await insightService.listInsights(tenantAId, {
      status: AIInsightStatus.ACTIVE,
      limit: 50,
      offset: 0,
    });
    assert.ok(listBefore.items.length > 0);
    const targetInsight = listBefore.items[0];

    // Acknowledge insight
    const acknowledged = await insightService.acknowledgeInsight(tenantAId, targetInsight.id);
    assert.equal(acknowledged.status, AIInsightStatus.ACKNOWLEDGED);

    // Dismiss insight
    const dismissed = await insightService.dismissInsight(tenantAId, targetInsight.id);
    assert.equal(dismissed.status, AIInsightStatus.DISMISSED);

    // Tenant Isolation on Insights
    await assert.rejects(
      async () => {
        await insightService.getInsightById(tenantBId, targetInsight.id);
      },
      /not found/i,
      'Tenant B cannot view Tenant A insight'
    );
  });
});
