import { PrismaClient, Prisma, type AIRequest } from '@prisma/client';
import { AIRequestStatus } from '../constants/ai.constants.js';

export class AIRequestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async create(
    data: {
      tenantId: string;
      requestedById: string;
      featureKey: string;
      operation: string;
      providerKey: string;
      model: string;
      inputHash: string;
      correlationId?: string | null;
    },
    tx?: Prisma.TransactionClient
  ): Promise<AIRequest> {
    const client = tx || this.prisma;
    return client.aIRequest.create({
      data: {
        tenantId: data.tenantId,
        requestedById: data.requestedById,
        featureKey: data.featureKey,
        operation: data.operation,
        providerKey: data.providerKey,
        model: data.model,
        inputHash: data.inputHash,
        status: AIRequestStatus.PENDING,
        correlationId: data.correlationId || null,
      },
    });
  }

  public async markCompleted(
    id: string,
    result: {
      inputTokens: number;
      outputTokens: number;
      latencyMs: number;
      estimatedCost?: number;
    },
    tx?: Prisma.TransactionClient
  ): Promise<AIRequest> {
    const client = tx || this.prisma;
    return client.aIRequest.update({
      where: { id },
      data: {
        status: AIRequestStatus.COMPLETED,
        completedAt: new Date(),
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        totalTokens: result.inputTokens + result.outputTokens,
        latencyMs: result.latencyMs,
        estimatedCost: result.estimatedCost !== undefined ? new Prisma.Decimal(result.estimatedCost) : undefined,
      },
    });
  }

  public async markFailed(
    id: string,
    errorCode: string,
    tx?: Prisma.TransactionClient
  ): Promise<AIRequest> {
    const client = tx || this.prisma;
    return client.aIRequest.update({
      where: { id },
      data: {
        status: AIRequestStatus.FAILED,
        failedAt: new Date(),
        errorCode,
      },
    });
  }

  public async findById(
    tenantId: string,
    id: string,
    tx?: Prisma.TransactionClient
  ): Promise<AIRequest | null> {
    const client = tx || this.prisma;
    return client.aIRequest.findFirst({
      where: { id, tenantId },
      include: {
        insights: true,
      },
    });
  }

  public async findMany(
    tenantId: string,
    query: { featureKey?: string; status?: string; limit?: number; offset?: number },
    tx?: Prisma.TransactionClient
  ): Promise<{ items: AIRequest[]; total: number }> {
    const client = tx || this.prisma;

    const where: Prisma.AIRequestWhereInput = {
      tenantId,
      ...(query.featureKey ? { featureKey: query.featureKey } : {}),
      ...(query.status ? { status: query.status as AIRequestStatus } : {}),
    };

    const [items, total] = await Promise.all([
      client.aIRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit ?? 50,
        skip: query.offset ?? 0,
      }),
      client.aIRequest.count({ where }),
    ]);

    return { items, total };
  }
}
