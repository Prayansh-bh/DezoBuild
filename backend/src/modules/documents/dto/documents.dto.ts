import { z } from 'zod';
import {
  DocumentType,
  DocumentDiscipline,
  IssuePurpose,
} from '../constants/documents.constants.js';

export const createDocumentSchema = z.object({
  projectId: z.string().uuid('Valid project ID is required'),
  documentType: z.nativeEnum(DocumentType).default(DocumentType.DRAWING),
  discipline: z.nativeEnum(DocumentDiscipline).default(DocumentDiscipline.GENERAL),
  title: z.string().min(3, 'Title must be at least 3 characters').max(255),
  description: z.string().optional(),
  category: z.string().max(100).optional(),
  documentNumber: z.string().max(100).optional(),
  drawingNumber: z.string().max(100).optional(),
  sheetNumber: z.string().max(50).optional(),
  scale: z.string().max(50).optional(),
  wbsNodeId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
});

export type CreateDocumentDto = z.infer<typeof createDocumentSchema>;

export const updateDocumentSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  discipline: z.nativeEnum(DocumentDiscipline).optional(),
  drawingNumber: z.string().max(100).optional().nullable(),
  sheetNumber: z.string().max(50).optional().nullable(),
  scale: z.string().max(50).optional().nullable(),
  wbsNodeId: z.string().uuid().optional().nullable(),
  taskId: z.string().uuid().optional().nullable(),
});

export type UpdateDocumentDto = z.infer<typeof updateDocumentSchema>;

export const registerVersionSchema = z.object({
  versionNumber: z.number().int().positive('Version number must be a positive integer'),
  revisionCode: z.string().min(1, 'Revision code is required').max(20),
  issuePurpose: z.nativeEnum(IssuePurpose).default(IssuePurpose.FOR_INFORMATION),
  storageObjectKey: z.string().min(5).max(500),
  originalFilename: z.string().min(1).max(255),
  fileExtension: z.string().max(20).optional(),
  mimeType: z.string().min(3).max(100),
  byteSize: z.union([z.number().int().nonnegative(), z.bigint()]),
  fileSha256: z.string().length(64, 'SHA-256 must be 64 hexadecimal characters'),
  revisionNotes: z.string().optional(),
});

export type RegisterVersionDto = z.infer<typeof registerVersionSchema>;

export const issueVersionSchema = z.object({
  issuePurpose: z.nativeEnum(IssuePurpose).optional(),
  revisionNotes: z.string().optional(),
});

export type IssueVersionDto = z.infer<typeof issueVersionSchema>;

export const voidVersionSchema = z.object({
  reason: z.string().min(5, 'Reason for voiding must be at least 5 characters'),
});

export type VoidVersionDto = z.infer<typeof voidVersionSchema>;

export const archiveDocumentSchema = z.object({
  reason: z.string().optional(),
});

export type ArchiveDocumentDto = z.infer<typeof archiveDocumentSchema>;

export const voidDocumentSchema = z.object({
  reason: z.string().min(5, 'Reason for voiding document must be at least 5 characters'),
});

export type VoidDocumentDto = z.infer<typeof voidDocumentSchema>;

export const listDocumentsQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  documentType: z.nativeEnum(DocumentType).optional(),
  discipline: z.nativeEnum(DocumentDiscipline).optional(),
  status: z.string().optional(),
  wbsNodeId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type ListDocumentsQueryDto = z.infer<typeof listDocumentsQuerySchema>;

export const listVersionsQuerySchema = z.object({
  status: z.string().optional(),
});

export type ListVersionsQueryDto = z.infer<typeof listVersionsQuerySchema>;
