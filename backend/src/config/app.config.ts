import dotenv from "dotenv";
import { environmentSchema, type ValidatedEnv } from "./env.schema";

// Load environment from .env file if available
dotenv.config();

export interface AppConfig {
  app: {
    name: string;
    version: string;
    port: number;
    environment: "development" | "staging" | "production" | "test";
    isProduction: boolean;
    isDevelopment: boolean;
    isTest: boolean;
    apiPrefix: string;
  };
  database: {
    url: string;
    poolMin: number;
    poolMax: number;
    timeoutMs: number;
  };
  cors: {
    allowedOrigins: string[];
    isOriginAllowed(origin?: string): boolean;
  };
  logging: {
    level: "debug" | "info" | "warn" | "error";
    format: "json" | "pretty";
  };
  security: {
    jwtAccessSecret: string;
    jwtRefreshSecret: string;
    accessExpiresInSec: number;
    refreshExpiresInDays: number;
    bcryptSaltRounds: number;
    cookieDomain?: string | undefined;
    secureCookies: boolean;
    platformAdminEmail: string;
    platformAdminPassword: string;
  };
  storage: {
    provider: "s3" | "r2" | "minio" | "local";
    bucket?: string | undefined;
    region?: string | undefined;
    endpoint?: string | undefined;
  };
  outbox: {
    pollIntervalMs: number;
    batchSize: number;
  };
}

export function loadAndValidateConfig(envSource: Record<string, unknown> = process.env): AppConfig {
  const result = environmentSchema.safeParse(envSource);

  if (!result.success) {
    const formattedErrors = result.error.issues
      .map((issue) => `  - [${issue.path.join(".")}]: ${issue.message}`)
      .join("\n");

    const errorMessage = `\n========================================================\n[FATAL] Configuration Validation Failed on Startup:\n${formattedErrors}\n========================================================\n`;
    
    throw new Error(errorMessage);
  }

  const env: ValidatedEnv = result.data;
  const origins = env.CORS_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  return {
    app: {
      name: env.APP_NAME,
      version: env.APP_VERSION,
      port: env.PORT,
      environment: env.NODE_ENV,
      isProduction: env.NODE_ENV === "production",
      isDevelopment: env.NODE_ENV === "development",
      isTest: env.NODE_ENV === "test",
      apiPrefix: env.API_PREFIX,
    },
    database: {
      url: env.DATABASE_URL,
      poolMin: env.DB_POOL_MIN,
      poolMax: env.DB_POOL_MAX,
      timeoutMs: env.DB_TIMEOUT_MS,
    },
    cors: {
      allowedOrigins: origins,
      isOriginAllowed(origin?: string): boolean {
        if (!origin) return true; // Allow non-browser requests (e.g. curl, health checkers)
        if (origins.includes("*") && env.NODE_ENV !== "production") return true;
        return origins.includes(origin);
      },
    },
    logging: {
      level: env.LOG_LEVEL,
      format: env.LOG_FORMAT,
    },
    security: {
      jwtAccessSecret: env.JWT_ACCESS_SECRET,
      jwtRefreshSecret: env.JWT_REFRESH_SECRET,
      accessExpiresInSec: env.JWT_ACCESS_EXPIRES_IN_SEC,
      refreshExpiresInDays: env.JWT_REFRESH_EXPIRES_IN_DAYS,
      bcryptSaltRounds: env.BCRYPT_SALT_ROUNDS,
      cookieDomain: env.COOKIE_DOMAIN,
      secureCookies: env.SECURE_COOKIES ?? env.NODE_ENV === "production",
      platformAdminEmail: env.PLATFORM_ADMIN_EMAIL,
      platformAdminPassword: env.PLATFORM_ADMIN_PASSWORD,
    },
    storage: {
      provider: env.STORAGE_PROVIDER,
      bucket: env.STORAGE_BUCKET,
      region: env.STORAGE_REGION,
      endpoint: env.STORAGE_ENDPOINT,
    },
    outbox: {
      pollIntervalMs: env.OUTBOX_POLL_INTERVAL_MS,
      batchSize: env.OUTBOX_BATCH_SIZE,
    },
  };
}

// Global singleton config instance initialized for runtime execution
let activeConfig: AppConfig;
try {
  activeConfig = loadAndValidateConfig(process.env);
} catch (error) {
  if (process.env["NODE_ENV"] !== "test") {
    console.error(error);
    process.exit(1);
  }
  // For test execution, provide a clean default
  activeConfig = loadAndValidateConfig({
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://test:test@localhost:5432/dezobuild_test",
  });
}

export const appConfig = activeConfig;
