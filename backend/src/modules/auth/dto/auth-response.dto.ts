export interface SafeUser {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  status: "ACTIVE" | "SUSPENDED" | "INVITED";
  createdAt: string;
  lastLoginAt?: string | null | undefined;
  role?: string | undefined;
  roles?: string[] | undefined;
  tenantName?: string | undefined;
  tenantCode?: string | undefined;
  planTier?: string | undefined;
}

export interface LoginResponseData {
  accessToken: string;
  expiresIn: number;
  tokenType: "Bearer";
  user: SafeUser;
}

export interface RefreshResponseData {
  accessToken: string;
  expiresIn: number;
  tokenType: "Bearer";
}

export interface LogoutResponseData {
  message: string;
}
