export const AIFeatureKey = {
  SCHEDULE_FORECASTING: 'ai:schedule_forecasting',
  RISK_SUMMARY: 'ai:risk_summary',
  COST_VARIANCE: 'ai:cost_variance',
  MATERIAL_RISK: 'ai:material_risk',
  RFI_SUMMARY: 'ai:rfi_summary',
  CONTROL_TOWER: 'ai:control_tower',
} as const;

export type AIFeatureKey = (typeof AIFeatureKey)[keyof typeof AIFeatureKey];

export const AIOperationType = {
  FORECAST: 'FORECAST',
  SUMMARIZE: 'SUMMARIZE',
  CLASSIFY: 'CLASSIFY',
  EXPLAIN: 'EXPLAIN',
  GENERATE: 'GENERATE',
} as const;

export type AIOperationType = (typeof AIOperationType)[keyof typeof AIOperationType];

export const AIRequestStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type AIRequestStatus = (typeof AIRequestStatus)[keyof typeof AIRequestStatus];

export const AIInsightStatus = {
  ACTIVE: 'ACTIVE',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  DISMISSED: 'DISMISSED',
  EXPIRED: 'EXPIRED',
} as const;

export type AIInsightStatus = (typeof AIInsightStatus)[keyof typeof AIInsightStatus];

export const AIInsightSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
} as const;

export type AIInsightSeverity = (typeof AIInsightSeverity)[keyof typeof AIInsightSeverity];

export const AI_TOKEN_PRICING = {
  DEFAULT_INPUT_PER_1K: 0.0015,
  DEFAULT_OUTPUT_PER_1K: 0.002,
} as const;
