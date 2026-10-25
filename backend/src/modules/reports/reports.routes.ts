import type { HttpRouter } from '../../common/http/router.js';
import { DatabaseService } from '../../database/database.service.js';
import { appConfig } from '../../config/app.config.js';

import { OperationalReportsService } from './services/operational-reports.service.js';
import { ReportsController } from './controllers/reports.controller.js';

export function registerReportsRoutes(
  router: HttpRouter,
  customControllers?: {
    reportsController?: ReportsController;
  }
): void {
  const prefix = appConfig.app.apiPrefix;
  const prisma = DatabaseService.getInstance().getClient();

  // Service
  const reportsService = new OperationalReportsService(prisma);

  // Controller
  const reportsController =
    customControllers?.reportsController || new ReportsController(reportsService);

  // ==========================================
  // OPERATIONAL REPORTS ENDPOINTS
  // ==========================================
  router.get(`${prefix}/reports/projects/summary`, async (req) =>
    reportsController.getProjectSummary(req)
  );
  router.get(`${prefix}/reports/finance/budget-actual`, async (req) =>
    reportsController.getBudgetActualSummary(req)
  );
  router.get(`${prefix}/reports/materials/stock-status`, async (req) =>
    reportsController.getMaterialStockSummary(req)
  );
  router.get(`${prefix}/reports/people/manpower-attendance`, async (req) =>
    reportsController.getManpowerAttendanceSummary(req)
  );
  router.get(`${prefix}/reports/equipment/utilization`, async (req) =>
    reportsController.getEquipmentUtilizationSummary(req)
  );
  router.get(`${prefix}/reports/quality-safety/summary`, async (req) =>
    reportsController.getQualitySafetySummary(req)
  );
  router.get(`${prefix}/reports/documents/pending-rfis`, async (req) =>
    reportsController.getPendingRfiSummary(req)
  );
  router.get(`${prefix}/reports/approvals/pending`, async (req) =>
    reportsController.getPendingApprovalsSummary(req)
  );
  router.get(`${prefix}/reports/alerts/summary`, async (req) =>
    reportsController.getAlertsSummary(req)
  );
}
