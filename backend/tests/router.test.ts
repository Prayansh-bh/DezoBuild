import { describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { HttpRouter } from "../src/common/http/router";
import { createSuccessResponse } from "../src/common/dto/api-response.dto";

describe("Phase 01 — HTTP Router & /api/v1 Pipeline", () => {
  it("should route GET requests correctly and serialize ApiResponse", async () => {
    const router = new HttpRouter();
    router.get("/api/v1/test", async () => {
      return createSuccessResponse({ message: "hello" });
    });

    const server = http.createServer((req, res) => router.handleRequest(req, res));

    await new Promise<void>((resolve) => {
      server.listen(0, async () => {
        const port = (server.address() as any).port;
        const res = await fetch(`http://localhost:${port}/api/v1/test`);
        const json = await res.json();

        assert.equal(res.status, 200);
        assert.equal(json.success, true);
        assert.equal(json.data.message, "hello");
        assert.equal(typeof json.meta.requestId, "string");
        assert.equal(typeof json.meta.correlationId, "string");

        server.close(() => resolve());
      });
    });
  });

  it("should extract route path parameters accurately", async () => {
    const router = new HttpRouter();
    router.get("/api/v1/projects/:id", async (req) => {
      return createSuccessResponse({ projectId: req.params["id"] });
    });

    const server = http.createServer((req, res) => router.handleRequest(req, res));

    await new Promise<void>((resolve) => {
      server.listen(0, async () => {
        const port = (server.address() as any).port;
        const res = await fetch(`http://localhost:${port}/api/v1/projects/PRJ-101`);
        const json = await res.json();

        assert.equal(res.status, 200);
        assert.equal(json.data.projectId, "PRJ-101");

        server.close(() => resolve());
      });
    });
  });

  it("should return 404 Problem Details when route does not exist", async () => {
    const router = new HttpRouter();
    const server = http.createServer((req, res) => router.handleRequest(req, res));

    await new Promise<void>((resolve) => {
      server.listen(0, async () => {
        const port = (server.address() as any).port;
        const res = await fetch(`http://localhost:${port}/api/v1/non-existent`);
        const json = await res.json();

        assert.equal(res.status, 404);
        assert.equal(json.success, false);
        assert.equal(json.error.code, "NOT_FOUND");
        assert.equal(json.error.status, 404);

        server.close(() => resolve());
      });
    });
  });
});
