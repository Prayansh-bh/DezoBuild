import crypto from "node:crypto";
import type { ISessionRepository, SessionEntity, CreateSessionParams } from "./session.repository.interface";

export class InMemorySessionRepository implements ISessionRepository {
  private readonly sessions = new Map<string, SessionEntity>();

  public async findById(id: string): Promise<SessionEntity | null> {
    const session = this.sessions.get(id);
    return session ? { ...session } : null;
  }

  public async findByTokenHash(refreshTokenHash: string): Promise<SessionEntity | null> {
    for (const session of this.sessions.values()) {
      if (session.refreshTokenHash === refreshTokenHash) {
        return { ...session };
      }
    }
    return null;
  }

  public async create(params: CreateSessionParams): Promise<SessionEntity> {
    const now = new Date();
    const session: SessionEntity = {
      id: params.id || crypto.randomUUID(),
      tenantId: params.tenantId,
      userId: params.userId,
      refreshTokenHash: params.refreshTokenHash,
      userAgent: params.userAgent || null,
      ipAddress: params.ipAddress || null,
      version: params.version,
      expiresAt: params.expiresAt,
      createdAt: now,
      revokedAt: null,
    };

    this.sessions.set(session.id, session);
    return { ...session };
  }

  public async rotateToken(
    sessionId: string,
    newRefreshTokenHash: string,
    newExpiresAt: Date,
  ): Promise<SessionEntity> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.refreshTokenHash = newRefreshTokenHash;
    session.expiresAt = newExpiresAt;
    return { ...session };
  }

  public async revoke(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session && !session.revokedAt) {
      session.revokedAt = new Date();
    }
  }

  public async revokeAllForUser(userId: string): Promise<void> {
    const now = new Date();
    for (const session of this.sessions.values()) {
      if (session.userId === userId && !session.revokedAt) {
        session.revokedAt = now;
      }
    }
  }

  public async findActiveByUserId(userId: string): Promise<SessionEntity[]> {
    const now = new Date();
    const result: SessionEntity[] = [];

    for (const session of this.sessions.values()) {
      if (session.userId === userId && !session.revokedAt && session.expiresAt > now) {
        result.push({ ...session });
      }
    }

    return result;
  }

  public clear(): void {
    this.sessions.clear();
  }
}
