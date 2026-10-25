import crypto from "node:crypto";
import { logger } from "../../../common/logging/logger";
import { DatabaseService } from "../../../database/database.service";

export type PlatformAuditAction =
  | "PLATFORM_LOGIN"
  | "PLATFORM_LOGOUT"
  | "TENANT_PROVISIONED"
  | "ENTITLEMENT_OVERRIDDEN"
  | "PLAN_CHANGED"
  | "TENANT_STATUS_UPDATED"
  | "PLAN_CREATED"
  | "PLAN_DRAFT_CREATED"
  | "PLAN_DRAFT_UPDATED"
  | "PLAN_PUBLISHED";

export interface PlatformAuditEvent {
  id: string;
  timestamp: string;
  actorId: string;
  action: PlatformAuditAction;
  targetTenantId?: string | null;
  targetTenantCode?: string | null;
  targetPlanId?: string | null;
  targetPlanCode?: string | null;
  details: Record<string, unknown>;
  ipAddress?: string | null;
}

export class PlatformAuditService {
  private static instance: PlatformAuditService;
  private readonly events: PlatformAuditEvent[] = [];
  private readonly maxEvents = 1000;
  private readonly prisma: any;

  constructor(prismaClient?: any) {
    this.prisma = prismaClient || DatabaseService.getInstance().getClient();
  }

  public static getInstance(prismaClient?: any): PlatformAuditService {
    if (!PlatformAuditService.instance || prismaClient) {
      PlatformAuditService.instance = new PlatformAuditService(prismaClient);
    }
    return PlatformAuditService.instance;
  }

  public static resetInstance(): void {
    PlatformAuditService.instance = undefined as unknown as PlatformAuditService;
  }

  public record(event: Omit<PlatformAuditEvent, "id" | "timestamp">): PlatformAuditEvent {
    // Sanitize any sensitive keys before logging/storing
    const sanitizedDetails: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(event.details || {})) {
      if (
        key.toLowerCase().includes("password") ||
        key.toLowerCase().includes("secret") ||
        key.toLowerCase().includes("token") ||
        key.toLowerCase().includes("hash")
      ) {
        sanitizedDetails[key] = "[REDACTED]";
      } else {
        sanitizedDetails[key] = value;
      }
    }

    const fullEvent: PlatformAuditEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...event,
      details: sanitizedDetails,
    };

    this.events.unshift(fullEvent);
    if (this.events.length > this.maxEvents) {
      this.events.pop();
    }

    logger.info(`[PLATFORM_AUDIT] ${fullEvent.action}`, {
      actorId: fullEvent.actorId,
      targetTenantId: fullEvent.targetTenantId,
      targetPlanCode: fullEvent.targetPlanCode,
      details: fullEvent.details,
    });

    // Asynchronously persist to PostgreSQL platform_audit_logs table
    try {
      if (this.prisma?.platformAuditLog) {
        this.prisma.platformAuditLog
          .create({
            data: {
              id: fullEvent.id,
              timestamp: new Date(fullEvent.timestamp),
              actorId: fullEvent.actorId,
              action: fullEvent.action,
              targetTenantId: fullEvent.targetTenantId || null,
              targetTenantCode: fullEvent.targetTenantCode || null,
              targetPlanId: fullEvent.targetPlanId || null,
              targetPlanCode: fullEvent.targetPlanCode || null,
              details: sanitizedDetails,
              ipAddress: fullEvent.ipAddress || null,
            },
          })
          .catch((err: any) => {
            logger.warn(`Failed to persist platform audit log to DB: ${err.message}`);
          });
      }
    } catch {
      // Non-fatal if DB not yet connected
    }

    return fullEvent;
  }

  public list(limit = 100): PlatformAuditEvent[] {
    return this.events.slice(0, limit);
  }

  public async listFromDb(limit = 100): Promise<PlatformAuditEvent[]> {
    try {
      if (this.prisma?.platformAuditLog) {
        const rows = await this.prisma.platformAuditLog.findMany({
          take: limit,
          orderBy: { timestamp: "desc" },
        });
        if (rows.length > 0) {
          return rows.map((r: any) => ({
            id: r.id,
            timestamp: r.timestamp.toISOString(),
            actorId: r.actorId,
            action: r.action as PlatformAuditAction,
            targetTenantId: r.targetTenantId,
            targetTenantCode: r.targetTenantCode,
            targetPlanId: r.targetPlanId,
            targetPlanCode: r.targetPlanCode,
            details: (r.details as Record<string, unknown>) || {},
            ipAddress: r.ipAddress,
          }));
        }
      }
    } catch {
      // Fallback to in-memory
    }
    return this.list(limit);
  }
}

