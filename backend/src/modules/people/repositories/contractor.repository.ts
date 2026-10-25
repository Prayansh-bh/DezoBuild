import { PrismaClient, Prisma } from '@prisma/client';
import { CreateContractorDto, ListContractorsQueryDto } from '../dto/contractor.dto.js';

export class ContractorRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(tenantId: string, dto: CreateContractorDto, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.labourContractor.create({
      data: {
        tenantId,
        vendorId: dto.vendorId ?? undefined,
        code: dto.code,
        name: dto.name,
        trade: dto.trade,
        contactPerson: dto.contactPerson ?? undefined,
        phone: dto.phone ?? undefined,
        defaultDailyWageRate: new Prisma.Decimal(dto.defaultDailyWageRate ?? 0),
        status: dto.status ?? 'ACTIVE',
      },
      include: {
        vendor: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async findById(tenantId: string, id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.labourContractor.findFirst({
      where: { id, tenantId },
      include: {
        vendor: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async findByCode(tenantId: string, code: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.labourContractor.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code,
        },
      },
      include: {
        vendor: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async list(tenantId: string, query: ListContractorsQueryDto) {
    const where: Prisma.LabourContractorWhereInput = {
      tenantId,
      ...(query.status && { status: query.status }),
      ...(query.trade && { trade: { contains: query.trade, mode: 'insensitive' } }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { code: { contains: query.search, mode: 'insensitive' } },
          { trade: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.labourContractor.findMany({
        where,
        take: query.limit,
        skip: query.offset,
        orderBy: { code: 'asc' },
        include: {
          vendor: { select: { id: true, name: true, code: true } },
        },
      }),
      this.prisma.labourContractor.count({ where }),
    ]);

    return { items, total, limit: query.limit, offset: query.offset };
  }
}
