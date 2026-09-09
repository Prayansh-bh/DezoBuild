/**
 * DEZOBUILD — Authoritative Role Model
 * 
 * Defines Platform-level role vs Customer-level roles.
 * Platform Owner (SUPER_ADMIN) operates the SaaS platform via owner.dezobuild.com.
 * Company Owner & team operate their company workspace via app.dezobuild.com.
 */

export const PlatformRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;

export type PlatformRoleType = (typeof PlatformRole)[keyof typeof PlatformRole];

export const CustomerRole = {
  COMPANY_OWNER: "COMPANY_OWNER",
  COMPANY_ADMIN: "COMPANY_ADMIN",
  PROJECT_MANAGER: "PROJECT_MANAGER",
  SITE_ENGINEER: "SITE_ENGINEER",
  PROCUREMENT_STORE: "PROCUREMENT_STORE",
  ACCOUNTANT: "ACCOUNTANT",
  HR: "HR",
  EMPLOYEE: "EMPLOYEE",
  VIEWER: "VIEWER",
} as const;

export type CustomerRoleType = (typeof CustomerRole)[keyof typeof CustomerRole];

export interface RoleMetadata {
  key: CustomerRoleType | PlatformRoleType;
  title: string;
  shortLabel: string;
  scope: "platform" | "customer";
  description: string;
  badgeClass: string;
  defaultRoute: string;
  workspaceTitle: string;
}

export const ROLE_DEFINITIONS: Record<CustomerRoleType, RoleMetadata> = {
  COMPANY_OWNER: {
    key: "COMPANY_OWNER",
    title: "Company Owner / Executive",
    shortLabel: "OWNER",
    scope: "customer",
    description: "Full portfolio visibility, executive financial health, board reports, and organizational control.",
    badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
    defaultRoute: "/",
    workspaceTitle: "Executive Overview",
  },
  COMPANY_ADMIN: {
    key: "COMPANY_ADMIN",
    title: "Company Administrator",
    shortLabel: "ADMIN",
    scope: "customer",
    description: "Company settings, user management, RBAC access control, legal profile, and compliance.",
    badgeClass: "bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30",
    defaultRoute: "/settings",
    workspaceTitle: "Organization Overview",
  },
  PROJECT_MANAGER: {
    key: "PROJECT_MANAGER",
    title: "Project Manager",
    shortLabel: "PM",
    scope: "customer",
    description: "Multi-site project execution, WBS schedules, DPR approvals, indent validation, and variance control.",
    badgeClass: "bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30",
    defaultRoute: "/projects",
    workspaceTitle: "Project Operations",
  },
  SITE_ENGINEER: {
    key: "SITE_ENGINEER",
    title: "Site Engineer",
    shortLabel: "SITE ENG",
    scope: "customer",
    description: "Field mobile workflow: daily DPR logging, labor muster, machinery hour logs, and site snags.",
    badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
    defaultRoute: "/projects",
    workspaceTitle: "Site Operations",
  },
  PROCUREMENT_STORE: {
    key: "PROCUREMENT_STORE",
    title: "Procurement & Store Manager",
    shortLabel: "STORE",
    scope: "customer",
    description: "Inventory stock, purchase orders, GRN verification, material issues to activities, and vendor management.",
    badgeClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/30",
    defaultRoute: "/materials",
    workspaceTitle: "Procurement & Store",
  },
  ACCOUNTANT: {
    key: "ACCOUNTANT",
    title: "Commercial & Finance Accountant",
    shortLabel: "FINANCE",
    scope: "customer",
    description: "Expense verification, vendor disbursements, contractor advances, retention ledgers, and cash burn.",
    badgeClass: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30",
    defaultRoute: "/finance",
    workspaceTitle: "Financial Overview",
  },
  HR: {
    key: "HR",
    title: "Human Resources & Payroll",
    shortLabel: "HR",
    scope: "customer",
    description: "Employee directory, biometric attendance muster, contractor gang onboarding, and wage processing.",
    badgeClass: "bg-pink-500/15 text-pink-600 dark:text-pink-300 border-pink-500/30",
    defaultRoute: "/people",
    workspaceTitle: "People Overview",
  },
  EMPLOYEE: {
    key: "EMPLOYEE",
    title: "Employee / Field Worker",
    shortLabel: "EMPLOYEE",
    scope: "customer",
    description: "Self-service attendance logging, assigned activity views, and personal profile.",
    badgeClass: "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30",
    defaultRoute: "/projects",
    workspaceTitle: "Employee Self-Service",
  },
  VIEWER: {
    key: "VIEWER",
    title: "Read-Only Stakeholder / Auditor",
    shortLabel: "VIEWER",
    scope: "customer",
    description: "Read-only inspection of project progress, drawings, and compliance records.",
    badgeClass: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 border-zinc-500/30",
    defaultRoute: "/projects",
    workspaceTitle: "Auditor Overview",
  },
};

export const PLATFORM_SUPER_ADMIN_DEFINITION: RoleMetadata = {
  key: "SUPER_ADMIN",
  title: "DEZOBUILD Platform Owner / Super Admin",
  shortLabel: "SUPER ADMIN",
  scope: "platform",
  description: "Platform-level governance at owner.dezobuild.com: tenant onboarding, billing, subscription plans, system health.",
  badgeClass: "bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30",
  defaultRoute: "/",
  workspaceTitle: "Platform Administration Console",
};

export const ALL_CUSTOMER_ROLES = Object.values(CustomerRole);
