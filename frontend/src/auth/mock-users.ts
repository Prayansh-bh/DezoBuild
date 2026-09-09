/**
 * DEZOBUILD — Mock User Profiles
 * 
 * Pre-configured mock profiles representing each customer role.
 * Used for development preview, navigation testing, and UI validation.
 */

import { CustomerRole } from "@/authorization/roles";
import type { CurrentUser, TenantContext } from "./types";

export const MOCK_TENANT: TenantContext = {
  id: "tenant-dezo-001",
  name: "Dezo Infra Projects",
  legalName: "Dezo Infrastructure & Engineering Private Limited",
  code: "DEZO-INFRA",
  plan: "Enterprise Tier",
  activeSitesCount: 8,
  currency: "INR",
  currencySymbol: "₹",
};

export const MOCK_USERS: CurrentUser[] = [
  {
    id: "user-owner-001",
    name: "Arjun Kapoor",
    email: "arjun.kapoor@dezoinfra.com",
    avatarInitials: "AK",
    role: CustomerRole.COMPANY_OWNER,
    title: "Portfolio Director & Founder",
    department: "Executive Board",
    phone: "+91 98201 23456",
    tenant: MOCK_TENANT,
    assignedProjects: [
      { projectId: "proj-001", projectCode: "METRO-L4", projectName: "Metro Line 4 Elevated Viaduct", siteIds: ["site-01", "site-02"], roleInProject: "Executive Sponsor" },
      { projectId: "proj-002", projectCode: "ORION-TWR", projectName: "Orion Luxury IT Towers", siteIds: ["site-03"], roleInProject: "Executive Sponsor" },
    ],
  },
  {
    id: "user-admin-002",
    name: "Neha Sharma",
    email: "neha.sharma@dezoinfra.com",
    avatarInitials: "NS",
    role: CustomerRole.COMPANY_ADMIN,
    title: "Enterprise Governance Director",
    department: "Administration",
    phone: "+91 98201 34567",
    tenant: MOCK_TENANT,
    assignedProjects: [],
  },
  {
    id: "user-pm-003",
    name: "Rahul Menon",
    email: "rahul.menon@dezoinfra.com",
    avatarInitials: "RM",
    role: CustomerRole.PROJECT_MANAGER,
    title: "Senior Project Manager",
    department: "Civil Infrastructure",
    phone: "+91 98450 12890",
    tenant: MOCK_TENANT,
    assignedProjects: [
      { projectId: "proj-001", projectCode: "METRO-L4", projectName: "Metro Line 4 Elevated Viaduct", siteIds: ["site-01", "site-02"], roleInProject: "Project Manager" },
    ],
    activeProjectId: "proj-001",
  },
  {
    id: "user-site-004",
    name: "Vikram Shenoy",
    email: "vikram.shenoy@dezoinfra.com",
    avatarInitials: "VS",
    role: CustomerRole.SITE_ENGINEER,
    title: "Senior Site Engineer (Structures)",
    department: "Field Engineering",
    phone: "+91 98765 43210",
    tenant: MOCK_TENANT,
    assignedProjects: [
      { projectId: "proj-001", projectCode: "METRO-L4", projectName: "Metro Line 4 Elevated Viaduct", siteIds: ["site-01"], roleInProject: "Site In-Charge" },
    ],
    activeProjectId: "proj-001",
  },
  {
    id: "user-store-005",
    name: "Ganesh Shinde",
    email: "ganesh.shinde@dezoinfra.com",
    avatarInitials: "GS",
    role: CustomerRole.PROCUREMENT_STORE,
    title: "Central Warehouse & Materials Lead",
    department: "Supply Chain & Logistics",
    phone: "+91 99345 67890",
    tenant: MOCK_TENANT,
    assignedProjects: [
      { projectId: "proj-001", projectCode: "METRO-L4", projectName: "Metro Line 4 Elevated Viaduct", siteIds: ["site-01", "site-02"], roleInProject: "Store Manager" },
      { projectId: "proj-002", projectCode: "ORION-TWR", projectName: "Orion Luxury IT Towers", siteIds: ["site-03"], roleInProject: "Store Manager" },
    ],
  },
  {
    id: "user-finance-006",
    name: "Kavita Joshi",
    email: "kavita.joshi@dezoinfra.com",
    avatarInitials: "KJ",
    role: CustomerRole.ACCOUNTANT,
    title: "Chief Commercial Officer & Lead Accountant",
    department: "Finance & Accounts",
    phone: "+91 98111 22334",
    tenant: MOCK_TENANT,
    assignedProjects: [],
  },
  {
    id: "user-hr-007",
    name: "Ramesh Patel",
    email: "ramesh.patel@dezoinfra.com",
    avatarInitials: "RP",
    role: CustomerRole.HR,
    title: "Head of Human Resources & Labor",
    department: "Human Resources",
    phone: "+91 98222 33445",
    tenant: MOCK_TENANT,
    assignedProjects: [],
  },
  {
    id: "user-employee-008",
    name: "Suresh Nair",
    email: "suresh.nair@dezoinfra.com",
    avatarInitials: "SN",
    role: CustomerRole.EMPLOYEE,
    title: "Junior Site Supervisor",
    department: "Site Operations",
    phone: "+91 98333 44556",
    tenant: MOCK_TENANT,
    assignedProjects: [
      { projectId: "proj-001", projectCode: "METRO-L4", projectName: "Metro Line 4 Elevated Viaduct", siteIds: ["site-01"], roleInProject: "Shift Supervisor" },
    ],
    activeProjectId: "proj-001",
  },
  {
    id: "user-viewer-009",
    name: "Ananya Roy",
    email: "ananya.roy@auditpartners.com",
    avatarInitials: "AR",
    role: CustomerRole.VIEWER,
    title: "Third-Party Compliance Auditor",
    department: "External QA Audit",
    phone: "+91 98444 55667",
    tenant: MOCK_TENANT,
    assignedProjects: [
      { projectId: "proj-001", projectCode: "METRO-L4", projectName: "Metro Line 4 Elevated Viaduct", siteIds: ["site-01"], roleInProject: "Auditor" },
    ],
  },
];

export const DEFAULT_MOCK_USER: CurrentUser = MOCK_USERS[0] as CurrentUser;
