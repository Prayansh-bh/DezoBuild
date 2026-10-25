import bcrypt from "bcrypt";
import { appConfig } from "../../../config/app.config";

export interface IPasswordService {
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
  getCostFactor(): number;
}

export class PasswordService implements IPasswordService {
  private static instance: PasswordService;
  private readonly saltRounds: number;

  constructor(saltRounds = appConfig.security.bcryptSaltRounds) {
    this.saltRounds = saltRounds;
  }

  public static getInstance(): PasswordService {
    if (!PasswordService.instance) {
      PasswordService.instance = new PasswordService();
    }
    return PasswordService.instance;
  }

  public getCostFactor(): number {
    return this.saltRounds;
  }

  /**
   * Hash plaintext password using bcrypt with random salt and configured cost factor
   */
  public async hashPassword(password: string): Promise<string> {
    if (!password || password.length === 0) {
      throw new Error("Password must not be empty");
    }

    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Cryptographically verify password against stored bcrypt hash in constant time
   */
  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }

    try {
      return await bcrypt.compare(password, hash);
    } catch {
      return false;
    }
  }
}

