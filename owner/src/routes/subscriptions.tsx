import React, { useState } from "react";
import { Check, Crown, HelpCircle, Layers, Sparkles, Zap } from "lucide-react";
import { PageHeader } from "../components/shared/page-header";
import { EmptyState } from "../components/shared/empty-state";
import { MOCK_SUBSCRIPTION_PLANS } from "../mock/platform-data";

export function SubscriptionsView() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        eyebrow="Commercial Packaging & Plans"
        title="SaaS Subscriptions & Plan Tiers"
        subtitle="Global packaging, pricing engines, entitlement bundles, and tenant plan allocations."
        actions={
          <div className="flex items-center rounded-lg border border-border bg-muted/60 p-1">
            <button
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
        }
      />

      {/* Plan Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {MOCK_SUBSCRIPTION_PLANS.map((plan) => {
          const price =
            billingCycle === "monthly" ? plan.monthlyPrice : Math.round(plan.annualPrice / 12);

          return (
            <div
              key={plan.id}
              className={`rounded-2xl border p-6 flex flex-col justify-between relative transition-all shadow-panel ${
                plan.recommended
                  ? "border-primary/60 bg-gradient-to-b from-card to-primary/5 shadow-float"
                  : "border-border/80 bg-card hover:border-border"
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-primary/40 bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm flex items-center gap-1">
                  <Sparkles className="size-3" /> Most Popular Enterprise Tier
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center justify-between">
                    <span>{plan.tier}</span>
                    <span className="text-[11px] text-muted-foreground font-normal">
                      {plan.activeTenants} active tenants
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">{plan.tagline}</p>
                </div>

                <div className="pt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black tracking-tight text-foreground tabular-nums">
                      ₹{(price / 1000).toLocaleString("en-IN")}k
                    </span>
                    <span className="text-xs text-muted-foreground">/ month</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                    {billingCycle === "annual" ? "Billed annually (₹" + (plan.annualPrice / 100000).toFixed(2) + "L/yr)" : "Billed monthly"}
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs space-y-1.5">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Seat Allocation:</span>
                    <span className="font-bold text-foreground tabular-nums">Up to {plan.seatLimit} users</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Cloud Storage:</span>
                    <span className="font-bold text-foreground tabular-nums">{plan.storageLimitGb} GB SSD</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Included Platform Features:
                  </p>
                  <ul className="space-y-2 text-xs text-foreground">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-border">
                <button
                  className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    plan.recommended
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                      : "bg-muted hover:bg-muted/80 text-foreground border border-border"
                  }`}
                >
                  Configure Tier Rules
                </button>
              </div>
            </div>
          );
        })}
      </div>

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
