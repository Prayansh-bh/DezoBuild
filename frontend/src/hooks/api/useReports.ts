import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@/lib/api";
import { queryKeys } from "./queryKeys";

export function useProjectSummaryReport(params?: { projectId?: string }) {
  return useQuery({
    queryKey: queryKeys.reports.projectSummary(params),
    queryFn: () => reportsApi.getProjectsSummary(params),
    staleTime: 60_000,
  });
}

export function useBudgetActualReport(params?: { projectId?: string }) {
  return useQuery({
    queryKey: queryKeys.reports.budgetActual(params),
    queryFn: () => reportsApi.getBudgetActual(params),
    staleTime: 60_000,
  });
}

export function useStockStatusReport(params?: { storeId?: string; projectId?: string }) {
  return useQuery({
    queryKey: queryKeys.reports.stockStatus(params),
    queryFn: () => reportsApi.getStockSummary(params),
    staleTime: 60_000,
  });
}

export function useManpowerAttendanceReport(params?: { date?: string; projectId?: string }) {
  return useQuery({
    queryKey: queryKeys.reports.manpowerAttendance(params),
    queryFn: () => reportsApi.getManpowerAttendance(params),
    staleTime: 60_000,
  });
}

export function useEquipmentUtilizationReport(params?: { projectId?: string }) {
  return useQuery({
    queryKey: queryKeys.reports.equipmentUtilization(params),
    queryFn: () => reportsApi.getEquipmentUtilization(params),
    staleTime: 60_000,
  });
}

export function useQualitySafetyReport(params?: { projectId?: string }) {
  return useQuery({
    queryKey: queryKeys.reports.qualitySafety(params),
    queryFn: () => reportsApi.getQualitySafety(params),
    staleTime: 60_000,
  });
}
