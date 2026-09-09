export interface AppConfig {
  port: number;
  environment: "development" | "staging" | "production";
  databaseUrl: string;
  corsOrigin: string;
  jwtSecret?: string | undefined;
}

export const appConfig: AppConfig = {
  port: Number(process.env["PORT"] || 4000),
  environment: ((process.env["NODE_ENV"] as "development" | "staging" | "production") || "development"),
  databaseUrl: process.env["DATABASE_URL"] || "postgresql://dezo_user:dezo_pass@localhost:5432/dezobuild",
  corsOrigin: process.env["CORS_ORIGIN"] || "*",
};
