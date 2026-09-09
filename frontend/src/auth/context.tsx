/**
 * DEZOBUILD — Current User & Auth Context
 * 
 * Development abstraction for managing current authenticated user,
 * active customer role, tenant scope, and mock role switching.
 * 
 * In production, this context will be hydrated from the real Auth provider
 * (OIDC/SAML/OAuth2) session and server-side user/permissions response.
 */

import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { CustomerRole, type CustomerRoleType } from "@/authorization/roles";
import { DEFAULT_MOCK_USER, MOCK_USERS } from "./mock-users";
import type { AuthContextType, CurrentUser } from "./types";

const CurrentUserContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "dezobuild_active_mock_user_id";

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser>(() => {
    if (typeof window !== "undefined") {
      const storedId = localStorage.getItem(STORAGE_KEY);
      if (storedId) {
        const found = MOCK_USERS.find((u) => u.id === storedId);
        if (found) return found;
      }
    }
    return DEFAULT_MOCK_USER;
  });

  const switchUser = (userId: string) => {
    const target = MOCK_USERS.find((u) => u.id === userId);
    if (target) {
      setCurrentUser(target);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, target.id);
      }
    }
  };

  const switchRole = (role: CustomerRoleType) => {
    const target = MOCK_USERS.find((u) => u.role === role);
    if (target) {
      setCurrentUser(target);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, target.id);
      }
    } else {
      // Fallback: update current user role directly
      setCurrentUser((prev) => ({
        ...prev,
        role,
      }));
    }
  };

  const value: AuthContextType = {
    isAuthenticated: true,
    user: currentUser,
    availableUsers: MOCK_USERS,
    switchUser,
    switchRole,
    isPlatformAdmin: false, // Platform Admin operates on owner.dezobuild.com
  };

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): AuthContextType {
  const context = useContext(CurrentUserContext);
  if (!context) {
    throw new Error("useCurrentUser must be used within a MockAuthProvider");
  }
  return context;
}
