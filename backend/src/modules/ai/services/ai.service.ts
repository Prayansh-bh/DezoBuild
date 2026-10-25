import type { PrismaClient } from '@prisma/client';
import { AIProviderRegistry } from '../providers/ai-provider.registry.js';
import type { AIRequestRepository } from '../repositories/ai-request.repository.js';
import type { AIInsightRepository } from '../repositories/ai-insight.repository.js';
import { AISafetyService } from '../security/ai-safety.service.js';
import { ScheduleForecastContextBuilder } from '../context/schedule-forecast-context.builder.js';
import { CostVarianceContextBuilder } from '../context/cost-variance-context.builder.js';
import { RfiSummaryContextBuilder } from '../context/rfi-summary-context.builder.js';
import {
  AIFeatureKey,
  AIOperationType,
  AI_TOKEN_PRICING,
  AIInsightSeverity,
} from '../constants/ai.constants.js';
import type { ExecuteAIRequestDto } from '../dto/ai.dto.js';
import { BadRequestError } from '../../../common/errors/app-error.js';

export class AIService {
  private readonly scheduleForecastBuilder: ScheduleForecastContextBuilder;
  private readonly costVarianceBuilder: CostVarianceContextBuilder;
  private readonly rfiSummaryBuilder: RfiSummaryContextBuilder;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly aiRequestRepo: AIRequestRepository,
    private readonly aiInsightRepo: AIInsightRepository,
    private readonly providerRegistry: AIProviderRegistry = AIProviderRegistry.getInstance()
  ) {
    this.scheduleForecastBuilder = new ScheduleForecastContextBuilder(this.prisma);
    this.costVarianceBuilder = new CostVarianceContextBuilder(this.prisma);
    this.rfiSummaryBuilder = new RfiSummaryContextBuilder(this.prisma);
  }

  public async execute(
    tenantId: string,
    userId: string,
    dto: ExecuteAIRequestDto,
    userProjectIds?: string[] | null
  ) {
    // 1. Safety: Rate limit and project scoping
    AISafetyService.enforceRateLimit(tenantId);
    if (dto.projectId) {
      AISafetyService.assertProjectAccess(dto.projectId, userProjectIds);
    }

    // 2. Build scoped contextual data
    let structuredContext: Record<string, any> = {};
    let promptText = `Execute ${dto.operation} for feature ${dto.featureKey}`;

    switch (dto.featureKey) {
      case AIFeatureKey.SCHEDULE_FORECASTING:
        if (!dto.projectId) {
          throw new BadRequestError('projectId is required for schedule forecasting');
        }
        structuredContext = await this.scheduleForecastBuilder.build(tenantId, dto.projectId);
        promptText = `Forecast schedule completion date and slippage for project ${dto.projectId}`;
        break;

      case AIFeatureKey.COST_VARIANCE:
        structuredContext = await this.costVarianceBuilder.build(tenantId, dto.projectId);
        promptText = `Explain cost variances across project financial ledgers`;
        break;

      case AIFeatureKey.RFI_SUMMARY:
        if (!dto.entityId) {
          throw new BadRequestError('entityId (rfiId) is required for RFI summary');
        }
        structuredContext = await this.rfiSummaryBuilder.build(tenantId, dto.entityId);
        promptText = `Summarize technical RFI ${dto.entityId}`;
        break;

      default:
        structuredContext = { parameters: dto.parameters };
        break;
    }

    const inputHash = AISafetyService.hashInput(structuredContext);
    const provider = this.providerRegistry.get();
    if (!provider) {
      throw new BadRequestError('No AI provider available');
    }

    // 3. Create audit record in PENDING status
    const aiRequest = await this.aiRequestRepo.create({
      tenantId,
      requestedById: userId,
      featureKey: dto.featureKey,
      operation: dto.operation,
      providerKey: provider.providerKey,
      model: provider.defaultModel,
      inputHash,
      correlationId: dto.correlationId,
    });

    // 4. Execute AI provider
    try {
      const result = await provider.execute({
        tenantId,
        projectId: dto.projectId,
        featureKey: dto.featureKey,
        operation: dto.operation,
        promptText,
        structuredContext,
        parameters: dto.parameters,
      });

      if (!result.success) {
        await this.aiRequestRepo.markFailed(aiRequest.id, result.error || 'PROVIDER_ERROR');
        return {
          success: false,
          requestId: aiRequest.id,
          error: result.error,
        };
      }

      // 5. Calculate token usage & cost
      const estimatedCost =
        (result.inputTokens / 1000) * AI_TOKEN_PRICING.DEFAULT_INPUT_PER_1K +
        (result.outputTokens / 1000) * AI_TOKEN_PRICING.DEFAULT_OUTPUT_PER_1K;

      await this.aiRequestRepo.markCompleted(aiRequest.id, {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs: result.latencyMs,
        estimatedCost,
      });

      // 6. Generate non-authoritative AI insight record
      const insight = await this.aiInsightRepo.create({
        tenantId,
        projectId: dto.projectId,
        featureKey: dto.featureKey,
        severity: AIInsightSeverity.INFO,
        title: `${dto.featureKey.replace('ai:', '').toUpperCase()} Analysis`,
        summary: result.outputSummary,
        evidence: result.structuredResult,
        confidence: result.confidence,
        generatedBy: `${provider.providerKey}:${provider.defaultModel}`,
        aiRequestId: aiRequest.id,
      });

      return {
        success: true,
        requestId: aiRequest.id,
        insightId: insight.id,
        summary: result.outputSummary,
        result: result.structuredResult,
        confidence: result.confidence,
        usage: {
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          totalTokens: result.inputTokens + result.outputTokens,
          estimatedCost,
          latencyMs: result.latencyMs,
        },
      };
    } catch (err: any) {
      const errorMsg = err?.message || 'Unexpected AI execution failure';
      await this.aiRequestRepo.markFailed(aiRequest.id, errorMsg);
      return {
        success: false,
        requestId: aiRequest.id,
        error: errorMsg,
      };
    }
  }

  public async getRequestById(tenantId: string, id: string) {
    return this.aiRequestRepo.findById(tenantId, id);
  }

  public async listRequests(
    tenantId: string,
    query: { featureKey?: string; status?: string; limit?: number; offset?: number }
  ) {
    return this.aiRequestRepo.findMany(tenantId, query);
  }
}
