import type {
  AIProvider,
  AIExecutionContext,
  AIExecutionResult,
} from './ai-provider.interface.js';
import { AIFeatureKey } from '../constants/ai.constants.js';

export class RuleBasedAIProvider implements AIProvider {
  public readonly providerKey = 'rule_based_engine';
  public readonly defaultModel = 'dezobuild-heuristics-v1';

  public async execute(context: AIExecutionContext): Promise<AIExecutionResult> {
    const startTime = Date.now();
    const ctx = context.structuredContext || {};

    if (context.parameters?.['forceFail']) {
      return {
        success: false,
        providerKey: this.providerKey,
        model: this.defaultModel,
        outputSummary: '',
        structuredResult: {},
        inputTokens: 120,
        outputTokens: 0,
        latencyMs: Date.now() - startTime,
        error: 'Engine inference timeout exceeded',
      };
    }

    let summary = '';
    let resultData: Record<string, any> = {};
    let confidence = 0.95;

    switch (context.featureKey) {
      case AIFeatureKey.SCHEDULE_FORECASTING: {
        const totalTasks = ctx.tasksCount ?? 10;
        const delayedTasks = ctx.delayedTasksCount ?? 0;
        const slippageDays = delayedTasks > 0 ? Math.round(delayedTasks * 2.5) : 0;
        const forecastEndDate = ctx.plannedEndDate
          ? new Date(new Date(ctx.plannedEndDate).getTime() + slippageDays * 86400000).toISOString().split('T')[0]
          : undefined;

        summary = slippageDays > 0
          ? `Forecasted project delay: ${slippageDays} days across ${delayedTasks} delayed critical-path tasks. Projected completion: ${forecastEndDate}.`
          : 'Project execution on schedule with 0 critical path task slippages.';

        resultData = {
          slippageDays,
          delayedTasksCount: delayedTasks,
          projectedCompletionDate: forecastEndDate,
          recommendedMitigation: slippageDays > 0 ? 'Increase workforce deployment on critical path activities.' : 'Maintain current progress velocity.',
        };
        break;
      }

      case AIFeatureKey.COST_VARIANCE: {
        const budget = Number(ctx.totalBudget ?? 0);
        const actual = Number(ctx.totalActual ?? 0);
        const variance = actual - budget;
        const variancePct = budget > 0 ? Math.round((variance / budget) * 100) : 0;

        summary = variance > 0
          ? `Budget variance of ₹${variance.toLocaleString()} (+${variancePct}%) detected against sanctioned baseline.`
          : 'Expenditures tracking within sanctioned project budget baseline.';

        resultData = {
          budget,
          actual,
          variance,
          variancePct,
          status: variance > 0 ? 'OVER_BUDGET' : 'WITHIN_BUDGET',
        };
        break;
      }

      case AIFeatureKey.RFI_SUMMARY: {
        const rfiSubject = ctx.subject || 'Technical Drawing Clarification';
        const rfiStatus = ctx.status || 'OPEN';
        summary = `RFI Summary: '${rfiSubject}' is currently ${rfiStatus}. Primary technical query pertains to rebar grade specifications.`;
        resultData = {
          keyIssues: ['Rebar grade mismatch', 'Consultant reply pending'],
          urgency: rfiStatus === 'OPEN' ? 'HIGH' : 'NORMAL',
        };
        break;
      }

      default: {
        summary = `Operational risk analysis generated for ${context.featureKey}. Total active signals evaluated: ${Object.keys(ctx).length}.`;
        resultData = {
          signalsEvaluated: Object.keys(ctx).length,
          riskLevel: 'MODERATE',
        };
      }
    }

    const latencyMs = Math.max(1, Date.now() - startTime);
    const inputTokens = Math.max(50, Math.round(JSON.stringify(ctx).length / 4));
    const outputTokens = Math.max(30, Math.round(summary.length / 4));

    return {
      success: true,
      providerKey: this.providerKey,
      model: this.defaultModel,
      outputSummary: summary,
      structuredResult: resultData,
      confidence,
      inputTokens,
      outputTokens,
      latencyMs,
      citations: context.projectId ? [{ source: 'PROJECT', referenceId: context.projectId }] : [],
    };
  }
}
