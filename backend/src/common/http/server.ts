import http from 'node:http';
import { HttpRouter } from './router';
import { HealthController } from '../../modules/health/health.controller';
import { registerAuthRoutes } from '../../modules/auth/auth.routes';
import { registerInvitationRoutes } from '../../modules/auth/invitation.routes';
import { registerTenancyRoutes } from '../../modules/tenancy/tenancy.routes';
import { registerRbacRoutes } from '../../modules/rbac/rbac.routes';
import { registerSubscriptionRoutes } from '../../modules/subscriptions/subscriptions.routes';
import { registerProjectRoutes } from '../../modules/projects/projects.routes';
import { registerWbsRoutes } from '../../modules/projects/routes/wbs.routes';
import { registerTaskRoutes } from '../../modules/projects/routes/task.routes';
import { registerTaskDependencyRoutes } from '../../modules/projects/routes/task-dependency.routes';
import { registerDprRoutes } from '../../modules/projects/routes/dpr.routes';
import { registerBoqRoutes } from '../../modules/projects/routes/boq.routes';
import { registerDigitalMbRoutes } from '../../modules/projects/routes/digital-mb.routes';
import { registerMaterialsRoutes } from '../../modules/materials/materials.routes';
import { registerFinanceRoutes } from '../../modules/finance/finance.routes';
import { registerPeopleRoutes } from '../../modules/people/people.routes';
import { registerEquipmentRoutes } from '../../modules/equipment/equipment.routes';
import { registerQualityRoutes } from '../../modules/quality/quality.routes';
import { registerDocumentsRoutes } from '../../modules/documents/documents.routes';
import { registerApprovalRoutes } from '../../modules/approvals/approvals.routes';
import { registerAlertsRoutes } from '../../modules/alerts/alerts.routes';
import { registerReportsRoutes } from '../../modules/reports/reports.routes';
import { registerIntegrationsRoutes } from '../../modules/integrations/integrations.routes';
import { registerAIRoutes } from '../../modules/ai/ai.routes';
import { registerPlatformRoutes } from '../../modules/platform/platform.routes';
import { DatabaseService } from '../../database/database.service';
import { appConfig } from '../../config/app.config';
import { logger } from '../logging/logger';

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
    this.router.get('/health', async () => {
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
          docs: '/docs/architecture/backend/backend-architecture-baseline.md',
        },
        meta: {
          timestamp: new Date().toISOString(),
          message: 'DEZOBUILD Backend Foundation API v1',
        },
      };
    });

    // Register Identity & Authentication routes (Phase 02)
    registerAuthRoutes(this.router);
    registerInvitationRoutes(this.router);

    // Register Tenancy & Enterprise Masters routes (Phase 03)
    registerTenancyRoutes(this.router);

    // Register RBAC, Permissions & Scoping routes (Phase 04)
    registerRbacRoutes(this.router);

    // Register Subscriptions & Entitlements routes (Phase 05)
    registerSubscriptionRoutes(this.router);

    // Register Projects Core routes (Phase 06.1)
    registerProjectRoutes(this.router);

    // Register WBS, Tasks & Dependencies routes (Phase 06.2)
    registerWbsRoutes(this.router);
    registerTaskRoutes(this.router);
    registerTaskDependencyRoutes(this.router);

    // Register Daily Progress Reports routes (Phase 06.3)
    registerDprRoutes(this.router);

    // Register BOQ & Digital MB routes (Phase 07)
    registerBoqRoutes(this.router);
    registerDigitalMbRoutes(this.router);

    // Register Materials, Vendors & Stores routes (Phase 07.1)
    registerMaterialsRoutes(this.router);

    // Register Finance, RA Billing & Commercial Subledger routes (Phase 10)
    registerFinanceRoutes(this.router);

    // Register People, Attendance & Workforce routes (Phase 11)
    registerPeopleRoutes(this.router);

    // Register Equipment, Machinery, Fuel & Maintenance routes (Phase 12)
    registerEquipmentRoutes(this.router);

    // Register QA/QC + Site Safety / Quality Management routes (Phase 13)
    registerQualityRoutes(this.router);

    // Register Documents, Drawings, Transmittals & RFIs routes (Phase 14)
    registerDocumentsRoutes(this.router);

    // Register Central Approval Engine & Controlled Workflow routes (Phase 15)
    registerApprovalRoutes(this.router);

    // Register Alerts, Durable Outbox & Notifications routes (Phase 16)
    registerAlertsRoutes(this.router);

    // Register Operational Reports routes (Phase 16)
    registerReportsRoutes(this.router);

    // Register External Integrations routes (Phase 17)
    registerIntegrationsRoutes(this.router);

    // Register AI & Intelligence Control Layer routes (Phase 17)
    registerAIRoutes(this.router);

    // Register Platform Owner Governance Control Plane routes
    registerPlatformRoutes(this.router);
  }

  public async start(): Promise<http.Server> {
    const db = DatabaseService.getInstance();
    await db.connect();

    this.server = http.createServer((req, res) => {
      this.router.handleRequest(req, res).catch((err) => {
        logger.error('Unhandled top-level request error', err);
        if (!res.writableEnded) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: { code: 'SERVER_ERROR', message: 'Fatal error' } }));
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

    logger.info('Initiating graceful application shutdown...');

    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => {
          logger.info('HTTP server closed to new connections.');
          resolve();
        });
      });
    }

    const db = DatabaseService.getInstance();
    await db.disconnect();

    logger.info('Application shutdown completed cleanly.');
  }

  public registerShutdownSignals(): void {
    const handleSignal = async (signal: string) => {
      logger.info(`Received shutdown signal: ${signal}`);
      await this.stop();
      process.exit(0);
    };

    process.on('SIGINT', () => handleSignal('SIGINT'));
    process.on('SIGTERM', () => handleSignal('SIGTERM'));
  }
}
