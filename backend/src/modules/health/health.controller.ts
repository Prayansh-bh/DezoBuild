import { DatabaseService } from "../../database/database.service";
import { appConfig } from "../../config/app.config";
import { createSuccessResponse, type ApiResponse } from "../../common/dto/api-response.dto";

export interface HealthCheckResult {
  status: "ok" | "degraded" | "error";
  service: string;
  version: string;
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
  database: {
    connected: boolean;
    status: string;
    latencyMs?: number | undefined;
  };
}

export class HealthController {
  private readonly dbService: DatabaseService;

  constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  public async getHealth(): Promise<ApiResponse<HealthCheckResult>> {
    const dbStatus = await this.dbService.getStatus();
    const isHealthy = dbStatus.connected;

    const result: HealthCheckResult = {
      status: isHealthy ? "ok" : "degraded",
      service: appConfig.app.name,
      version: appConfig.app.version,
      environment: appConfig.app.environment,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: {
        connected: dbStatus.connected,
        status: dbStatus.status,
        latencyMs: dbStatus.latencyMs,
      },
    };

    return createSuccessResponse(result, "System health operational status");
  }
}
