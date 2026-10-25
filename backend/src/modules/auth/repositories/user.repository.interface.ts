export interface UserEntity {
  id: string;
  tenantId: string;
  email: string;
  phone?: string | null | undefined;
  fullName: string;
  passwordHash: string;
  status: "ACTIVE" | "SUSPENDED" | "INVITED";
  sessionVersion: number;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | null | undefined;
  role?: string | undefined;
  roles?: string[] | undefined;
  tenantName?: string | undefined;
  tenantCode?: string | undefined;
  planTier?: string | undefined;
}

export type CreateUserParams = {
  id?: string | undefined;
  tenantId: string;
  email: string;
  phone?: string | null | undefined;
  fullName: string;
  passwordHash: string;
  status?: "ACTIVE" | "SUSPENDED" | "INVITED" | undefined;
  sessionVersion?: number | undefined;
};

export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string, tenantId?: string): Promise<UserEntity | null>;
  create(params: CreateUserParams, tx?: any): Promise<UserEntity>;
  updateLastLogin(id: string): Promise<void>;
  incrementSessionVersion(id: string): Promise<number>;
  updateStatus(id: string, status: "ACTIVE" | "SUSPENDED" | "INVITED", tx?: any): Promise<void>;
  findTenantUsers(tenantId: string, limit?: number): Promise<TenantUserRecord[]>;
}

export interface TenantUserRoleAssignmentRecord {
  id: string;
  scopeType: string;
  scopeId: string | null;
  role: {
    id: string;
    name: string;
    displayName: string;
  };
}

export interface TenantUserInvitationRecord {
  id: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface TenantUserRecord {
  id: string;
  email: string;
  fullName: string;
  status: string;
  createdAt: Date;
  lastLoginAt: Date | null;
  roleAssignments: TenantUserRoleAssignmentRecord[];
  invitations: TenantUserInvitationRecord[];
  employee: {
    department: {
      name: string;
    } | null;
  } | null;
  projectMembers: {
    project: {
      name: string;
    };
  }[];
}
