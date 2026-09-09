import React, { useState, useEffect } from "react";
import { OwnerShell } from "./components/owner-shell";
import { OverviewView } from "./routes/overview";
import { TenantsView } from "./routes/tenants";
import { SubscriptionsView } from "./routes/subscriptions";
import { BillingView } from "./routes/billing";
import { UsersView } from "./routes/users";
import { EntitlementsView } from "./routes/entitlements";
import { AnalyticsView } from "./routes/analytics";
import { HealthView } from "./routes/health";
import { AuditView } from "./routes/audit";
import { SupportView } from "./routes/support";
import { SettingsView } from "./routes/settings";

export function App() {
  const [activeTab, setActiveTab] = useState<string>(() => {
    const hash = window.location.hash.replace("#", "");
    return hash || "overview";
  });

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    window.location.hash = tabId;
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash) {
        setActiveTab(hash);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const renderActiveView = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewView onNavigate={handleTabChange} />;
      case "tenants":
        return <TenantsView />;
      case "subscriptions":
        return <SubscriptionsView />;
      case "billing":
        return <BillingView />;
      case "users":
        return <UsersView />;
      case "entitlements":
        return <EntitlementsView />;
      case "analytics":
        return <AnalyticsView />;
      case "health":
        return <HealthView />;
      case "audit":
        return <AuditView />;
      case "support":
        return <SupportView />;
      case "settings":
        return <SettingsView />;
      default:
        return <OverviewView onNavigate={handleTabChange} />;
    }
  };

  return (
    <OwnerShell activeTab={activeTab} onTabChange={handleTabChange}>
      {renderActiveView()}
    </OwnerShell>
  );
}

export default App;
