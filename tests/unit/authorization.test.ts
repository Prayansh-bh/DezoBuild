import { describe, it, expect } from "vitest";
import {
  PlatformRole,
  CustomerRole,
  ALL_CUSTOMER_ROLES,
  ROLE_DEFINITIONS,
  PLATFORM_SUPER_ADMIN_DEFINITION,
} from "../../frontend/src/authorization/roles";
import {
  hasPermission,
  DEFAULT_ROLE_PERMISSIONS,
} from "../../frontend/src/authorization/permissions";
import {
  getWorkspaceConfig,
  WORKSPACE_CONFIGS,
} from "../../frontend/src/authorization/workspace";
import {
  resolveNavigation,
  CANONICAL_NAV_ITEMS,
} from "../../frontend/src/authorization/navigation";
import {
  MASTER_MODULE_CATALOG,
  ALL_MODULE_DOMAINS,
} from "../../frontend/src/config/modules";
import { MOCK_USERS, DEFAULT_MOCK_USER } from "../../frontend/src/auth/mock-users";

describe("Authoritative Role Model & Platform Separation", () => {
  it("strictly separates Platform Super Admin from Customer Company roles", () => {
    expect(PlatformRole.SUPER_ADMIN).toBe("SUPER_ADMIN");
    expect(PLATFORM_SUPER_ADMIN_DEFINITION.scope).toBe("platform");
    expect(PLATFORM_SUPER_ADMIN_DEFINITION.workspaceTitle).toContain("Platform Administration Console");

    // Super Admin must NOT be a customer company role
    expect(ALL_CUSTOMER_ROLES).not.toContain(PlatformRole.SUPER_ADMIN);
    expect(ALL_CUSTOMER_ROLES).toHaveLength(9);
  });

  it("defines all 9 customer roles with complete metadata", () => {
    const requiredRoles = [
      "COMPANY_OWNER",
      "COMPANY_ADMIN",
      "PROJECT_MANAGER",
      "SITE_ENGINEER",
      "PROCUREMENT_STORE",
      "ACCOUNTANT",
      "HR",
      "EMPLOYEE",
      "VIEWER",
    ];

    for (const roleKey of requiredRoles) {
      expect(CustomerRole).toHaveProperty(roleKey);
      const meta = ROLE_DEFINITIONS[roleKey as keyof typeof CustomerRole];
      expect(meta).toBeDefined();
      expect(meta.scope).toBe("customer");
      expect(meta.title).toBeTruthy();
      expect(meta.badgeClass).toBeTruthy();
    }
  });
});

describe("Master Customer Module Catalog", () => {
  it("contains all 9 canonical business domains", () => {
    const expectedDomainKeys = [
      "PROJECTS",
      "PROCUREMENT_STORE",
      "PEOPLE_HR",
      "PLANT_EQUIPMENT",
      "FINANCE_COMMERCIAL",
      "ISSUES_ALERTS",
      "ANALYTICS_REPORTS",
      "DOCUMENTS_DRAWINGS",
      "ADMINISTRATION",
    ];

    expect(Object.keys(MASTER_MODULE_CATALOG)).toEqual(
      expect.arrayContaining(expectedDomainKeys)
    );
    expect(ALL_MODULE_DOMAINS).toHaveLength(9);

    // Each domain must have submodules and capability tags
    for (const domain of ALL_MODULE_DOMAINS) {
      expect(domain.id).toBeTruthy();
      expect(domain.primaryRoute).toBeTruthy();
      expect(domain.submodules.length).toBeGreaterThan(0);
      domain.submodules.forEach((sub) => {
        expect(sub.capabilityTag).toBeTruthy();
      });
    }
  });
});

