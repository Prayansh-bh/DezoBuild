import { z } from 'zod';
import {
  AIFeatureKey,
  AIOperationType,
  AIInsightStatus,
  AIInsightSeverity,
} from '../constants/ai.constants.js';

export const executeAIRequestSchema = z.object({
  featureKey: z.string().min(1).max(100),
  operation: z.nativeEnum(AIOperationType),
  projectId: z.string().uuid().optional(),
  entityType: z.string().max(100).optional(),
  entityId: z.string().max(100).optional(),
  parameters: z.record(z.any()).default({}),
  correlationId: z.string().max(100).optional(),
});

export type ExecuteAIRequestDto = z.infer<typeof executeAIRequestSchema>;

export const queryAIRequestsSchema = z.object({
  featureKey: z.string().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type QueryAIRequestsDto = z.infer<typeof queryAIRequestsSchema>;

export const queryAIInsightsSchema = z.object({
  projectId: z.string().uuid().optional(),
  featureKey: z.string().optional(),
  severity: z.nativeEnum(AIInsightSeverity).optional(),
  status: z.nativeEnum(AIInsightStatus).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type QueryAIInsightsDto = z.infer<typeof queryAIInsightsSchema>;

export const queryControlTowerSchema = z.object({
  projectId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type QueryControlTowerDto = z.infer<typeof queryControlTowerSchema>;
