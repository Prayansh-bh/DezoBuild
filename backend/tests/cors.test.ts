import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { appConfig } from "../src/config/app.config";

describe("Phase 01 — CORS Origin Enforcement", () => {
  it("should allow configured origins for client applications", () => {
    // Standard frontend ports
    assert.equal(appConfig.cors.isOriginAllowed("http://localhost:8081"), true);
    assert.equal(appConfig.cors.isOriginAllowed("http://localhost:8082"), true);
    assert.equal(appConfig.cors.isOriginAllowed("http://localhost:3000"), true);
  });

  it("should allow non-browser requests without origin header", () => {
    assert.equal(appConfig.cors.isOriginAllowed(undefined), true);
  });

  it("should reject unconfigured unauthorized origins", () => {
    assert.equal(appConfig.cors.isOriginAllowed("https://malicious-site.com"), false);
  });
});
