import type { Vendor } from '@prisma/client';
import type { CreateVendorDto, UpdateVendorDto, ListVendorQueryDto } from '../dto/vendor.dto';

export interface VendorFilters extends ListVendorQueryDto {}

export interface IVendorRepository {
  findById(tenantId: string, id: string): Promise<Vendor | null>;
  findByCode(tenantId: string, code: string): Promise<Vendor | null>;
  findMany(tenantId: string, filters: VendorFilters): Promise<Vendor[]>;
  count(tenantId: string, filters: VendorFilters): Promise<number>;
  create(tenantId: string, data: CreateVendorDto): Promise<Vendor>;
  update(tenantId: string, id: string, data: UpdateVendorDto): Promise<Vendor>;
}
