import type { HttpRouter } from "../../common/http/router";
import { TenancyController } from "./tenancy.controller";
import { appConfig } from "../../config/app.config";

export function registerTenancyRoutes(
  router: HttpRouter,
  controller = new TenancyController(),
): void {
  const prefix = appConfig.app.apiPrefix;

  // ==========================================
  // TENANTS
  // ==========================================
  // GET /api/v1/tenants/:id
  router.get(`${prefix}/tenants/:id`, async (req) => controller.getTenant(req));
  // POST /api/v1/tenants
  router.post(`${prefix}/tenants`, async (req) => controller.createTenant(req));
  // PATCH /api/v1/tenants/:id
  router.patch(`${prefix}/tenants/:id`, async (req) => controller.updateTenant(req));

  // ==========================================
  // COMPANIES
  // ==========================================
  // GET /api/v1/companies
  router.get(`${prefix}/companies`, async (req) => controller.listCompanies(req));
  // GET /api/v1/companies/:id
  router.get(`${prefix}/companies/:id`, async (req) => controller.getCompany(req));
  // POST /api/v1/companies
  router.post(`${prefix}/companies`, async (req) => controller.createCompany(req));
  // PATCH /api/v1/companies/:id
  router.patch(`${prefix}/companies/:id`, async (req) => controller.updateCompany(req));
  // DELETE /api/v1/companies/:id
  router.delete(`${prefix}/companies/:id`, async (req) => controller.deleteCompany(req));

  // ==========================================
  // BRANCHES
  // ==========================================
  // GET /api/v1/branches
  router.get(`${prefix}/branches`, async (req) => controller.listBranches(req));
  // GET /api/v1/branches/:id
  router.get(`${prefix}/branches/:id`, async (req) => controller.getBranch(req));
  // POST /api/v1/branches
  router.post(`${prefix}/branches`, async (req) => controller.createBranch(req));
  // PATCH /api/v1/branches/:id
  router.patch(`${prefix}/branches/:id`, async (req) => controller.updateBranch(req));
  // DELETE /api/v1/branches/:id
  router.delete(`${prefix}/branches/:id`, async (req) => controller.deleteBranch(req));

  // ==========================================
  // DEPARTMENTS
  // ==========================================
  // GET /api/v1/departments
  router.get(`${prefix}/departments`, async (req) => controller.listDepartments(req));
  // GET /api/v1/departments/:id
  router.get(`${prefix}/departments/:id`, async (req) => controller.getDepartment(req));
  // POST /api/v1/departments
  router.post(`${prefix}/departments`, async (req) => controller.createDepartment(req));
  // PATCH /api/v1/departments/:id
  router.patch(`${prefix}/departments/:id`, async (req) => controller.updateDepartment(req));
  // DELETE /api/v1/departments/:id
  router.delete(`${prefix}/departments/:id`, async (req) => controller.deleteDepartment(req));
}
