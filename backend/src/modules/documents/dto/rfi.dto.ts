import { z } from 'zod';
import {
  DocumentDiscipline,
  RfiPriority,
  RfiReferenceType,
} from '../constants/documents.constants.js';

export const createRfiSchema = z.object({
  projectId: z.string().uuid('Valid project ID is required'),
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(255),
  discipline: z.nativeEnum(DocumentDiscipline).default(DocumentDiscipline.GENERAL),
  location: z.string().max(255).optional(),
  technicalQuery: z.string().min(10, 'Technical query must be at least 10 characters'),
  proposedSolution: z.string().optional(),
  priority: z.nativeEnum(RfiPriority).default(RfiPriority.MEDIUM),
  wbsNodeId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
  assignedToId: z.string().uuid().optional(),
  submitImmediately: z.boolean().default(false),
  references: z
    .array(
      z.object({
        documentId: z.string().uuid('Valid document ID is required'),
        documentVersionId: z.string().uuid().optional(),
        referenceType: z.nativeEnum(RfiReferenceType).default(RfiReferenceType.QUERY_ATTACHMENT),
      })
    )
    .optional(),
});

export type CreateRfiDto = z.infer<typeof createRfiSchema>;

export const submitRfiSchema = z.object({
  remarks: z.string().optional(),
});

export type SubmitRfiDto = z.infer<typeof submitRfiSchema>;

export const assignRfiSchema = z.object({
  assignedToId: z.string().uuid('Assigned user ID is required'),
});

export type AssignRfiDto = z.infer<typeof assignRfiSchema>;

export const respondRfiSchema = z.object({
  officialResponse: z.string().min(10, 'Official response must be at least 10 characters'),
});

export type RespondRfiDto = z.infer<typeof respondRfiSchema>;

export const closeRfiSchema = z.object({
  closureRemarks: z.string().min(3, 'Closure remarks must be at least 3 characters'),
});

export type CloseRfiDto = z.infer<typeof closeRfiSchema>;

export const reopenRfiSchema = z.object({
  reopenReason: z.string().min(10, 'Reopen reason must be at least 10 characters'),
});

export type ReopenRfiDto = z.infer<typeof reopenRfiSchema>;

export const cancelRfiSchema = z.object({
  cancellationReason: z.string().min(5, 'Cancellation reason must be at least 5 characters'),
});

export type CancelRfiDto = z.infer<typeof cancelRfiSchema>;

export const addRfiReferenceSchema = z.object({
  documentId: z.string().uuid('Valid document ID is required'),
  documentVersionId: z.string().uuid().optional(),
  referenceType: z.nativeEnum(RfiReferenceType).default(RfiReferenceType.QUERY_ATTACHMENT),
});

export type AddRfiReferenceDto = z.infer<typeof addRfiReferenceSchema>;

export const listRfisQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.string().optional(),
  priority: z.nativeEnum(RfiPriority).optional(),
  discipline: z.nativeEnum(DocumentDiscipline).optional(),
  assignedToId: z.string().uuid().optional(),
  raisedById: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type ListRfisQueryDto = z.infer<typeof listRfisQuerySchema>;
