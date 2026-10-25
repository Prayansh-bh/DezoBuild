import type { PrismaClient, Vendor, Prisma } from '@prisma/client';
import { DatabaseService } from '../../../database/database.service';
import type {
  IVendorRepository,
  VendorFilters,
} from './vendor.repository.interface';
import type { CreateVendorDto, UpdateVendorDto } from '../dto/vendor.dto';

export class PrismaVendorRepository implements IVendorRepository {
  private static instance: PrismaVendorRepository;
  private readonly prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || DatabaseService.getInstance().getClient();
  }

  public static getInstance(): PrismaVendorRepository {
    if (!PrismaVendorRepository.instance) {
      PrismaVendorRepository.instance = new PrismaVendorRepository();
    }
    return PrismaVendorRepository.instance;
  }

  public async findById(tenantId: string, id: string): Promise<Vendor | null> {
    return this.prisma.vendor.findFirst({
      where: {
        id,
        tenantId,
      },
    });
  }

  public async findByCode(tenantId: string, code: string): Promise<Vendor | null> {
    return this.prisma.vendor.findFirst({
      where: {
        tenantId,
        code: code.trim().toUpperCase(),
      },
    });
  }

  public async findMany(tenantId: string, filters: VendorFilters): Promise<Vendor[]> {
    const where = this.buildWhereClause(tenantId, filters);
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    return this.prisma.vendor.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  public async count(tenantId: string, filters: VendorFilters): Promise<number> {
    const where = this.buildWhereClause(tenantId, filters);
    return this.prisma.vendor.count({ where });
  }

  public async create(tenantId: string, data: CreateVendorDto): Promise<Vendor> {
    return this.prisma.vendor.create({
      data: {
        tenantId,
        code: data.code,
        name: data.name,
        gstin: data.gstin ?? null,
        pan: data.pan ?? null,
        contactPerson: data.contactPerson ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
        paymentTerms: data.paymentTerms ?? null,
        status: data.status ?? 'ACTIVE',
      },
    });
  }

  public async update(tenantId: string, id: string, data: UpdateVendorDto): Promise<Vendor> {
    const updateData: Prisma.VendorUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.gstin !== undefined) updateData.gstin = data.gstin;
    if (data.pan !== undefined) updateData.pan = data.pan;
    if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.paymentTerms !== undefined) updateData.paymentTerms = data.paymentTerms;
    if (data.status !== undefined) updateData.status = data.status;

    return this.prisma.vendor.update({
      where: {
        id,
      },
      data: updateData,
    });
  }

  private buildWhereClause(tenantId: string, filters: VendorFilters): Prisma.VendorWhereInput {
    const where: Prisma.VendorWhereInput = {
      tenantId,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
        { contactPerson: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }
}
