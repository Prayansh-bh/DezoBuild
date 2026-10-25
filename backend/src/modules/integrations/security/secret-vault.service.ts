import crypto from 'node:crypto';

export class SecretVaultService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 12;
  private static readonly TAG_LENGTH = 16;
  private static readonly DEFAULT_KEY = crypto
    .createHash('sha256')
    .update(process.env['INTEGRATION_MASTER_KEY'] || 'dezobuild-dev-integration-master-key-32b')
    .digest();

  public static encrypt(plainSecret: string, masterKey: Buffer = this.DEFAULT_KEY): string {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, masterKey, iv);
    
    let encrypted = cipher.update(plainSecret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  public static decrypt(cipherText: string, masterKey: Buffer = this.DEFAULT_KEY): string {
    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted secret format');
    }

    const [ivHex, tagHex, encryptedHex] = parts as [string, string, string];
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv(this.ALGORITHM, masterKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  public static redactConfig(config: Record<string, any>): Record<string, any> {
    if (!config || typeof config !== 'object') return {};

    const sensitiveKeys = [
      'secret',
      'password',
      'token',
      'apikey',
      'api_key',
      'clientsecret',
      'client_secret',
      'refreshtoken',
      'refresh_token',
      'accesstoken',
      'access_token',
      'privatekey',
      'private_key',
      'auth',
      'authorization',
    ];

    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(config)) {
      const lower = key.toLowerCase().replace(/[-_]/g, '');
      if (sensitiveKeys.some((s) => lower.includes(s))) {
        result[key] = '********';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.redactConfig(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  public static redactConnection(connection: any): any {
    if (!connection) return connection;
    const { encryptedSecret, ...safeConn } = connection;
    return {
      ...safeConn,
      config: this.redactConfig(connection.config || {}),
      hasSecret: Boolean(connection.encryptedSecret || connection.secretRef),
    };
  }
}
