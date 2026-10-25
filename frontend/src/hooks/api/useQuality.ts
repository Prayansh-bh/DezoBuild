import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qualityApi } from "@/lib/api";
import { queryKeys } from "./queryKeys";
import type {
  CreateInspectionRequest,
  CreateNcrRequest,
  CreateSafetyObservationRequest,
  CreateSafetyIncidentRequest,
} from "@/lib/api";

export function useInspectionsList(params?: { projectId?: string; status?: string }) {
  return useQuery({
    queryKey: queryKeys.quality.inspections(params),
    queryFn: () => qualityApi.listInspections(params),
  });
}

export function useCreateInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInspectionRequest) => qualityApi.createInspection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quality.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}

export function useSubmitInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => qualityApi.submitInspection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quality.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
    },
  });
}

export function useApproveInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => qualityApi.approveInspection(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quality.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
    },
  });
}

export function useNcrsList(params?: { projectId?: string; status?: string; severity?: string }) {
  return useQuery({
    queryKey: queryKeys.quality.ncrs(params),
    queryFn: () => qualityApi.listNcrs(params),
  });
}

export function useCreateNcr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateNcrRequest) => qualityApi.createNcr(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quality.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}

export function useVerifyNcr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks?: string }) => qualityApi.verifyNcr(id, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quality.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}

export function useSafetyObservations(params?: { projectId?: string; status?: string }) {
  return useQuery({
    queryKey: queryKeys.quality.safetyObservations(params),
    queryFn: () => qualityApi.listSafetyObservations(params),
  });
}

export function useCreateSafetyObservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSafetyObservationRequest) => qualityApi.createSafetyObservation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quality.all });
    },
  });
}

export function useSafetyIncidents(params?: { projectId?: string; severity?: string }) {
  return useQuery({
    queryKey: queryKeys.quality.safetyIncidents(params),
    queryFn: () => qualityApi.listSafetyIncidents(params),
  });
}

export function useCreateSafetyIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSafetyIncidentRequest) => qualityApi.createSafetyIncident(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quality.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}
