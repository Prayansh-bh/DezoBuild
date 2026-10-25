import type { HttpRouter } from '../../common/http/router.js';
import { DatabaseService } from '../../database/database.service.js';
import { appConfig } from '../../config/app.config.js';

import { ApprovalPolicyRepository } from './repositories/approval-policy.repository.js';
import { ApprovalRequestRepository } from './repositories/approval-request.repository.js';

import { ApprovalPolicyService } from './services/approval-policy.service.js';
import { ApprovalService } from './services/approval.service.js';

import { ApprovalPolicyController } from './controllers/approval-policy.controller.js';
import { ApprovalController } from './controllers/approval.controller.js';

export function registerApprovalRoutes(
  router: HttpRouter,
  customControllers?: {
    policyController?: ApprovalPolicyController;
    approvalController?: ApprovalController;
  }
): void {
  const prefix = appConfig.app.apiPrefix;
  const prisma = DatabaseService.getInstance().getClient();

  // Repositories
  const policyRepo = new ApprovalPolicyRepository(prisma);
  const requestRepo = new ApprovalRequestRepository(prisma);

  // Services
  const policyService = new ApprovalPolicyService(policyRepo, prisma);
  const approvalService = new ApprovalService(requestRepo, policyRepo, prisma);

  // Controllers
  const policyController =
    customControllers?.policyController || new ApprovalPolicyController(policyService);
  const approvalController =
    customControllers?.approvalController || new ApprovalController(approvalService);

  // ==========================================
  // 1. APPROVAL POLICIES
  // ==========================================
  router.get(`${prefix}/approvals/policies`, async (req) => policyController.listPolicies(req));
  router.post(`${prefix}/approvals/policies`, async (req) => policyController.createPolicy(req));
  router.get(`${prefix}/approvals/policies/:id`, async (req) => policyController.getPolicy(req));
  router.post(`${prefix}/approvals/policies/:id/activate`, async (req) =>
    policyController.activatePolicy(req)
  );
  router.post(`${prefix}/approvals/policies/:id/supersede`, async (req) =>
    policyController.supersedePolicy(req)
  );
  router.post(`${prefix}/approvals/policies/:id/deactivate`, async (req) =>
    policyController.deactivatePolicy(req)
  );

  // ==========================================
  // 2. APPROVAL REQUESTS & ACTIONS
  // ==========================================
  // Note: /requests/pending must be registered before /requests/:id
  router.get(`${prefix}/approvals/requests/pending`, async (req) =>
    approvalController.listPending(req)
  );
  router.get(`${prefix}/approvals/requests`, async (req) => approvalController.listRequests(req));
  router.post(`${prefix}/approvals/requests`, async (req) => approvalController.submitRequest(req));
  router.get(`${prefix}/approvals/requests/:id`, async (req) => approvalController.getRequest(req));

  router.post(`${prefix}/approvals/requests/:id/approve`, async (req) =>
    approvalController.approveStep(req)
  );
  router.post(`${prefix}/approvals/requests/:id/reject`, async (req) =>
    approvalController.rejectRequest(req)
  );
  router.post(`${prefix}/approvals/requests/:id/return`, async (req) =>
    approvalController.returnRequest(req)
  );
  router.post(`${prefix}/approvals/requests/:id/cancel`, async (req) =>
    approvalController.cancelRequest(req)
  );
}
