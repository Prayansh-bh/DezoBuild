import { z } from 'zod';
import { OutboxEventStatus } from '../constants/outbox.constants.js';

export const createOutboxEventSchema = z.object({
  tenantId: z.string().uuid(),
  eventType: z.string().min(1).max(100),
  aggregateType: z.string().min(1).max(100),
  aggregateId: z.string().min(1).max(100),
  projectId: z.string().uuid().optional().nullable(),
  branchId: z.string().uuid().optional().nullable(),
  payload: z.record(z.unknown()),
  correlationId: z.string().max(100).optional().nullable(),
  causationId: z.string().max(100).optional().nullable(),
  idempotencyKey: z.string().min(1).max(255),
  availableAt: z.date().optional(),
  maxAttempts: z.number().int().positive().optional().default(5),
});

export type CreateOutboxEventDto = z.input<typeof createOutboxEventSchema>;

export const queryOutboxEventsSchema = z.object({
  status: z.nativeEnum(OutboxEventStatus).optional(),
  eventType: z.string().optional(),
  aggregateType: z.string().optional(),
  aggregateId: z.string().optional(),
  projectId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type QueryOutboxEventsDto = z.infer<typeof queryOutboxEventsSchema>;
