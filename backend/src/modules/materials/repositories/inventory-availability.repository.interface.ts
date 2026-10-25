import type {
  ListAvailabilityQueryDto,
  GetShortagesQueryDto,
  MaterialAvailabilityItem,
  Material360Availability,
  ProjectAvailabilityPosition,
  StoreAvailabilityPosition,
  MaterialShortageItem,
} from '../dto/inventory-availability.dto';

export interface IInventoryAvailabilityRepository {
  findAvailabilityList(
    tenantId: string,
    options: {
      allowedStoreIds?: string[];
      allowedProjectIds?: string[];
      filter?: ListAvailabilityQueryDto;
    }
  ): Promise<{ items: MaterialAvailabilityItem[]; total: number }>;

  getMaterial360(
    tenantId: string,
    materialId: string,
    allowedStoreIds?: string[],
    allowedProjectIds?: string[]
  ): Promise<Material360Availability | null>;

  getProjectAvailability(
    tenantId: string,
    projectId: string
  ): Promise<ProjectAvailabilityPosition | null>;

  getStoreAvailability(
    tenantId: string,
    storeId: string
  ): Promise<StoreAvailabilityPosition | null>;

  getShortages(
    tenantId: string,
    options: {
      allowedProjectIds?: string[];
      allowedStoreIds?: string[];
      filter?: GetShortagesQueryDto;
    }
  ): Promise<{ items: MaterialShortageItem[]; total: number }>;
}
