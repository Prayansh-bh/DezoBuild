import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  HardHat,
  Layers,
  Loader2,
  RefreshCw,
  Save,
  Sliders,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  X,
  Zap,
} from "lucide-react";
import { PageHeader } from "../components/shared/page-header";
import { EmptyState } from "../components/shared/empty-state";
import { PLATFORM_FEATURE_CATALOG } from "../mock/platform-data";
import {
  platformTenantsApi,
  platformEntitlementsApi,
  type PlatformTenantListItem,
  type EffectiveSubscriptionDetails,
} from "../lib/api";

const FEATURE_KEY_MAP: Record<string, string> = {
  bim3dViewer: "bim:3d_viewer",
  aiScheduleForecasting: "ai:schedule_forecasting",
  tallyErpSync: "integrations:erp_sync",
  biometricHardwareSync: "hardware:biometric",
  droneSurveyOrthomosaic: "survey:drone_orthomosaic",
  customDomainSsl: "security:custom_domain",
};

interface TenantWithEntitlements {
  tenant: PlatformTenantListItem;
  subscription: EffectiveSubscriptionDetails | null;
}

export function EntitlementsView() {
  const [tenantsWithEntitlements, setTenantsWithEntitlements] = useState<TenantWithEntitlements[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingKeys, setTogglingKeys] = useState<Record<string, boolean>>({});
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setFeedbackMsg(null);
    try {
      const tenantRes = await platformTenantsApi.listTenants({ limit: 50 });
      const items = tenantRes.items || [];

      const enriched = await Promise.all(
        items.map(async (tenant) => {
          try {
            const sub = await platformEntitlementsApi.getTenantEntitlements(tenant.id);
            return { tenant, subscription: sub };
          } catch {
            return { tenant, subscription: null };
          }
        })
      );

      setTenantsWithEntitlements(enriched);
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message || "Failed to load platform entitlements." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (tenantId: string, uiKey: string, currentValue: boolean) => {
    const backendKey = FEATURE_KEY_MAP[uiKey] || uiKey;
    const keyId = `${tenantId}-${backendKey}`;

    setTogglingKeys((prev) => ({ ...prev, [keyId]: true }));
    setFeedbackMsg(null);

    try {
      const nextState = !currentValue;
      const updatedSub = await platformEntitlementsApi.updateOverride(tenantId, {
        featureKey: backendKey,
        isEnabled: nextState,
      });

      // Update state with authoritative recalculated subscription
      setTenantsWithEntitlements((prev) =>
        prev.map((item) => {
          if (item.tenant.id === tenantId) {
            return { ...item, subscription: updatedSub };
          }
          return item;
        })
      );

      setFeedbackMsg({
        type: "success",
        text: `Entitlement '${backendKey}' ${nextState ? "ENABLED" : "DISABLED"} and persisted to PostgreSQL.`,
      });
    } catch (err: any) {
      setFeedbackMsg({
        type: "error",
        text: `Failed to update entitlement: ${err.message}`,
      });
    } finally {
      setTogglingKeys((prev) => ({ ...prev, [keyId]: false }));
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        eyebrow="Platform Features & Add-On Modules"
        title="Feature Catalog & Tenant Access Limits"
        subtitle="Standard platform capabilities, modular features, BIM engines, AI predictors, and tenant access limits."
        actions={
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-xs transition-all hover:bg-muted/50 cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Sync with PostgreSQL</span>
          </button>
        }
      />

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`rounded-xl border p-4 text-xs flex items-center justify-between gap-2 ${
            feedbackMsg.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : (
              <AlertCircle className="size-4 shrink-0" />
            )}
            <span className="font-semibold">{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="rounded p-1 hover:opacity-75 cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* 1. Platform Feature Catalog (Product Configuration) */}
      <div className="rounded-xl border border-border/80 bg-card p-6 shadow-panel space-y-4">
        <div className="border-b border-border/60 pb-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Boxes className="size-4 text-primary" />
            <span>Platform Features & Add-ons</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Global DEZOBUILD software capabilities available across subscription tiers and add-on licenses
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLATFORM_FEATURE_CATALOG.map((feat) => (
            <div
              key={feat.key}
              className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2.5 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground">{feat.name}</span>
                  <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                    {feat.category}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {feat.description}
                </p>
              </div>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Default in:</span>
                <span className="font-semibold text-foreground">
                  {feat.includedInTiers.join(", ")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Tenant Entitlement Overrides (Active Customer Data) */}
      <div className="rounded-xl border border-border/80 bg-card p-6 shadow-panel space-y-4">
        <div className="border-b border-border/60 pb-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Sliders className="size-4 text-primary" />
            <span>Tenant Entitlement Assignments & Feature Flags</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Per-tenant contract overrides, beta pilot toggles, and dedicated storage quota allocations (persisted to PostgreSQL)
          </p>
        </div>

        {isLoading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="size-6 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground">Loading authoritative tenant entitlements from cluster…</p>
          </div>
        ) : tenantsWithEntitlements.length > 0 ? (
          <div className="space-y-4">
            {tenantsWithEntitlements.map(({ tenant, subscription }) => (
              <div
                key={tenant.id}
                className="rounded-xl border border-border/80 bg-muted/20 p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground">{tenant.name}</h3>
                      <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] text-primary font-semibold">
                        {tenant.planTier}
                      </span>
                      {subscription && (
                        <span className="rounded bg-muted border border-border px-2 py-0.5 text-[10px] text-muted-foreground font-mono">
                          {subscription.status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">{tenant.code} ({tenant.id})</p>
                  </div>

                  {subscription && (
                    <div className="text-xs text-muted-foreground flex items-center gap-3">
                      <span>
                        Seats: <strong className="text-foreground">{subscription.quotas.seats.current}</strong> / {subscription.quotas.seats.max || "Unlimited"}
                      </span>
                      <span>
                        Sites: <strong className="text-foreground">{subscription.quotas.activeProjects.current}</strong> / {subscription.quotas.activeProjects.max || "Unlimited"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Toggle Switches */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1 text-xs">
                  {[
                    { key: "bim3dViewer", label: "BIM 3D Model Viewer" },
                    { key: "aiScheduleForecasting", label: "AI Slippage & Schedule Predictor" },
                    { key: "tallyErpSync", label: "Tally / ERP Sync Gateway" },
                    { key: "biometricHardwareSync", label: "Biometric Hardware Sync" },
                    { key: "droneSurveyOrthomosaic", label: "Drone Orthomosaic Mesh" },
                    { key: "customDomainSsl", label: "Custom Subdomain SSL" },
                  ].map(({ key, label }) => {
                    const backendKey = FEATURE_KEY_MAP[key] || key;
                    const isEnabled = Boolean(subscription?.entitlements?.[backendKey]);
                    const keyId = `${tenant.id}-${backendKey}`;
                    const isToggling = Boolean(togglingKeys[keyId]);

                    return (
                      <div
                        key={key}
                        onClick={() => !isToggling && handleToggle(tenant.id, key, isEnabled)}
                        className={`flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/40 cursor-pointer transition-colors ${
                          isEnabled
                            ? "border-emerald-500/40 bg-emerald-500/5"
                            : "border-border/60"
                        } ${isToggling ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <span className="font-semibold text-foreground">{label}</span>
                        <div className="flex items-center gap-1.5">
                          {isToggling ? (
                            <Loader2 className="size-3.5 animate-spin text-primary" />
                          ) : (
                            <span
                              className={`text-xs font-bold ${
                                isEnabled
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {isEnabled ? "ENABLED" : "DISABLED"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Sliders}
            title="No tenant entitlement assignments yet"
            description="Feature overrides, beta flags, and storage quota limits can be customized per tenant organization once customer workspaces are provisioned."
          />
        )}
      </div>
    </div>
  );
}
