import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  Check,
  Crown,
  Layers,
  Sparkles,
  Zap,
  RefreshCw,
  Sliders,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "../components/shared/page-header";
import { EmptyState } from "../components/shared/empty-state";
import {
  platformPlansApi,
  type PlatformPlanDetailDto,
} from "../lib/api/plans";
import { TierEditorModal, CANONICAL_FEATURES } from "../components/tier-editor-modal";

interface SubscriptionsViewProps {
  onNavigate?: (tab: string) => void;
}

export function SubscriptionsView({ onNavigate }: SubscriptionsViewProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [plans, setPlans] = useState<PlatformPlanDetailDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // In-place Tier Configuration Drawer/Modal State
  const [selectedPlanForEditor, setSelectedPlanForEditor] = useState<PlatformPlanDetailDto | null>(null);

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await platformPlansApi.listPlans();
      setPlans(data);
    } catch (err: any) {
      setError(err.message || "Failed to load global platform subscription plans.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handlePlanUpdated = (updatedPlan: PlatformPlanDetailDto) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === updatedPlan.id ? updatedPlan : p))
    );
    if (selectedPlanForEditor?.id === updatedPlan.id) {
      setSelectedPlanForEditor(updatedPlan);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        eyebrow="Commercial Packaging & Plans"
        title="SaaS Subscriptions & Plan Tiers"
        subtitle="Global packaging, pricing engines, immutable version lineage, and tenant plan governance."
        actions={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadPlans}
              disabled={isLoading}
              className="h-9 px-3 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>

            <div className="flex items-center rounded-lg border border-border bg-muted/60 p-1">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  billingCycle === "monthly"
                    ? "bg-card text-foreground shadow-panel"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("annual")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  billingCycle === "annual"
                    ? "bg-card text-foreground shadow-panel"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Annual (2 Mo Free)</span>
                <span className="rounded bg-emerald-500/20 px-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                  -17%
                </span>
              </button>
            </div>
          </div>
        }
      />

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-600 dark:text-rose-400 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="size-4.5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Failed to Load Global Plans</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadPlans}
            className="px-3 py-1 rounded-md bg-rose-500 text-white font-semibold text-xs hover:bg-rose-600 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton or Plan Tier Cards */}
      {isLoading && plans.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card p-6 h-96 animate-pulse space-y-4"
            >
              <div className="h-6 bg-muted rounded w-1/2" />
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-12 bg-muted rounded w-1/3 mt-4" />
              <div className="h-24 bg-muted rounded w-full mt-4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const activeVersion = plan.publishedVersion || plan.draftVersion;
            const priceMonthly = activeVersion ? Number(activeVersion.priceMonthly) : 0;
            const priceAnnual = activeVersion ? Number(activeVersion.priceAnnual) : 0;
            const displayPrice =
              billingCycle === "monthly"
                ? priceMonthly
                : Math.round(priceAnnual / 12);

            const isPopular = plan.code === "PROFESSIONAL";

            // Enabled feature names
            const enabledFeatureKeys = new Set(
              Object.entries(activeVersion?.features || {})
                .filter(([_, isEnabled]) => isEnabled)
                .map(([key]) => key)
            );

            const featureItems = CANONICAL_FEATURES.filter((f) =>
              enabledFeatureKeys.has(f.key)
            );

            return (
              <div
                key={plan.id}
                className={`rounded-2xl border p-6 flex flex-col justify-between relative transition-all shadow-panel ${
                  isPopular
                    ? "border-primary/60 bg-gradient-to-b from-card to-primary/5 shadow-float"
                    : "border-border/80 bg-card hover:border-border"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-primary/40 bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm flex items-center gap-1">
                    <Sparkles className="size-3" /> Most Popular Enterprise Tier
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-foreground">
                        {plan.name}
                      </h3>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                          v{plan.publishedVersion?.versionNumber || 1}
                        </span>
                        {plan.draftVersion && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            Draft v{plan.draftVersion.versionNumber}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 min-h-[32px]">
                      {plan.description || "Global subscription packaging tier"}
                    </p>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black tracking-tight text-foreground tabular-nums">
                        ₹{(displayPrice / 1000).toLocaleString("en-IN")}k
                      </span>
                      <span className="text-xs text-muted-foreground">/ month</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                      {billingCycle === "annual"
                        ? `Billed annually (₹${(priceAnnual / 100000).toFixed(2)}L/yr)`
                        : "Billed monthly"}
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs space-y-1.5">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Max Projects:</span>
                      <span className="font-bold text-foreground tabular-nums">
                        {activeVersion?.maxProjects !== null && activeVersion?.maxProjects !== undefined
                          ? `${activeVersion.maxProjects} projects`
                          : "Unlimited"}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Seat Allocation:</span>
                      <span className="font-bold text-foreground tabular-nums">
                        {activeVersion?.maxSeats !== null && activeVersion?.maxSeats !== undefined
                          ? `Up to ${activeVersion.maxSeats} users`
                          : "Unlimited users"}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Cloud Storage:</span>
                      <span className="font-bold text-foreground tabular-nums">
                        {activeVersion?.maxStorageGb !== null && activeVersion?.maxStorageGb !== undefined
                          ? `${activeVersion.maxStorageGb} GB SSD`
                          : "Unlimited"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Included Canonical Features ({featureItems.length}):
                    </p>
                    <ul className="space-y-2 text-xs text-foreground">
                      {featureItems.slice(0, 7).map((feat) => (
                        <li key={feat.key} className="flex items-start gap-2">
                          <Check className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feat.name}</span>
                        </li>
                      ))}
                      {featureItems.length > 7 && (
                        <li className="text-[11px] text-muted-foreground pl-6 font-medium">
                          + {featureItems.length - 7} additional enterprise modules
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setSelectedPlanForEditor(plan)}
                    className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isPopular
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                        : "bg-muted hover:bg-muted/80 text-foreground border border-border"
                    }`}
                  >
                    <Sliders className="size-3.5" />
                    <span>Configure Tier Rules</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* In-Place Tier Configuration Editor Modal */}
      {selectedPlanForEditor && (
        <TierEditorModal
          plan={selectedPlanForEditor}
          isOpen={Boolean(selectedPlanForEditor)}
          onClose={() => setSelectedPlanForEditor(null)}
          onPlanUpdated={handlePlanUpdated}
        />
      )}

      {/* Add-On Enterprise Feature Modules */}
      <div className="rounded-xl border border-border/80 bg-card p-6 shadow-panel space-y-4">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Zap className="size-4 text-primary" />
          <span>Modular Add-On Micro-Packages</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1.5">
            <h4 className="text-xs font-bold text-foreground">Drone Aerial Orthomosaic Engine</h4>
            <p className="text-[11px] text-muted-foreground">
              High-resolution GeoTIFF volumetric cut/fill earthwork calculation models.
            </p>
            <p className="text-xs font-bold text-primary pt-2 tabular-nums">+₹49,999/site/mo</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1.5">
            <h4 className="text-xs font-bold text-foreground">Biometric Machine Hardware Sync</h4>
            <p className="text-[11px] text-muted-foreground">
              Direct IP whitelist & MQTT broker connector for eSSL/Matrix turnstile devices.
            </p>
            <p className="text-xs font-bold text-primary pt-2 tabular-nums">+₹19,999/tenant/mo</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1.5">
            <h4 className="text-xs font-bold text-foreground">Tally Prime & SAP ECC Connector</h4>
            <p className="text-[11px] text-muted-foreground">
              Two-way automatic sync of vendor ledgers, retention balances, and TDS entries.
            </p>
            <p className="text-xs font-bold text-primary pt-2 tabular-nums">+₹29,999/tenant/mo</p>
          </div>
        </div>
      </div>

      {/* Active Customer Subscriptions Ledger */}
      <div className="rounded-xl border border-border/80 bg-card p-6 shadow-panel space-y-4">
        <div className="border-b border-border/60 pb-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Crown className="size-4 text-primary" />
            <span>Active Tenant Customer Subscriptions</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Live tenant plan allocations, contract durations, and automated recurring billing schedules
          </p>
        </div>

        <EmptyState
          icon={Crown}
          title="No active subscriptions yet"
          description="Customer subscription contracts and renewal schedules will appear here once tenant organizations are provisioned."
        />
      </div>
    </div>
  );
}
