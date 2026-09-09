/**
 * DEZOBUILD — Authoritative Permission Model
 * 
 * Granular capability-based access control matrix mapping
 * Customer Roles to functional domain actions.
 */

import type { CustomerRoleType } from "./roles";

export type PermissionAction = "view" | "create" | "edit" | "approve" | "delete";

export interface ActionPermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  approve: boolean;
  delete: boolean;
}

export type DomainPermissions = Record<string, ActionPermissions>;

export const DEFAULT_ROLE_PERMISSIONS: Record<CustomerRoleType, DomainPermissions> = {
  COMPANY_OWNER: {
    projects: { view: true, create: true, edit: true, approve: true, delete: true },
    procurement_store: { view: true, create: true, edit: true, approve: true, delete: true },
    finance_commercial: { view: true, create: true, edit: true, approve: true, delete: true },
    people_hr: { view: true, create: true, edit: true, approve: true, delete: true },
    plant_equipment: { view: true, create: true, edit: true, approve: true, delete: true },
    issues_alerts: { view: true, create: true, edit: true, approve: true, delete: true },
    analytics_reports: { view: true, create: true, edit: true, approve: true, delete: true },
    documents_drawings: { view: true, create: true, edit: true, approve: true, delete: true },
    administration: { view: true, create: true, edit: true, approve: true, delete: true },
  },
  COMPANY_ADMIN: {
    projects: { view: true, create: true, edit: true, approve: true, delete: false },
    procurement_store: { view: true, create: true, edit: true, approve: true, delete: false },
    finance_commercial: { view: true, create: true, edit: true, approve: true, delete: false },
    people_hr: { view: true, create: true, edit: true, approve: true, delete: true },
    plant_equipment: { view: true, create: true, edit: true, approve: true, delete: false },
    issues_alerts: { view: true, create: true, edit: true, approve: true, delete: false },
    analytics_reports: { view: true, create: true, edit: true, approve: true, delete: false },
    documents_drawings: { view: true, create: true, edit: true, approve: true, delete: true },
    administration: { view: true, create: true, edit: true, approve: true, delete: true },
  },
  PROJECT_MANAGER: {
    projects: { view: true, create: false, edit: true, approve: true, delete: false },
    procurement_store: { view: true, create: true, edit: true, approve: true, delete: false },
    finance_commercial: { view: true, create: true, edit: true, approve: false, delete: false },
    people_hr: { view: true, create: true, edit: true, approve: true, delete: false },
    plant_equipment: { view: true, create: true, edit: true, approve: true, delete: false },
    issues_alerts: { view: true, create: true, edit: true, approve: true, delete: false },
    analytics_reports: { view: true, create: true, edit: false, approve: false, delete: false },
    documents_drawings: { view: true, create: true, edit: true, approve: true, delete: false },
    administration: { view: false, create: false, edit: false, approve: false, delete: false },
  },
  SITE_ENGINEER: {
    projects: { view: true, create: false, edit: true, approve: false, delete: false },
    procurement_store: { view: true, create: true, edit: false, approve: false, delete: false },
    finance_commercial: { view: false, create: false, edit: false, approve: false, delete: false },
    people_hr: { view: true, create: true, edit: true, approve: false, delete: false },
    plant_equipment: { view: true, create: true, edit: false, approve: false, delete: false },
    issues_alerts: { view: true, create: true, edit: false, approve: false, delete: false },
    analytics_reports: { view: false, create: false, edit: false, approve: false, delete: false },
    documents_drawings: { view: true, create: true, edit: false, approve: false, delete: false },
    administration: { view: false, create: false, edit: false, approve: false, delete: false },
  },
  PROCUREMENT_STORE: {
    projects: { view: true, create: false, edit: false, approve: false, delete: false },
    procurement_store: { view: true, create: true, edit: true, approve: true, delete: false },
    finance_commercial: { view: false, create: false, edit: false, approve: false, delete: false },
    people_hr: { view: false, create: false, edit: false, approve: false, delete: false },
    plant_equipment: { view: false, create: false, edit: false, approve: false, delete: false },
    issues_alerts: { view: true, create: true, edit: false, approve: false, delete: false },
    analytics_reports: { view: true, create: true, edit: false, approve: false, delete: false },
    documents_drawings: { view: true, create: true, edit: false, approve: false, delete: false },
    administration: { view: false, create: false, edit: false, approve: false, delete: false },
  },
  ACCOUNTANT: {
    projects: { view: true, create: false, edit: false, approve: false, delete: false },
    procurement_store: { view: true, create: false, edit: false, approve: false, delete: false },
    finance_commercial: { view: true, create: true, edit: true, approve: true, delete: false },
    people_hr: { view: false, create: false, edit: false, approve: false, delete: false },
    plant_equipment: { view: false, create: false, edit: false, approve: false, delete: false },
    issues_alerts: { view: true, create: false, edit: false, approve: false, delete: false },
    analytics_reports: { view: true, create: true, edit: false, approve: false, delete: false },
    documents_drawings: { view: true, create: true, edit: true, approve: true, delete: false },
    administration: { view: false, create: false, edit: false, approve: false, delete: false },
  },
  HR: {
    projects: { view: true, create: false, edit: false, approve: false, delete: false },
    procurement_store: { view: false, create: false, edit: false, approve: false, delete: false },
    finance_commercial: { view: false, create: false, edit: false, approve: false, delete: false },
    people_hr: { view: true, create: true, edit: true, approve: true, delete: false },
    plant_equipment: { view: false, create: false, edit: false, approve: false, delete: false },
    issues_alerts: { view: true, create: false, edit: false, approve: false, delete: false },
    analytics_reports: { view: true, create: true, edit: false, approve: false, delete: false },
    documents_drawings: { view: true, create: true, edit: false, approve: false, delete: false },
    administration: { view: false, create: false, edit: false, approve: false, delete: false },
  },
  EMPLOYEE: {
    projects: { view: true, create: false, edit: false, approve: false, delete: false },
    procurement_store: { view: false, create: false, edit: false, approve: false, delete: false },
    finance_commercial: { view: false, create: false, edit: false, approve: false, delete: false },
    people_hr: { view: true, create: false, edit: false, approve: false, delete: false },
    plant_equipment: { view: false, create: false, edit: false, approve: false, delete: false },
    issues_alerts: { view: false, create: false, edit: false, approve: false, delete: false },
    analytics_reports: { view: false, create: false, edit: false, approve: false, delete: false },
    documents_drawings: { view: true, create: false, edit: false, approve: false, delete: false },
    administration: { view: false, create: false, edit: false, approve: false, delete: false },
  },
  VIEWER: {
    projects: { view: true, create: false, edit: false, approve: false, delete: false },
    procurement_store: { view: false, create: false, edit: false, approve: false, delete: false },
    finance_commercial: { view: false, create: false, edit: false, approve: false, delete: false },
    people_hr: { view: false, create: false, edit: false, approve: false, delete: false },
    plant_equipment: { view: false, create: false, edit: false, approve: false, delete: false },
    issues_alerts: { view: false, create: false, edit: false, approve: false, delete: false },
    analytics_reports: { view: true, create: false, edit: false, approve: false, delete: false },
    documents_drawings: { view: true, create: false, edit: false, approve: false, delete: false },
    administration: { view: false, create: false, edit: false, approve: false, delete: false },
  },
};

