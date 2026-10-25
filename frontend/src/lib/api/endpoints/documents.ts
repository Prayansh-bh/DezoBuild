import { apiClient } from "../client";
import type {
  EngineeringDocumentDto,
  CreateDocumentRequest,
  DocumentVersionDto,
  RegisterDocumentVersionRequest,
  TransmittalDto,
  CreateTransmittalRequest,
  RfiDto,
  CreateRfiRequest,
  PaginatedResponse,
} from "../types";

export const documentsApi = {
  // Documents
  listDocuments: async (params?: { projectId?: string; category?: string; status?: string }): Promise<EngineeringDocumentDto[]> => {
    return apiClient.get<EngineeringDocumentDto[]>("/documents", { params });
  },

  getDocumentById: async (id: string): Promise<EngineeringDocumentDto> => {
    return apiClient.get<EngineeringDocumentDto>(`/documents/${id}`);
  },

  createDocument: async (data: CreateDocumentRequest): Promise<EngineeringDocumentDto> => {
    return apiClient.post<EngineeringDocumentDto>("/documents", data);
  },

  archiveDocument: async (id: string): Promise<EngineeringDocumentDto> => {
    return apiClient.post<EngineeringDocumentDto>(`/documents/${id}/archive`);
  },

  // Document Versions
  listVersions: async (documentId: string): Promise<DocumentVersionDto[]> => {
    return apiClient.get<DocumentVersionDto[]>(`/documents/${documentId}/versions`);
  },

  registerVersion: async (documentId: string, data: RegisterDocumentVersionRequest): Promise<DocumentVersionDto> => {
    return apiClient.post<DocumentVersionDto>(`/documents/${documentId}/versions`, data);
  },

  issueVersion: async (documentId: string, versionId: string): Promise<DocumentVersionDto> => {
    return apiClient.post<DocumentVersionDto>(`/documents/${documentId}/versions/${versionId}/issue`);
  },

  // Transmittals
  listTransmittals: async (params?: { projectId?: string; status?: string }): Promise<TransmittalDto[]> => {
    return apiClient.get<TransmittalDto[]>("/documents/transmittals", { params });
  },

  getTransmittalById: async (id: string): Promise<TransmittalDto> => {
    return apiClient.get<TransmittalDto>(`/documents/transmittals/${id}`);
  },

  createTransmittal: async (data: CreateTransmittalRequest): Promise<TransmittalDto> => {
    return apiClient.post<TransmittalDto>("/documents/transmittals", data);
  },

  issueTransmittal: async (id: string): Promise<TransmittalDto> => {
    return apiClient.post<TransmittalDto>(`/documents/transmittals/${id}/issue`);
  },

  // RFIs
  listRfis: async (params?: { projectId?: string; status?: string; priority?: string }): Promise<RfiDto[]> => {
    return apiClient.get<RfiDto[]>("/documents/rfis", { params });
  },

  getRfiById: async (id: string): Promise<RfiDto> => {
    return apiClient.get<RfiDto>(`/documents/rfis/${id}`);
  },

  createRfi: async (data: CreateRfiRequest): Promise<RfiDto> => {
    return apiClient.post<RfiDto>("/documents/rfis", data);
  },

  submitRfi: async (id: string): Promise<RfiDto> => {
    return apiClient.post<RfiDto>(`/documents/rfis/${id}/submit`);
  },

  respondRfi: async (id: string, response: string): Promise<RfiDto> => {
    return apiClient.post<RfiDto>(`/documents/rfis/${id}/respond`, { response });
  },

  closeRfi: async (id: string): Promise<RfiDto> => {
    return apiClient.post<RfiDto>(`/documents/rfis/${id}/close`);
  },
};
