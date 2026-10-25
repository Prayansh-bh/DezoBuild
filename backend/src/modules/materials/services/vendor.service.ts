import type { Vendor } from '@prisma/client';
import { PrismaVendorRepository } from '../repositories/prisma-vendor.repository';
import type { IVendorRepository } from '../repositories/vendor.repository.interface';
import type {
  CreateVendorDto,
  UpdateVendorDto,
  ListVendorQueryDto,
} from '../dto/vendor.dto';
import { NotFoundError, ConflictError } from '../../../common/errors/app-error';

export class VendorService {
  private static instance: VendorService;
  private readonly vendorRepo: IVendorRepository;

  constructor(vendorRepo?: IVendorRepository) {
    this.vendorRepo = vendorRepo || PrismaVendorRepository.getInstance();
  }

  public static getInstance(): VendorService {
    if (!VendorService.instance) {
      VendorService.instance = new VendorService();
    }
    return VendorService.instance;
  }

  public async listVendors(
    tenantId: string,
    filters: ListVendorQueryDto
  ): Promise<{ items: Vendor[]; total: number }> {
    const [items, total] = await Promise.all([
      this.vendorRepo.findMany(tenantId, filters),
      this.vendorRepo.count(tenantId, filters),
    ]);

    return { items, total };
  }

  public async getVendorById(tenantId: string, id: string): Promise<Vendor> {
    const vendor = await this.vendorRepo.findById(tenantId, id);
    if (!vendor) {
      throw new NotFoundError(`Vendor with ID ${id} not found in this tenant`);
    }
    return vendor;
  }

  public async createVendor(
    tenantId: string,
    dto: CreateVendorDto
  ): Promise<Vendor> {
    const existing = await this.vendorRepo.findByCode(tenantId, dto.code);
    if (existing) {
      throw new ConflictError(
        `Vendor with code "${dto.code}" already exists in this tenant`
      );
    }

    return this.vendorRepo.create(tenantId, dto);
  }

  public async updateVendor(
    tenantId: string,
    id: string,
    dto: UpdateVendorDto
  ): Promise<Vendor> {
    const vendor = await this.vendorRepo.findById(tenantId, id);
    if (!vendor) {
      throw new NotFoundError(`Vendor with ID ${id} not found in this tenant`);
    }

    return this.vendorRepo.update(tenantId, id, dto);
  }
}
