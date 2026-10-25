import { PrismaClient, Prisma, type AIInsight } from '@prisma/client';
import { AIInsightStatus, AIInsightSeverity } from '../constants/ai.constants.js';
import type { QueryAIInsightsDto } from '../dto/ai.dto.js';

export class AIInsightRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async create(
    data: {
      tenantId: string;
      projectId?: string | null;
      featureKey: string;
      severity?: AIInsightSeverity;
      title: string;
      summary: string;
      evidence?: Record<string, any>;
      sourceReferences?: Record<string, any>;
      confidence?: number;
      generatedBy: string;
      aiRequestId?: string | null;
      expiresAt?: Date | null;
    },
    tx?: Prisma.TransactionClient
  ): Promise<AIInsight> {
    const client = tx || this.prisma;
    return client.aIInsight.create({
      data: {
        tenantId: data.tenantId,
        projectId: data.projectId || null,
        featureKey: data.featureKey,
        severity: data.severity ?? AIInsightSeverity.INFO,
        title: data.title,
        summary: data.summary,
        evidence: data.evidence ? (data.evidence as Prisma.InputJsonValue) : undefined,
        sourceReferences: data.sourceReferences
          ? (data.sourceReferences as Prisma.InputJsonValue)
          : undefined,
        confidence: data.confidence !== undefined ? new Prisma.Decimal(data.confidence) : undefined,
        generatedBy: data.generatedBy,
        aiRequestId: data.aiRequestId || null,
        status: AIInsightStatus.ACTIVE,
        expiresAt: data.expiresAt || null,
      },
    });
  }

  public async findById(
    tenantId: string,
    id: string,
    tx?: Prisma.TransactionClient
  ): Promise<AIInsight | null> {
    const client = tx || this.prisma;
    return client.aIInsight.findFirst({
      where: { id, tenantId },
    });
  }

  public async findMany(
    tenantId: string,
    filters: QueryAIInsightsDto,
    tx?: Prisma.TransactionClient
  ): Promise<{ items: AIInsight[]; total: number }> {
    const client = tx || this.prisma;

    const where: Prisma.AIInsightWhereInput = {
      tenantId,
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.featureKey ? { featureKey: filters.featureKey } : {}),
      ...(filters.severity ? { severity: filters.severity } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    };

    const [items, total] = await Promise.all([
      client.aIInsight.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit ?? 50,
        skip: filters.offset ?? 0,
      }),
      client.aIInsight.count({ where }),
    ]);

    return { items, total };
  }

  public async updateStatus(
    tenantId: string,
    id: string,
    status: AIInsightStatus,
    tx?: Prisma.TransactionClient
  ): Promise<AIInsight> {
    const client = tx || this.prisma;
    return client.aIInsight.update({
      where: { id, tenantId },
      data: { status },
    });
  }
}
