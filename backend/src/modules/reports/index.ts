export interface ReportConfigDto {
  id: string;
  name: string;
  category:
    | "Executive & Variance"
    | "Site DPR & Progress"
    | "Procurement & Stock"
    | "Finance & Cash Flow"
    | "Labour & Productivity"
    | "Equipment Utilization";
  description: string;
  frequency: "Daily" | "Weekly" | "Monthly" | "On-Demand";
  lastGenerated: string;
  format: "PDF" | "Excel (XLSX)" | "Interactive Dashboard";
  status: "ready" | "scheduled";
}

export interface ReportsServiceContract {
  findAll(): Promise<ReportConfigDto[]>;
  generateReport(
    reportId: string,
    parameters?: Record<string, unknown>,
  ): Promise<{ downloadUrl: string }>;
}
