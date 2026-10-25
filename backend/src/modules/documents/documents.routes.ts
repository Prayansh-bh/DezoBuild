import type { HttpRouter } from '../../common/http/router.js';
import { DatabaseService } from '../../database/database.service.js';
import { appConfig } from '../../config/app.config.js';

import { EngineeringDocumentRepository } from './repositories/engineering-document.repository.js';
import { DocumentVersionRepository } from './repositories/document-version.repository.js';
import { DocumentTransmittalRepository } from './repositories/document-transmittal.repository.js';
import { RfiRepository } from './repositories/rfi.repository.js';
import { DocumentAuditRepository } from './repositories/document-audit.repository.js';

import { EngineeringDocumentService } from './services/engineering-document.service.js';
import { DocumentTransmittalService } from './services/document-transmittal.service.js';
import { RfiService } from './services/rfi.service.js';
import { DocumentAuditService } from './services/document-audit.service.js';

import { EngineeringDocumentController } from './controllers/engineering-document.controller.js';
import { DocumentTransmittalController } from './controllers/document-transmittal.controller.js';
import { RfiController } from './controllers/rfi.controller.js';
import { DocumentAuditController } from './controllers/document-audit.controller.js';

export function registerDocumentsRoutes(
  router: HttpRouter,
  customControllers?: {
    documentController?: EngineeringDocumentController;
    transmittalController?: DocumentTransmittalController;
    rfiController?: RfiController;
    auditController?: DocumentAuditController;
  }
): void {
  const prefix = appConfig.app.apiPrefix;
  const prisma = DatabaseService.getInstance().getClient();

  // Repositories
  const auditRepo = new DocumentAuditRepository(prisma);
  const documentRepo = new EngineeringDocumentRepository(prisma);
  const versionRepo = new DocumentVersionRepository(prisma);
  const transmittalRepo = new DocumentTransmittalRepository(prisma);
  const rfiRepo = new RfiRepository(prisma);

  // Services
  const auditService = new DocumentAuditService(auditRepo);
  const documentService = new EngineeringDocumentService(prisma, documentRepo, versionRepo, auditRepo);
  const transmittalService = new DocumentTransmittalService(prisma, transmittalRepo, versionRepo, auditRepo);
  const rfiService = new RfiService(prisma, rfiRepo, documentRepo, versionRepo, auditRepo);

  // Controllers
  const documentController =
    customControllers?.documentController || new EngineeringDocumentController(documentService);
  const transmittalController =
    customControllers?.transmittalController || new DocumentTransmittalController(transmittalService);
  const rfiController = customControllers?.rfiController || new RfiController(rfiService);
  const auditController = customControllers?.auditController || new DocumentAuditController(auditService);

  // ==========================================
  // 1. TRANSMITTALS (Registered before /documents/:id)
  // ==========================================
  router.get(`${prefix}/documents/transmittals`, async (req) => transmittalController.listTransmittals(req));
  router.post(`${prefix}/documents/transmittals`, async (req) => transmittalController.createTransmittal(req));
  router.get(`${prefix}/documents/transmittals/:id`, async (req) => transmittalController.getTransmittal(req));
  router.post(`${prefix}/documents/transmittals/:id/items`, async (req) => transmittalController.addItem(req));
  router.delete(`${prefix}/documents/transmittals/:id/items/:itemId`, async (req) =>
    transmittalController.removeItem(req)
  );
  router.post(`${prefix}/documents/transmittals/:id/issue`, async (req) => transmittalController.issueTransmittal(req));
  router.post(`${prefix}/documents/transmittals/:id/acknowledge`, async (req) =>
    transmittalController.acknowledgeTransmittal(req)
  );
  router.post(`${prefix}/documents/transmittals/:id/cancel`, async (req) =>
    transmittalController.cancelTransmittal(req)
  );

  // ==========================================
  // 2. RFIS (Registered before /documents/:id)
  // ==========================================
  router.get(`${prefix}/documents/rfis`, async (req) => rfiController.listRfis(req));
  router.post(`${prefix}/documents/rfis`, async (req) => rfiController.createRfi(req));
  router.get(`${prefix}/documents/rfis/:id`, async (req) => rfiController.getRfi(req));
  router.post(`${prefix}/documents/rfis/:id/submit`, async (req) => rfiController.submitRfi(req));
  router.post(`${prefix}/documents/rfis/:id/assign`, async (req) => rfiController.assignRfi(req));
  router.post(`${prefix}/documents/rfis/:id/respond`, async (req) => rfiController.respondRfi(req));
  router.post(`${prefix}/documents/rfis/:id/close`, async (req) => rfiController.closeRfi(req));
  router.post(`${prefix}/documents/rfis/:id/reopen`, async (req) => rfiController.reopenRfi(req));
  router.post(`${prefix}/documents/rfis/:id/cancel`, async (req) => rfiController.cancelRfi(req));
  router.post(`${prefix}/documents/rfis/:id/references`, async (req) => rfiController.addReference(req));
  router.delete(`${prefix}/documents/rfis/:id/references/:referenceId`, async (req) =>
    rfiController.removeReference(req)
  );

  // ==========================================
  // 3. AUDIT LOGS (Registered before /documents/:id)
  // ==========================================
  router.get(`${prefix}/documents/audit-logs`, async (req) => auditController.listLogs(req));

  // ==========================================
  // 4. ENGINEERING DOCUMENTS & VERSIONS
  // ==========================================
  router.get(`${prefix}/documents`, async (req) => documentController.listDocuments(req));
  router.post(`${prefix}/documents`, async (req) => documentController.createDocument(req));
  router.get(`${prefix}/documents/:id`, async (req) => documentController.getDocument(req));
  router.put(`${prefix}/documents/:id`, async (req) => documentController.updateDocument(req));
  router.post(`${prefix}/documents/:id/archive`, async (req) => documentController.archiveDocument(req));
  router.post(`${prefix}/documents/:id/void`, async (req) => documentController.voidDocument(req));

  router.post(`${prefix}/documents/:id/versions`, async (req) => documentController.registerVersion(req));
  router.get(`${prefix}/documents/:id/versions`, async (req) => documentController.listVersions(req));
  router.get(`${prefix}/documents/:id/versions/:versionId`, async (req) => documentController.getVersion(req));
  router.post(`${prefix}/documents/:id/versions/:versionId/issue`, async (req) =>
    documentController.issueVersion(req)
  );
  router.post(`${prefix}/documents/:id/versions/:versionId/void`, async (req) =>
    documentController.voidVersion(req)
  );
}
