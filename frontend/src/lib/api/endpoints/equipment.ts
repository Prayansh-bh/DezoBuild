import { apiClient } from "../client";
import type {
  EquipmentDto,
  CreateEquipmentRequest,
  EquipmentAssignmentDto,
  CreateEquipmentAssignmentRequest,
  EquipmentOperatingLogDto,
  CreateEquipmentLogRequest,
  EquipmentFuelLogDto,
  CreateFuelLogRequest,
  EquipmentWorkOrderDto,
  CreateEquipmentWorkOrderRequest,
  PaginatedResponse,
} from "../types";

export const equipmentApi = {
  // Equipment
  list: async (params?: { projectId?: string; status?: string; category?: string }): Promise<EquipmentDto[]> => {
    return apiClient.get<EquipmentDto[]>("/equipment", { params });
  },

  getById: async (id: string): Promise<EquipmentDto> => {
    return apiClient.get<EquipmentDto>(`/equipment/${id}`);
  },

  create: async (data: CreateEquipmentRequest): Promise<EquipmentDto> => {
    return apiClient.post<EquipmentDto>("/equipment", data);
  },

  update: async (id: string, data: Partial<CreateEquipmentRequest>): Promise<EquipmentDto> => {
    return apiClient.put<EquipmentDto>(`/equipment/${id}`, data);
  },

  updateStatus: async (id: string, status: string): Promise<EquipmentDto> => {
    return apiClient.patch<EquipmentDto>(`/equipment/${id}/status`, { status });
  },

  // Assignments
  listAssignments: async (equipmentId: string): Promise<EquipmentAssignmentDto[]> => {
    return apiClient.get<EquipmentAssignmentDto[]>(`/equipment/${equipmentId}/assignments`);
  },

  createAssignment: async (equipmentId: string, data: CreateEquipmentAssignmentRequest): Promise<EquipmentAssignmentDto> => {
    return apiClient.post<EquipmentAssignmentDto>(`/equipment/${equipmentId}/assignments`, data);
  },

  returnAssignment: async (assignmentId: string, data: { returnDate?: string; returnMeterReading?: number; remarks?: string }): Promise<EquipmentAssignmentDto> => {
    return apiClient.post<EquipmentAssignmentDto>(`/equipment/assignments/${assignmentId}/return`, data);
  },

  // Operating Logs
  listOperatingLogs: async (equipmentId: string): Promise<EquipmentOperatingLogDto[]> => {
    return apiClient.get<EquipmentOperatingLogDto[]>(`/equipment/${equipmentId}/operating-logs`);
  },

  createOperatingLog: async (equipmentId: string, data: CreateEquipmentLogRequest): Promise<EquipmentOperatingLogDto> => {
    return apiClient.post<EquipmentOperatingLogDto>(`/equipment/${equipmentId}/operating-logs`, data);
  },

  // Fuel Logs
  listFuelLogs: async (equipmentId: string): Promise<EquipmentFuelLogDto[]> => {
    return apiClient.get<EquipmentFuelLogDto[]>(`/equipment/${equipmentId}/fuel-logs`);
  },

  createFuelLog: async (equipmentId: string, data: CreateFuelLogRequest): Promise<EquipmentFuelLogDto> => {
    return apiClient.post<EquipmentFuelLogDto>(`/equipment/${equipmentId}/fuel-logs`, data);
  },

  // Work Orders & Maintenance
  listWorkOrders: async (params?: { equipmentId?: string; status?: string }): Promise<EquipmentWorkOrderDto[]> => {
    return apiClient.get<EquipmentWorkOrderDto[]>("/equipment/work-orders", { params });
  },

  getWorkOrderById: async (id: string): Promise<EquipmentWorkOrderDto> => {
    return apiClient.get<EquipmentWorkOrderDto>(`/equipment/work-orders/${id}`);
  },

  createWorkOrder: async (data: CreateEquipmentWorkOrderRequest): Promise<EquipmentWorkOrderDto> => {
    return apiClient.post<EquipmentWorkOrderDto>("/equipment/work-orders", data);
  },

  completeWorkOrder: async (id: string, data?: { actualCost?: number; remarks?: string }): Promise<EquipmentWorkOrderDto> => {
    return apiClient.post<EquipmentWorkOrderDto>(`/equipment/work-orders/${id}/complete`, data);
  },
};
