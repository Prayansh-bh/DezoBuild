/**
 * DEZOBUILD — Workspace Definition Model
 * 
 * Provides contextual workspace identities, header titles, and
 * descriptions customized to the authenticated customer role.
 */

import { CustomerRole, type CustomerRoleType } from "./roles";

export interface WorkspaceConfig {
  role: CustomerRoleType;
  identityTitle: string;
  headerTitle: string;
  headerSubtitle: string;
  crumbLabel: string;
  defaultRoute: string;
  primaryActionLabel: string;
  primaryActionRoute: string;
  priorityDomain: string;
}

export const WORKSPACE_CONFIGS: Record<CustomerRoleType, WorkspaceConfig> = {
  [CustomerRole.COMPANY_OWNER]: {
    role: CustomerRole.COMPANY_OWNER,
    identityTitle: "Executive Overview",
    headerTitle: "Executive Portfolio Overview",
    headerSubtitle: "Consolidated operational health, cash flow, and cost variance across all active metro sites.",
    crumbLabel: "Executive Overview",
    defaultRoute: "/",
    primaryActionLabel: "+ Create Project",
    primaryActionRoute: "/projects/new",
    priorityDomain: "projects",
  },
  [CustomerRole.COMPANY_ADMIN]: {
    role: CustomerRole.COMPANY_ADMIN,
    identityTitle: "Organization Overview",
    headerTitle: "Enterprise Governance & Organization",
    headerSubtitle: "Manage company profile, user access permissions, enterprise settings, and compliance.",
    crumbLabel: "Organization Overview",
    defaultRoute: "/settings",
    primaryActionLabel: "+ Invite User",
    primaryActionRoute: "/settings",
    priorityDomain: "administration",
  },
  [CustomerRole.PROJECT_MANAGER]: {
    role: CustomerRole.PROJECT_MANAGER,
    identityTitle: "Project Operations",
    headerTitle: "Project Operations Center",
    headerSubtitle: "Track WBS execution, daily progress reports (DPR), material indents, and schedule milestones.",
    crumbLabel: "Project Operations",
    defaultRoute: "/projects",
    primaryActionLabel: "+ Submit Indent",
    primaryActionRoute: "/materials",
    priorityDomain: "projects",
  },
  [CustomerRole.SITE_ENGINEER]: {
    role: CustomerRole.SITE_ENGINEER,
    identityTitle: "Site Operations",
    headerTitle: "Site Operations & Field Log",
    headerSubtitle: "Log daily site progress, muster roll attendance, equipment run hours, and quality snags.",
    crumbLabel: "Site Operations",
    defaultRoute: "/projects",
    primaryActionLabel: "+ Daily DPR",
    primaryActionRoute: "/projects",
    priorityDomain: "projects",
  },
  [CustomerRole.PROCUREMENT_STORE]: {
    role: CustomerRole.PROCUREMENT_STORE,
    identityTitle: "Procurement & Store",
    headerTitle: "Store & Inventory Management",
    headerSubtitle: "Monitor stock balances, vendor purchase orders, GRN verification, and activity material issues.",
    crumbLabel: "Procurement & Store",
    defaultRoute: "/materials",
    primaryActionLabel: "+ Create PO",
    primaryActionRoute: "/materials",
    priorityDomain: "procurement_store",
  },
  [CustomerRole.ACCOUNTANT]: {
    role: CustomerRole.ACCOUNTANT,
    identityTitle: "Financial Overview",
    headerTitle: "Commercial & Financial Ledger",
    headerSubtitle: "Verify site expenses, process vendor disbursements, track retention ledgers, and cash burn.",
    crumbLabel: "Financial Overview",
    defaultRoute: "/finance",
    primaryActionLabel: "+ Record Expense",
    primaryActionRoute: "/finance",
    priorityDomain: "finance_commercial",
  },
  [CustomerRole.HR]: {
    role: CustomerRole.HR,
    identityTitle: "People Overview",
    headerTitle: "Workforce & HR Operations",
    headerSubtitle: "Staff directory, biometric muster logs, contractor labor deployments, and payroll records.",
    crumbLabel: "People Overview",
    defaultRoute: "/people",
    primaryActionLabel: "+ Add Employee",
    primaryActionRoute: "/people",
    priorityDomain: "people_hr",
  },
  [CustomerRole.EMPLOYEE]: {
    role: CustomerRole.EMPLOYEE,
    identityTitle: "Employee Self-Service",
    headerTitle: "Employee Self-Service Portal",
    headerSubtitle: "View daily shift assignments, log personal attendance, and access site drawings.",
    crumbLabel: "Employee Portal",
    defaultRoute: "/projects",
    primaryActionLabel: "View Assignments",
    primaryActionRoute: "/projects",
    priorityDomain: "projects",
  },
  [CustomerRole.VIEWER]: {
    role: CustomerRole.VIEWER,
    identityTitle: "Auditor Overview",
    headerTitle: "Compliance & Project Inspection",
    headerSubtitle: "Read-only inspection of project execution milestones, drawings, and statutory compliance.",
    crumbLabel: "Auditor Overview",
    defaultRoute: "/projects",
    primaryActionLabel: "View Reports",
    primaryActionRoute: "/reports",
    priorityDomain: "analytics_reports",
  },
};

export function getWorkspaceConfig(role: CustomerRoleType): WorkspaceConfig {
  return WORKSPACE_CONFIGS[role] || WORKSPACE_CONFIGS[CustomerRole.COMPANY_OWNER];
}
