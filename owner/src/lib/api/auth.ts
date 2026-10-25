import { ownerApiClient } from "./client";

export interface PlatformAdminUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export interface PlatformLoginResponse {
  user: PlatformAdminUser;
}

class PlatformAuthManager {
  private currentUser: PlatformAdminUser | null = null;
  private authPromise: Promise<PlatformAdminUser> | null = null;

  public async login(email: string, password: string): Promise<PlatformAdminUser> {
    const res = await ownerApiClient.post<PlatformLoginResponse>("/platform/auth/login", {
      email,
      password,
    });
    this.currentUser = res.user;
    return this.currentUser;
  }

  public async getMe(): Promise<PlatformAdminUser> {
    const user = await ownerApiClient.get<PlatformAdminUser>("/platform/auth/me");
    this.currentUser = user;
    return user;
  }

  public async ensureAuthenticated(): Promise<PlatformAdminUser> {
    if (this.currentUser) {
      return this.currentUser;
    }

    if (this.authPromise) {
      return this.authPromise;
    }

    this.authPromise = (async () => {
      try {
        const user = await this.getMe();
        return user;
      } finally {
        this.authPromise = null;
      }
    })();

    return this.authPromise;
  }

  public async logout(): Promise<void> {
    try {
      await ownerApiClient.post("/platform/auth/logout");
    } finally {
      this.currentUser = null;
    }
  }

  public getCurrentUser(): PlatformAdminUser | null {
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return Boolean(this.currentUser);
  }

  public setCurrentUser(user: PlatformAdminUser | null): void {
    this.currentUser = user;
  }
}

export const platformAuthApi = new PlatformAuthManager();
