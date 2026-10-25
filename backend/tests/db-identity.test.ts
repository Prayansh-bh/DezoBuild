import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DatabaseService } from "../src/database/database.service";

describe("Database Identity & Access Verification", () => {
  it("should connect as dezo_user to dezobuild database", async () => {
    const db = DatabaseService.getInstance();
    const connected = await db.connect();
    assert.equal(connected, true, "Database should connect successfully");

    const prisma = db.getClient();
    const result: any = await prisma.$queryRaw<Array<{ current_database: string; current_user: string; version: string }>>`
      SELECT current_database(), current_user, version();
    `;

    assert.ok(result && result.length > 0);
    assert.equal(result[0].current_database, "dezobuild");
    assert.equal(result[0].current_user, "dezo_user");
    console.log("DB Identity Verified:", {
      database: result[0].current_database,
      user: result[0].current_user,
      version: result[0].version.split(" on ")[0],
    });
  });
});
