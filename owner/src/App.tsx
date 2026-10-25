import React, { useState, useEffect } from "react";
import { OwnerShell } from "./components/owner-shell";
import { OwnerLogin, sanitizeOwnerRedirect } from "./components/owner-login";
import { PlatformAuthProvider, usePlatformAuth } from "./auth";
import { HardHat, Loader2 } from "lucide-react";

// Platform Governance Views
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

function OwnerLoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
        <div className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <HardHat className="size-7" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-lg font-extrabold tracking-tight">
            DEZO<span className="text-primary">BUILD</span>
          </h2>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Verifying Platform Session…
          </p>
        </div>
        <Loader2 className="size-5 animate-spin text-primary mt-2" />
      </div>
    </div>
  );
}

function OwnerAppContent() {
  const { isAuthenticated, isLoading } = usePlatformAuth();

  const [activeTab, setActiveTab] = useState<string>(() => {
    const hash = window.location.hash.replace("#", "");
    return sanitizeOwnerRedirect(hash);
  });

  const handleTabChange = (tabId: string) => {
    const sanitized = sanitizeOwnerRedirect(tabId);
    setActiveTab(sanitized);
    window.location.hash = sanitized;
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash) {
        setActiveTab(sanitizeOwnerRedirect(hash));
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  if (isLoading) {
    return <OwnerLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <OwnerLogin onSuccessRedirect={handleTabChange} />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewView onNavigate={handleTabChange} />;
      case "tenants":
        return <TenantsView />;
      case "subscriptions":
        return <SubscriptionsView onNavigate={handleTabChange} />;
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

export function App() {
  return (
    <PlatformAuthProvider>
      <OwnerAppContent />
    </PlatformAuthProvider>
  );
}

export default App;
