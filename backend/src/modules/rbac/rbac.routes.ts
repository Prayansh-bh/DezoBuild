import type { HttpRouter } from '../../common/http/router';
import { RbacController } from './rbac.controller';
import { appConfig } from '../../config/app.config';

export function registerRbacRoutes(
  router: HttpRouter,
  controller = new RbacController()
): void {
  const prefix = appConfig.app.apiPrefix;

  // ==========================================
  // PERMISSIONS & ROLES
  // ==========================================
  // GET /api/v1/rbac/permissions
  router.get(`${prefix}/rbac/permissions`, async (req) => controller.listPermissions(req));
  // GET /api/v1/rbac/roles
  router.get(`${prefix}/rbac/roles`, async (req) => controller.listRoles(req));
  // GET /api/v1/rbac/roles/:id
  router.get(`${prefix}/rbac/roles/:id`, async (req) => controller.getRole(req));

  // ==========================================
  // USER ROLES & PERMISSIONS
  // ==========================================
  // GET /api/v1/rbac/my-permissions
  router.get(`${prefix}/rbac/my-permissions`, async (req) => controller.getMyPermissions(req));
  // GET /api/v1/rbac/users/:userId/roles
  router.get(`${prefix}/rbac/users/:userId/roles`, async (req) => controller.getUserRoles(req));
  // GET /api/v1/rbac/users/:userId/permissions
  router.get(`${prefix}/rbac/users/:userId/permissions`, async (req) => controller.getUserPermissions(req));
  // POST /api/v1/rbac/users/roles
  router.post(`${prefix}/rbac/users/roles`, async (req) => controller.assignRole(req));
  // DELETE /api/v1/rbac/users/:userId/roles/:roleId
  router.delete(`${prefix}/rbac/users/:userId/roles/:roleId`, async (req) => controller.removeRole(req));

  // ==========================================
  // PROJECT MEMBERSHIP SCOPE
  // ==========================================
  // GET /api/v1/rbac/projects/:projectId/members
  router.get(`${prefix}/rbac/projects/:projectId/members`, async (req) => controller.listProjectMembers(req));
  // POST /api/v1/rbac/projects/:projectId/members
  router.post(`${prefix}/rbac/projects/:projectId/members`, async (req) => controller.addProjectMember(req));
  // DELETE /api/v1/rbac/projects/:projectId/members/:userId
  router.delete(`${prefix}/rbac/projects/:projectId/members/:userId`, async (req) => controller.removeProjectMember(req));

  // ==========================================
  // STORE ACCESS SCOPE
  // ==========================================
  // GET /api/v1/rbac/stores/:storeId/access
  router.get(`${prefix}/rbac/stores/:storeId/access`, async (req) => controller.listStoreUsers(req));
  // POST /api/v1/rbac/stores/:storeId/access
  router.post(`${prefix}/rbac/stores/:storeId/access`, async (req) => controller.grantStoreAccess(req));
  // DELETE /api/v1/rbac/stores/:storeId/access/:userId
  router.delete(`${prefix}/rbac/stores/:storeId/access/:userId`, async (req) => controller.revokeStoreAccess(req));
}
