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

import type { CustomerRoleType, PlatformRoleType } from "@/authorization/roles";
import type { DomainPermissions } from "@/authorization/permissions";

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
  user: CurrentUser;
  availableUsers: CurrentUser[];
  switchUser: (userId: string) => void;
  switchRole: (role: CustomerRoleType) => void;
  isPlatformAdmin: boolean;
}
