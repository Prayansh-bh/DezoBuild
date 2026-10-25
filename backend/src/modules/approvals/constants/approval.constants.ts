export const SUPPORTED_APPROVAL_ENTITIES = [
  'PURCHASE_ORDER',
  'RA_BILL',
  'VENDOR_INVOICE',
  'EXPENSE_CLAIM',
  'PAYMENT_VOUCHER',
  'DAILY_PROGRESS_REPORT',
  'DIGITAL_MB',
  'INSPECTION_REQUEST',
  'NON_CONFORMANCE_REPORT',
  'MATERIAL_INDENT',
  'MATERIAL_ISSUE',
  'MATERIAL_TRANSFER',
  'LEAVE_RECORD',
  'ATTENDANCE_REGULARIZATION',
  'LABOUR_MUSTER_RECORD',
] as const;

export type SupportedApprovalEntityType = (typeof SUPPORTED_APPROVAL_ENTITIES)[number];

export const APPROVAL_POLICY_STATUSES = ['DRAFT', 'ACTIVE', 'SUPERSEDED', 'INACTIVE'] as const;
export type ApprovalPolicyStatusType = (typeof APPROVAL_POLICY_STATUSES)[number];

export const APPROVAL_REQUEST_STATUSES = [
  'SUBMITTED',
  'IN_REVIEW',
  'APPROVED',
  'REJECTED',
  'RETURNED',
  'CANCELLED',
] as const;
export type ApprovalRequestStatusType = (typeof APPROVAL_REQUEST_STATUSES)[number];

export const APPROVAL_STEP_STATUSES = [
  'PENDING',
  'IN_REVIEW',
  'APPROVED',
  'REJECTED',
  'RETURNED',
  'SKIPPED',
] as const;
export type ApprovalStepStatusType = (typeof APPROVAL_STEP_STATUSES)[number];

export const APPROVAL_DECISION_TYPES = ['APPROVE', 'REJECT', 'RETURN', 'CANCEL'] as const;
export type ApprovalDecisionTypeEnum = (typeof APPROVAL_DECISION_TYPES)[number];
