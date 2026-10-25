import type { PrismaClient } from "@prisma/client";
import type { ISessionRepository, SessionEntity, CreateSessionParams } from "./session.repository.interface";
import { DatabaseService } from "../../../database/database.service";

export class PrismaSessionRepository implements ISessionRepository {
  private get prisma(): PrismaClient {
    return DatabaseService.getInstance().getClient();
  }

  public async findById(id: string): Promise<SessionEntity | null> {
    const session = await this.prisma.session.findUnique({
      where: { id },
    });
    return session ? this.mapToEntity(session) : null;
  }

  public async findByTokenHash(refreshTokenHash: string): Promise<SessionEntity | null> {
    const session = await this.prisma.session.findFirst({
      where: { refreshTokenHash },
    });
    return session ? this.mapToEntity(session) : null;
  }

  public async create(params: CreateSessionParams): Promise<SessionEntity> {
    const session = await this.prisma.session.create({
      data: {
        id: params.id,
        tenantId: params.tenantId,
        userId: params.userId,
        refreshTokenHash: params.refreshTokenHash,
        userAgent: params.userAgent,
        ipAddress: params.ipAddress,
        version: params.version,
        expiresAt: params.expiresAt,
      },
    });
    return this.mapToEntity(session);
  }

  public async rotateToken(
    sessionId: string,
    newRefreshTokenHash: string,
    newExpiresAt: Date,
  ): Promise<SessionEntity> {
    const session = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        expiresAt: newExpiresAt,
      },
    });
    return this.mapToEntity(session);
  }

  public async revoke(sessionId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  public async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  public async findActiveByUserId(userId: string): Promise<SessionEntity[]> {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    return sessions.map((s: any) => this.mapToEntity(s));
  }

  private mapToEntity(record: any): SessionEntity {
    return {
      id: record.id,
      tenantId: record.tenantId,
      userId: record.userId,
      refreshTokenHash: record.refreshTokenHash,
      userAgent: record.userAgent,
      ipAddress: record.ipAddress,
      version: record.version,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
      revokedAt: record.revokedAt,
    };
  }
}
