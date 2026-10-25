import React, { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Globe,
  Key,
  Lock,
  Mail,
  Save,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  Sliders,
  Webhook,
  X,
} from "lucide-react";
import { PageHeader } from "../components/shared/page-header";

export function SettingsView() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [forceMfa, setForceMfa] = useState(true);
  const [configNoticeOpen, setConfigNoticeOpen] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setConfigNoticeOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        eyebrow="Root Platform Governance"
        title="Global Platform Settings & Security Policies"
        subtitle="Root platform configuration, transactional email relay gateways, SIEM telemetry webhooks, and enterprise security policies."
        actions={
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
          >
            <Save className="size-4" />
            <span>Save Configuration</span>
          </button>
        }
      />

      {/* Notice Dialog */}
      {configNoticeOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setConfigNoticeOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-float space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-base font-bold text-foreground">
                <Settings className="size-4.5 text-primary" />
                <span>Platform Configuration Notice</span>
              </div>
              <button
                onClick={() => setConfigNoticeOpen(false)}
                className="rounded p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>Declarative Infrastructure Configuration</span>
              </div>
              <p className="mt-1 text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                Direct runtime persistence requires the Root Platform Gateway service. In this deployment, root security policies, SMTP credentials, and SIEM webhooks are managed declaratively via infrastructure environment variables.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setConfigNoticeOpen(false)}
                className="h-9 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-xs cursor-pointer"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Maintenance Mode Alert Box */}
        <div
          className={`rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-panel ${
            maintenanceMode
              ? "border-destructive/60 bg-destructive/10"
              : "border-border/80 bg-card"
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={`p-2.5 rounded-lg shrink-0 ${
                maintenanceMode
                  ? "bg-destructive/20 text-destructive"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Emergency Cluster Maintenance Mode
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground mt-1 max-w-2xl">
                When enabled, blocks all customer tenant traffic on{" "}
                <code className="text-foreground font-semibold font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded border border-border inline-block align-baseline mx-0.5">
                  app.dezobuild.com
                </code>{" "}
                with an HTTP 503 Maintenance Screen while keeping administrative control on{" "}
                <code className="text-foreground font-semibold font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded border border-border inline-block align-baseline mx-0.5">
                  owner.dezobuild.com
                </code>{" "}
                accessible.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMaintenanceMode(!maintenanceMode)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
              maintenanceMode
                ? "bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90"
                : "border border-border bg-background text-foreground hover:bg-muted"
            }`}
          >
            {maintenanceMode ? "MAINTENANCE ACTIVE" : "Maintenance Disabled"}
          </button>
        </div>

        {/* Global Security & Authentication Policy */}
        <div className="rounded-xl border border-border/80 bg-card p-5 space-y-4 shadow-panel">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Shield className="size-4 text-primary" />
                <span>Global Authentication & Access Policies</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Multi-tenant session lifecycles, global 2FA requirements, and password strength rules
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-foreground mb-1.5">
                Global Session Inactivity Timeout (Minutes)
              </label>
              <input
                type="number"
                defaultValue={30}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-foreground mb-1.5">
                Maximum Concurrent Sessions Per User
              </label>
              <input
                type="number"
                defaultValue={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-border/60 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-foreground">Enforce Multi-Factor Authentication (MFA)</span>
              <p className="text-[11px] text-muted-foreground">
                Require TOTP/FIDO2 hardware keys across all tenant administrative roles
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForceMfa(!forceMfa)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                forceMfa ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  forceMfa ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Global SMTP Relay */}
        <div className="rounded-xl border border-border/80 bg-card p-5 space-y-4 shadow-panel">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Mail className="size-4 text-sky-500" />
                <span>Platform Transactional Email Relay</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                High-throughput SMTP provider used for system alerts, password resets, and tenant invitations
              </p>
            </div>
            <span className="rounded bg-muted border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              Configured via Env
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-foreground mb-1.5">SMTP Provider Gateway</label>
              <input
                type="text"
                disabled
                defaultValue="Amazon SES (us-east-1)"
                className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-muted-foreground focus:outline-none cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block font-semibold text-foreground mb-1.5">System Sender Address</label>
              <input
                type="email"
                disabled
                defaultValue="notifications@dezobuild.com"
                className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-muted-foreground focus:outline-none cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Global Webhooks & SIEM */}
        <div className="rounded-xl border border-border/80 bg-card p-5 space-y-4 shadow-panel">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Webhook className="size-4 text-emerald-500" />
                <span>Security Event Stream & SIEM Webhooks</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Encrypted HTTPS endpoints receiving audit telemetry, auth anomalies, and billing events
              </p>
            </div>
            <span className="rounded bg-muted border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              Configured via Env
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-foreground mb-1.5">
                SIEM Security Event Webhook (HTTPS)
              </label>
              <input
                type="url"
                disabled
                defaultValue="https://siem.dezobuild.internal/v1/security/events"
                className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-muted-foreground focus:outline-none cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block font-semibold text-foreground mb-1.5">
                PagerDuty Emergency Escalation Webhook
              </label>
              <input
                type="url"
                disabled
                defaultValue="https://events.pagerduty.com/v2/enqueue"
                className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-muted-foreground focus:outline-none cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 font-semibold text-xs text-primary-foreground shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <Save className="size-4" />
            <span>Save Platform Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
}
