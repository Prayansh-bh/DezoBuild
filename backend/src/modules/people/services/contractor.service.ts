import { PrismaClient } from '@prisma/client';
import { NotFoundError, ConflictError } from '../../../common/errors/index.js';
import { PeopleRequestContext } from '../constants/people.constants.js';
import { CreateContractorDto, ListContractorsQueryDto } from '../dto/contractor.dto.js';
import { ContractorRepository } from '../repositories/contractor.repository.js';
import { PeopleAuditRepository } from '../repositories/people-audit.repository.js';

export class ContractorService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly contractorRepo: ContractorRepository,
    private readonly auditRepo: PeopleAuditRepository
  ) {}

  async createContractor(context: PeopleRequestContext, dto: CreateContractorDto) {
    const existing = await this.contractorRepo.findByCode(context.tenantId, dto.code);
    if (existing) {
      throw new ConflictError(`Labour contractor with code '${dto.code}' already exists`);
    }

    if (dto.vendorId) {
      const vendor = await this.prisma.vendor.findFirst({
        where: { id: dto.vendorId, tenantId: context.tenantId },
      });
      if (!vendor) {
        throw new NotFoundError(`Vendor '${dto.vendorId}' not found in tenant`);
      }
    }

    const contractor = await this.contractorRepo.create(context.tenantId, dto);

    await this.auditRepo.log({
      tenantId: context.tenantId,
      entityType: 'LABOUR_CONTRACTOR',
      entityId: contractor.id,
      action: 'CREATED',
      actorId: context.user.id,
      newState: contractor,
      ipAddress: context.ipAddress,
    });

    return contractor;
  }

  async getContractorById(context: PeopleRequestContext, id: string) {
    const contractor = await this.contractorRepo.findById(context.tenantId, id);
    if (!contractor) {
      throw new NotFoundError(`Labour contractor '${id}' not found`);
    }
    return contractor;
  }

  async listContractors(context: PeopleRequestContext, query: ListContractorsQueryDto) {
    return this.contractorRepo.list(context.tenantId, query);
  }
}
