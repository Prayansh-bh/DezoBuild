import { AppShell, useNotify } from "@/components/app-shell";
import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { StatGrid } from "@/components/shared/stat-grid";
import { HealthBadge, StatusPill, WorkflowBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  FormSection,
  FormField,
  FormRow,
  FormActions,
} from "@/components/shared/form-system";
import { formatCurrency, mockStore, useMockStore, useContextualData } from "@/mock";
import type { SmartAlert, CustomAlertRule } from "@/mock/types";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { EmptyState } from "@/components/shared/empty-state";
import {
  AlertCircle,
  AlertTriangle,
  BellPlus,
  Bot,
  Boxes,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  HardHat,
  History,
  IndianRupee,
  Layers,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  Truck,
  UserCheck,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/alerts/")({
  head: () => ({
    meta: [
      { title: "Issues & Alerts Exception Center | DEZOBUILD" },
      {
        name: "description",
        content:
          "Construction variance alerts, root cause analysis, and corrective actions in DEZOBUILD.",
      },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const store = useMockStore();
  const contextual = useContextualData();
  const notify = useNotify();
  const navigate = useNavigate();

  const alerts = contextual.alerts;
  const projects = contextual.projects;

  // Primary Section Navigation: overview | all | critical | domains | custom_rules | ai_assistant | resolved
  const [activeSection, setActiveSection] = useState<
    "overview" | "all" | "critical" | "domains" | "custom_rules" | "ai_assistant" | "resolved"
  >("overview");

  // Domain Sub-tab
  const [domainSubTab, setDomainSubTab] = useState<"project" | "site" | "materials" | "finance" | "equipment">("project");

  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  // Drawer / Modal state
  const [selectedAlert, setSelectedAlert] = useState<SmartAlert | null>(null);
  const [resolveNote, setResolveNote] = useState<string>("");
  const [createIssueOpen, setCreateIssueOpen] = useState<boolean>(false);
  const [newIssueTitle, setNewIssueTitle] = useState<string>("");
  const [newIssueProjId, setNewIssueProjId] = useState<string>(projects[0]?.id || "");
  const [newIssueSeverity, setNewIssueSeverity] = useState<"critical" | "attention" | "info">("attention");
  const [newIssueCategory, setNewIssueCategory] = useState<string>("Material");
  const [newIssueProblem, setNewIssueProblem] = useState<string>("");
  const [newIssueAction, setNewIssueAction] = useState<string>("");

  // Custom Alert Rule Builder State
  const [createRuleOpen, setCreateRuleOpen] = useState<boolean>(false);
  const [ruleName, setRuleName] = useState<string>("");
  const [ruleMetric, setRuleMetric] = useState<string>("Material Stock");
  const [ruleOperator, setRuleOperator] = useState<"<" | ">" | "=" | "<=" | ">=">("<");
  const [ruleThreshold, setRuleThreshold] = useState<string>("20");
  const [ruleScope, setRuleScope] = useState<string>("Project / Store");
  const [ruleSeverity, setRuleSeverity] = useState<"critical" | "attention" | "info">("critical");
  const [ruleRecipient, setRuleRecipient] = useState<string>("Project Manager");

  // AI Shell State
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [aiCommandInput, setAiCommandInput] = useState<string>("");

  // Calculations
  const totalOpen = alerts.filter((a) => a.status !== "resolved").length;
  const criticalAlerts = alerts.filter(
    (a) => a.severity === "critical" && a.status !== "resolved"
  );
  const criticalCount = criticalAlerts.length;
  const attentionAlerts = alerts.filter(
    (a) => a.severity === "attention" && a.status !== "resolved"
  );
  const attentionCount = attentionAlerts.length;
  const resolvedAlerts = alerts.filter((a) => a.status === "resolved");
  const resolvedCount = resolvedAlerts.length;

  // Filtered Alerts based on Section and sub-filters
  const getFilteredAlerts = () => {
    return alerts.filter((a) => {
      if (activeSection === "critical" && (a.severity !== "critical" || a.status === "resolved")) return false;
      if (activeSection === "resolved" && a.status !== "resolved") return false;
      if (activeSection === "domains") {
        if (domainSubTab === "materials" && a.category !== "Material") return false;
        if (domainSubTab === "finance" && a.category !== "Cost" && a.category !== "Payment") return false;
        if (domainSubTab === "equipment" && a.category !== "Equipment") return false;
        if (domainSubTab === "project" && a.category !== "Schedule") return false;
        if (domainSubTab === "site" && a.category !== "DPR") return false;
      }

      if (projectFilter !== "all" && a.projectId !== projectFilter) return false;
      if (categoryFilter !== "all" && a.category !== categoryFilter) return false;

      const q = search.toLowerCase();
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.problem.toLowerCase().includes(q) ||
        a.projectName.toLowerCase().includes(q) ||
        a.suggestedAction.toLowerCase().includes(q)
      );
    });
  };

  const filteredAlerts = getFilteredAlerts();

  const handleResolveAlert = (alertId: string) => {
    mockStore.resolveAlert(alertId, resolveNote || "Confirmed and rectified on site.");
    notify("Alert status updated to Resolved");
    setSelectedAlert(null);
    setResolveNote("");
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    mockStore.acknowledgeAlert(alertId);
    notify("Alert marked as Acknowledged by site leadership");
    setSelectedAlert(null);
  };

  const handleCreateIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIssueTitle) return;
    notify(`Issue "${newIssueTitle}" logged and assigned to site team.`);
    setCreateIssueOpen(false);
    setNewIssueTitle("");
    setNewIssueProblem("");
    setNewIssueAction("");
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName) return;
    mockStore.addCustomAlertRule({
      name: ruleName,
      metric: ruleMetric,
      operator: ruleOperator,
      threshold: Number(ruleThreshold) || 0,
      scope: ruleScope,
      severity: ruleSeverity,
      recipient: ruleRecipient,
      enabled: true,
      status: "Alert engine not connected",
    });
    notify(`Custom alert rule "${ruleName}" created (Alert engine not connected — backend required).`);
    setCreateRuleOpen(false);
    setRuleName("");
  };

  return (
    <AppShell crumb="Alerts">
      <PageHeader
        title="Smart Alert Engine & Risk Mitigation"
        subtitle="Automated variance detection: root cause analysis, financial/schedule impacts, and traceable corrective action triggers."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setCreateRuleOpen(true)} className="gap-1.5 shadow-sm text-xs">
              <BellPlus className="size-4" /> Build Alert Rule
            </Button>
            <Button size="sm" onClick={() => setCreateIssueOpen(true)} className="gap-1.5 shadow-sm text-xs">
              <Plus className="size-4" /> Log Site Snag / Issue
            </Button>
          </div>
        }
      />

      {/* KPI Stats */}
      <StatGrid
        columns={4}
        items={[
          {
            label: "Critical Risks",
            value: criticalCount,
            hint: "Immediate owner intervention",
            tone: criticalCount > 0 ? "critical" : "healthy",
            icon: <ShieldAlert className="size-4" />,
          },
          {
            label: "Attention Items",
            value: attentionCount,
            hint: "Site review recommended",
            tone: attentionCount > 0 ? "attention" : "healthy",
            icon: <AlertTriangle className="size-4" />,
          },
          {
            label: "Total Open Signals",
            value: totalOpen,
            hint: "Across all active projects",
            icon: <SlidersHorizontal className="size-4" />,
          },
          {
            label: "Resolved Signals",
            value: resolvedCount,
            hint: "Audited & confirmed closed",
            tone: "healthy",
            icon: <CheckCircle2 className="size-4" />,
          },
        ]}
        className="mb-6"
      />

      {/* Attention Queue */}
      {criticalCount > 0 && (
        <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-xs">
              <ShieldAlert className="size-4" />
              <span>Critical Action Queue ({criticalCount} urgent anomalies requiring mitigation)</span>
            </div>
            <span className="text-[11px] text-muted-foreground">High impact on project schedule & cost</span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 text-xs">
            {criticalAlerts.slice(0, 2).map((alert) => (
              <div
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
                className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:border-rose-500/50 cursor-pointer transition-all"
              >
                <div>
                  <p className="font-semibold text-foreground truncate max-w-xs">{alert.title}</p>
                  <p className="text-[11px] text-muted-foreground">{alert.projectName} · {alert.category}</p>
                </div>
                <span className="text-primary font-bold text-xs flex items-center gap-1">
                  Mitigate <ChevronRight className="size-3" />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section Navigation */}
      <div className="space-y-6">
        <div className="flex border-b border-border/80 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSection("overview")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
              activeSection === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="size-4" /> Risk Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("all")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
              activeSection === "all"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <SlidersHorizontal className="size-4" /> All Active Signals ({totalOpen})
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("critical")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
              activeSection === "critical"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldAlert className="size-4" /> Critical ({criticalCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("domains")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
              activeSection === "domains"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="size-4" /> Domain Exceptions
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("custom_rules")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
              activeSection === "custom_rules"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <BellPlus className="size-4" /> Custom Alert Rules
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("ai_assistant")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
              activeSection === "ai_assistant"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bot className="size-4" /> AI Predictive Shells
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("resolved")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
              activeSection === "resolved"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="size-4" /> Resolved Log ({resolvedCount})
          </button>
        </div>

        {/* SECTION 1: OVERVIEW */}
        {activeSection === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border bg-card p-5 shadow-panel space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-foreground">Critical Variance Exceptions</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => setActiveSection("critical")}
                  >
                    View All Critical →
                  </Button>
                </div>
                {criticalAlerts.length === 0 ? (
                  <EmptyState
                    icon={CheckCircle2}
                    title="No critical exceptions active"
                    description="All monitored project sites, materials, and cost lines are within threshold limits."
                  />
                ) : (
                  <div className="space-y-2 text-xs">
                    {criticalAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        onClick={() => setSelectedAlert(alert)}
                        className="p-3 rounded-lg border bg-rose-500/5 hover:border-rose-500/40 cursor-pointer flex justify-between items-center transition-all"
                      >
                        <div>
                          <p className="font-bold text-foreground">{alert.title}</p>
                          <p className="text-[11px] text-muted-foreground">{alert.projectName} · {alert.problem}</p>
                        </div>
                        <StatusPill tone="critical">Critical</StatusPill>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border bg-card p-5 shadow-panel space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-foreground">Domain Attention Breakdown</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => setActiveSection("domains")}
                  >
                    Domain Filters →
                  </Button>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-lg border bg-muted/20 flex justify-between items-center">
                    <span className="font-semibold">Material & Store Exceptions</span>
                    <span className="font-mono font-bold text-primary">{alerts.filter(a => a.category === "Material").length} alerts</span>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/20 flex justify-between items-center">
                    <span className="font-semibold">Schedule & Milestone Delays</span>
                    <span className="font-mono font-bold text-primary">{alerts.filter(a => a.category === "Schedule").length} alerts</span>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/20 flex justify-between items-center">
                    <span className="font-semibold">Cost & Payment Variances</span>
                    <span className="font-mono font-bold text-primary">{alerts.filter(a => a.category === "Cost" || a.category === "Payment").length} alerts</span>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/20 flex justify-between items-center">
                    <span className="font-semibold">Equipment & Plant Breakdowns</span>
                    <span className="font-mono font-bold text-primary">{alerts.filter(a => a.category === "Equipment").length} alerts</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2, 3, 4, 5: ALERT LIST VIEW */}
        {(activeSection === "all" ||
          activeSection === "critical" ||
          activeSection === "domains" ||
          activeSection === "resolved") && (
          <div className="space-y-4">
            {activeSection === "domains" && (
              <div className="flex items-center gap-2 border-b pb-2">
                <Button
                  size="sm"
                  variant={domainSubTab === "project" ? "default" : "outline"}
                  onClick={() => setDomainSubTab("project")}
                  className="text-xs gap-1.5"
                >
                  <Building2 className="size-3.5" /> Project & Schedule
                </Button>
                <Button
                  size="sm"
                  variant={domainSubTab === "site" ? "default" : "outline"}
                  onClick={() => setDomainSubTab("site")}
                  className="text-xs gap-1.5"
                >
                  <HardHat className="size-3.5" /> Site & DPR
                </Button>
                <Button
                  size="sm"
                  variant={domainSubTab === "materials" ? "default" : "outline"}
                  onClick={() => setDomainSubTab("materials")}
                  className="text-xs gap-1.5"
                >
                  <Boxes className="size-3.5" /> Materials & Inventory
                </Button>
                <Button
                  size="sm"
                  variant={domainSubTab === "finance" ? "default" : "outline"}
                  onClick={() => setDomainSubTab("finance")}
                  className="text-xs gap-1.5"
                >
                  <IndianRupee className="size-3.5" /> Finance & Commercial
                </Button>
                <Button
                  size="sm"
                  variant={domainSubTab === "equipment" ? "default" : "outline"}
                  onClick={() => setDomainSubTab("equipment")}
                  className="text-xs gap-1.5"
                >
                  <Truck className="size-3.5" /> Equipment & Fleet
                </Button>
              </div>
            )}

            <FilterBar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search alerts by title, root cause, project, impact…"
              filters={
                <>
                  <select
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                    className="h-9 rounded-md border bg-background px-3 text-xs font-medium"
                  >
                    <option value="all">All Projects</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="h-9 rounded-md border bg-background px-3 text-xs font-medium"
                  >
                    <option value="all">All Categories</option>
                    <option value="Material">Material</option>
                    <option value="Schedule">Schedule</option>
                    <option value="Cost">Cost</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Payment">Payment</option>
                    <option value="DPR">DPR</option>
                  </select>
                </>
              }
              onReset={() => {
                setSearch("");
                setProjectFilter("all");
                setCategoryFilter("all");
              }}
            />

            {filteredAlerts.length === 0 ? (
              <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 p-12 text-center">
                <CheckCircle2 className="size-10 text-success" />
                <h3 className="mt-3 text-base font-bold">No Alerts in this View</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  All parameters are currently within baseline thresholds.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-xl border border-border/80 bg-card p-5 shadow-panel space-y-4 transition-all hover:border-border hover:shadow-float"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <StatusPill tone={alert.severity as any}>
                            {alert.severity === "critical" ? "Critical Priority" : "Attention"}
                          </StatusPill>
                          <span className="rounded-md bg-muted/80 px-2 py-0.5 text-[11px] font-medium text-foreground">
                            {alert.category}
                          </span>
                          <WorkflowBadge status={alert.status} />
                        </div>
                        <h3 className="text-[15px] font-semibold text-foreground mt-2.5 tracking-tight">
                          {alert.title}
                        </h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                          <Building2 className="size-3.5" />{" "}
                          <span className="font-medium text-foreground">{alert.projectName}</span> ·
                          Detected {alert.createdAt}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedAlert(alert)}
                          className="text-xs h-8 gap-1 rounded-lg"
                        >
                          View Audit History ({alert.history.length})
                        </Button>
                      </div>
                    </div>

                    {/* Problem & Root Cause Grid */}
                    <div className="grid gap-3 sm:grid-cols-2 text-xs">
                      <div className="rounded-lg border border-border/60 p-3.5 bg-muted/15">
                        <span className="font-semibold text-muted-foreground text-[11px]">
                          Observed Symptom / Problem
                        </span>
                        <p className="mt-1 text-foreground/90 leading-relaxed">{alert.problem}</p>
                      </div>
                      <div className="rounded-lg border border-border/60 p-3.5 bg-muted/15">
                        <span className="font-semibold text-muted-foreground text-[11px]">
                          Identified Root Cause
                        </span>
                        <p className="mt-1 text-foreground/90 leading-relaxed">{alert.rootCause}</p>
                      </div>
                    </div>

                    {/* Impact & Suggested Action */}
                    <div className="grid gap-3 sm:grid-cols-2 text-xs">
                      <div className="rounded-lg border border-danger/20 bg-danger-soft/60 p-3.5">
                        <span className="font-semibold text-danger text-[11px]">
                          Operational & Financial Impact
                        </span>
                        <p className="mt-1 font-medium text-rose-800 dark:text-rose-300 text-xs leading-relaxed">
                          {alert.impact}
                        </p>
                      </div>
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5">
                        <span className="font-semibold text-primary text-[11px]">Recommended Action</span>
                        <p className="mt-1 text-foreground/90 font-medium leading-relaxed">
                          {alert.suggestedAction}
                        </p>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span>Source:</span>
                        <span className="font-semibold text-foreground">{alert.sourceRef.label}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (alert.sourceRef.to) {
                              navigate({ to: alert.sourceRef.to as any });
                            } else {
                              navigate({ to: `/projects/${alert.projectId}` as any });
                            }
                          }}
                          className="text-xs h-8 rounded-lg"
                        >
                          Review Source Transaction →
                        </Button>

                        {alert.status === "open" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                            className="text-xs h-8 rounded-lg"
                          >
                            Acknowledge
                          </Button>
                        )}

                        {alert.status !== "resolved" ? (
                          <Button
                            size="sm"
                            onClick={() => handleResolveAlert(alert.id)}
                            className="text-xs font-semibold h-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                          >
                            Resolve Alert
                          </Button>
                        ) : (
                          <span className="text-xs font-semibold text-success flex items-center gap-1">
                            <CheckCircle2 className="size-4" /> Resolved at {alert.resolvedAt || "Today"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 6: CUSTOM ALERT RULES */}
        {activeSection === "custom_rules" && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-blue-50/40 dark:bg-blue-950/20 p-4 text-xs space-y-1">
              <div className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-300">
                <BellPlus className="size-4" />
                <span>Custom Alert Rule Builder</span>
                <span className="rounded bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 text-[10px] font-mono">
                  Alert engine not connected — Backend Required
                </span>
              </div>
              <p className="text-blue-800/80 dark:text-blue-300/80 text-[11px]">
                Define parametric trigger conditions across material stock, schedule slippage, expense ceilings, and plant telemetry.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-panel space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="font-bold text-sm text-foreground">Active Custom Alert Trigger Rules</h3>
                  <p className="text-xs text-muted-foreground">Rules evaluate incoming telemetry and operational transactions</p>
                </div>
                <Button size="sm" onClick={() => setCreateRuleOpen(true)} className="gap-1.5 text-xs">
                  <Plus className="size-3.5" /> Build New Rule
                </Button>
              </div>

              {store.customAlertRules.length === 0 ? (
                <EmptyState
                  icon={BellPlus}
                  title="No custom alert rules configured"
                  description="Build automated threshold rules to notify managers upon material shortages or budget overruns."
                  action={{
                    label: "Build Rule",
                    onClick: () => setCreateRuleOpen(true),
                  }}
                />
              ) : (
                <div className="rounded-xl border bg-card overflow-hidden shadow-panel">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 border-b text-[11px] uppercase font-bold text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3">Rule Name</th>
                          <th className="px-4 py-3">Parametric Condition</th>
                          <th className="px-4 py-3">Operational Scope</th>
                          <th className="px-4 py-3">Severity</th>
                          <th className="px-4 py-3">Target Recipient</th>
                          <th className="px-4 py-3 text-center">Execution Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {store.customAlertRules.map((rule) => (
                          <tr key={rule.id} className="hover:bg-muted/20">
                            <td className="px-4 py-3 font-bold text-foreground">{rule.name}</td>
                            <td className="px-4 py-3 font-mono font-medium text-foreground">
                              WHEN <span className="text-primary font-bold">{rule.metric}</span> {rule.operator} {rule.threshold}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{rule.scope}</td>
                            <td className="px-4 py-3">
                              <StatusPill tone={rule.severity as any}>
                                {rule.severity.toUpperCase()}
                              </StatusPill>
                            </td>
                            <td className="px-4 py-3 font-medium text-foreground">{rule.recipient}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground font-bold">
                                {rule.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 7: AI & PREDICTIVE SHELLS */}
        {activeSection === "ai_assistant" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs space-y-1">
              <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-300">
                <Bot className="size-4" />
                <span>AI Predictive Services & Project Assistant Shell</span>
                <span className="rounded bg-amber-200 dark:bg-amber-900/60 px-2 py-0.5 text-[10px] font-mono font-bold">
                  AI Service Not Connected — Backend & Model Integration Required
                </span>
              </div>
              <p className="text-amber-800/80 dark:text-amber-300/80 text-[11px]">
                Predictive risk models and natural language querying require the backend machine learning and LLM orchestration pipeline.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Shell 1: Delay Prediction */}
              <div className="rounded-xl border bg-card p-5 shadow-panel space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                  <Clock className="size-4 text-primary" />
                  <span>Project Schedule Delay Prediction Shell</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Simulates Monte-Carlo critical path variance against milestone baseline dates.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="rounded-lg border bg-muted/20 p-3 text-muted-foreground">
                    <p className="font-mono text-[11px]">Status: AI Service Not Connected</p>
                    <p className="text-[11px] mt-1">Schedule risk probability analysis will execute once planning baseline and live DPR sync is established.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => notify("AI Service Not Connected — Planning Engine Required")}
                    className="w-full text-xs gap-1.5"
                  >
                    <Sparkles className="size-3.5" /> Run Schedule Risk Simulation
                  </Button>
                </div>
              </div>

              {/* Shell 2: Cost Overrun Forecast */}
              <div className="rounded-xl border bg-card p-5 shadow-panel space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                  <IndianRupee className="size-4 text-primary" />
                  <span>Cost Overrun & EAC Forecast Shell</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Predicts Estimate At Completion (EAC) using historical material burn and subcontractor productivity.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="rounded-lg border bg-muted/20 p-3 text-muted-foreground">
                    <p className="font-mono text-[11px]">Status: AI Service Not Connected</p>
                    <p className="text-[11px] mt-1">Cost forecasting requires finance transaction history and supplier purchase commitments.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => notify("AI Service Not Connected — ML Model Required")}
                    className="w-full text-xs gap-1.5"
                  >
                    <Sparkles className="size-3.5" /> Forecast Budget Variance
                  </Button>
                </div>
              </div>

              {/* Shell 3: Natural Language Assistant */}
              <div className="rounded-xl border bg-card p-5 shadow-panel space-y-3 md:col-span-2">
                <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                  <Bot className="size-4 text-primary" />
                  <span>AI Construction Copilot Query Shell</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ask questions regarding site progress, material variances, contractor muster, or compliance.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Compare actual steel consumption against standard BOQ for Metro Line 4..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!aiPrompt) return;
                      notify("AI Service Not Connected — LLM Backend Required");
                    }}
                    className="gap-1.5 text-xs shrink-0"
                  >
                    <Bot className="size-3.5" /> Ask Copilot
                  </Button>
                </div>
                <div className="rounded-lg border border-dashed bg-muted/10 p-3 text-[11px] text-muted-foreground font-mono text-center">
                  AI Service Not Connected — Natural language copilot responses require backend AI provider integration.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Log Snag / Issue Dialog */}
      <Dialog open={createIssueOpen} onOpenChange={setCreateIssueOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Log Site Issue / Snag</DialogTitle>
            <DialogDescription className="text-xs">Record a quality variance, safety hazard, or site obstacle.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateIssue} className="space-y-4 pt-2">
            <FormRow columns={1}>
              <FormField id="issue-proj" label="Project Site" required>
                <select
                  id="issue-proj"
                  value={newIssueProjId}
                  onChange={(e) => setNewIssueProjId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </FormField>

              <FormField id="issue-title" label="Issue / Snag Title" required>
                <Input
                  id="issue-title"
                  value={newIssueTitle}
                  onChange={(e) => setNewIssueTitle(e.target.value)}
                  required
                  placeholder="e.g. Honeycombing detected on Pier 14 pour"
                  className="h-9 text-xs"
                />
              </FormField>
            </FormRow>

            <FormRow columns={2}>
              <FormField id="issue-sev" label="Severity Level" required>
                <select
                  id="issue-sev"
                  value={newIssueSeverity}
                  onChange={(e) => setNewIssueSeverity(e.target.value as any)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="critical">Critical</option>
                  <option value="attention">Attention</option>
                  <option value="info">Info</option>
                </select>
              </FormField>

              <FormField id="issue-cat" label="Operational Domain" required>
                <select
                  id="issue-cat"
                  value={newIssueCategory}
                  onChange={(e) => setNewIssueCategory(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="Quality">Quality</option>
                  <option value="Safety">Safety</option>
                  <option value="Material">Material</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Schedule">Schedule</option>
                </select>
              </FormField>
            </FormRow>

            <FormRow columns={1}>
              <FormField id="issue-prob" label="Problem Description" required help="Observed symptom, defect location, and root cause context.">
                <Textarea
                  id="issue-prob"
                  value={newIssueProblem}
                  onChange={(e) => setNewIssueProblem(e.target.value)}
                  placeholder="Observed symptom, defect location, and root cause..."
                  className="h-20 text-xs"
                  required
                />
              </FormField>

              <FormField id="issue-act" label="Recommended Corrective Action" optional help="Immediate or preventative site rectification instructions.">
                <Textarea
                  id="issue-act"
                  value={newIssueAction}
                  onChange={(e) => setNewIssueAction(e.target.value)}
                  placeholder="Recommended site rectification..."
                  className="h-16 text-xs"
                />
              </FormField>
            </FormRow>

            <FormActions
              onCancel={() => setCreateIssueOpen(false)}
              submitLabel="Log Site Issue"
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Audit Detail Drawer */}
      {selectedAlert && (
        <Dialog open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <History className="size-4 text-primary" /> Alert Audit Trail & Actions
              </DialogTitle>
              <DialogDescription>
                {selectedAlert.title} · {selectedAlert.projectName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-2">
                <Label className="text-xs font-bold">Event Timeline</Label>
                <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                  {selectedAlert.history.map((h, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start">
                      <div className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/20 text-primary font-bold text-[10px]">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{h.action}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {h.by} · {h.timestamp}
                        </p>
                        {h.note && (
                          <p className="mt-1 text-xs text-foreground bg-card p-1.5 rounded border">
                            {h.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedAlert.status !== "resolved" && (
                <div className="space-y-2 border-t pt-3">
                  <Label className="text-xs font-bold">Resolution Note</Label>
                  <Textarea
                    placeholder="Enter notes on actions taken on site to rectify this risk…"
                    value={resolveNote}
                    onChange={(e) => setResolveNote(e.target.value)}
                    className="h-18 text-xs"
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedAlert(null)}>
                      Close
                    </Button>
                    <Button size="sm" onClick={() => handleResolveAlert(selectedAlert.id)}>
                      Mark Resolved
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Build Custom Alert Rule Dialog */}
      <Dialog open={createRuleOpen} onOpenChange={setCreateRuleOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <BellPlus className="size-4 text-primary" /> Build Custom Alert Rule
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure automated parametric trigger conditions (Alert engine disconnected).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRule} className="space-y-4 pt-2">
            <FormRow columns={1}>
              <FormField id="rule-name" label="Rule Name / Descriptor" required>
                <Input
                  id="rule-name"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="e.g. Critical Cement Stock Threshold Rule"
                  required
                  className="h-9 text-xs"
                />
              </FormField>
            </FormRow>

            <FormRow columns={3}>
              <FormField id="rule-metric" label="Monitored Metric" required>
                <select
                  id="rule-metric"
                  value={ruleMetric}
                  onChange={(e) => setRuleMetric(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="Material Stock">Material Stock</option>
                  <option value="Milestone Delay">Milestone Delay (Days)</option>
                  <option value="Cost Variance %">Cost Variance %</option>
                  <option value="Equipment Uptime %">Equipment Uptime %</option>
                  <option value="Attendance Muster %">Attendance Muster %</option>
                </select>
              </FormField>

              <FormField id="rule-op" label="Operator" required>
                <select
                  id="rule-op"
                  value={ruleOperator}
                  onChange={(e) => setRuleOperator(e.target.value as any)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs font-mono font-bold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="<">&lt; (Less than)</option>
                  <option value="<=">&lt;= (Less or eq)</option>
                  <option value=">">&gt; (Greater than)</option>
                  <option value=">=">&gt;= (Greater or eq)</option>
                  <option value="=">= (Equal to)</option>
                </select>
              </FormField>

              <FormField id="rule-thresh" label="Threshold Value" required>
                <Input
                  id="rule-thresh"
                  value={ruleThreshold}
                  onChange={(e) => setRuleThreshold(e.target.value)}
                  placeholder="e.g. 20"
                  required
                  className="h-9 text-xs font-mono font-bold"
                />
              </FormField>
            </FormRow>

            <FormRow columns={2}>
              <FormField id="rule-scope" label="Operational Scope" required>
                <select
                  id="rule-scope"
                  value={ruleScope}
                  onChange={(e) => setRuleScope(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="Project / Store">Project / Store</option>
                  <option value="Entire Company">Entire Company</option>
                  <option value="Central Store">Central Store</option>
                  <option value="Specific Project Site">Specific Project Site</option>
                </select>
              </FormField>

              <FormField id="rule-sev" label="Trigger Severity" required>
                <select
                  id="rule-sev"
                  value={ruleSeverity}
                  onChange={(e) => setRuleSeverity(e.target.value as any)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="critical">Critical</option>
                  <option value="attention">Attention</option>
                  <option value="info">Info</option>
                </select>
              </FormField>
            </FormRow>

            <FormRow columns={1}>
              <FormField id="rule-recip" label="Notification Recipient Role" required>
                <select
                  id="rule-recip"
                  value={ruleRecipient}
                  onChange={(e) => setRuleRecipient(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="Project Manager">Project Manager</option>
                  <option value="Store Manager">Store Manager</option>
                  <option value="Site Engineer">Site Engineer</option>
                  <option value="Accountant">Accountant</option>
                  <option value="Company Admin">Company Admin</option>
                  <option value="Company Owner">Company Owner</option>
                </select>
              </FormField>
            </FormRow>

            <div className="rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 p-2.5 text-[11px] text-amber-800 dark:text-amber-300">
              <strong>Notice:</strong> Rule evaluation requires the backend event broker service. No active transactions are evaluated in this frontend preview.
            </div>

            <FormActions
              onCancel={() => setCreateRuleOpen(false)}
              submitLabel="Save Alert Rule"
            />
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
