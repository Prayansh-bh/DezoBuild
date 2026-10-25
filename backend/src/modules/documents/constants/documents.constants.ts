import type { Prisma } from '@prisma/client';

export type PrismaTransactionClient = Prisma.TransactionClient;

export interface DocumentsRequestContext {
  tenantId: string;
  user: {
    id: string;
    role?: string;
  };
  ipAddress?: string;
}

export const DocumentType = {
  DRAWING: 'DRAWING',
  SPECIFICATION: 'SPECIFICATION',
  CONTRACT: 'CONTRACT',
  MUNICIPAL_NOC: 'MUNICIPAL_NOC',
  TEST_REPORT: 'TEST_REPORT',
  METHOD_STATEMENT: 'METHOD_STATEMENT',
  SITE_PHOTO: 'SITE_PHOTO',
  GENERAL: 'GENERAL',
} as const;
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];

export const DocumentDiscipline = {
  ARCHITECTURAL: 'ARCHITECTURAL',
  STRUCTURAL: 'STRUCTURAL',
  MEP: 'MEP',
  CIVIL: 'CIVIL',
  GEOTECHNICAL: 'GEOTECHNICAL',
  HVAC: 'HVAC',
  ELECTRICAL: 'ELECTRICAL',
  PLUMBING: 'PLUMBING',
  GENERAL: 'GENERAL',
} as const;
export type DocumentDiscipline = (typeof DocumentDiscipline)[keyof typeof DocumentDiscipline];

export const DocumentStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  SUPERSEDED: 'SUPERSEDED',
  ARCHIVED: 'ARCHIVED',
  VOIDED: 'VOIDED',
} as const;
export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const VersionStatus = {
  DRAFT: 'DRAFT',
  ISSUED: 'ISSUED',
  SUPERSEDED: 'SUPERSEDED',
  VOID: 'VOID',
} as const;
export type VersionStatus = (typeof VersionStatus)[keyof typeof VersionStatus];

export const IssuePurpose = {
  FOR_INFORMATION: 'FOR_INFORMATION',
  FOR_REVIEW: 'FOR_REVIEW',
  FOR_APPROVAL: 'FOR_APPROVAL',
  GFC: 'GFC',
  TENDER: 'TENDER',
  AS_BUILT: 'AS_BUILT',
} as const;
export type IssuePurpose = (typeof IssuePurpose)[keyof typeof IssuePurpose];

export const TransmittalStatus = {
  DRAFT: 'DRAFT',
  ISSUED: 'ISSUED',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  CANCELLED: 'CANCELLED',
} as const;
export type TransmittalStatus = (typeof TransmittalStatus)[keyof typeof TransmittalStatus];

export const RfiPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;
export type RfiPriority = (typeof RfiPriority)[keyof typeof RfiPriority];

export const RfiStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  ASSIGNED: 'ASSIGNED',
  RESPONDED: 'RESPONDED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const;
export type RfiStatus = (typeof RfiStatus)[keyof typeof RfiStatus];

export const RfiReferenceType = {
  QUERY_ATTACHMENT: 'QUERY_ATTACHMENT',
  RESPONSE_SKETCH: 'RESPONSE_SKETCH',
  IMPACTED_DRAWING: 'IMPACTED_DRAWING',
} as const;
export type RfiReferenceType = (typeof RfiReferenceType)[keyof typeof RfiReferenceType];

export const DocumentEntityType = {
  ENGINEERING_DOCUMENT: 'ENGINEERING_DOCUMENT',
  DOCUMENT_VERSION: 'DOCUMENT_VERSION',
  DOCUMENT_TRANSMITTAL: 'DOCUMENT_TRANSMITTAL',
  REQUEST_FOR_INFORMATION: 'REQUEST_FOR_INFORMATION',
  RFI_DOCUMENT_REFERENCE: 'RFI_DOCUMENT_REFERENCE',
} as const;
export type DocumentEntityType = (typeof DocumentEntityType)[keyof typeof DocumentEntityType];

export const DocumentAuditAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  REGISTER_VERSION: 'REGISTER_VERSION',
  ISSUE: 'ISSUE',
  SUPERSEDE: 'SUPERSEDE',
  VOID: 'VOID',
  ROLLBACK: 'ROLLBACK',
  ISSUE_TRANSMITTAL: 'ISSUE_TRANSMITTAL',
  ACKNOWLEDGE_TRANSMITTAL: 'ACKNOWLEDGE_TRANSMITTAL',
  SUBMIT_RFI: 'SUBMIT_RFI',
  ASSIGN_RFI: 'ASSIGN_RFI',
  RESPOND_RFI: 'RESPOND_RFI',
  CLOSE_RFI: 'CLOSE_RFI',
  REOPEN_RFI: 'REOPEN_RFI',
  CANCEL_RFI: 'CANCEL_RFI',
  ADD_REFERENCE: 'ADD_REFERENCE',
  REMOVE_REFERENCE: 'REMOVE_REFERENCE',
} as const;
export type DocumentAuditAction = (typeof DocumentAuditAction)[keyof typeof DocumentAuditAction];

/**
 * StorageProvider interface contract (Option B).
 * Defines cloud object storage operations for future integration
 * without streaming binaries through Node.js.
 */
export interface StorageProvider {
  getUploadUrl(key: string, mimeType: string, byteSize: number): Promise<{ uploadUrl: string; expiresAt: Date }>;
  getDownloadUrl(key: string): Promise<{ downloadUrl: string; expiresAt: Date }>;
  deleteObject(key: string): Promise<void>;
}
