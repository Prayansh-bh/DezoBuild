import crypto from "node:crypto";
import type { IUserRepository, UserEntity, CreateUserParams } from "./user.repository.interface";
import { ConflictError } from "../../../common/errors/app-error";

export class InMemoryUserRepository implements IUserRepository {
  private readonly users = new Map<string, UserEntity>();

  public async findById(id: string): Promise<UserEntity | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  public async findByEmail(email: string, tenantId?: string): Promise<UserEntity | null> {
    const normalizedEmail = email.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === normalizedEmail) {
        if (!tenantId || user.tenantId === tenantId) {
          return { ...user };
        }
      }
    }
    return null;
  }

  public async create(params: CreateUserParams): Promise<UserEntity> {
    const normalizedEmail = params.email.trim().toLowerCase();

    // Check unique constraint [tenantId, email]
    const existing = await this.findByEmail(normalizedEmail, params.tenantId);
    if (existing) {
      throw new ConflictError(`User with email '${normalizedEmail}' already exists in tenant.`);
    }

    const now = new Date();
    const user: UserEntity = {
      id: params.id || crypto.randomUUID(),
      tenantId: params.tenantId,
      email: normalizedEmail,
      phone: params.phone || null,
      fullName: params.fullName.trim(),
      passwordHash: params.passwordHash,
      status: params.status || "ACTIVE",
      sessionVersion: params.sessionVersion ?? 1,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    };

    this.users.set(user.id, user);
    return { ...user };
  }

  public async updateLastLogin(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.lastLoginAt = new Date();
      user.updatedAt = new Date();
    }
  }

  public async incrementSessionVersion(id: string): Promise<number> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User ${id} not found`);
    }

    user.sessionVersion += 1;
    user.updatedAt = new Date();
    return user.sessionVersion;
  }

  public async updateStatus(id: string, status: "ACTIVE" | "SUSPENDED" | "INVITED"): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.status = status;
      user.updatedAt = new Date();
    }
  }

  public async findTenantUsers(tenantId: string, limit = 200): Promise<any[]> {
    const list: any[] = [];
    for (const user of this.users.values()) {
      if (user.tenantId === tenantId) {
        list.push({
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          status: user.status,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt ?? null,
          roleAssignments: [],
          invitations: [],
          employee: null,
          projectMembers: [],
        });
        if (list.length >= limit) break;
      }
    }
    return list;
  }

  public clear(): void {
    this.users.clear();
  }
}
