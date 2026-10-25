export interface ProjectCostSummaryDto {
  projectId: string;
  projectName: string;
  currency: string;
  contractValue: number;
  committedCost: number;
  receivedPhysicalValue: number;
  invoicedCost: number;
  paidCost: number;
  actualCost: number;
  earnedValue: number;
  costVariance: number;
  costPerformanceIndex: number | null;
  advanceOutstanding: number;
  retentionHeld: number;
}
