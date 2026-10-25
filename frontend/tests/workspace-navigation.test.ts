import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CustomerRole } from '../src/authorization/roles';
import { resolveNavigation, CANONICAL_NAV_ITEMS } from '../src/authorization/navigation';

describe('DEZOBUILD Frontend Navigation & Workspace Feature Gating Suite', () => {
  it('1. should show all permitted items when effectiveFeatures are not restricted', () => {
    const nav = resolveNavigation({
      role: CustomerRole.COMPANY_OWNER,
    });

    const ids = nav.primaryItems.map((i) => i.id);
    assert.ok(ids.includes('dashboard'));
    assert.ok(ids.includes('projects'));
    assert.ok(ids.includes('procurement_store'));
    assert.ok(ids.includes('finance_commercial'));
    assert.ok(nav.settingsItem !== null);
  });

  it('2. should hide Projects navigation when projects:core is disabled in workspace', () => {
    const nav = resolveNavigation({
      role: CustomerRole.COMPANY_OWNER,
      effectiveFeatures: {
        'projects:core': false,
      },
    });

    const ids = nav.primaryItems.map((i) => i.id);
    assert.ok(!ids.includes('projects'), 'Projects must be hidden when projects:core is false');
    assert.ok(ids.includes('procurement_store'), 'Other enabled modules must remain visible');
  });

  it('3. should hide Finance navigation when finance:commercial is disabled in workspace', () => {
    const nav = resolveNavigation({
      role: CustomerRole.COMPANY_OWNER,
      effectiveFeatures: {
        'finance:commercial': false,
      },
    });

    const ids = nav.primaryItems.map((i) => i.id);
    assert.ok(!ids.includes('finance_commercial'), 'Finance must be hidden when finance:commercial is false');
    assert.ok(ids.includes('projects'), 'Projects must remain visible');
  });

  it('4. should still enforce RBAC when a feature is active', () => {
    // Viewer should not see Finance even if finance:commercial is active
    const nav = resolveNavigation({
      role: CustomerRole.VIEWER,
      effectiveFeatures: {
        'finance:commercial': true,
      },
    });

    const ids = nav.primaryItems.map((i) => i.id);
    assert.ok(!ids.includes('finance_commercial'), 'Viewer must not see Finance despite workspace enablement');
  });

  it('5. should allow Company Admin access to Settings', () => {
    const navAdmin = resolveNavigation({
      role: CustomerRole.COMPANY_ADMIN,
    });
    assert.ok(navAdmin.settingsItem !== null, 'Company Admin must have Settings link');

    const navSiteEngineer = resolveNavigation({
      role: CustomerRole.SITE_ENGINEER,
    });
    assert.strictEqual(navSiteEngineer.settingsItem, null, 'Site Engineer must NOT have Settings link');
  });
});
