import { apiClient } from "../client";
import type {
  ControlTowerSummaryDto,
  AiInsightDto,
  PaginatedResponse,
} from "../types";

export const controlTowerApi = {
  getSummary: async (params?: { projectId?: string }): Promise<ControlTowerSummaryDto> => {
    return apiClient.get<ControlTowerSummaryDto>("/ai/control-tower", { params });
  },

  listInsights: async (params?: { projectId?: string; category?: string }): Promise<AiInsightDto[]> => {
    return apiClient.get<AiInsightDto[]>("/ai/insights", { params });
  },

  acknowledgeInsight: async (id: string): Promise<AiInsightDto> => {
    return apiClient.patch<AiInsightDto>(`/ai/insights/${id}/acknowledge`);
  },

  dismissInsight: async (id: string): Promise<AiInsightDto> => {
    return apiClient.patch<AiInsightDto>(`/ai/insights/${id}/dismiss`);
  },

  executeAiRequest: async (data: { capability: string; context?: any; prompt?: string }): Promise<any> => {
    return apiClient.post("/ai/requests", data);
  },
};

export const integrationsApi = {
  listConnections: async (): Promise<any[]> => {
    return apiClient.get<any[]>("/integrations");
  },

  getConnectionById: async (id: string): Promise<any> => {
    return apiClient.get<any>(`/integrations/${id}`);
  },

  createConnection: async (data: any): Promise<any> => {
    return apiClient.post<any>("/integrations", data);
  },

  testConnection: async (id: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.post<{ success: boolean; message: string }>(`/integrations/${id}/test`);
  },

  triggerSync: async (id: string): Promise<{ jobId: string; status: string }> => {
    return apiClient.post<{ jobId: string; status: string }>(`/integrations/${id}/sync`);
  },
};
