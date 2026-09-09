import React, { useState } from "react";
import {
  Boxes,
  CheckCircle2,
  HardHat,
  Layers,
  Save,
  Sliders,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Zap,
} from "lucide-react";
import { PageHeader } from "../components/shared/page-header";
import { EmptyState } from "../components/shared/empty-state";
import { MOCK_ENTITLEMENTS, PLATFORM_FEATURE_CATALOG } from "../mock/platform-data";
import type { PlatformEntitlement } from "../types";

export function EntitlementsView() {
  const [entitlements, setEntitlements] = useState<PlatformEntitlement[]>(MOCK_ENTITLEMENTS);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleToggle = (
    tenantId: string,
    feature: keyof Omit<PlatformEntitlement, "tenantId" | "tenantName" | "planTier" | "storageQuotaGb" | "storageUsedGb">
  ) => {
    setEntitlements(
      entitlements.map((e) => {
        if (e.tenantId === tenantId) {
          const updatedVal = !e[feature];
          showToast(`Updated ${feature} for ${e.tenantName}`);
          return { ...e, [feature]: updatedVal };
        }
        return e;
      })
    );
  };

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-float flex items-center gap-2">
          <CheckCircle2 className="size-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        eyebrow="Feature Gates & Add-On Modules"
        title="Feature Catalog & Tenant Entitlements"
        subtitle="Standard platform capabilities, modular micro-features, BIM engines, AI predictors, and tenant entitlement overrides."
        actions={
          entitlements.length > 0 ? (
            <button
              onClick={() => showToast("All entitlement flags synced")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 cursor-pointer"
            >
              <Save className="size-4" />
              <span>Publish Entitlement Changes</span>
            </button>
          ) : undefined
        }
      />

      {/* 1. Platform Feature Catalog (Product Configuration) */}
      <div className="rounded-xl border border-border/80 bg-card p-6 shadow-panel space-y-4">
        <div className="border-b border-border/60 pb-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Boxes className="size-4 text-primary" />
            <span>Platform Feature Gate Catalog (Product Definitions)</span>
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
            Per-tenant contract overrides, beta pilot toggles, and dedicated storage quota allocations
          </p>
        </div>

        {entitlements.length > 0 ? (
          <div className="space-y-4">
            {entitlements.map((ent) => (
              <div
                key={ent.tenantId}
                className="rounded-xl border border-border/80 bg-muted/20 p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground">{ent.tenantName}</h3>
                      <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] text-primary font-semibold">
                        {ent.planTier}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{ent.tenantId}</p>
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center gap-3">
                    <span className="tabular-nums">
                      Storage: <strong className="text-foreground">{ent.storageUsedGb} GB</strong> / {ent.storageQuotaGb} GB
                    </span>
                    <div className="w-24 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${(ent.storageUsedGb / ent.storageQuotaGb) * 100}%` }}
                      />
                    </div>
                  </div>
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
                    const isEnabled = Boolean(ent[key as keyof PlatformEntitlement]);
                    return (
                      <div
                        key={key}
                        onClick={() => handleToggle(ent.tenantId, key as any)}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-card hover:bg-muted/40 cursor-pointer transition-colors"
                      >
                        <span className="font-semibold text-foreground">{label}</span>
                        <span
                          className={`text-xs font-bold ${
                            isEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                          }`}
                        >
                          {isEnabled ? "ENABLED" : "DISABLED"}
                        </span>
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
