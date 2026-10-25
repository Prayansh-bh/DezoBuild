import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { peopleApi } from "@/lib/api";
import { queryKeys } from "./queryKeys";
import type {
  CreateEmployeeRequest,
  CreateAttendanceRequest,
  CreateLabourMusterRequest,
  CreateLeaveRequest,
} from "@/lib/api";

export function useEmployeesList(params?: { departmentId?: string; status?: string; search?: string }) {
  return useQuery({
    queryKey: queryKeys.people.employees(params),
    queryFn: () => peopleApi.listEmployees(params),
    staleTime: 30_000,
  });
}

export function useEmployeeDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.people.employeeDetail(id || ""),
    queryFn: () => peopleApi.getEmployeeById(id!),
    enabled: Boolean(id),
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEmployeeRequest) => peopleApi.createEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.people.all });
    },
  });
}

export function useAttendanceList(params?: { date?: string; employeeId?: string; projectId?: string }) {
  return useQuery({
    queryKey: queryKeys.people.attendance(params),
    queryFn: () => peopleApi.listAttendance(params),
  });
}

export function useRecordPunch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { employeeId: string; type: "IN" | "OUT"; timestamp?: string; location?: any }) =>
      peopleApi.recordPunch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.people.attendance() });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}

export function useCreateManualAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAttendanceRequest) => peopleApi.createManualAttendance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.people.attendance() });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}

export function useMustersList(params?: { projectId?: string; date?: string }) {
  return useQuery({
    queryKey: queryKeys.people.musters(params),
    queryFn: () => peopleApi.listMusters(params),
  });
}

export function useCreateMuster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLabourMusterRequest) => peopleApi.createMuster(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.people.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}

export function useLeavesList(params?: { employeeId?: string; status?: string }) {
  return useQuery({
    queryKey: queryKeys.people.leaves(params),
    queryFn: () => peopleApi.listLeaves(params),
  });
}

export function useCreateLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLeaveRequest) => peopleApi.createLeave(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.people.leaves() });
    },
  });
}
