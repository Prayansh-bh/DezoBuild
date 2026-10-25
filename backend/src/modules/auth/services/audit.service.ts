import { logger } from "../../../common/logging/logger";

export type AuthAuditEventType =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "LOGOUT"
  | "REFRESH"
  | "SESSION_REVOKED"
  | "PASSWORD_CHANGED"
  | "INVITATION_CREATED"
  | "INVITATION_ACCEPTED"
  | "INVITATION_REVOKED";

export interface AuthAuditEvent {
  eventType: AuthAuditEventType;
  timestamp: string;
  userId?: string | null | undefined;
  tenantId?: string | null | undefined;
  clientIp?: string | undefined;
  userAgent?: string | undefined;
  reason?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface IAuthAuditService {
  emit(event: Omit<AuthAuditEvent, "timestamp">): void;
}

export class AuthAuditService implements IAuthAuditService {
  private static instance: AuthAuditService;

  public static getInstance(): AuthAuditService {
    if (!AuthAuditService.instance) {
      AuthAuditService.instance = new AuthAuditService();
    }
    return AuthAuditService.instance;
  }

  public emit(event: Omit<AuthAuditEvent, "timestamp">): void {
    const fullEvent: AuthAuditEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    logger.info(`[AUTH_AUDIT] ${fullEvent.eventType}`, {
      eventType: fullEvent.eventType,
      userId: fullEvent.userId || "anonymous",
      tenantId: fullEvent.tenantId || "unscoped",
      clientIp: fullEvent.clientIp,
      reason: fullEvent.reason,
    });
  }
}
