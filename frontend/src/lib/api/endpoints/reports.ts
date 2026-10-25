import { apiClient } from "../client";
import type {
  ProjectSummaryReportDto,
  FinanceBudgetReportDto,
  MaterialStockReportDto,
  ManpowerAttendanceReportDto,
  EquipmentUtilizationReportDto,
  QualitySafetyReportDto,
} from "../types";

export const reportsApi = {
  getProjectsSummary: async (params?: { projectId?: string }): Promise<ProjectSummaryReportDto> => {
    return apiClient.get<ProjectSummaryReportDto>("/reports/projects/summary", { params });
  },

  getBudgetActual: async (params?: { projectId?: string }): Promise<FinanceBudgetReportDto> => {
    return apiClient.get<FinanceBudgetReportDto>("/reports/finance/budget-actual", { params });
  },

  getStockSummary: async (params?: { storeId?: string; projectId?: string }): Promise<MaterialStockReportDto> => {
    return apiClient.get<MaterialStockReportDto>("/reports/materials/stock-status", { params });
  },

  getManpowerAttendance: async (params?: { date?: string; projectId?: string }): Promise<ManpowerAttendanceReportDto> => {
    return apiClient.get<ManpowerAttendanceReportDto>("/reports/people/manpower-attendance", { params });
  },

  getEquipmentUtilization: async (params?: { projectId?: string }): Promise<EquipmentUtilizationReportDto> => {
    return apiClient.get<EquipmentUtilizationReportDto>("/reports/equipment/utilization", { params });
  },

  getQualitySafety: async (params?: { projectId?: string }): Promise<QualitySafetyReportDto> => {
    return apiClient.get<QualitySafetyReportDto>("/reports/quality-safety/summary", { params });
  },

  getPendingRfis: async (params?: { projectId?: string }): Promise<any> => {
    return apiClient.get("/reports/documents/pending-rfis", { params });
  },

  getPendingApprovals: async (params?: { projectId?: string }): Promise<any> => {
    return apiClient.get("/reports/approvals/pending", { params });
  },

  getAlertsSummary: async (params?: { projectId?: string }): Promise<any> => {
    return apiClient.get("/reports/alerts/summary", { params });
  },
};
