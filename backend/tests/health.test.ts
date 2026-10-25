import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HealthController } from "../src/modules/health/health.controller";
import { DatabaseService } from "../src/database/database.service";

describe("Phase 01 — Health Endpoint & Database Telemetry", () => {
  it("should report truthful database telemetry reflecting connection state", async () => {
    const db = DatabaseService.getInstance();
    const isConnected = await db.connect();

    const controller = new HealthController();
    const response = await controller.getHealth();

    assert.equal(response.success, true);
    assert.equal(typeof response.data.uptimeSeconds, "number");
    assert.equal(typeof response.meta.correlationId, "string");

    if (isConnected) {
      assert.equal(response.data.status, "ok");
      assert.equal(response.data.database.connected, true);
      assert.equal(response.data.database.status, "connected");
    } else {
      assert.equal(response.data.status, "degraded");
      assert.equal(response.data.database.connected, false);
      assert.equal(response.data.database.status, "disconnected");
    }
  });

  it("should accurately detect database disconnection status", async () => {
    const db = DatabaseService.getInstance();
    await db.disconnect();

    const controller = new HealthController();
    const response = await controller.getHealth();

    assert.equal(response.success, true);
    assert.equal(response.data.status, "degraded");
    assert.equal(response.data.database.connected, false);
    assert.equal(response.data.database.status, "disconnected");
  });
});
