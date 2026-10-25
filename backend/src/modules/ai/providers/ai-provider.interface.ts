import type { AIOperationType } from '../constants/ai.constants.js';

export interface AIExecutionContext {
  tenantId: string;
  projectId?: string;
  featureKey: string;
  operation: AIOperationType;
  promptText: string;
  structuredContext: Record<string, any>;
  parameters?: Record<string, any>;
}

export interface AIExecutionResult {
  success: boolean;
  providerKey: string;
  model: string;
  outputSummary: string;
  structuredResult: Record<string, any>;
  confidence?: number;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  error?: string;
  citations?: Array<{ source: string; referenceId?: string }>;
}

export interface AIProvider {
  readonly providerKey: string;
  readonly defaultModel: string;

  execute(context: AIExecutionContext): Promise<AIExecutionResult>;
}
