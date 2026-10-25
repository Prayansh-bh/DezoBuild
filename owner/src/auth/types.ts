export interface PlatformAdminUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export interface PlatformAuthCredentials {
  email: string;
  password: string;
}

export interface PlatformAuthContextType {
  user: PlatformAdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: PlatformAuthCredentials) => Promise<PlatformAdminUser>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<PlatformAdminUser | null>;
  clearError: () => void;
}
