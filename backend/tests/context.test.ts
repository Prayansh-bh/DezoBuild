import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RequestContext } from "../src/common/context/request-context";

describe("Phase 01 — Request Context & Correlation Propagation", () => {
  it("should generate fresh request and correlation ID when none are provided", () => {
    const context = RequestContext.createFromHeaders({});
    assert.equal(typeof context.requestId, "string");
    assert.equal(context.requestId.length > 0, true);
    assert.equal(context.correlationId, context.requestId);
    assert.equal(context.tenantId, null);
    assert.equal(context.userId, null);
  });

  it("should propagate provided X-Correlation-ID header faithfully", () => {
    const customCorrelation = "corr-upstream-trace-12345";
    const context = RequestContext.createFromHeaders({
      "x-correlation-id": customCorrelation,
    });

    assert.equal(context.correlationId, customCorrelation);
    assert.notEqual(context.requestId, customCorrelation);
  });

  it("should maintain AsyncLocalStorage isolation within execution scope", () => {
    const ctx1 = RequestContext.createFromHeaders({ "x-request-id": "req-1" });
    const ctx2 = RequestContext.createFromHeaders({ "x-request-id": "req-2" });

    RequestContext.run(ctx1, () => {
      assert.equal(RequestContext.getRequestId(), "req-1");
    });

    RequestContext.run(ctx2, () => {
      assert.equal(RequestContext.getRequestId(), "req-2");
    });
  });
});
