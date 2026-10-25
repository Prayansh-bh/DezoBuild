import type { Material } from '@prisma/client';
import { PrismaMaterialRepository } from '../repositories/prisma-material.repository';
import type { IMaterialRepository } from '../repositories/material.repository.interface';
import type {
  CreateMaterialDto,
  UpdateMaterialDto,
  ListMaterialQueryDto,
} from '../dto/material.dto';
import { NotFoundError, ConflictError } from '../../../common/errors/app-error';

export class MaterialService {
  private static instance: MaterialService;
  private readonly materialRepo: IMaterialRepository;

  constructor(materialRepo?: IMaterialRepository) {
    this.materialRepo = materialRepo || PrismaMaterialRepository.getInstance();
  }

  public static getInstance(): MaterialService {
    if (!MaterialService.instance) {
      MaterialService.instance = new MaterialService();
    }
    return MaterialService.instance;
  }

  public async listMaterials(
    tenantId: string,
    filters: ListMaterialQueryDto
  ): Promise<{ items: Material[]; total: number }> {
    const [items, total] = await Promise.all([
      this.materialRepo.findMany(tenantId, filters),
      this.materialRepo.count(tenantId, filters),
    ]);

    return { items, total };
  }

  public async getMaterialById(tenantId: string, id: string): Promise<Material> {
    const material = await this.materialRepo.findById(tenantId, id);
    if (!material) {
      throw new NotFoundError(`Material with ID ${id} not found in this tenant`);
    }
    return material;
  }

  public async createMaterial(
    tenantId: string,
    dto: CreateMaterialDto
  ): Promise<Material> {
    const existing = await this.materialRepo.findByItemCode(tenantId, dto.itemCode);
    if (existing) {
      throw new ConflictError(
        `Material with item code "${dto.itemCode}" already exists in this tenant`
      );
    }

    return this.materialRepo.create(tenantId, dto);
  }

  public async updateMaterial(
    tenantId: string,
    id: string,
    dto: UpdateMaterialDto
  ): Promise<Material> {
    const material = await this.materialRepo.findById(tenantId, id);
    if (!material) {
      throw new NotFoundError(`Material with ID ${id} not found in this tenant`);
    }

    return this.materialRepo.update(tenantId, id, dto);
  }
}
