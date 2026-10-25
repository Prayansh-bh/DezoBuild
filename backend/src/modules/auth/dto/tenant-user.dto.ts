export interface TenantUserRoleDto {
  id: string;
  name: string;
  displayName: string;
  scopeType: string;
}

export interface TenantUserInvitationDto {
  id: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface TenantUserDto {
  id: string;
  email: string;
  fullName: string;
  status: string;
  primaryRole: string;
  roleDisplayName: string;
  roles: TenantUserRoleDto[];
  department: string | null;
  assignedSite: string | null;
  invitation: TenantUserInvitationDto | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface ListTenantUsersResponseData {
  users: TenantUserDto[];
  total: number;
}
