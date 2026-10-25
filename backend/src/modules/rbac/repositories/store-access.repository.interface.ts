export interface StoreAccessAssignmentEntity {
  id: string;
  tenantId: string;
  storeId: string;
  userId: string;
  accessLevel: string;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    email: string;
    fullName: string;
  };
  store?: {
    id: string;
    code: string;
    name: string;
    isCentralWarehouse: boolean;
    projectId: string | null;
  };
}

export interface GrantStoreAccessParams {
  tenantId: string;
  storeId: string;
  userId: string;
  accessLevel?: string;
}

export interface IStoreAccessRepository {
  grantAccess(params: GrantStoreAccessParams): Promise<StoreAccessAssignmentEntity>;
  revokeAccess(tenantId: string, storeId: string, userId: string): Promise<boolean>;
  findAccess(tenantId: string, storeId: string, userId: string): Promise<StoreAccessAssignmentEntity | null>;
  findUserStores(tenantId: string, userId: string): Promise<StoreAccessAssignmentEntity[]>;
  findStoreUsers(tenantId: string, storeId: string): Promise<StoreAccessAssignmentEntity[]>;
  hasStoreAccess(tenantId: string, storeId: string, userId: string): Promise<boolean>;
}
