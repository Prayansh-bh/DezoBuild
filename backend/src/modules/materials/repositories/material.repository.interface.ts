import type { Material } from '@prisma/client';
import type { CreateMaterialDto, UpdateMaterialDto, ListMaterialQueryDto } from '../dto/material.dto';

export interface MaterialFilters extends ListMaterialQueryDto {}

export interface IMaterialRepository {
  findById(tenantId: string, id: string): Promise<Material | null>;
  findByItemCode(tenantId: string, itemCode: string): Promise<Material | null>;
  findMany(tenantId: string, filters: MaterialFilters): Promise<Material[]>;
  count(tenantId: string, filters: MaterialFilters): Promise<number>;
  create(tenantId: string, data: CreateMaterialDto): Promise<Material>;
  update(tenantId: string, id: string, data: UpdateMaterialDto): Promise<Material>;
}
