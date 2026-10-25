/**
 * DEZOBUILD — Authentication & Identity Types
 * 
 * Development abstraction representing authenticated user state,
 * tenant context, and project/site assignments.
 * 
 * NOTE: This is a frontend architectural abstraction for development
 * and mock presentation. Production authentication (OIDC/SAML/OAuth2)
 * and server-side RBAC will connect to this contract in later phases.
 */

import { CustomerRole, type CustomerRoleType, type PlatformRoleType } from "@/authorization/roles";
import type { DomainPermissions } from "@/authorization/permissions";

export const ANONYMOUS_USER: CurrentUser = {
  id: "",
  name: "Guest",
  email: "",
  avatarInitials: "GU",
  role: CustomerRole.VIEWER,
  title: "Unauthenticated",
  tenant: {
    id: "",
    name: "DEZOBUILD",
    legalName: "DEZOBUILD Operating System",
    code: "DEZO",
    plan: "Standard",
    activeSitesCount: 0,
    currency: "INR",
    currencySymbol: "₹",
  },
  assignedProjects: [],
};

export interface TenantContext {
  id: string;
  name: string;
  legalName: string;
  code: string;
  plan: "Enterprise Tier" | "Professional" | "Standard";
  activeSitesCount: number;
  currency: string;
  currencySymbol: string;
}

export interface ProjectAssignment {
  projectId: string;
  projectCode: string;
  projectName: string;
  siteIds: string[];
  roleInProject: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  avatarInitials: string;
  role: CustomerRoleType;
  platformRole?: PlatformRoleType;
  title: string;
  phone?: string;
  department?: string;
  tenant: TenantContext;
  assignedProjects: ProjectAssignment[];
  activeProjectId?: string;
  customPermissions?: DomainPermissions;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: CurrentUser;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
  isPlatformAdmin: boolean;
}

