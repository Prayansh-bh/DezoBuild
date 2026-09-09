import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { DtoValidator } from "../src/common/validation/validator";
import { ValidationError } from "../src/common/errors/app-error";

describe("Phase 01 — Validation Foundation", () => {
  const sampleSchema = z.object({
    name: z.string().min(3),
    budget: z.number().positive(),
    status: z.enum(["active", "planning"]),
  });

  it("should validate and parse valid DTO payload", () => {
    const validData = {
      name: "Highway Project",
      budget: 5000000,
      status: "active",
    };

    const parsed = DtoValidator.validate(sampleSchema, validData);
    assert.deepEqual(parsed, validData);
  });

  it("should throw ValidationError with structured invalidParams on failure", () => {
    const invalidData = {
      name: "Hi", // too short (<3)
      budget: -100, // not positive
      status: "invalid_status",
    };

    try {
      DtoValidator.validate(sampleSchema, invalidData);
      assert.fail("Should have thrown ValidationError");
    } catch (err) {
      assert.equal(err instanceof ValidationError, true);
      const valErr = err as ValidationError;
      assert.equal(valErr.statusCode, 422);
      assert.equal(valErr.errorCode, "VALIDATION_ERROR");
      assert.equal(Array.isArray(valErr.invalidParams), true);
      assert.equal(valErr.invalidParams!.length, 3);
      
      const names = valErr.invalidParams!.map((p) => p.name);
      assert.equal(names.includes("name"), true);
      assert.equal(names.includes("budget"), true);
      assert.equal(names.includes("status"), true);
    }
  });
});
