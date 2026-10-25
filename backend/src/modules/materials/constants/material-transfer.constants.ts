export const MATERIAL_TRANSFER_STATUSES = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  IN_TRANSIT: 'IN_TRANSIT',
  RECEIVED: 'RECEIVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

export type MaterialTransferStatus =
  (typeof MATERIAL_TRANSFER_STATUSES)[keyof typeof MATERIAL_TRANSFER_STATUSES];

export const MATERIAL_TRANSFER_PERMISSIONS = {
  VIEW: 'materials:view',
  TRANSFER: 'materials:stock:transfer',
  RECEIVE: 'materials:stock:receive',
} as const;

export const MATERIAL_TRANSFER_ENTITLEMENT = 'materials:core';
