import type { HttpRouter } from '../../common/http/router.js';
import { DatabaseService } from '../../database/database.service.js';
import { appConfig } from '../../config/app.config.js';

import { InspectionRepository } from './repositories/inspection.repository.js';
import { NcrRepository } from './repositories/ncr.repository.js';
import { ActionRepository } from './repositories/action.repository.js';
import { SafetyObservationRepository } from './repositories/safety-observation.repository.js';
import { SafetyIncidentRepository } from './repositories/safety-incident.repository.js';
import { QualitySafetyAuditRepository } from './repositories/quality-safety-audit.repository.js';

import { InspectionService } from './services/inspection.service.js';
import { NcrService } from './services/ncr.service.js';
import { ActionService } from './services/action.service.js';
import { SafetyObservationService } from './services/safety-observation.service.js';
import { SafetyIncidentService } from './services/safety-incident.service.js';
import { QualitySafetyAuditService } from './services/quality-safety-audit.service.js';

import { InspectionController } from './controllers/inspection.controller.js';
import { NcrController } from './controllers/ncr.controller.js';
import { ActionController } from './controllers/action.controller.js';
import { SafetyObservationController } from './controllers/safety-observation.controller.js';
import { SafetyIncidentController } from './controllers/safety-incident.controller.js';
import { QualitySafetyAuditController } from './controllers/quality-safety-audit.controller.js';

