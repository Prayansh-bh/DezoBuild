export const MATERIAL_RETURN_STATUSES = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

export type MaterialReturnStatus =
  (typeof MATERIAL_RETURN_STATUSES)[keyof typeof MATERIAL_RETURN_STATUSES];

export const MATERIAL_RETURN_CONDITIONS = {
  GOOD: 'GOOD',
  DAMAGED: 'DAMAGED',
  DEFECTIVE: 'DEFECTIVE',
  UNUSABLE: 'UNUSABLE',
} as const;

export type MaterialReturnCondition =
  (typeof MATERIAL_RETURN_CONDITIONS)[keyof typeof MATERIAL_RETURN_CONDITIONS];

export const MATERIAL_RETURN_PERMISSIONS = {
  VIEW: 'materials:view',
  ISSUE: 'materials:stock:issue',
} as const;

export const MATERIAL_RETURN_ENTITLEMENT = 'materials:core';
