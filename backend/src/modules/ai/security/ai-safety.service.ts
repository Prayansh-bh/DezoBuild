import crypto from 'node:crypto';
import { ForbiddenError, RateLimitError } from '../../../common/errors/app-error.js';

export class AISafetyService {
  private static readonly rateLimits: Map<string, { count: number; windowStart: number }> = new Map();
  private static readonly MAX_REQUESTS_PER_MINUTE = 60;
  private static readonly WINDOW_MS = 60 * 1000;

  public static hashInput(contextData: Record<string, any>): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(contextData))
      .digest('hex');
  }

  public static enforceRateLimit(tenantId: string): void {
    const now = Date.now();
    const entry = this.rateLimits.get(tenantId);

    if (!entry || now - entry.windowStart > this.WINDOW_MS) {
      this.rateLimits.set(tenantId, { count: 1, windowStart: now });
      return;
    }

    if (entry.count >= this.MAX_REQUESTS_PER_MINUTE) {
      throw new RateLimitError(
        `AI rate limit exceeded (${this.MAX_REQUESTS_PER_MINUTE} requests/min). Please slow down.`
      );
    }

    entry.count++;
  }

  public static assertProjectAccess(
    requestedProjectId: string | undefined,
    userProjectIds: string[] | null | undefined
  ): void {
    if (requestedProjectId && userProjectIds && !userProjectIds.includes(requestedProjectId)) {
      throw new ForbiddenError(
        `User does not have access to project ${requestedProjectId} for AI context generation.`
      );
    }
  }

  public static assertTenantIsolation(contextTenantId: string, requestTenantId: string): void {
    if (contextTenantId !== requestTenantId) {
      throw new ForbiddenError('Cross-tenant AI data access is strictly forbidden.');
    }
  }
}
