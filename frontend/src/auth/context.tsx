/**
 * DEZOBUILD — Real Customer Authentication Context & Provider
 * 
 * Implements Single Responsibility Principle (SRP):
 * - Server-authoritative session hydration via GET /api/v1/auth/me
 * - Login & Token pair management (accessToken + refresh rotation)
 * - Centralized logout and session revocation
 * - Session restoration and 401 refresh handling
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CustomerRole, ROLE_DEFINITIONS, type CustomerRoleType } from "@/authorization/roles";
import { ANONYMOUS_USER, type AuthContextType, type CurrentUser, type TenantContext } from "./types";
import { authApi } from "@/lib/api/endpoints/auth";
import { apiClient } from "@/lib/api/client";
import type { AuthUser } from "@/lib/api/types";

const CurrentUserContext = createContext<AuthContextType | null>(null);

export function mapUserToCurrentUser(apiUser: AuthUser | any, fallbackUser?: CurrentUser): CurrentUser {
  const name = apiUser?.fullName || apiUser?.name || apiUser?.email || "DEZO User";
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .map((n: string) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "DU";

  const rawRole = apiUser?.role || (apiUser?.roles && apiUser.roles[0]) || fallbackUser?.role;
  const role: CustomerRoleType = (rawRole && Object.values(CustomerRole).includes(rawRole as CustomerRoleType))
    ? (rawRole as CustomerRoleType)
    : CustomerRole.VIEWER;

  const tenant: TenantContext = fallbackUser?.tenant || {
    id: apiUser?.tenantId || "ten-dezoinfra-001",
    name: apiUser?.tenantName || "DEZO Infra Projects Ltd",
    legalName: "DEZO Infrastructure & Construction Limited",
    code: apiUser?.tenantCode || "DEZO-IN",
    plan: (apiUser?.planTier as any) || "Enterprise Tier",
    activeSitesCount: 4,
    currency: "INR",
    currencySymbol: "₹",
  };

  const roleMeta = ROLE_DEFINITIONS[role] || ROLE_DEFINITIONS[CustomerRole.VIEWER];
  const defaultDepartment = 
    role === CustomerRole.COMPANY_OWNER ? "Executive Leadership" :
    role === CustomerRole.COMPANY_ADMIN ? "Administration & Compliance" :
    role === CustomerRole.PROJECT_MANAGER ? "Project Management" :
    role === CustomerRole.SITE_ENGINEER ? "Site Operations" :
    role === CustomerRole.ACCOUNTANT ? "Finance & Commercial" :
    role === CustomerRole.PROCUREMENT_STORE ? "Procurement & Stores" : "Operations";

  return {
    id: apiUser?.id || "",
    name,
    email: apiUser?.email || "",
    avatarInitials: initials,
    role,
    title: apiUser?.title || roleMeta.title || "Construction Professional",
    phone: apiUser?.phone || undefined,
    department: apiUser?.department || defaultDepartment,
    tenant,
    assignedProjects: apiUser?.assignedProjects || fallbackUser?.assignedProjects || [
      {
        projectId: "proj-001",
        projectCode: "PRJ-BLR-01",
        projectName: "Prestige Cyber Heights",
        siteIds: ["site-blr-01a", "site-blr-01b"],
        roleInProject: roleMeta.shortLabel ? `${roleMeta.shortLabel} Lead` : "Project Member",
      },
    ],
    activeProjectId: apiUser?.activeProjectId || fallbackUser?.activeProjectId || "proj-001",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Server-Authoritative Session Hydration on Mount
  const hydrateSession = useCallback(async (): Promise<boolean> => {
    const token = apiClient.getAuthToken();
    const refreshToken = apiClient.getRefreshToken();

    if (!token && !refreshToken) {
      setCurrentUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      return false;
    }

    try {
      const serverUser = await authApi.getMe();
      if (serverUser && serverUser.id) {
        const mapped = mapUserToCurrentUser(serverUser);
        setCurrentUser(mapped);
        setIsAuthenticated(true);
        setIsLoading(false);
        return true;
      }
    } catch {
      // If getMe fails, attempt refresh token rotation if available
      if (refreshToken) {
        try {
          const refreshedToken = await apiClient.refreshSession();
          if (refreshedToken) {
            const serverUser = await authApi.getMe();
            if (serverUser && serverUser.id) {
              const mapped = mapUserToCurrentUser(serverUser);
              setCurrentUser(mapped);
              setIsAuthenticated(true);
              setIsLoading(false);
              return true;
            }
          }
        } catch {
          // Refresh failed
        }
      }
    }

    // If session hydration failed completely, clean up
    apiClient.clearTokens();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setIsLoading(false);
    return false;
  }, []);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  const login = useCallback(async (credentials: { email: string; password: string }): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await authApi.login(credentials);
      if (res?.accessToken) {
        apiClient.setTokens(res.accessToken, (res as any).refreshToken);
      }

      let userProfile = (res as any).user;
      if (!userProfile) {
        userProfile = await authApi.getMe();
      }

      const mapped = mapUserToCurrentUser(userProfile);
      setCurrentUser(mapped);
      setIsAuthenticated(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors during logout
    } finally {
      apiClient.clearTokens();
      setCurrentUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async (): Promise<string | null> => {
    return apiClient.refreshSession();
  }, []);

  const value: AuthContextType = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      user: currentUser || ANONYMOUS_USER,
      login,
      logout,
      refreshSession,
      isPlatformAdmin: false,
    }),
    [isAuthenticated, isLoading, currentUser, login, logout, refreshSession]
  );

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}

// Backward compatibility alias for existing consumers
export const MockAuthProvider = AuthProvider;

export function useCurrentUser(): AuthContextType {
  const context = useContext(CurrentUserContext);
  if (!context) {
    throw new Error("useCurrentUser must be used within an AuthProvider");
  }
  return context;
}

export const useAuth = useCurrentUser;

