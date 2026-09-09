import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadAndValidateConfig } from "../src/config/app.config";

describe("Phase 01 — Configuration Validation", () => {
  it("should successfully load valid configuration with defaults", () => {
    const validEnv = {
      DATABASE_URL: "postgresql://postgres:password@localhost:5432/dezobuild_dev",
      NODE_ENV: "development",
      PORT: "4000",
    };

    const config = loadAndValidateConfig(validEnv);
    assert.equal(config.app.port, 4000);
    assert.equal(config.app.environment, "development");
    assert.equal(config.database.url, "postgresql://postgres:password@localhost:5432/dezobuild_dev");
    assert.equal(config.cors.allowedOrigins.length > 0, true);
  });

  it("should reject invalid PORT values (non-numeric)", () => {
    const invalidEnv = {
      NODE_ENV: "development",
      PORT: "not-a-port",
    };

    assert.throws(
      () => loadAndValidateConfig(invalidEnv as any),
      /Expected number, received NaN|Invalid input/,
    );
  });

  it("should reject wildcard CORS origin in production mode", () => {
    const prodWithWildcard = {
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://user:pass@prod-db.aws.com:5432/dezobuild",
      CORS_ORIGINS: "*",
    };

    assert.throws(
      () => loadAndValidateConfig(prodWithWildcard),
      /Wildcard CORS origin '\*' is strictly prohibited in production/,
    );
  });

  it("should reject localhost or dummy credentials in production mode", () => {
    const prodWithLocalhost = {
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://dezo_user:dezo_pass@localhost:5432/dezobuild",
      CORS_ORIGINS: "https://app.dezobuild.com",
    };

    assert.throws(
      () => loadAndValidateConfig(prodWithLocalhost),
      /Production DATABASE_URL must not use default or localhost credentials/,
    );
  });
});
