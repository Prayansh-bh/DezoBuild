import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ProblemDetailsSerializer } from "../src/common/errors/problem-details";
import { NotFoundError, ForbiddenError, ConflictError } from "../src/common/errors/app-error";

describe("Phase 01 — Global Error Contract & RFC 7807 Serialization", () => {
  it("should serialize domain NotFoundError into structured 404 Problem Details", () => {
    const error = new NotFoundError("Project with ID 123 does not exist.");
    const { statusCode, payload } = ProblemDetailsSerializer.fromError(error, "/api/v1/projects/123");

    assert.equal(statusCode, 404);
    assert.equal(payload.success, false);
    assert.equal(payload.error.code, "NOT_FOUND");
    assert.equal(payload.error.status, 404);
    assert.equal(payload.error.detail, "Project with ID 123 does not exist.");
    assert.equal(payload.error.instance, "/api/v1/projects/123");
    assert.equal(typeof payload.error.timestamp, "string");
  });

  it("should serialize ForbiddenError into structured 403 Problem Details", () => {
    const error = new ForbiddenError("You do not have permission to approve RA bills.");
    const { statusCode, payload } = ProblemDetailsSerializer.fromError(error, "/api/v1/ra-bills/456/approve");

    assert.equal(statusCode, 403);
    assert.equal(payload.error.code, "FORBIDDEN");
    assert.equal(payload.error.status, 403);
  });

  it("should convert unknown unhandled exceptions safely without exposing internal traces", () => {
    const rawError = new Error("FATAL: database query SELECT * FROM secret_table failed at connection.ts:42");
    const { statusCode, payload } = ProblemDetailsSerializer.fromError(rawError, "/api/v1/unknown");

    assert.equal(statusCode, 500);
    assert.equal(payload.success, false);
    assert.equal(payload.error.code, "INTERNAL_SERVER_ERROR");
    assert.equal(payload.error.status, 500);
    assert.equal(typeof payload.error.correlationId, "string");
  });
});