describe("Role-Aware Navigation Resolver (Section 14 Validations)", () => {
  it("projects full executive navigation for COMPANY_OWNER including Administration", () => {
    const nav = resolveNavigation({
      role: CustomerRole.COMPANY_OWNER,
    });

    const labels = nav.primaryItems.map((i) => i.label);
    expect(labels[0]).toBe("Executive Overview");
    expect(labels).toContain("Projects");
    expect(labels).toContain("Finance & Commercial");
    expect(labels).toContain("Procurement & Store");
    expect(labels).toContain("People & HR");
    expect(labels).toContain("Plant & Equipment");
    expect(labels).toContain("Issues & Alerts");
    expect(labels).toContain("Analytics & Reports");
    expect(labels).toContain("Documents & Drawings");

    expect(nav.settingsItem).not.toBeNull();
    expect(nav.settingsItem?.label).toBe("Administration");
    expect(nav.totalVisible).toBe(10);
  });

  it("projects full governance navigation for COMPANY_ADMIN including Administration", () => {
    const nav = resolveNavigation({
      role: CustomerRole.COMPANY_ADMIN,
    });

    const labels = nav.primaryItems.map((i) => i.label);
    expect(labels[0]).toBe("Executive Overview");
    expect(labels).toContain("Projects");
    expect(labels).toContain("Finance & Commercial");
    expect(labels).toContain("Procurement & Store");
    expect(labels).toContain("People & HR");
    expect(labels).toContain("Plant & Equipment");
    expect(labels).toContain("Issues & Alerts");
    expect(labels).toContain("Analytics & Reports");
    expect(labels).toContain("Documents & Drawings");

    expect(nav.settingsItem).not.toBeNull();
    expect(nav.settingsItem?.label).toBe("Administration");
    expect(nav.totalVisible).toBe(10);
  });

  it("projects operational navigation for PROJECT_MANAGER without Administration", () => {
    const nav = resolveNavigation({
      role: CustomerRole.PROJECT_MANAGER,
    });

    const labels = nav.primaryItems.map((i) => i.label);
    expect(labels[0]).toBe("Project Overview");
    expect(labels).toContain("Projects");
    expect(labels).toContain("Finance & Commercial");
    expect(labels).toContain("Procurement & Store");
    expect(labels).toContain("People & HR");
    expect(labels).toContain("Plant & Equipment");
    expect(labels).toContain("Issues & Alerts");
    expect(labels).toContain("Analytics & Reports");
    expect(labels).toContain("Documents & Drawings");

    // Project manager must not see Administration settings by default
    expect(nav.settingsItem).toBeNull();
    expect(nav.totalVisible).toBe(9);
  });

  it("projects field-focused navigation for SITE_ENGINEER without Finance or Admin", () => {
    const nav = resolveNavigation({
      role: CustomerRole.SITE_ENGINEER,
    });

    const labels = nav.primaryItems.map((i) => i.label);
    expect(labels[0]).toBe("Site Overview");
    expect(labels).toContain("Projects");
    expect(labels).toContain("Procurement & Store");
    expect(labels).toContain("People & HR");
    expect(labels).toContain("Plant & Equipment");
    expect(labels).toContain("Issues & Alerts");
    expect(labels).toContain("Documents & Drawings");

    expect(labels).not.toContain("Finance & Commercial");
    expect(labels).not.toContain("Analytics & Reports");
    expect(nav.settingsItem).toBeNull();
    expect(nav.totalVisible).toBe(7);
  });

  it("projects store-focused navigation for PROCUREMENT_STORE", () => {
    const nav = resolveNavigation({
      role: CustomerRole.PROCUREMENT_STORE,
    });

    const labels = nav.primaryItems.map((i) => i.label);
    expect(labels[0]).toBe("Store Overview");
    expect(labels).toContain("Projects");
    expect(labels).toContain("Procurement & Store");
    expect(labels).toContain("Issues & Alerts");
    expect(labels).toContain("Documents & Drawings");
    expect(labels).toContain("Analytics & Reports");

    expect(labels).not.toContain("People & HR");
    expect(labels).not.toContain("Finance & Commercial");
    expect(nav.settingsItem).toBeNull();
    expect(nav.totalVisible).toBe(6);
  });

  it("projects financial navigation for ACCOUNTANT", () => {
    const nav = resolveNavigation({
      role: CustomerRole.ACCOUNTANT,
    });

    const labels = nav.primaryItems.map((i) => i.label);
    expect(labels[0]).toBe("Finance Overview");
    expect(labels).toContain("Finance & Commercial");
    expect(labels).toContain("Projects");
    expect(labels).toContain("Procurement & Store");
    expect(labels).toContain("Issues & Alerts");
    expect(labels).toContain("Analytics & Reports");
    expect(labels).toContain("Documents & Drawings");

    expect(labels).not.toContain("People & HR");
    expect(nav.settingsItem).toBeNull();
    expect(nav.totalVisible).toBe(7);
  });

  it("projects workforce navigation for HR", () => {
    const nav = resolveNavigation({
      role: CustomerRole.HR,
    });

    const labels = nav.primaryItems.map((i) => i.label);
    expect(labels[0]).toBe("HR Overview");
    expect(labels).toContain("People & HR");
    expect(labels).toContain("Projects");
    expect(labels).toContain("Issues & Alerts");
    expect(labels).toContain("Documents & Drawings");
    expect(labels).toContain("Analytics & Reports");

    expect(labels).not.toContain("Finance & Commercial");
    expect(labels).not.toContain("Procurement & Store");
    expect(nav.settingsItem).toBeNull();
    expect(nav.totalVisible).toBe(6);
  });

  it("projects simplified 4-item navigation for EMPLOYEE", () => {
    const nav = resolveNavigation({
      role: CustomerRole.EMPLOYEE,
    });

    const labels = nav.primaryItems.map((i) => i.label);
    expect(labels).toEqual([
      "My Workspace",
      "My Tasks",
      "My Attendance",
      "My Documents",
    ]);

    expect(labels).not.toContain("Finance & Commercial");
    expect(labels).not.toContain("Procurement & Store");
    expect(labels).not.toContain("Plant & Equipment");
    expect(labels).not.toContain("Analytics & Reports");
    expect(labels).not.toContain("Administration");
    expect(nav.settingsItem).toBeNull();
    expect(nav.totalVisible).toBe(4);
  });

  it("projects read-only 4-item navigation for VIEWER", () => {
    const nav = resolveNavigation({
      role: CustomerRole.VIEWER,
    });

    const labels = nav.primaryItems.map((i) => i.label);
    expect(labels).toEqual([
      "Read-Only Overview",
      "Projects",
      "Analytics & Reports",
      "Documents & Drawings",
    ]);

    expect(labels).not.toContain("Finance & Commercial");
    expect(labels).not.toContain("Procurement & Store");
    expect(labels).not.toContain("People & HR");
    expect(labels).not.toContain("Administration");
    expect(nav.settingsItem).toBeNull();
    expect(nav.totalVisible).toBe(4);
  });
});

