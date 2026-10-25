import { DatabaseService } from "../../../database/database.service";
import { ConflictError, NotFoundError } from "../../../common/errors/app-error";
import { PasswordService } from "../../auth/services/password.service";
import { PlatformAuditService } from "./platform-audit.service";
import type { ProvisionTenantDto } from "../dto/platform.dto";

export interface ProvisionedTenantResult {
  id: string;
  code: string;
  name: string;
  domain: string | null;
  planTier: string;
  status: string;
  companyId: string;
  branchId: string;
  adminUser: {
    id: string;
    email: string;
    fullName: string;
  } | null;
  createdAt: string;
}

export class PlatformProvisioningService {
  private static instance: PlatformProvisioningService;
  private readonly prisma: any;
  private readonly passwordService: PasswordService;
  private readonly auditService: PlatformAuditService;

  constructor(prismaClient?: any) {
    this.prisma = prismaClient || DatabaseService.getInstance().getClient();
    this.passwordService = PasswordService.getInstance();
    this.auditService = PlatformAuditService.getInstance();
  }

  public static getInstance(prismaClient?: any): PlatformProvisioningService {
    if (!PlatformProvisioningService.instance || prismaClient) {
      PlatformProvisioningService.instance = new PlatformProvisioningService(prismaClient);
    }
    return PlatformProvisioningService.instance;
  }

  public static resetInstance(): void {
    PlatformProvisioningService.instance = undefined as unknown as PlatformProvisioningService;
  }

  /**
   * Atomically provisions a complete customer tenant workspace:
   * 1. Creates Tenant record
   * 2. Provisions default Trial Subscription
   * 3. Creates primary Company (Headquarters)
   * 4. Creates primary Branch (Main Office)
   * 5. If admin details provided, creates User with hashed password and assigns COMPANY_OWNER role
   * 6. Emits platform audit event
   * 
   * Strict Transaction Guarantee: Any failure rolls back all database mutations.
   */
  public async provisionTenant(
    dto: ProvisionTenantDto,
    actorId: string,
    clientIp?: string
  ): Promise<ProvisionedTenantResult> {
    const normalizedCode = dto.code.trim().toUpperCase();

    return this.prisma.$transaction(async (tx: any) => {
      // 1. Check uniqueness of Tenant code
      const existing = await tx.tenant.findUnique({
        where: { code: normalizedCode },
      });
      if (existing) {
        throw new ConflictError(`Tenant code '${normalizedCode}' is already registered.`);
      }

      if (dto.domain) {
        const normalizedDomain = dto.domain.toLowerCase().trim();
        const existingDomain = await tx.tenant.findUnique({
          where: { domain: normalizedDomain },
        });
        if (existingDomain) {
          throw new ConflictError(`Domain '${dto.domain}' is already assigned to another tenant.`);
        }
      }

      // 2. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          code: normalizedCode,
          name: dto.name.trim(),
          domain: dto.domain ? dto.domain.toLowerCase().trim() : null,
          status: "ACTIVE",
          planTier: dto.planTier,
          currency: dto.currency || "INR",
          currencySymbol: dto.currencySymbol || "₹",
          timezone: dto.timezone || "Asia/Kolkata",
        },
      });

      // 3. Provision Default Subscription pinned to published Plan Version
      const plan = await tx.platformPlan.findUnique({
        where: { code: dto.planTier },
        include: {
          versions: {
            where: { status: "PUBLISHED" },
            orderBy: { versionNumber: "desc" },
            take: 1,
          },
        },
      });

      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14-day trial
      const periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1-year period

      if (plan) {
        let planVersionId = plan.versions?.[0]?.id;
        if (!planVersionId) {
          const anyVersion = await tx.platformPlanVersion.findFirst({
            where: { planId: plan.id },
            orderBy: { versionNumber: "desc" },
          });
          planVersionId = anyVersion?.id;
        }

        await tx.tenantSubscription.create({
          data: {
            tenantId: tenant.id,
            planId: plan.id,
            planVersionId: planVersionId || null,
            status: "TRIAL",
            billingCycle: "ANNUAL",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            trialEndsAt,
            cancelAtPeriodEnd: false,
          },
        });
      }

      // 4. Create Primary Company (HQ)
      const company = await tx.company.create({
        data: {
          tenantId: tenant.id,
          code: "HQ",
          name: dto.name.trim(),
          legalName: dto.legalName?.trim() || dto.name.trim(),
          panNumber: "N/A",
          gstin: "N/A",
          email: dto.adminEmail?.trim().toLowerCase() || "admin@example.com",
          phone: "N/A",
          address: "Corporate Headquarters",
          city: "Metro",
          state: "State",
          pincode: "000000",
          status: "ACTIVE",
        },
      });

      // 5. Create Primary Branch (Main Office)
      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          companyId: company.id,
          code: "MAIN",
          name: "Main Office",
          gstin: "N/A",
          city: "Metro",
          state: "State",
          status: "ACTIVE",
        },
      });

      let createdUser = null;

      // 6. Create Initial User if Admin details provided
      if (dto.adminEmail) {
        const normalizedEmail = dto.adminEmail.trim().toLowerCase();
        const rawPassword = dto.adminPassword || "Welcome@Dezo2026!";
        const passwordHash = await this.passwordService.hashPassword(rawPassword);

        createdUser = await tx.user.create({
          data: {
            tenantId: tenant.id,
            email: normalizedEmail,
            fullName: dto.adminName?.trim() || "Organization Owner",
            passwordHash,
            status: "ACTIVE",
          },
        });

        // Find system role COMPANY_OWNER
        const ownerRole = await tx.role.findFirst({
          where: {
            name: "COMPANY_OWNER",
            OR: [{ tenantId: null, isSystemRole: true }, { tenantId: tenant.id }],
          },
        });

        if (ownerRole) {
          await tx.userRoleAssignment.create({
            data: {
              tenantId: tenant.id,
              userId: createdUser.id,
              roleId: ownerRole.id,
              scopeType: "TENANT",
              scopeId: null,
            },
          });
        }
      }

      // 7. Record platform audit event
      this.auditService.record({
        actorId,
        action: "TENANT_PROVISIONED",
        targetTenantId: tenant.id,
        targetTenantCode: tenant.code,
        details: {
          tenantId: tenant.id,
          code: tenant.code,
          name: tenant.name,
          planTier: tenant.planTier,
          companyId: company.id,
          branchId: branch.id,
          adminUserId: createdUser?.id || null,
        },
        ipAddress: clientIp || null,
      });

      return {
        id: tenant.id,
        code: tenant.code,
        name: tenant.name,
        domain: tenant.domain,
        planTier: tenant.planTier,
        status: tenant.status,
        companyId: company.id,
        branchId: branch.id,
        adminUser: createdUser
          ? {
              id: createdUser.id,
              email: createdUser.email,
              fullName: createdUser.fullName,
            }
          : null,
        createdAt: tenant.createdAt.toISOString(),
      };
    });
  }
}
