import { PrismaClient } from "@prisma/client";
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
  private readonly prisma: PrismaClient;
  private isConnected = false;
  private isConnecting = false;
  private lastError?: string | undefined;

  private constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: appConfig.database.url,
        },
      },
      log: appConfig.app.isDevelopment ? ["warn", "error"] : ["error"],
    });
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public getClient(): PrismaClient {
    return this.prisma;
  }

  /**
   * Initialize and verify the real database connection with a real query ping
   */
  public async connect(): Promise<boolean> {
    if (this.isConnected) return true;
    this.isConnecting = true;
    const startTime = Date.now();

    try {
      logger.info("Initializing database connection...", {
        url: appConfig.database.url ? appConfig.database.url.replace(/:[^:@]+@/, ":****@") : "none",
        poolMin: appConfig.database.poolMin,
        poolMax: appConfig.database.poolMax,
        timeoutMs: appConfig.database.timeoutMs,
      });

      await this.prisma.$connect();
      // Execute a real query against PostgreSQL to ensure connection is actually alive
      await this.prisma.$queryRaw`SELECT 1`;

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
      logger.error("Database connection failure", { error: this.lastError });
      return false;
    }
  }

  /**
   * Graceful disconnection on application termination
   */
  public async disconnect(): Promise<void> {
    try {
      logger.info("Closing database connection pool...");
      await this.prisma.$disconnect();
      this.isConnected = false;
      this.lastError = undefined;
      logger.info("Database connection closed cleanly.");
    } catch (err: any) {
      this.isConnected = false;
      logger.error("Error during database disconnection", err);
    }
  }

  /**
   * Check connection health and measure real round-trip query latency
   */
  public async ping(): Promise<{ ok: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      if (!this.isConnected) {
        return { ok: false, latencyMs: 0 };
      }
      await this.prisma.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - start;
      return { ok: true, latencyMs };
    } catch (err: any) {
      this.isConnected = false;
      this.lastError = err.message || "Database ping failed";
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
      status: this.isConnected && pingResult.ok ? "connected" : "disconnected",
      latencyMs: pingResult.latencyMs,
      poolMin: appConfig.database.poolMin,
      poolMax: appConfig.database.poolMax,
      lastChecked: new Date().toISOString(),
      error: this.lastError,
    };
  }
}
