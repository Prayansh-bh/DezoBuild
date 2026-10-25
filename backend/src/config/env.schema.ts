import { z } from "zod";

export const environmentSchema = z
  .object({
    // App Environment
    NODE_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),
    PORT: z
      .union([z.string().regex(/^\d+$/).transform(Number), z.number()])
      .default(4000),
    APP_NAME: z.string().min(1).default("DEZOBUILD Construction OS API"),
    APP_VERSION: z.string().min(1).default("1.0.0"),
    API_PREFIX: z.string().min(1).default("/api/v1"),

    // Database Configuration
    DATABASE_URL: z
      .string()
      .default("postgresql://dezo_user:dezo_pass@localhost:5432/dezobuild"),
    DIRECT_URL: z.string().optional(),
    DB_POOL_MIN: z
      .union([z.string().regex(/^\d+$/).transform(Number), z.number()])
      .default(2),
    DB_POOL_MAX: z
      .union([z.string().regex(/^\d+$/).transform(Number), z.number()])
      .default(10),
    DB_TIMEOUT_MS: z
      .union([z.string().regex(/^\d+$/).transform(Number), z.number()])
      .default(10000),

    // CORS Configuration
    CORS_ORIGINS: z
      .string()
      .default("http://localhost:8081,http://localhost:8082"),

    // Logging & Observability
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    LOG_FORMAT: z.enum(["json", "pretty"]).default("json"),

    // Security & Authentication (Phase 02)
    JWT_ACCESS_SECRET: z
      .string()
      .min(32, "JWT_ACCESS_SECRET must be at least 32 characters long.")
      .default("dezobuild-access-secret-key-development-minimum-32-chars-ok!"),
    JWT_REFRESH_SECRET: z
      .string()
      .min(32, "JWT_REFRESH_SECRET must be at least 32 characters long.")
      .default("dezobuild-refresh-secret-key-development-minimum-32-chars-ok!"),
    JWT_ACCESS_EXPIRES_IN_SEC: z
      .union([z.string().regex(/^\d+$/).transform(Number), z.number()])
      .default(900), // 15 minutes
    JWT_REFRESH_EXPIRES_IN_DAYS: z
      .union([z.string().regex(/^\d+$/).transform(Number), z.number()])
      .default(7), // 7 days
    BCRYPT_SALT_ROUNDS: z
      .union([z.string().regex(/^\d+$/).transform(Number), z.number()])
      .default(10),
    COOKIE_DOMAIN: z.string().optional(),
    SECURE_COOKIES: z
      .union([z.string().transform((val) => val === "true"), z.boolean()])
      .optional(),
    PLATFORM_ADMIN_EMAIL: z.string().email().default("superadmin@dezobuild.com"),
    PLATFORM_ADMIN_PASSWORD: z.string().default("SuperAdmin@DezoBuild2026!"),

    // Object Storage Placeholders (Phase 08+)
    STORAGE_PROVIDER: z.enum(["s3", "r2", "minio", "local"]).default("local"),
    STORAGE_BUCKET: z.string().optional(),
    STORAGE_REGION: z.string().optional(),
    STORAGE_ENDPOINT: z.string().optional(),

    // Event & Outbox Queue Placeholders (Phase 16+)
    OUTBOX_POLL_INTERVAL_MS: z
      .union([z.string().regex(/^\d+$/).transform(Number), z.number()])
      .default(1000),
    OUTBOX_BATCH_SIZE: z
      .union([z.string().regex(/^\d+$/).transform(Number), z.number()])
      .default(50),
  })
  .superRefine((data, ctx) => {
    // In production, reject bare wildcard CORS origin
    const rawOrigins = data.CORS_ORIGINS.split(",").map((o) => o.trim());
    if (data.NODE_ENV === "production" && rawOrigins.includes("*")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CORS_ORIGINS"],
        message: "Wildcard CORS origin '*' is strictly prohibited in production.",
      });
    }

    // In production, require explicit non-default DATABASE_URL
    if (
      data.NODE_ENV === "production" &&
      (!data.DATABASE_URL ||
        data.DATABASE_URL.includes("localhost") ||
        data.DATABASE_URL.includes("dezo_pass"))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DATABASE_URL"],
        message: "Production DATABASE_URL must not use default or localhost credentials.",
      });
    }

    // In production, require non-default high-entropy JWT secrets
    if (
      data.NODE_ENV === "production" &&
      (!data.JWT_ACCESS_SECRET ||
        data.JWT_ACCESS_SECRET.includes("development") ||
        !data.JWT_REFRESH_SECRET ||
        data.JWT_REFRESH_SECRET.includes("development"))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_ACCESS_SECRET"],
        message: "Production environment requires explicit non-default JWT secrets.",
      });
    }
  });

export type ValidatedEnv = z.infer<typeof environmentSchema>;
