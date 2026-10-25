import type { PrismaClient } from "@prisma/client";
import type {
  ITenantRepository,
  TenantEntity,
  CreateTenantParams,
  UpdateTenantParams,
} from "./tenant.repository.interface";
import { DatabaseService } from "../../../database/database.service";

export class PrismaTenantRepository implements ITenantRepository {
  private get prisma(): PrismaClient {
    return DatabaseService.getInstance().getClient();
  }

  public async findById(id: string): Promise<TenantEntity | null> {
    const record = await this.prisma.tenant.findUnique({
      where: { id },
    });
    return record ? this.mapToEntity(record) : null;
  }

  public async findByCode(code: string): Promise<TenantEntity | null> {
    const record = await this.prisma.tenant.findUnique({
      where: { code },
    });
    return record ? this.mapToEntity(record) : null;
  }

  public async create(params: CreateTenantParams): Promise<TenantEntity> {
    const record = await this.prisma.tenant.create({
      data: {
        id: params.id,
        code: params.code.trim().toUpperCase(),
        name: params.name.trim(),
        domain: params.domain?.trim() || null,
        planTier: params.planTier || "ENTERPRISE",
        currency: params.currency || "INR",
        currencySymbol: params.currencySymbol || "₹",
        timezone: params.timezone || "Asia/Kolkata",
      },
    });
    return this.mapToEntity(record);
  }

  public async update(id: string, params: UpdateTenantParams): Promise<TenantEntity> {
    const record = await this.prisma.tenant.update({
      where: { id },
      data: {
        name: params.name?.trim(),
        domain: params.domain?.trim() || null,
        status: params.status,
        currency: params.currency,
        currencySymbol: params.currencySymbol,
        timezone: params.timezone,
      },
    });
    return this.mapToEntity(record);
  }

  public async softDelete(id: string): Promise<void> {
    await this.prisma.tenant.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "SUSPENDED",
      },
    });
  }

  private mapToEntity(record: any): TenantEntity {
    return {
      id: record.id,
      code: record.code,
      name: record.name,
      domain: record.domain,
      status: record.status,
      planTier: record.planTier,
      currency: record.currency,
      currencySymbol: record.currencySymbol,
      timezone: record.timezone,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    };
  }
}
