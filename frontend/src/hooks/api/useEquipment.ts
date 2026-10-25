import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { equipmentApi } from "@/lib/api";
import { queryKeys } from "./queryKeys";
import type {
  CreateEquipmentRequest,
  CreateEquipmentAssignmentRequest,
  CreateEquipmentLogRequest,
  CreateFuelLogRequest,
  CreateEquipmentWorkOrderRequest,
} from "@/lib/api";

export function useEquipmentList(params?: { projectId?: string; status?: string; category?: string }) {
  return useQuery({
    queryKey: queryKeys.equipment.list(params),
    queryFn: () => equipmentApi.list(params),
    staleTime: 30_000,
  });
}

export function useEquipmentDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.equipment.detail(id || ""),
    queryFn: () => equipmentApi.getById(id!),
    enabled: Boolean(id),
  });
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEquipmentRequest) => equipmentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.equipment.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}

export function useUpdateEquipmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => equipmentApi.updateStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.equipment.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.equipment.all });
    },
  });
}

export function useEquipmentAssignments(equipmentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.equipment.assignments(equipmentId || ""),
    queryFn: () => equipmentApi.listAssignments(equipmentId!),
    enabled: Boolean(equipmentId),
  });
}

export function useCreateEquipmentAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ equipmentId, data }: { equipmentId: string; data: CreateEquipmentAssignmentRequest }) =>
      equipmentApi.createAssignment(equipmentId, data),
    onSuccess: (_, { equipmentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.equipment.assignments(equipmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.equipment.detail(equipmentId) });
    },
  });
}

export function useEquipmentOperatingLogs(equipmentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.equipment.operatingLogs(equipmentId || ""),
    queryFn: () => equipmentApi.listOperatingLogs(equipmentId!),
    enabled: Boolean(equipmentId),
  });
}

export function useCreateEquipmentOperatingLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ equipmentId, data }: { equipmentId: string; data: CreateEquipmentLogRequest }) =>
      equipmentApi.createOperatingLog(equipmentId, data),
    onSuccess: (_, { equipmentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.equipment.operatingLogs(equipmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}

export function useEquipmentFuelLogs(equipmentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.equipment.fuelLogs(equipmentId || ""),
    queryFn: () => equipmentApi.listFuelLogs(equipmentId!),
    enabled: Boolean(equipmentId),
  });
}

export function useCreateEquipmentFuelLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ equipmentId, data }: { equipmentId: string; data: CreateFuelLogRequest }) =>
      equipmentApi.createFuelLog(equipmentId, data),
    onSuccess: (_, { equipmentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.equipment.fuelLogs(equipmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
    },
  });
}

export function useEquipmentWorkOrders(params?: { equipmentId?: string; status?: string }) {
  return useQuery({
    queryKey: queryKeys.equipment.workOrders(params),
    queryFn: () => equipmentApi.listWorkOrders(params),
  });
}

export function useCreateEquipmentWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEquipmentWorkOrderRequest) => equipmentApi.createWorkOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.equipment.all });
    },
  });
}