const DOMAIN_ALIASES: Record<string, string> = {
  projects: "projects",
  wbs: "projects",
  dpr: "projects",
  procurement_store: "procurement_store",
  materials: "procurement_store",
  procurement: "procurement_store",
  store: "procurement_store",
  finance_commercial: "finance_commercial",
  finance: "finance_commercial",
  commercial: "finance_commercial",
  people_hr: "people_hr",
  people: "people_hr",
  hr: "people_hr",
  plant_equipment: "plant_equipment",
  equipment: "plant_equipment",
  issues_alerts: "issues_alerts",
  alerts: "issues_alerts",
  analytics_reports: "analytics_reports",
  reports: "analytics_reports",
  documents_drawings: "documents_drawings",
  documents: "documents_drawings",
  administration: "administration",
  settings: "administration",
  admin: "administration",
};

const SPECIFIC_CAPABILITIES: Record<string, CustomerRoleType[]> = {
  "wbs.create": ["COMPANY_OWNER", "COMPANY_ADMIN", "PROJECT_MANAGER"],
  "wbs.edit": ["COMPANY_OWNER", "COMPANY_ADMIN", "PROJECT_MANAGER", "SITE_ENGINEER"],
  "dpr.create": ["COMPANY_OWNER", "COMPANY_ADMIN", "PROJECT_MANAGER", "SITE_ENGINEER"],
  "dpr.view": ["COMPANY_OWNER", "COMPANY_ADMIN", "PROJECT_MANAGER", "SITE_ENGINEER", "VIEWER"],
  "materials.indent": [
    "COMPANY_OWNER",
    "COMPANY_ADMIN",
    "PROJECT_MANAGER",
    "SITE_ENGINEER",
    "PROCUREMENT_STORE",
  ],
  "materials.po": ["COMPANY_OWNER", "COMPANY_ADMIN", "PROCUREMENT_STORE", "ACCOUNTANT"],
  "materials.grn": ["COMPANY_OWNER", "COMPANY_ADMIN", "SITE_ENGINEER", "PROCUREMENT_STORE"],
  "materials.issue": ["COMPANY_OWNER", "COMPANY_ADMIN", "SITE_ENGINEER", "PROCUREMENT_STORE"],
  "commercial.view": ["COMPANY_OWNER", "COMPANY_ADMIN", "PROJECT_MANAGER", "ACCOUNTANT", "VIEWER"],
  "commercial.expense": ["COMPANY_OWNER", "COMPANY_ADMIN", "PROJECT_MANAGER", "ACCOUNTANT"],
};

export function hasPermission(
  role: CustomerRoleType,
  permissionOrDomain: string,
  action?: PermissionAction,
  customOverrides?: DomainPermissions
): boolean {
  if (SPECIFIC_CAPABILITIES[permissionOrDomain] && !customOverrides) {
    return SPECIFIC_CAPABILITIES[permissionOrDomain].includes(role);
  }

  let resolvedDomain = permissionOrDomain;
  let resolvedAction: PermissionAction = action || "view";

  if (permissionOrDomain.includes(".")) {
    const [domainPart, actionPart] = permissionOrDomain.split(".");
    resolvedDomain = domainPart || permissionOrDomain;
    if (actionPart) {
      if (
        actionPart === "expense" ||
        actionPart === "indent" ||
        actionPart === "po" ||
        actionPart === "grn" ||
        actionPart === "issue"
      ) {
        resolvedAction = "create";
      } else {
        resolvedAction = actionPart as PermissionAction;
      }
    }
  }

  const normalizedDomain = DOMAIN_ALIASES[resolvedDomain.toLowerCase()] || resolvedDomain;
  const rolePerms = customOverrides || DEFAULT_ROLE_PERMISSIONS[role];
  if (!rolePerms || !rolePerms[normalizedDomain]) {
    return false;
  }
  return !!rolePerms[normalizedDomain][resolvedAction];
}
