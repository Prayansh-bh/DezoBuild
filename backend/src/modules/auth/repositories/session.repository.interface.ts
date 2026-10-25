export interface SessionEntity {
  id: string;
  tenantId: string;
  userId: string;
  refreshTokenHash: string;
  userAgent?: string | null | undefined;
  ipAddress?: string | null | undefined;
  version: number;
  expiresAt: Date;
  createdAt: Date;
  revokedAt?: Date | null | undefined;
}

export type CreateSessionParams = {
  id?: string | undefined;
  tenantId: string;
  userId: string;
  refreshTokenHash: string;
  userAgent?: string | null | undefined;
  ipAddress?: string | null | undefined;
  version: number;
  expiresAt: Date;
};

export interface ISessionRepository {
  findById(id: string): Promise<SessionEntity | null>;
  findByTokenHash(refreshTokenHash: string): Promise<SessionEntity | null>;
  create(params: CreateSessionParams): Promise<SessionEntity>;
  rotateToken(sessionId: string, newRefreshTokenHash: string, newExpiresAt: Date): Promise<SessionEntity>;
  revoke(sessionId: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  findActiveByUserId(userId: string): Promise<SessionEntity[]>;
}
