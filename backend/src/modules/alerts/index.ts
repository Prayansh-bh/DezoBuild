export interface SmartAlertDto {
  id: string;
  type: "variance" | "inventory" | "delay" | "labour" | "compliance" | "safety";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  projectId?: string;
  projectName?: string;
  status: "active" | "acknowledged" | "resolved";
  recommendedAction: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface AlertsServiceContract {
  findAll(status?: "active" | "acknowledged" | "resolved"): Promise<SmartAlertDto[]>;
  acknowledge(id: string, userId: string): Promise<SmartAlertDto>;
  resolve(id: string, note?: string): Promise<SmartAlertDto>;
}
