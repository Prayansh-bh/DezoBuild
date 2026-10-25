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
        const json = (await res.json()) as any;

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
        const json = (await res.json()) as any;

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
        const json = (await res.json()) as any;

        assert.equal(res.status, 404);
        assert.equal(json.success, false);
        assert.equal(json.error.code, "NOT_FOUND");
        assert.equal(json.error.status, 404);

        server.close(() => resolve());
      });
    });
  });

  it("should prioritize static route over parameterized sibling route regardless of registration order", async () => {
    const router = new HttpRouter();

    // 1. Register parameterized route FIRST
    router.get("/api/v1/tenants/:id", async (req) => {
      return createSuccessResponse({ handler: "getTenant", id: req.params["id"] });
    });

    // 2. Register static route SECOND
    router.get("/api/v1/tenants/workspace-modules", async () => {
      return createSuccessResponse({ handler: "getWorkspaceModules" });
    });

    // 3. Register another static route THIRD
    router.get("/api/v1/tenants/subscription", async () => {
      return createSuccessResponse({ handler: "getSubscription" });
    });

    const server = http.createServer((req, res) => router.handleRequest(req, res));

    await new Promise<void>((resolve) => {
      server.listen(0, async () => {
        const port = (server.address() as any).port;

        // Test A: Request static /workspace-modules
        const resA = await fetch(`http://localhost:${port}/api/v1/tenants/workspace-modules`);
        const jsonA = (await resA.json()) as any;
        assert.equal(resA.status, 200);
        assert.equal(jsonA.data.handler, "getWorkspaceModules");

        // Test B: Request static /subscription
        const resB = await fetch(`http://localhost:${port}/api/v1/tenants/subscription`);
        const jsonB = (await resB.json()) as any;
        assert.equal(resB.status, 200);
        assert.equal(jsonB.data.handler, "getSubscription");

        // Test C: Request parameterized /:id with real ID
        const resC = await fetch(`http://localhost:${port}/api/v1/tenants/aaaa1111-0000-0000-0000-aaaaaaaaaaaa`);
        const jsonC = (await resC.json()) as any;
        assert.equal(resC.status, 200);
        assert.equal(jsonC.data.handler, "getTenant");
        assert.equal(jsonC.data.id, "aaaa1111-0000-0000-0000-aaaaaaaaaaaa");

        server.close(() => resolve());
      });
    });
  });
});

