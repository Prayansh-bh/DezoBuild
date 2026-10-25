import { RateLimitError } from "../../../common/errors/app-error";

interface RateLimitRecord {
  failures: number[];
}

export interface IRateLimiterService {
  assertNotBlocked(key: string): void;
  recordFailure(key: string): void;
  recordSuccess(key: string): void;
  resetAll(): void;
}

export class RateLimiterService implements IRateLimiterService {
  private static instance: RateLimiterService;
  private readonly maxFailures: number;
  private readonly windowMs: number;
  private readonly records: Map<string, RateLimitRecord> = new Map();

  constructor(maxFailures = 5, windowMs = 15 * 60 * 1000) {
    this.maxFailures = maxFailures;
    this.windowMs = windowMs;
  }

  public static getInstance(): RateLimiterService {
    if (!RateLimiterService.instance) {
      RateLimiterService.instance = new RateLimiterService();
    }
    return RateLimiterService.instance;
  }

  private getCleanFailures(record: RateLimitRecord, now: number): number[] {
    const threshold = now - this.windowMs;
    return record.failures.filter((timestamp) => timestamp > threshold);
  }

  /**
   * Assert that a client key is not rate-limited, throwing RateLimitError (429) if blocked
   */
  public assertNotBlocked(key: string): void {
    const now = Date.now();
    const record = this.records.get(key);
    if (!record) return;

    const activeFailures = this.getCleanFailures(record, now);
    record.failures = activeFailures;

    if (activeFailures.length >= this.maxFailures) {
      throw new RateLimitError(
        "Too many failed login attempts. Please try again in 15 minutes.",
      );
    }
  }

  /**
   * Record an authentication failure
   */
  public recordFailure(key: string): void {
    const now = Date.now();
    let record = this.records.get(key);
    if (!record) {
      record = { failures: [] };
      this.records.set(key, record);
    }

    record.failures = this.getCleanFailures(record, now);
    record.failures.push(now);
  }

  /**
   * Reset failed attempt counter upon successful authentication
   */
  public recordSuccess(key: string): void {
    this.records.delete(key);
  }

  /**
   * Reset all rate limit entries (useful for test harnesses)
   */
  public resetAll(): void {
    this.records.clear();
  }
}
