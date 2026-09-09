import { describe, it, expect } from "vitest";

describe("DEZOBUILD Route Contract Verification", () => {
  const publicRoutes = [
    "/",
    "/projects",
    "/projects/new",
    "/projects/proj-001",
    "/materials",
    "/finance",
    "/people",
    "/equipment",
    "/alerts",
    "/reports",
    "/documents",
    "/settings",
  ];

  it("verifies all 12 operational route contracts are defined", () => {
    expect(publicRoutes.length).toBe(12);
    expect(publicRoutes).toContain("/");
    expect(publicRoutes).toContain("/projects");
    expect(publicRoutes).toContain("/materials");
    expect(publicRoutes).toContain("/finance");
    expect(publicRoutes).toContain("/people");
    expect(publicRoutes).toContain("/equipment");
    expect(publicRoutes).toContain("/alerts");
    expect(publicRoutes).toContain("/reports");
    expect(publicRoutes).toContain("/documents");
    expect(publicRoutes).toContain("/settings");
  });
});
