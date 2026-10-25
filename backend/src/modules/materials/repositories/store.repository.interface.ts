import type { Store, Project } from '@prisma/client';
import type { CreateStoreDto, UpdateStoreDto, ListStoreQueryDto } from '../dto/store.dto';

export type StoreWithRelations = Store & {
  project?: Project | null;
};

export interface StoreFilters extends ListStoreQueryDto {}

export interface IStoreRepository {
  findById(tenantId: string, storeId: string): Promise<StoreWithRelations | null>;
  findByCode(tenantId: string, code: string): Promise<Store | null>;
  findMany(tenantId: string, filters: StoreFilters, allowedStoreIds?: string[]): Promise<StoreWithRelations[]>;
  count(tenantId: string, filters: StoreFilters, allowedStoreIds?: string[]): Promise<number>;
  create(tenantId: string, data: CreateStoreDto): Promise<StoreWithRelations>;
  update(tenantId: string, storeId: string, data: UpdateStoreDto): Promise<StoreWithRelations>;
}
