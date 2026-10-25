import { z } from 'zod';
import { IssuePurpose } from '../constants/documents.constants.js';

export const createTransmittalSchema = z.object({
  projectId: z.string().uuid('Valid project ID is required'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(255),
  issuePurpose: z.nativeEnum(IssuePurpose).default(IssuePurpose.FOR_INFORMATION),
  issueDate: z.string().datetime().optional(),
  recipientOrganization: z.string().min(2, 'Recipient organization is required').max(255),
  recipientName: z.string().min(2, 'Recipient name is required').max(255),
  recipientEmail: z.string().email('Valid recipient email is required').optional().nullable(),
  remarks: z.string().optional(),
  items: z
    .array(
      z.object({
        documentVersionId: z.string().uuid('Valid document version ID is required'),
        copyCount: z.number().int().positive().default(1),
        remarks: z.string().optional(),
      })
    )
    .optional(),
});

export type CreateTransmittalDto = z.infer<typeof createTransmittalSchema>;

export const addTransmittalItemSchema = z.object({
  documentVersionId: z.string().uuid('Valid document version ID is required'),
  copyCount: z.number().int().positive().default(1),
  remarks: z.string().optional(),
});

export type AddTransmittalItemDto = z.infer<typeof addTransmittalItemSchema>;

export const issueTransmittalSchema = z.object({
  remarks: z.string().optional(),
});

export type IssueTransmittalDto = z.infer<typeof issueTransmittalSchema>;

export const acknowledgeTransmittalSchema = z.object({
  remarks: z.string().optional(),
});

export type AcknowledgeTransmittalDto = z.infer<typeof acknowledgeTransmittalSchema>;

export const cancelTransmittalSchema = z.object({
  reason: z.string().min(5, 'Cancellation reason must be at least 5 characters'),
});

export type CancelTransmittalDto = z.infer<typeof cancelTransmittalSchema>;

export const listTransmittalsQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type ListTransmittalsQueryDto = z.infer<typeof listTransmittalsQuerySchema>;