export function registerQualityRoutes(
  router: HttpRouter,
  customControllers?: {
    inspectionController?: InspectionController;
    ncrController?: NcrController;
    actionController?: ActionController;
    safetyObservationController?: SafetyObservationController;
    safetyIncidentController?: SafetyIncidentController;
    auditController?: QualitySafetyAuditController;
  }
): void {
  const prefix = appConfig.app.apiPrefix;
  const prisma = DatabaseService.getInstance().getClient();

  // Repositories
  const auditRepo = new QualitySafetyAuditRepository(prisma);
  const inspectionRepo = new InspectionRepository(prisma);
  const ncrRepo = new NcrRepository(prisma);
  const actionRepo = new ActionRepository(prisma);
  const observationRepo = new SafetyObservationRepository(prisma);
  const incidentRepo = new SafetyIncidentRepository(prisma);

  // Services
  const inspectionService = new InspectionService(prisma, inspectionRepo, auditRepo, actionRepo);
  const ncrService = new NcrService(prisma, ncrRepo, auditRepo);
  const actionService = new ActionService(prisma, actionRepo, auditRepo);
  const observationService = new SafetyObservationService(prisma, observationRepo, auditRepo);
  const incidentService = new SafetyIncidentService(prisma, incidentRepo, auditRepo);
  const auditService = new QualitySafetyAuditService(auditRepo);

  // Controllers
  const inspectionController = customControllers?.inspectionController || new InspectionController(inspectionService);
  const ncrController = customControllers?.ncrController || new NcrController(ncrService);
  const actionController = customControllers?.actionController || new ActionController(actionService);
  const safetyObservationController =
    customControllers?.safetyObservationController || new SafetyObservationController(observationService);
  const safetyIncidentController =
    customControllers?.safetyIncidentController || new SafetyIncidentController(incidentService);
  const auditController = customControllers?.auditController || new QualitySafetyAuditController(auditService);

  // ==========================================
  // 1. INSPECTIONS
  // ==========================================
  router.get(`${prefix}/quality/inspections`, async (req) => inspectionController.listInspections(req));
  router.post(`${prefix}/quality/inspections`, async (req) => inspectionController.createInspection(req));
  router.get(`${prefix}/quality/inspections/:id`, async (req) => inspectionController.getInspection(req));
  router.put(`${prefix}/quality/inspections/:id/draft`, async (req) => inspectionController.updateDraft(req));
  router.post(`${prefix}/quality/inspections/:id/checkpoints`, async (req) => inspectionController.addCustomCheckpoint(req));
  router.put(`${prefix}/quality/inspections/:id/checkpoints/:checkpointId`, async (req) => inspectionController.updateCheckpointResult(req));
  router.post(`${prefix}/quality/inspections/:id/submit`, async (req) => inspectionController.submitInspection(req));
  router.post(`${prefix}/quality/inspections/:id/schedule`, async (req) => inspectionController.scheduleInspection(req));
  router.post(`${prefix}/quality/inspections/:id/start`, async (req) => inspectionController.startInspection(req));
  router.post(`${prefix}/quality/inspections/:id/evaluate`, async (req) => inspectionController.submitEvaluation(req));
  router.post(`${prefix}/quality/inspections/:id/approve`, async (req) => inspectionController.approveInspection(req));
  router.post(`${prefix}/quality/inspections/:id/conditional-approve`, async (req) => inspectionController.conditionalApproveInspection(req));
  router.post(`${prefix}/quality/inspections/:id/reject`, async (req) => inspectionController.rejectInspection(req));
  router.post(`${prefix}/quality/inspections/:id/cancel`, async (req) => inspectionController.cancelInspection(req));
  router.post(`${prefix}/quality/inspections/:id/reinspect`, async (req) => inspectionController.reinspect(req));
  router.get(`${prefix}/quality/inspections/:id/hold-point-release`, async (req) => inspectionController.checkHoldPointRelease(req));

  // ==========================================
  // 2. NON-CONFORMANCE REPORTS (NCR)
  // ==========================================
  router.get(`${prefix}/quality/ncrs`, async (req) => ncrController.listNcrs(req));
  router.post(`${prefix}/quality/ncrs`, async (req) => ncrController.createNcr(req));
  router.get(`${prefix}/quality/ncrs/:id`, async (req) => ncrController.getNcr(req));
  router.put(`${prefix}/quality/ncrs/:id/draft`, async (req) => ncrController.updateDraft(req));
  router.post(`${prefix}/quality/ncrs/:id/require-action`, async (req) => ncrController.requireAction(req));
  router.post(`${prefix}/quality/ncrs/:id/submit-verification`, async (req) => ncrController.submitVerification(req));
  router.post(`${prefix}/quality/ncrs/:id/verify`, async (req) => ncrController.verifyAndClose(req));
  router.post(`${prefix}/quality/ncrs/:id/reject-verification`, async (req) => ncrController.rejectVerification(req));
  router.post(`${prefix}/quality/ncrs/:id/reopen`, async (req) => ncrController.reopenNcr(req));
  router.post(`${prefix}/quality/ncrs/:id/void`, async (req) => ncrController.voidNcr(req));

  // ==========================================
  // 3. CAPA ACTIONS
  // ==========================================
  router.get(`${prefix}/quality/actions`, async (req) => actionController.listActions(req));
  router.post(`${prefix}/quality/actions`, async (req) => actionController.createAction(req));
  router.get(`${prefix}/quality/actions/:id`, async (req) => actionController.getAction(req));
  router.post(`${prefix}/quality/actions/:id/reassign`, async (req) => actionController.reassignAction(req));
  router.post(`${prefix}/quality/actions/:id/start`, async (req) => actionController.startAction(req));
  router.post(`${prefix}/quality/actions/:id/complete`, async (req) => actionController.completeAction(req));
  router.post(`${prefix}/quality/actions/:id/verify`, async (req) => actionController.verifyAction(req));
  router.post(`${prefix}/quality/actions/:id/cancel`, async (req) => actionController.cancelAction(req));
  router.post(`${prefix}/quality/actions/:id/reopen`, async (req) => actionController.reopenAction(req));

  // ==========================================
  // 4. SAFETY OBSERVATIONS
  // ==========================================
  router.get(`${prefix}/safety/observations`, async (req) => safetyObservationController.listObservations(req));
  router.post(`${prefix}/safety/observations`, async (req) => safetyObservationController.createObservation(req));
  router.get(`${prefix}/safety/observations/:id`, async (req) => safetyObservationController.getObservation(req));
  router.put(`${prefix}/safety/observations/:id/draft`, async (req) => safetyObservationController.updateDraft(req));
  router.post(`${prefix}/safety/observations/:id/assign-action`, async (req) => safetyObservationController.assignAction(req));
  router.post(`${prefix}/safety/observations/:id/close`, async (req) => safetyObservationController.closeObservation(req));
  router.post(`${prefix}/safety/observations/:id/reopen`, async (req) => safetyObservationController.reopenObservation(req));

  // ==========================================
  // 5. SAFETY INCIDENTS
  // ==========================================
  router.get(`${prefix}/safety/incidents`, async (req) => safetyIncidentController.listIncidents(req));
  router.post(`${prefix}/safety/incidents`, async (req) => safetyIncidentController.createIncident(req));
  router.get(`${prefix}/safety/incidents/:id`, async (req) => safetyIncidentController.getIncident(req));
  router.post(`${prefix}/safety/incidents/:id/investigate`, async (req) => safetyIncidentController.startInvestigation(req));
  router.post(`${prefix}/safety/incidents/:id/findings`, async (req) => safetyIncidentController.addFindings(req));
  router.post(`${prefix}/safety/incidents/:id/move-to-capa`, async (req) => safetyIncidentController.moveToCapa(req));
  router.post(`${prefix}/safety/incidents/:id/close`, async (req) => safetyIncidentController.closeIncident(req));
  router.post(`${prefix}/safety/incidents/:id/reopen`, async (req) => safetyIncidentController.reopenIncident(req));

  // ==========================================
  // 6. AUDIT LOGS
  // ==========================================
  router.get(`${prefix}/quality/audit-logs/:entityType/:entityId`, async (req) => auditController.listByEntity(req));
  router.get(`${prefix}/quality/projects/:projectId/audit-logs`, async (req) => auditController.listByProject(req));
}
