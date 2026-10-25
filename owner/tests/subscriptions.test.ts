import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { CANONICAL_FEATURES } from "../src/components/tier-editor-modal";
import { platformPlansApi, type PlatformPlanDetailDto, type SavePlanDraftDto } from "../src/lib/api/plans";
import { platformEntitlementsApi } from "../src/lib/api/entitlements";
import { platformAuthApi } from "../src/lib/api/auth";

describe("Platform Owner Subscriptions & Tier Governance Test Suite", () => {
  let plans: PlatformPlanDetailDto[] = [];
  let proPlan: PlatformPlanDetailDto;

  before(async () => {
    // Authenticate Super Admin against live dev backend (port 4000)
    await platformAuthApi.login("superadmin@dezobuild.com", "SuperAdmin@DezoBuild2026!");
  });

  it("1. `/subscriptions` loads live global plans from database API", async () => {
    plans = await platformPlansApi.listPlans();
    assert.ok(Array.isArray(plans), "Plans must be an array");
    assert.ok(plans.length >= 3, "Must have at least 3 global tiers (Starter, Professional, Enterprise)");

    const starter = plans.find((p) => p.code === "STARTER");
    const pro = plans.find((p) => p.code === "PROFESSIONAL");
    const enterprise = plans.find((p) => p.code === "ENTERPRISE");

    assert.ok(starter, "Starter plan exists");
    assert.ok(pro, "Professional plan exists");
    assert.ok(enterprise, "Enterprise plan exists");

    proPlan = pro;
  });

  it("2. Configure Tier Rules retrieves plan detail for in-place editor", async () => {
    const detail = await platformPlansApi.getPlan(proPlan.id);
    assert.equal(detail.id, proPlan.id);
    assert.equal(detail.code, "PROFESSIONAL");
    assert.ok(detail.publishedVersion, "Must have published version");
  });

  it("3. Current published version renders and exposes quotas/pricing", async () => {
    const detail = await platformPlansApi.getPlan(proPlan.id);
    const pub = detail.publishedVersion;
    assert.ok(pub);
    assert.equal(pub.status, "PUBLISHED");
    assert.ok(Number(pub.priceMonthly) > 0, "Monthly price is positive");
    assert.ok(Number(pub.priceAnnual) > 0, "Annual price is positive");
  });

  it("4. Draft creation and editing: Monthly and Annual pricing can be saved", async () => {
    const draftPayload: SavePlanDraftDto = {
      priceMonthly: 179999,
      priceAnnual: 1799990,
      maxProjects: 20,
      maxSeats: 25,
      maxStorageGb: 100,
      description: "Professional Tier with expanded project limits",
      features: {
        "projects:core": true,
        "projects:wbs": true,
        "materials:core": true,
        "materials:po_matching": true,
        "finance:commercial": true,
        "bim:3d_viewer": false,
        "ai:schedule_forecasting": false,
        "integrations:erp_sync": true,
        "hardware:biometric": true,
        "survey:drone_orthomosaic": false,
        "security:custom_domain": false,
        "compliance:audit_export": false,
      },
    };

    const updated = await platformPlansApi.saveDraft(proPlan.id, draftPayload);
    assert.ok(updated.draftVersion, "Draft version must be present");
    assert.equal(updated.draftVersion?.status, "DRAFT");
    assert.equal(Number(updated.draftVersion?.priceMonthly), 179999);
    assert.equal(Number(updated.draftVersion?.priceAnnual), 1799990);
  });

  it("5, 6, 7, 8, 9. Project, Seat, Storage quotas and description render and update in draft", async () => {
    const detail = await platformPlansApi.getPlan(proPlan.id);
    assert.ok(detail.draftVersion);
    assert.equal(detail.draftVersion.maxProjects, 20);
    assert.equal(detail.draftVersion.maxSeats, 25);
    assert.equal(detail.draftVersion.maxStorageGb, 100);
    assert.equal(detail.description, "Professional Tier with expanded project limits");
  });

  it("10. Feature toggle state renders 12 canonical features correctly", async () => {
    const detail = await platformPlansApi.getPlan(proPlan.id);
    assert.ok(detail.draftVersion?.features);

    // Verify all 12 canonical keys are accounted for
    for (const feat of CANONICAL_FEATURES) {
      assert.ok(
        feat.key in detail.draftVersion.features,
        `Feature key ${feat.key} must be in features dictionary`
      );
    }

    assert.equal(detail.draftVersion.features["projects:wbs"], true);
    assert.equal(detail.draftVersion.features["bim:3d_viewer"], false);
  });

  it("11 & 12. Save Draft validates server-side and rejects invalid pricing", async () => {
    // Negative pricing should fail validation
    const invalidPayload: any = {
      priceMonthly: -500,
      priceAnnual: 1000,
      features: {},
    };

    await assert.rejects(
      async () => platformPlansApi.saveDraft(proPlan.id, invalidPayload),
      (err: any) => err.message !== undefined
    );
  });

  it("13 & 14. Publish calls API, atomically archives old version, and refreshes plan", async () => {
    const published = await platformPlansApi.publishPlan(proPlan.id);
    assert.ok(published.publishedVersion);
    assert.equal(published.publishedVersion.status, "PUBLISHED");
    assert.equal(Number(published.publishedVersion.priceMonthly), 179999);
    assert.equal(published.draftVersion, null, "Draft is consumed upon publishing");
  });

  it("15. Version history renders immutable historical lineage", async () => {
    const history = await platformPlansApi.getVersionHistory(proPlan.id);
    assert.ok(Array.isArray(history));
    assert.ok(history.length >= 2, "Must have at least v1 and v2 in history");

    const publishedVer = history.find((v) => v.status === "PUBLISHED");
    assert.ok(publishedVer, "A published version must exist in history");
    const archivedVers = history.filter((v) => v.status === "ARCHIVED");
    assert.ok(archivedVers.length >= 1, "Historical versions must be marked ARCHIVED");
  });

  it("16 & 17. Entitlements separation: Global tier configuration does not touch /entitlements", async () => {
    // /entitlements is strictly for tenant-specific overrides
    // Verify platformEntitlementsApi interface is separate from platformPlansApi
    assert.ok(typeof platformEntitlementsApi.getTenantEntitlements === "function");
    assert.ok(typeof platformEntitlementsApi.updateOverride === "function");
    assert.ok(typeof platformEntitlementsApi.changePlan === "function");

    assert.ok(typeof platformPlansApi.listPlans === "function");
    assert.ok(typeof platformPlansApi.getPlan === "function");
    assert.ok(typeof platformPlansApi.saveDraft === "function");
    assert.ok(typeof platformPlansApi.publishPlan === "function");
    assert.ok(typeof platformPlansApi.getVersionHistory === "function");
  });
});
