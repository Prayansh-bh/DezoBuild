export const GOODS_RECEIPT_STATUSES = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

export type GoodsReceiptStatus =
  (typeof GOODS_RECEIPT_STATUSES)[keyof typeof GOODS_RECEIPT_STATUSES];

export const GRN_PERMISSIONS = {
  VIEW: 'materials:view',
  CREATE: 'materials:grn:create',
  VERIFY: 'materials:grn:verify',
} as const;

export const GRN_ENTITLEMENT = 'materials:po_matching';