describe("Workspace Model & Contextual Identity", () => {
  it("provides distinct workspace identities per role", () => {
    expect(getWorkspaceConfig(CustomerRole.COMPANY_OWNER).identityTitle).toBe("Executive Overview");
    expect(getWorkspaceConfig(CustomerRole.COMPANY_ADMIN).identityTitle).toBe("Organization Overview");
    expect(getWorkspaceConfig(CustomerRole.PROJECT_MANAGER).identityTitle).toBe("Project Operations");
    expect(getWorkspaceConfig(CustomerRole.SITE_ENGINEER).identityTitle).toBe("Site Operations");
    expect(getWorkspaceConfig(CustomerRole.PROCUREMENT_STORE).identityTitle).toBe("Procurement & Store");
    expect(getWorkspaceConfig(CustomerRole.ACCOUNTANT).identityTitle).toBe("Financial Overview");
    expect(getWorkspaceConfig(CustomerRole.HR).identityTitle).toBe("People Overview");
    expect(getWorkspaceConfig(CustomerRole.EMPLOYEE).identityTitle).toBe("Employee Self-Service");
    expect(getWorkspaceConfig(CustomerRole.VIEWER).identityTitle).toBe("Auditor Overview");
  });
});

describe("Mock Authentication & Personas", () => {
  it("has mock user profiles covering all 9 customer roles", () => {
    expect(MOCK_USERS).toHaveLength(9);
    const assignedRoles = MOCK_USERS.map((u) => u.role);
    for (const customerRole of ALL_CUSTOMER_ROLES) {
      expect(assignedRoles).toContain(customerRole);
    }
  });

  it("decouples project/site assignments from user roles", () => {
    const pmUser = MOCK_USERS.find((u) => u.role === CustomerRole.PROJECT_MANAGER);
    expect(pmUser).toBeDefined();
    expect(pmUser?.assignedProjects.length).toBeGreaterThan(0);
    expect(pmUser?.assignedProjects[0]?.projectId).toBe("proj-001");
  });
});

describe("Authoritative Entity Action Permissions", () => {
  it("verifies financial permission boundaries between roles", () => {
    // Accountant and Owner can view/create commercial items
    expect(hasPermission(CustomerRole.ACCOUNTANT, "commercial.view")).toBe(true);
    expect(hasPermission(CustomerRole.ACCOUNTANT, "commercial.expense")).toBe(true);
    expect(hasPermission(CustomerRole.COMPANY_OWNER, "commercial.view")).toBe(true);
    expect(hasPermission(CustomerRole.COMPANY_OWNER, "commercial.expense")).toBe(true);

    // Site Engineer and Employee cannot view financial ledger
    expect(hasPermission(CustomerRole.SITE_ENGINEER, "commercial.view")).toBe(false);
    expect(hasPermission(CustomerRole.EMPLOYEE, "commercial.view")).toBe(false);
  });

  it("verifies DPR and WBS operational boundaries", () => {
    // PM can create WBS, approve DPR
    expect(hasPermission(CustomerRole.PROJECT_MANAGER, "wbs.create")).toBe(true);
    expect(hasPermission(CustomerRole.PROJECT_MANAGER, "dpr.view")).toBe(true);

    // Site Engineer can create DPR, but cannot create WBS baseline
    expect(hasPermission(CustomerRole.SITE_ENGINEER, "dpr.create")).toBe(true);
    expect(hasPermission(CustomerRole.SITE_ENGINEER, "wbs.create")).toBe(false);

    // Viewer is read-only
    expect(hasPermission(CustomerRole.VIEWER, "dpr.view")).toBe(true);
    expect(hasPermission(CustomerRole.VIEWER, "dpr.create")).toBe(false);
    expect(hasPermission(CustomerRole.VIEWER, "wbs.create")).toBe(false);
  });

  it("verifies procurement and store permissions", () => {
    // Site engineer can indent but cannot issue PO
    expect(hasPermission(CustomerRole.SITE_ENGINEER, "materials.indent")).toBe(true);
    expect(hasPermission(CustomerRole.SITE_ENGINEER, "materials.po")).toBe(false);

    // Procurement store can indent, PO, and GRN
    expect(hasPermission(CustomerRole.PROCUREMENT_STORE, "materials.indent")).toBe(true);
    expect(hasPermission(CustomerRole.PROCUREMENT_STORE, "materials.po")).toBe(true);
    expect(hasPermission(CustomerRole.PROCUREMENT_STORE, "materials.grn")).toBe(true);
  });
});
