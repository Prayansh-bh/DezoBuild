import http from "node:http";
import { HttpRouter } from "./router";
import { HealthController } from "../../modules/health/health.controller";
import { DatabaseService } from "../../database/database.service";
import { appConfig } from "../../config/app.config";
import { logger } from "../logging/logger";

export class ApplicationServer {
  private server?: http.Server | undefined;
  private readonly router: HttpRouter;
  private isShuttingDown = false;

  constructor() {
    this.router = new HttpRouter();
    this.registerFoundationRoutes();
  }

  public getRouter(): HttpRouter {
    return this.router;
  }

  private registerFoundationRoutes(): void {
    const healthController = new HealthController();

    // Standard root health check
    this.router.get("/health", async () => {
      return healthController.getHealth();
    });

    // Versioned API health check (/api/v1/health)
    const versionedHealth = `${appConfig.app.apiPrefix}/health`;
    this.router.get(versionedHealth, async () => {
      return healthController.getHealth();
    });

    // Base API info endpoint
    this.router.get(appConfig.app.apiPrefix, async () => {
      return {
        success: true,
        data: {
          service: appConfig.app.name,
          version: appConfig.app.version,
          environment: appConfig.app.environment,
          docs: "/docs/architecture/backend/backend-architecture-baseline.md",
        },
        meta: {
          timestamp: new Date().toISOString(),
          message: "DEZOBUILD Backend Foundation API v1",
        },
      };
    });
  }

  public async start(): Promise<http.Server> {
    const db = DatabaseService.getInstance();
    await db.connect();

    this.server = http.createServer((req, res) => {
      this.router.handleRequest(req, res).catch((err) => {
        logger.error("Unhandled top-level request error", err);
        if (!res.writableEnded) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, error: { code: "SERVER_ERROR", message: "Fatal error" } }));
        }
      });
    });

    return new Promise((resolve) => {
      this.server!.listen(appConfig.app.port, () => {
        logger.info(`DEZOBUILD API Server started on port ${appConfig.app.port}`, {
          port: appConfig.app.port,
          environment: appConfig.app.environment,
          apiPrefix: appConfig.app.apiPrefix,
        });
        resolve(this.server!);
      });
    });
  }

  public async stop(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    logger.info("Initiating graceful application shutdown...");

    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => {
          logger.info("HTTP server closed to new connections.");
          resolve();
        });
      });
    }

    const db = DatabaseService.getInstance();
    await db.disconnect();

    logger.info("Application shutdown completed cleanly.");
  }

  public registerShutdownSignals(): void {
    const handleSignal = async (signal: string) => {
      logger.info(`Received shutdown signal: ${signal}`);
      await this.stop();
      process.exit(0);
    };

    process.on("SIGINT", () => handleSignal("SIGINT"));
    process.on("SIGTERM", () => handleSignal("SIGTERM"));
  }
}
