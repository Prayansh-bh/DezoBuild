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
      .default("http://localhost:8081,http://localhost:8082,http://localhost:3000,http://localhost:5173"),

    // Logging & Observability
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    LOG_FORMAT: z.enum(["json", "pretty"]).default("json"),

    // Security Placeholders (Validated for presence in Phase 02+)
    JWT_ACCESS_SECRET: z.string().optional(),
    JWT_REFRESH_SECRET: z.string().optional(),
    COOKIE_DOMAIN: z.string().optional(),
    SECURE_COOKIES: z
      .union([z.string().transform((val) => val === "true"), z.boolean()])
      .optional(),

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
    // In production, reject wildcard CORS origin
    if (data.NODE_ENV === "production" && data.CORS_ORIGINS.includes("*")) {
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
  });

export type ValidatedEnv = z.infer<typeof environmentSchema>;
