import type { PrismaClient } from "@prisma/client";
import type {
  ICompanyRepository,
  CompanyEntity,
  CreateCompanyParams,
  UpdateCompanyParams,
} from "./company.repository.interface";
import { DatabaseService } from "../../../database/database.service";

export class PrismaCompanyRepository implements ICompanyRepository {
  private get prisma(): PrismaClient {
    return DatabaseService.getInstance().getClient();
  }

  public async findById(id: string, tenantId: string): Promise<CompanyEntity | null> {
    const record = await this.prisma.company.findFirst({
      where: { id, tenantId },
    });
    return record ? this.mapToEntity(record) : null;
  }

  public async findByCode(code: string, tenantId: string): Promise<CompanyEntity | null> {
    const record = await this.prisma.company.findFirst({
      where: {
        tenantId,
        code: { equals: code.trim().toUpperCase(), mode: "insensitive" },
      },
    });
    return record ? this.mapToEntity(record) : null;
  }

  public async findManyByTenant(tenantId: string): Promise<CompanyEntity[]> {
    const records = await this.prisma.company.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    return records.map((r: any) => this.mapToEntity(r));
  }

  public async create(params: CreateCompanyParams): Promise<CompanyEntity> {
    const record = await this.prisma.company.create({
      data: {
        id: params.id,
        tenantId: params.tenantId,
        code: params.code.trim().toUpperCase(),
        name: params.name.trim(),
        legalName: params.legalName.trim(),
        cinNumber: params.cinNumber?.trim() || null,
        panNumber: params.panNumber.trim().toUpperCase(),
        gstin: params.gstin.trim().toUpperCase(),
        email: params.email.trim().toLowerCase(),
        phone: params.phone.trim(),
        address: params.address.trim(),
        city: params.city.trim(),
        state: params.state.trim(),
        pincode: params.pincode.trim(),
        status: params.status || "ACTIVE",
      },
    });
    return this.mapToEntity(record);
  }

  public async update(
    id: string,
    tenantId: string,
    params: UpdateCompanyParams,
  ): Promise<CompanyEntity> {
    const record = await this.prisma.company.update({
      where: {
        id,
        tenantId,
      },
      data: {
        name: params.name?.trim(),
        legalName: params.legalName?.trim(),
        cinNumber: params.cinNumber?.trim() || null,
        panNumber: params.panNumber ? params.panNumber.trim().toUpperCase() : undefined,
        gstin: params.gstin ? params.gstin.trim().toUpperCase() : undefined,
        email: params.email ? params.email.trim().toLowerCase() : undefined,
        phone: params.phone?.trim(),
        address: params.address?.trim(),
        city: params.city?.trim(),
        state: params.state?.trim(),
        pincode: params.pincode?.trim(),
        status: params.status,
      },
    });
    return this.mapToEntity(record);
  }

  public async delete(id: string, tenantId: string): Promise<void> {
    await this.prisma.company.delete({
      where: {
        id,
        tenantId,
      },
    });
  }

  private mapToEntity(record: any): CompanyEntity {
    return {
      id: record.id,
      tenantId: record.tenantId,
      code: record.code,
      name: record.name,
      legalName: record.legalName,
      cinNumber: record.cinNumber,
      panNumber: record.panNumber,
      gstin: record.gstin,
      email: record.email,
      phone: record.phone,
      address: record.address,
      city: record.city,
      state: record.state,
      pincode: record.pincode,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
