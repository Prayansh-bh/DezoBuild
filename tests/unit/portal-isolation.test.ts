import { describe, it, expect } from "vitest";
import {
  CustomerRole,
  PlatformRole,
  ALL_CUSTOMER_ROLES,
  ROLE_DEFINITIONS,
  PLATFORM_SUPER_ADMIN_DEFINITION,
} from "../../frontend/src/authorization/roles";
import {
  resolveNavigation,
  CANONICAL_NAV_ITEMS,
} from "../../frontend/src/authorization/navigation";
import { hasPermission } from "../../frontend/src/authorization/permissions";

describe("DEZOBUILD Dual-Portal Isolation & Role Authority", () => {
  describe("Portal Boundaries & Role Separation", () => {
    it("should clearly separate PlatformRole (SUPER_ADMIN) from CustomerRole (9 roles)", () => {
      expect(PlatformRole.SUPER_ADMIN).toBe("SUPER_ADMIN");
      expect(ALL_CUSTOMER_ROLES).toHaveLength(9);
      expect(ALL_CUSTOMER_ROLES).not.toContain("SUPER_ADMIN");
    });

    it("should define PLATFORM_SUPER_ADMIN_DEFINITION with platform scope", () => {
      expect(PLATFORM_SUPER_ADMIN_DEFINITION.scope).toBe("platform");
      expect(PLATFORM_SUPER_ADMIN_DEFINITION.key).toBe("SUPER_ADMIN");
      expect(PLATFORM_SUPER_ADMIN_DEFINITION.workspaceTitle).toContain("Platform Administration");
    });

    it("should define all 9 customer roles with customer scope", () => {
      for (const role of ALL_CUSTOMER_ROLES) {
        const meta = ROLE_DEFINITIONS[role];
        expect(meta).toBeDefined();
        expect(meta.scope).toBe("customer");
        expect(meta.title).toBeTruthy();
        expect(meta.badgeClass).toBeTruthy();
      }
    });
  });

  describe("Customer Navigation Projections (Section 14)", () => {
    it("COMPANY_OWNER receives 9 primary domain items plus administration (total 10)", () => {
      const nav = resolveNavigation({ role: CustomerRole.COMPANY_OWNER });
      expect(nav.primaryItems.map((i) => i.id)).toEqual([
        "dashboard",
        "projects",
        "finance_commercial",
        "procurement_store",
        "people_hr",
        "plant_equipment",
        "issues_alerts",
        "analytics_reports",
        "documents_drawings",
      ]);
      expect(nav.settingsItem).not.toBeNull();
      expect(nav.settingsItem?.id).toBe("administration");
      expect(nav.totalVisible).toBe(10);
      expect(nav.primaryItems[0]?.label).toBe("Executive Overview");
    });

    it("COMPANY_ADMIN receives 9 primary domain items plus administration (total 10)", () => {
      const nav = resolveNavigation({ role: CustomerRole.COMPANY_ADMIN });
      expect(nav.primaryItems.map((i) => i.id)).toEqual([
        "dashboard",
        "projects",
        "finance_commercial",
        "procurement_store",
        "people_hr",
        "plant_equipment",
        "issues_alerts",
        "analytics_reports",
        "documents_drawings",
      ]);
      expect(nav.settingsItem).not.toBeNull();
      expect(nav.totalVisible).toBe(10);
      expect(nav.primaryItems[0]?.label).toBe("Executive Overview");
    });

    it("PROJECT_MANAGER receives 9 items and NO administration settings", () => {
      const nav = resolveNavigation({ role: CustomerRole.PROJECT_MANAGER });
      expect(nav.primaryItems.map((i) => i.id)).toEqual([
        "dashboard",
        "projects",
        "finance_commercial",
        "procurement_store",
        "people_hr",
        "plant_equipment",
        "issues_alerts",
        "analytics_reports",
        "documents_drawings",
      ]);
      expect(nav.settingsItem).toBeNull();
      expect(nav.totalVisible).toBe(9);
      expect(nav.primaryItems[0]?.label).toBe("Project Overview");
    });

    it("SITE_ENGINEER receives 7 field-focused items", () => {
      const nav = resolveNavigation({ role: CustomerRole.SITE_ENGINEER });
      expect(nav.primaryItems.map((i) => i.id)).toEqual([
        "dashboard",
        "projects",
        "procurement_store",
        "people_hr",
        "plant_equipment",
        "issues_alerts",
        "documents_drawings",
      ]);
      expect(nav.settingsItem).toBeNull();
      expect(nav.totalVisible).toBe(7);
      expect(nav.primaryItems[0]?.label).toBe("Site Overview");
    });

    it("PROCUREMENT_STORE receives 6 procurement-focused items", () => {
      const nav = resolveNavigation({ role: CustomerRole.PROCUREMENT_STORE });
      expect(nav.primaryItems.map((i) => i.id)).toEqual([
        "dashboard",
        "projects",
        "procurement_store",
        "issues_alerts",
        "documents_drawings",
        "analytics_reports",
      ]);
      expect(nav.settingsItem).toBeNull();
      expect(nav.totalVisible).toBe(6);
      expect(nav.primaryItems[0]?.label).toBe("Store Overview");
    });

    it("ACCOUNTANT receives 7 finance-focused items", () => {
      const nav = resolveNavigation({ role: CustomerRole.ACCOUNTANT });
      expect(nav.primaryItems.map((i) => i.id)).toEqual([
        "dashboard",
        "finance_commercial",
        "projects",
        "procurement_store",
        "issues_alerts",
        "analytics_reports",
        "documents_drawings",
      ]);
      expect(nav.settingsItem).toBeNull();
      expect(nav.totalVisible).toBe(7);
      expect(nav.primaryItems[0]?.label).toBe("Finance Overview");
    });

    it("HR receives 6 people-focused items", () => {
      const nav = resolveNavigation({ role: CustomerRole.HR });
      expect(nav.primaryItems.map((i) => i.id)).toEqual([
        "dashboard",
        "people_hr",
        "projects",
        "issues_alerts",
        "documents_drawings",
        "analytics_reports",
      ]);
      expect(nav.settingsItem).toBeNull();
      expect(nav.totalVisible).toBe(6);
      expect(nav.primaryItems[0]?.label).toBe("HR Overview");
    });

    it("EMPLOYEE receives 4 self-service items with personalized labels", () => {
      const nav = resolveNavigation({ role: CustomerRole.EMPLOYEE });
      expect(nav.primaryItems.map((i) => i.id)).toEqual([
        "dashboard",
        "projects",
        "people_hr",
        "documents_drawings",
      ]);
      expect(nav.primaryItems.map((i) => i.label)).toEqual([
        "My Workspace",
        "My Tasks",
        "My Attendance",
        "My Documents",
      ]);
      expect(nav.settingsItem).toBeNull();
      expect(nav.totalVisible).toBe(4);
    });

    it("VIEWER receives 4 read-only items", () => {
      const nav = resolveNavigation({ role: CustomerRole.VIEWER });
      expect(nav.primaryItems.map((i) => i.id)).toEqual([
        "dashboard",
        "projects",
        "analytics_reports",
        "documents_drawings",
      ]);
      expect(nav.settingsItem).toBeNull();
      expect(nav.totalVisible).toBe(4);
      expect(nav.primaryItems[0]?.label).toBe("Read-Only Overview");
    });
  });

  describe("Permission & Domain Boundary Enforcement", () => {
    it("forbids SITE_ENGINEER from accessing finance disbursements or company administration", () => {
      expect(hasPermission(CustomerRole.SITE_ENGINEER, "finance_commercial", "view")).toBe(false);
      expect(hasPermission(CustomerRole.SITE_ENGINEER, "administration", "view")).toBe(false);
      expect(hasPermission(CustomerRole.SITE_ENGINEER, "dpr.create")).toBe(true);
      expect(hasPermission(CustomerRole.SITE_ENGINEER, "materials.indent")).toBe(true);
    });

    it("forbids PROCUREMENT_STORE from approving contractor wage payroll", () => {
      expect(hasPermission(CustomerRole.PROCUREMENT_STORE, "people_hr", "approve")).toBe(false);
      expect(hasPermission(CustomerRole.PROCUREMENT_STORE, "procurement_store", "create")).toBe(true);
      expect(hasPermission(CustomerRole.PROCUREMENT_STORE, "materials.grn")).toBe(true);
      expect(hasPermission(CustomerRole.PROCUREMENT_STORE, "materials.po")).toBe(true);
    });

    it("forbids VIEWER from creating or editing any entity", () => {
      expect(hasPermission(CustomerRole.VIEWER, "projects", "create")).toBe(false);
      expect(hasPermission(CustomerRole.VIEWER, "procurement_store", "create")).toBe(false);
      expect(hasPermission(CustomerRole.VIEWER, "dpr.create")).toBe(false);
      expect(hasPermission(CustomerRole.VIEWER, "projects", "view")).toBe(true);
    });

    it("allows COMPANY_OWNER and COMPANY_ADMIN full executive capabilities", () => {
      expect(hasPermission(CustomerRole.COMPANY_OWNER, "administration", "view")).toBe(true);
      expect(hasPermission(CustomerRole.COMPANY_ADMIN, "administration", "view")).toBe(true);
      expect(hasPermission(CustomerRole.COMPANY_OWNER, "finance_commercial", "approve")).toBe(true);
      expect(hasPermission(CustomerRole.COMPANY_OWNER, "projects", "create")).toBe(true);
    });
  });
});
