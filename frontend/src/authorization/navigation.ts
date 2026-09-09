/**
 * DEZOBUILD — Authoritative Role-Aware Navigation Resolver
 * 
 * Centralized resolver that computes the navigation tree based on
 * authenticated User, Role, Permissions, Tenant, and Project/Site context.
 */

import {
  Bell,
  Boxes,
  Building2,
  FileBarChart,
  FileText,
  LayoutDashboard,
  Settings,
  Truck,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { CustomerRole, type CustomerRoleType } from "./roles";
import { hasPermission, type DomainPermissions } from "./permissions";

export interface NavItemConfig {
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
  badgeKey?: string | undefined;
  domainId: string;
  description?: string | undefined;
}

export interface NavigationResolutionParams {
  role: CustomerRoleType;
  permissions?: DomainPermissions | undefined;
  tenantId?: string | undefined;
  projectAssignments?: string[] | undefined;
  siteAssignments?: string[] | undefined;
}

export interface ResolvedNavigation {
  primaryItems: NavItemConfig[];
  settingsItem: NavItemConfig | null;
  activeRole: CustomerRoleType;
  totalVisible: number;
}

// Canonical Nav Items with authoritative terminology
export const CANONICAL_NAV_ITEMS = {
  DASHBOARD: {
    id: "dashboard",
    label: "Executive Overview",
    to: "/",
    icon: LayoutDashboard,
    domainId: "dashboard",
  },
  PROJECTS: {
    id: "projects",
    label: "Projects",
    to: "/projects",
    icon: Building2,
    domainId: "projects",
  },
  PROCUREMENT_STORE: {
    id: "procurement_store",
    label: "Procurement & Store",
    to: "/materials",
    icon: Boxes,
    domainId: "procurement_store",
  },
  FINANCE_COMMERCIAL: {
    id: "finance_commercial",
    label: "Finance & Commercial",
    to: "/finance",
    icon: WalletCards,
    domainId: "finance_commercial",
  },
  PEOPLE_HR: {
    id: "people_hr",
    label: "People & HR",
    to: "/people",
    icon: Users,
    domainId: "people_hr",
  },
  PLANT_EQUIPMENT: {
    id: "plant_equipment",
    label: "Plant & Equipment",
    to: "/equipment",
    icon: Truck,
    domainId: "plant_equipment",
  },
  ISSUES_ALERTS: {
    id: "issues_alerts",
    label: "Issues & Alerts",
    to: "/alerts",
    icon: Bell,
    badgeKey: "alerts",
    domainId: "issues_alerts",
  },
  ANALYTICS_REPORTS: {
    id: "analytics_reports",
    label: "Analytics & Reports",
    to: "/reports",
    icon: FileBarChart,
    domainId: "analytics_reports",
  },
  DOCUMENTS_DRAWINGS: {
    id: "documents_drawings",
    label: "Documents & Drawings",
    to: "/documents",
    icon: FileText,
    domainId: "documents_drawings",
  },
  ADMINISTRATION: {
    id: "administration",
    label: "Administration",
    to: "/settings",
    icon: Settings,
    domainId: "administration",
  },
} satisfies Record<string, NavItemConfig>;

export type CanonicalNavKey = keyof typeof CANONICAL_NAV_ITEMS;

/**
 * Authoritative Role-based navigation order priority maps (Section 14)
 */
const ROLE_NAV_PROJECTIONS: Record<CustomerRoleType, CanonicalNavKey[]> = {
  COMPANY_OWNER: [
    "DASHBOARD",
    "PROJECTS",
    "FINANCE_COMMERCIAL",
    "PROCUREMENT_STORE",
    "PEOPLE_HR",
    "PLANT_EQUIPMENT",
    "ISSUES_ALERTS",
    "ANALYTICS_REPORTS",
    "DOCUMENTS_DRAWINGS",
  ],
  COMPANY_ADMIN: [
    "DASHBOARD",
    "PROJECTS",
    "FINANCE_COMMERCIAL",
    "PROCUREMENT_STORE",
    "PEOPLE_HR",
    "PLANT_EQUIPMENT",
    "ISSUES_ALERTS",
    "ANALYTICS_REPORTS",
    "DOCUMENTS_DRAWINGS",
  ],
  PROJECT_MANAGER: [
    "DASHBOARD",
    "PROJECTS",
    "FINANCE_COMMERCIAL",
    "PROCUREMENT_STORE",
    "PEOPLE_HR",
    "PLANT_EQUIPMENT",
    "ISSUES_ALERTS",
    "ANALYTICS_REPORTS",
    "DOCUMENTS_DRAWINGS",
  ],
  SITE_ENGINEER: [
    "DASHBOARD",
    "PROJECTS",
    "PROCUREMENT_STORE",
    "PEOPLE_HR",
    "PLANT_EQUIPMENT",
    "ISSUES_ALERTS",
    "DOCUMENTS_DRAWINGS",
  ],
  PROCUREMENT_STORE: [
    "DASHBOARD",
    "PROJECTS",
    "PROCUREMENT_STORE",
    "ISSUES_ALERTS",
    "DOCUMENTS_DRAWINGS",
    "ANALYTICS_REPORTS",
  ],
  ACCOUNTANT: [
    "DASHBOARD",
    "FINANCE_COMMERCIAL",
    "PROJECTS",
    "PROCUREMENT_STORE",
    "ISSUES_ALERTS",
    "ANALYTICS_REPORTS",
    "DOCUMENTS_DRAWINGS",
  ],
  HR: [
    "DASHBOARD",
    "PEOPLE_HR",
    "PROJECTS",
    "ISSUES_ALERTS",
    "DOCUMENTS_DRAWINGS",
    "ANALYTICS_REPORTS",
  ],
  EMPLOYEE: [
    "DASHBOARD",
    "PROJECTS",
    "PEOPLE_HR",
    "DOCUMENTS_DRAWINGS",
  ],
  VIEWER: [
    "DASHBOARD",
    "PROJECTS",
    "ANALYTICS_REPORTS",
    "DOCUMENTS_DRAWINGS",
  ],
};

/**
 * Role-tailored label mapper for contextual navigation
 */
function getRoleSpecificLabel(role: CustomerRoleType, key: CanonicalNavKey, defaultLabel: string): string {
  if (role === CustomerRole.EMPLOYEE) {
    switch (key) {
      case "DASHBOARD":
        return "My Workspace";
      case "PROJECTS":
        return "My Tasks";
      case "PEOPLE_HR":
        return "My Attendance";
      case "DOCUMENTS_DRAWINGS":
        return "My Documents";
      default:
        return defaultLabel;
    }
  }

  if (key === "DASHBOARD") {
    switch (role) {
      case CustomerRole.COMPANY_OWNER:
      case CustomerRole.COMPANY_ADMIN:
        return "Executive Overview";
      case CustomerRole.PROJECT_MANAGER:
        return "Project Overview";
      case CustomerRole.SITE_ENGINEER:
        return "Site Overview";
      case CustomerRole.PROCUREMENT_STORE:
        return "Store Overview";
      case CustomerRole.ACCOUNTANT:
        return "Finance Overview";
      case CustomerRole.HR:
        return "HR Overview";
      case CustomerRole.VIEWER:
        return "Read-Only Overview";
      default:
        return "Overview";
    }
  }

  return defaultLabel;
}

/**
 * Authoritative Navigation Resolver
 */
export function resolveNavigation(params: NavigationResolutionParams): ResolvedNavigation {
  const { role, permissions } = params;
  const navKeys = ROLE_NAV_PROJECTIONS[role] ?? ROLE_NAV_PROJECTIONS.COMPANY_OWNER;

  const primaryItems: NavItemConfig[] = [];

  for (const key of navKeys) {
    const item = CANONICAL_NAV_ITEMS[key];
    if (!item) continue;

    const contextualLabel = getRoleSpecificLabel(role, key, item.label);

    if (item.domainId === "dashboard") {
      primaryItems.push({
        id: item.id,
        label: contextualLabel,
        to: item.to,
        icon: item.icon,
        domainId: item.domainId,
      });
      continue;
    }

    if (hasPermission(role, item.domainId, "view", permissions)) {
      primaryItems.push({
        id: item.id,
        label: contextualLabel,
        to: item.to,
        icon: item.icon,
        badgeKey: "badgeKey" in item ? item.badgeKey : undefined,
        domainId: item.domainId,
      });
    }
  }

  // Determine if administration/settings is visible (only COMPANY_OWNER and COMPANY_ADMIN by default)
  const canAccessAdmin = hasPermission(role, "administration", "view", permissions);
  const adminItem = CANONICAL_NAV_ITEMS.ADMINISTRATION;
  const settingsItem: NavItemConfig | null =
    canAccessAdmin && adminItem
      ? {
          id: adminItem.id,
          label: "Administration",
          to: adminItem.to,
          icon: adminItem.icon,
          domainId: "administration",
        }
      : null;

  return {
    primaryItems,
    settingsItem,
    activeRole: role,
    totalVisible: primaryItems.length + (settingsItem ? 1 : 0),
  };
}
