import { apiClient } from "../client";
import type {
  InspectionDto,
  CreateInspectionRequest,
  NcrDto,
  CreateNcrRequest,
  SafetyObservationDto,
  CreateSafetyObservationRequest,
  SafetyIncidentDto,
  CreateSafetyIncidentRequest,
  PaginatedResponse,
} from "../types";

export const qualityApi = {
  // Inspections
  listInspections: async (params?: { projectId?: string; status?: string }): Promise<InspectionDto[]> => {
    return apiClient.get<InspectionDto[]>("/quality/inspections", { params });
  },

  getInspectionById: async (id: string): Promise<InspectionDto> => {
    return apiClient.get<InspectionDto>(`/quality/inspections/${id}`);
  },

  createInspection: async (data: CreateInspectionRequest): Promise<InspectionDto> => {
    return apiClient.post<InspectionDto>("/quality/inspections", data);
  },

  submitInspection: async (id: string): Promise<InspectionDto> => {
    return apiClient.post<InspectionDto>(`/quality/inspections/${id}/submit`);
  },

  approveInspection: async (id: string, notes?: string): Promise<InspectionDto> => {
    return apiClient.post<InspectionDto>(`/quality/inspections/${id}/approve`, { notes });
  },

  rejectInspection: async (id: string, notes?: string): Promise<InspectionDto> => {
    return apiClient.post<InspectionDto>(`/quality/inspections/${id}/reject`, { notes });
  },

  // NCRs
  listNcrs: async (params?: { projectId?: string; status?: string; severity?: string }): Promise<NcrDto[]> => {
    return apiClient.get<NcrDto[]>("/quality/ncrs", { params });
  },

  getNcrById: async (id: string): Promise<NcrDto> => {
    return apiClient.get<NcrDto>(`/quality/ncrs/${id}`);
  },

  createNcr: async (data: CreateNcrRequest): Promise<NcrDto> => {
    return apiClient.post<NcrDto>("/quality/ncrs", data);
  },

  verifyNcr: async (id: string, remarks?: string): Promise<NcrDto> => {
    return apiClient.post<NcrDto>(`/quality/ncrs/${id}/verify`, { remarks });
  },

  // Safety Observations
  listSafetyObservations: async (params?: { projectId?: string; status?: string }): Promise<SafetyObservationDto[]> => {
    return apiClient.get<SafetyObservationDto[]>("/safety/observations", { params });
  },

  createSafetyObservation: async (data: CreateSafetyObservationRequest): Promise<SafetyObservationDto> => {
    return apiClient.post<SafetyObservationDto>("/safety/observations", data);
  },

  closeSafetyObservation: async (id: string): Promise<SafetyObservationDto> => {
    return apiClient.post<SafetyObservationDto>(`/safety/observations/${id}/close`);
  },

  // Safety Incidents
  listSafetyIncidents: async (params?: { projectId?: string; severity?: string }): Promise<SafetyIncidentDto[]> => {
    return apiClient.get<SafetyIncidentDto[]>("/safety/incidents", { params });
  },

  createSafetyIncident: async (data: CreateSafetyIncidentRequest): Promise<SafetyIncidentDto> => {
    return apiClient.post<SafetyIncidentDto>("/safety/incidents", data);
  },

  closeSafetyIncident: async (id: string, data?: any): Promise<SafetyIncidentDto> => {
    return apiClient.post<SafetyIncidentDto>(`/safety/incidents/${id}/close`, data);
  },
};
