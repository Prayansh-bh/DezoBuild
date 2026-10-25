import { apiClient } from "../client";
import type {
  ApprovalRequestDto,
  SubmitApprovalRequest,
  PaginatedResponse,
} from "../types";

export interface ApprovalPolicyDto {
  id: string;
  tenantId: string;
  name: string;
  entityType: string;
  status: "DRAFT" | "ACTIVE" | "SUPERSEDED" | "ARCHIVED";
  version: number;
  description?: string;
  thresholdAmount?: number;
  steps: Array<{
    stepOrder: number;
    approverRole: string;
    description?: string;
    isMandatory: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApprovalPolicyRequest {
  name: string;
  entityType: string;
  description?: string;
  thresholdAmount?: number;
  steps: Array<{
    stepOrder: number;
    approverRole: string;
    description?: string;
    isMandatory?: boolean;
  }>;
}

export const approvalsApi = {
  // Policies
  listPolicies: async (params?: { entityType?: string; status?: string }): Promise<ApprovalPolicyDto[]> => {
    return apiClient.get<ApprovalPolicyDto[]>("/approvals/policies", { params });
  },

  getPolicyById: async (id: string): Promise<ApprovalPolicyDto> => {
    return apiClient.get<ApprovalPolicyDto>(`/approvals/policies/${id}`);
  },

  createPolicy: async (data: CreateApprovalPolicyRequest): Promise<ApprovalPolicyDto> => {
    return apiClient.post<ApprovalPolicyDto>("/approvals/policies", data);
  },

  activatePolicy: async (id: string): Promise<ApprovalPolicyDto> => {
    return apiClient.post<ApprovalPolicyDto>(`/approvals/policies/${id}/activate`);
  },

  deactivatePolicy: async (id: string): Promise<ApprovalPolicyDto> => {
    return apiClient.post<ApprovalPolicyDto>(`/approvals/policies/${id}/deactivate`);
  },

  // Requests
  listRequests: async (params?: { entityType?: string; status?: string }): Promise<ApprovalRequestDto[]> => {
    return apiClient.get<ApprovalRequestDto[]>("/approvals/requests", { params });
  },

  listPending: async (): Promise<ApprovalRequestDto[]> => {
    return apiClient.get<ApprovalRequestDto[]>("/approvals/requests/pending");
  },

  getRequestById: async (id: string): Promise<ApprovalRequestDto> => {
    return apiClient.get<ApprovalRequestDto>(`/approvals/requests/${id}`);
  },

  submitRequest: async (data: SubmitApprovalRequest): Promise<ApprovalRequestDto> => {
    return apiClient.post<ApprovalRequestDto>("/approvals/requests", data);
  },

  approveStep: async (id: string, notes?: string): Promise<ApprovalRequestDto> => {
    return apiClient.post<ApprovalRequestDto>(`/approvals/requests/${id}/approve`, { notes });
  },

  rejectRequest: async (id: string, reason?: string): Promise<ApprovalRequestDto> => {
    return apiClient.post<ApprovalRequestDto>(`/approvals/requests/${id}/reject`, { reason });
  },

  returnRequest: async (id: string, reason?: string): Promise<ApprovalRequestDto> => {
    return apiClient.post<ApprovalRequestDto>(`/approvals/requests/${id}/return`, { reason });
  },

  cancelRequest: async (id: string, reason?: string): Promise<ApprovalRequestDto> => {
    return apiClient.post<ApprovalRequestDto>(`/approvals/requests/${id}/cancel`, { reason });
  },
};

