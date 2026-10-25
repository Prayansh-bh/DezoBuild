export const MATERIAL_ISSUE_STATUSES = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  ISSUED: 'ISSUED',
  CANCELLED: 'CANCELLED',
} as const;

export type MaterialIssueStatus =
  (typeof MATERIAL_ISSUE_STATUSES)[keyof typeof MATERIAL_ISSUE_STATUSES];

export const MATERIAL_ISSUE_PERMISSIONS = {
  VIEW: 'materials:view',
  ISSUE: 'materials:stock:issue',
} as const;

export const MATERIAL_ISSUE_ENTITLEMENT = 'materials:core';
