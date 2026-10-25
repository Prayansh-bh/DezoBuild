import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type {
  PlatformAdminUser,
  PlatformAuthCredentials,
  PlatformAuthContextType,
} from "./types";
import { platformAuthApi } from "../lib/api/auth";

const PlatformAuthContext = createContext<PlatformAuthContextType | null>(null);

export interface PlatformAuthProviderProps {
  children: ReactNode;
}

export function PlatformAuthProvider({ children }: PlatformAuthProviderProps) {
  const [user, setUser] = useState<PlatformAdminUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshSession = useCallback(async (): Promise<PlatformAdminUser | null> => {
    try {
      const currentUser = await platformAuthApi.getMe();
      setUser(currentUser);
      setError(null);
      return currentUser;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  // Hydrate platform session on initial mount
  useEffect(() => {
    let isMounted = true;

    async function initPlatformSession() {
      setIsLoading(true);
      try {
        const currentUser = await platformAuthApi.getMe();
        if (isMounted) {
          setUser(currentUser);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initPlatformSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(
    async (credentials: PlatformAuthCredentials): Promise<PlatformAdminUser> => {
      setIsLoading(true);
      setError(null);
      try {
        const authenticatedUser = await platformAuthApi.login(
          credentials.email.trim(),
          credentials.password
        );
        setUser(authenticatedUser);
        return authenticatedUser;
      } catch (err: any) {
        setUser(null);
        const errorMessage =
          err?.message && !err.message.includes("status 500")
            ? err.message
            : "Invalid platform administrator credentials. Access to owner governance console is restricted.";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await platformAuthApi.logout();
    } finally {
      setUser(null);
      setError(null);
      setIsLoading(false);
    }
  }, []);

  const contextValue: PlatformAuthContextType = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    error,
    login,
    logout,
    refreshSession,
    clearError,
  };

  return (
    <PlatformAuthContext.Provider value={contextValue}>
      {children}
    </PlatformAuthContext.Provider>
  );
}

export function usePlatformAuth(): PlatformAuthContextType {
  const context = useContext(PlatformAuthContext);
  if (!context) {
    throw new Error(
      "usePlatformAuth must be used within a <PlatformAuthProvider>"
    );
  }
  return context;
}
