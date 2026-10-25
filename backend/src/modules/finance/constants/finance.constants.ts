/**
 * DEZOBUILD Phase 10: Finance & Commercial Constants & Domain Types
 */

export const EXPENSE_CLAIM_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'PAID',
  'REJECTED',
  'CANCELLED',
] as const;
export type ExpenseClaimStatus = (typeof EXPENSE_CLAIM_STATUSES)[number];

export const VENDOR_INVOICE_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'VERIFIED',
  'APPROVED',
  'PARTIALLY_PAID',
  'PAID',
  'REJECTED',
  'CANCELLED',
] as const;
export type VendorInvoiceStatus = (typeof VENDOR_INVOICE_STATUSES)[number];

export const RA_BILL_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'VERIFIED',
  'APPROVED',
  'PARTIALLY_PAID',
  'PAID',
  'REJECTED',
  'CANCELLED',
] as const;
export type RaBillStatus = (typeof RA_BILL_STATUSES)[number];

export const PAYMENT_VOUCHER_STATUSES = [
  'DRAFT',
  'APPROVED',
  'DISBURSED',
  'REJECTED',
  'CANCELLED',
] as const;
export type PaymentVoucherStatus = (typeof PAYMENT_VOUCHER_STATUSES)[number];

export const PAYMENT_MODES = [
  'BANK_TRANSFER',
  'CHEQUE',
  'UPI',
  'PETTY_CASH',
] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const ADVANCE_TYPES = [
  'VENDOR_MATERIAL_ADVANCE',
  'CONTRACTOR_MOBILIZATION_ADVANCE',
  'EMPLOYEE_IMPREST',
] as const;
export type AdvanceType = (typeof ADVANCE_TYPES)[number];

export const ADVANCE_STATUSES = [
  'DISBURSED',
  'PARTIALLY_RECOVERED',
  'FULLY_RECOVERED',
  'CANCELLED',
] as const;
export type AdvanceStatus = (typeof ADVANCE_STATUSES)[number];

export const RETENTION_STATUSES = [
  'HELD',
  'PARTIALLY_RELEASED',
  'FULLY_RELEASED',
] as const;
export type RetentionStatus = (typeof RETENTION_STATUSES)[number];

export const DEDUCTION_TYPES = [
  'RETENTION',
  'MOBILIZATION_ADVANCE_RECOVERY',
  'TDS_CONTRACTOR',
  'TDS_PROFESSIONAL',
  'TDS_GOODS',
  'LABOUR_CESS',
  'GST_TDS',
  'SAFETY_PENALTY',
  'MATERIAL_DEBIT_NOTE',
  'OTHER_DEDUCTION',
] as const;
export type DeductionType = (typeof DEDUCTION_TYPES)[number];

export const TAX_TYPES = [
  'GST_CGST',
  'GST_SGST',
  'GST_IGST',
  'TDS_194C',
  'TDS_194J',
  'TDS_194Q',
  'LABOUR_CESS',
  'CUSTOM_TAX',
] as const;
export type TaxType = (typeof TAX_TYPES)[number];

export const FINANCE_SEQUENCE_PREFIXES = [
  'EXP',
  'INV',
  'PAY',
  'RAB',
  'ADV',
] as const;
export type FinanceSequencePrefix = (typeof FINANCE_SEQUENCE_PREFIXES)[number];

export interface FinanceRequestContext {
  tenantId: string;
  user: {
    id: string;
    email?: string;
  };
  ipAddress?: string;
}

