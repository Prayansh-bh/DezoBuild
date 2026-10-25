import type { PrismaClient } from "@prisma/client";
import type {
  IBranchRepository,
  BranchEntity,
  CreateBranchParams,
  UpdateBranchParams,
} from "./branch.repository.interface";
import { DatabaseService } from "../../../database/database.service";

export class PrismaBranchRepository implements IBranchRepository {
  private get prisma(): PrismaClient {
    return DatabaseService.getInstance().getClient();
  }

  public async findById(id: string, tenantId: string): Promise<BranchEntity | null> {
    const record = await this.prisma.branch.findFirst({
      where: { id, tenantId },
    });
    return record ? this.mapToEntity(record) : null;
  }

  public async findByCode(
    code: string,
    companyId: string,
    tenantId: string,
  ): Promise<BranchEntity | null> {
    const record = await this.prisma.branch.findFirst({
      where: {
        tenantId,
        companyId,
        code: { equals: code.trim().toUpperCase(), mode: "insensitive" },
      },
    });
    return record ? this.mapToEntity(record) : null;
  }

  public async findManyByTenant(tenantId: string, companyId?: string): Promise<BranchEntity[]> {
    const records = await this.prisma.branch.findMany({
      where: {
        tenantId,
        ...(companyId ? { companyId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return records.map((r: any) => this.mapToEntity(r));
  }

  public async create(params: CreateBranchParams): Promise<BranchEntity> {
    const record = await this.prisma.branch.create({
      data: {
        id: params.id,
        tenantId: params.tenantId,
        companyId: params.companyId,
        code: params.code.trim().toUpperCase(),
        name: params.name.trim(),
        gstin: params.gstin.trim().toUpperCase(),
        city: params.city.trim(),
        state: params.state.trim(),
        status: params.status || "ACTIVE",
      },
    });
    return this.mapToEntity(record);
  }

  public async update(
    id: string,
    tenantId: string,
    params: UpdateBranchParams,
  ): Promise<BranchEntity> {
    const record = await this.prisma.branch.update({
      where: {
        id,
        tenantId,
      },
      data: {
        name: params.name?.trim(),
        gstin: params.gstin ? params.gstin.trim().toUpperCase() : undefined,
        city: params.city?.trim(),
        state: params.state?.trim(),
        status: params.status,
      },
    });
    return this.mapToEntity(record);
  }

  public async delete(id: string, tenantId: string): Promise<void> {
    await this.prisma.branch.delete({
      where: {
        id,
        tenantId,
      },
    });
  }

  private mapToEntity(record: any): BranchEntity {
    return {
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      code: record.code,
      name: record.name,
      gstin: record.gstin,
      city: record.city,
      state: record.state,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
