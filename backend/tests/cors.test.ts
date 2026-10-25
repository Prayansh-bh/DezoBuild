import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { appConfig, loadAndValidateConfig } from "../src/config/app.config";
import { handleCorsMiddleware } from "../src/common/middleware/cors.middleware";
import type { IncomingMessage, ServerResponse } from "node:http";

describe("Phase 01 — CORS Origin Enforcement & Middleware", () => {
  it("should allow configured origins for customer and owner client applications", () => {
    // Verified development frontend ports
    assert.equal(appConfig.cors.isOriginAllowed("http://localhost:8081"), true);
    assert.equal(appConfig.cors.isOriginAllowed("http://localhost:8082"), true);
  });

  it("should allow non-browser requests without origin header", () => {
    assert.equal(appConfig.cors.isOriginAllowed(undefined), true);
  });

  it("should reject unconfigured unauthorized origins and prefix/suffix spoofs", () => {
    assert.equal(appConfig.cors.isOriginAllowed("https://malicious-site.com"), false);
    assert.equal(appConfig.cors.isOriginAllowed("http://localhost:8081.evil.com"), false);
    assert.equal(appConfig.cors.isOriginAllowed("http://evil.com:8081"), false);
    assert.equal(appConfig.cors.isOriginAllowed("http://localhost:9999"), false);
  });

  it("should deterministically parse and trim comma-separated origins", () => {
    const config = loadAndValidateConfig({
      DATABASE_URL: "postgresql://postgres:password@localhost:5432/dezobuild_dev",
      NODE_ENV: "development",
      PORT: "4000",
      CORS_ORIGINS: " http://localhost:8081 , http://localhost:8082 ,   http://localhost:5173  ",
    });

    assert.deepEqual(config.cors.allowedOrigins, [
      "http://localhost:8081",
      "http://localhost:8082",
      "http://localhost:5173",
    ]);
    assert.equal(config.cors.isOriginAllowed("http://localhost:8081"), true);
    assert.equal(config.cors.isOriginAllowed("http://localhost:8082"), true);
    assert.equal(config.cors.isOriginAllowed("http://localhost:5173"), true);
  });

  it("should set Access-Control-Allow-Credentials only for configured allowed origins", () => {
    const headers: Record<string, string> = {};
    const mockReq = {
      headers: { origin: "http://localhost:8081" },
      method: "GET",
    } as unknown as IncomingMessage;

    const mockRes = {
      setHeader(key: string, value: string) {
        headers[key.toLowerCase()] = value;
      },
    } as unknown as ServerResponse;

    const terminated = handleCorsMiddleware(mockReq, mockRes);
    assert.equal(terminated, false);
    assert.equal(headers["access-control-allow-origin"], "http://localhost:8081");
    assert.equal(headers["access-control-allow-credentials"], "true");
  });

  it("should not set CORS headers for unconfigured rejected origins", () => {
    const headers: Record<string, string> = {};
    const mockReq = {
      headers: { origin: "https://unauthorized-origin.com" },
      method: "GET",
    } as unknown as IncomingMessage;

    const mockRes = {
      setHeader(key: string, value: string) {
        headers[key.toLowerCase()] = value;
      },
    } as unknown as ServerResponse;

    const terminated = handleCorsMiddleware(mockReq, mockRes);
    assert.equal(terminated, false);
    assert.equal(headers["access-control-allow-origin"], undefined);
    assert.equal(headers["access-control-allow-credentials"], undefined);
  });

  it("should immediately handle OPTIONS preflight with 204 No Content", () => {
    let statusCode = 200;
    let ended = false;
    const headers: Record<string, string> = {};

    const mockReq = {
      headers: { origin: "http://localhost:8081" },
      method: "OPTIONS",
    } as unknown as IncomingMessage;

    const mockRes = {
      set statusCode(code: number) {
        statusCode = code;
      },
      get statusCode() {
        return statusCode;
      },
      setHeader(key: string, value: string) {
        headers[key.toLowerCase()] = value;
      },
      end() {
        ended = true;
      },
    } as unknown as ServerResponse;

    const terminated = handleCorsMiddleware(mockReq, mockRes);
    assert.equal(terminated, true);
    assert.equal(statusCode, 204);
    assert.equal(ended, true);
    assert.equal(headers["access-control-allow-origin"], "http://localhost:8081");
  });
});
