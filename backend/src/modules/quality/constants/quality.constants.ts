import type { Prisma } from '@prisma/client';

export type PrismaTransactionClient = Prisma.TransactionClient;

export interface QualityRequestContext {
  tenantId: string;
  user: {
    id: string;
    role?: string;
  };
  ipAddress?: string;
}

export const InspectionType = {
  POUR_CARD: 'POUR_CARD',
  REBAR: 'REBAR',
  FORMWORK: 'FORMWORK',
  CONCRETE_PRE_POUR: 'CONCRETE_PRE_POUR',
  WATERPROOFING: 'WATERPROOFING',
  SCAFFOLDING: 'SCAFFOLDING',
  MATERIAL_RECEIVING: 'MATERIAL_RECEIVING',
  STRUCTURAL_STEEL: 'STRUCTURAL_STEEL',
  MEP_ROUGH_IN: 'MEP_ROUGH_IN',
  MASONRY: 'MASONRY',
  PLASTERING: 'PLASTERING',
  FINISHES: 'FINISHES',
  GENERAL_QA: 'GENERAL_QA',
} as const;
export type InspectionType = (typeof InspectionType)[keyof typeof InspectionType];

export const InspectionDiscipline = {
  CIVIL: 'CIVIL',
  STRUCTURAL: 'STRUCTURAL',
  MEP: 'MEP',
  ARCHITECTURAL: 'ARCHITECTURAL',
  GEOTECHNICAL: 'GEOTECHNICAL',
  SAFETY_EHS: 'SAFETY_EHS',
} as const;
export type InspectionDiscipline = (typeof InspectionDiscipline)[keyof typeof InspectionDiscipline];

export const InspectionStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  PASSED: 'PASSED',
  CONDITIONALLY_PASSED: 'CONDITIONALLY_PASSED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;
export type InspectionStatus = (typeof InspectionStatus)[keyof typeof InspectionStatus];

export const ChecklistItemType = {
  VISUAL_CHECK: 'VISUAL_CHECK',
  MEASUREMENT: 'MEASUREMENT',
  LABORATORY_TEST: 'LABORATORY_TEST',
  FIELD_TEST: 'FIELD_TEST',
  DOCUMENT_VERIFICATION: 'DOCUMENT_VERIFICATION',
  HOLD_POINT_GATE: 'HOLD_POINT_GATE',
} as const;
export type ChecklistItemType = (typeof ChecklistItemType)[keyof typeof ChecklistItemType];

export const ChecklistResult = {
  PENDING: 'PENDING',
  PASS: 'PASS',
  FAIL: 'FAIL',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
} as const;
export type ChecklistResult = (typeof ChecklistResult)[keyof typeof ChecklistResult];

export const NcrCategory = {
  WORKMANSHIP: 'WORKMANSHIP',
  MATERIAL_DEFECT: 'MATERIAL_DEFECT',
  DIMENSIONAL_DEVIATION: 'DIMENSIONAL_DEVIATION',
  SPECIFICATION_BREACH: 'SPECIFICATION_BREACH',
  SAFETY_HAZARD: 'SAFETY_HAZARD',
  DOCUMENTATION: 'DOCUMENTATION',
} as const;
export type NcrCategory = (typeof NcrCategory)[keyof typeof NcrCategory];

export const NcrSeverity = {
  MINOR: 'MINOR',
  MAJOR: 'MAJOR',
  CRITICAL: 'CRITICAL',
} as const;
export type NcrSeverity = (typeof NcrSeverity)[keyof typeof NcrSeverity];

export const NcrStatus = {
  OPEN: 'OPEN',
  ACTION_REQUIRED: 'ACTION_REQUIRED',
  UNDER_VERIFICATION: 'UNDER_VERIFICATION',
  CLOSED: 'CLOSED',
  VOIDED: 'VOIDED',
} as const;
export type NcrStatus = (typeof NcrStatus)[keyof typeof NcrStatus];

export const ActionType = {
  CORRECTIVE: 'CORRECTIVE',
  PREVENTIVE: 'PREVENTIVE',
  CONTAINMENT: 'CONTAINMENT',
  IMMEDIATE_HAZARD_CONTROL: 'IMMEDIATE_HAZARD_CONTROL',
  INSPECTION_HOLD_CONDITION: 'INSPECTION_HOLD_CONDITION',
} as const;
export type ActionType = (typeof ActionType)[keyof typeof ActionType];

export const ActionPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;
export type ActionPriority = (typeof ActionPriority)[keyof typeof ActionPriority];

export const ActionStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  VERIFIED: 'VERIFIED',
  CANCELLED: 'CANCELLED',
} as const;
export type ActionStatus = (typeof ActionStatus)[keyof typeof ActionStatus];

export const ObservationType = {
  UNSAFE_ACT: 'UNSAFE_ACT',
  UNSAFE_CONDITION: 'UNSAFE_CONDITION',
  POSITIVE_BEHAVIOR: 'POSITIVE_BEHAVIOR',
  TOOLBOX_TALK: 'TOOLBOX_TALK',
  NEAR_MISS_OBSERVATION: 'NEAR_MISS_OBSERVATION',
  PPE_NON_COMPLIANCE: 'PPE_NON_COMPLIANCE',
  ENVIRONMENTAL_HAZARD: 'ENVIRONMENTAL_HAZARD',
} as const;
export type ObservationType = (typeof ObservationType)[keyof typeof ObservationType];

export const ObservationSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;
export type ObservationSeverity = (typeof ObservationSeverity)[keyof typeof ObservationSeverity];

export const ObservationStatus = {
  OPEN: 'OPEN',
  ACTION_REQUIRED: 'ACTION_REQUIRED',
  CLOSED: 'CLOSED',
} as const;
export type ObservationStatus = (typeof ObservationStatus)[keyof typeof ObservationStatus];

export const IncidentType = {
  NEAR_MISS: 'NEAR_MISS',
  FIRST_AID: 'FIRST_AID',
  MEDICAL_TREATMENT: 'MEDICAL_TREATMENT',
  LOST_TIME_INJURY: 'LOST_TIME_INJURY',
  FATALITY: 'FATALITY',
  PROPERTY_DAMAGE: 'PROPERTY_DAMAGE',
  ENVIRONMENTAL: 'ENVIRONMENTAL',
  DANGEROUS_OCCURRENCE: 'DANGEROUS_OCCURRENCE',
} as const;
export type IncidentType = (typeof IncidentType)[keyof typeof IncidentType];

export const IncidentSeverity = {
  MINOR: 'MINOR',
  MODERATE: 'MODERATE',
  SEVERE: 'SEVERE',
  CRITICAL: 'CRITICAL',
  CATASTROPHIC: 'CATASTROPHIC',
} as const;
export type IncidentSeverity = (typeof IncidentSeverity)[keyof typeof IncidentSeverity];

export const IncidentStatus = {
  REPORTED: 'REPORTED',
  UNDER_INVESTIGATION: 'UNDER_INVESTIGATION',
  CAPA_IN_PROGRESS: 'CAPA_IN_PROGRESS',
  CLOSED: 'CLOSED',
} as const;
export type IncidentStatus = (typeof IncidentStatus)[keyof typeof IncidentStatus];

export const RiskLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;
export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel];
