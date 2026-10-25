import type { AIInsightRepository } from '../repositories/ai-insight.repository.js';
import type { QueryAIInsightsDto } from '../dto/ai.dto.js';
import { AIInsightStatus } from '../constants/ai.constants.js';
import { NotFoundError } from '../../../common/errors/app-error.js';

export class AIInsightService {
  constructor(private readonly insightRepo: AIInsightRepository) {}

  public async listInsights(
    tenantId: string,
    query: QueryAIInsightsDto,
    userProjectIds?: string[] | null
  ) {
    if (userProjectIds && query.projectId && !userProjectIds.includes(query.projectId)) {
      return { items: [], total: 0 };
    }
    return this.insightRepo.findMany(tenantId, query);
  }

  public async getInsightById(tenantId: string, id: string) {
    const insight = await this.insightRepo.findById(tenantId, id);
    if (!insight) {
      throw new NotFoundError(`AIInsight ${id} not found`);
    }
    return insight;
  }

  public async acknowledgeInsight(tenantId: string, id: string) {
    await this.getInsightById(tenantId, id);
    return this.insightRepo.updateStatus(tenantId, id, AIInsightStatus.ACKNOWLEDGED);
  }

  public async dismissInsight(tenantId: string, id: string) {
    await this.getInsightById(tenantId, id);
    return this.insightRepo.updateStatus(tenantId, id, AIInsightStatus.DISMISSED);
  }
}
