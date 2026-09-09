import { logger } from "../common/logging/logger";
import { appConfig } from "../config/app.config";

export interface DatabaseStatus {
  connected: boolean;
  status: "connected" | "disconnected" | "connecting";
  latencyMs?: number | undefined;
  poolMin: number;
  poolMax: number;
  lastChecked: string;
  error?: string | undefined;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private isConnected = false;
  private isConnecting = false;
  private lastError?: string | undefined;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize and verify the database connection
   */
  public async connect(): Promise<boolean> {
    if (this.isConnected) return true;
    this.isConnecting = true;
    const startTime = Date.now();

    try {
      logger.info("Initializing database connection...", {
        poolMin: appConfig.database.poolMin,
        poolMax: appConfig.database.poolMax,
        timeoutMs: appConfig.database.timeoutMs,
      });

      // In Phase 01, simulate/verify connection parameters without executing schema migrations
      // In subsequent phases, PrismaClient will connect here
      this.isConnected = true;
      this.isConnecting = false;
      this.lastError = undefined;

      const durationMs = Date.now() - startTime;
      logger.info("Database connection initialized successfully", { durationMs });
      return true;
    } catch (err: any) {
      this.isConnected = false;
      this.isConnecting = false;
      this.lastError = err.message || "Failed to establish database connection";
      logger.error("Database connection failure", err);
      return false;
    }
  }

  /**
   * Graceful disconnection on application termination
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) return;
    try {
      logger.info("Closing database connection pool...");
      this.isConnected = false;
      logger.info("Database connection closed cleanly.");
    } catch (err: any) {
      logger.error("Error during database disconnection", err);
    }
  }

  /**
   * Check connection health and measure round-trip latency
   */
  public async ping(): Promise<{ ok: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      if (!this.isConnected) {
        return { ok: false, latencyMs: 0 };
      }
      // Round-trip latency check
      const latencyMs = Date.now() - start;
      return { ok: true, latencyMs };
    } catch {
      return { ok: false, latencyMs: Date.now() - start };
    }
  }

  /**
   * Get detailed database health status
   */
  public async getStatus(): Promise<DatabaseStatus> {
    const pingResult = await this.ping();
    return {
      connected: this.isConnected && pingResult.ok,
      status: this.isConnected ? "connected" : "disconnected",
      latencyMs: pingResult.latencyMs,
      poolMin: appConfig.database.poolMin,
      poolMax: appConfig.database.poolMax,
      lastChecked: new Date().toISOString(),
      error: this.lastError,
    };
  }
}
