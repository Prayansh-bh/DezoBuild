import { AppShell, useNotify } from "@/components/app-shell";
import { HealthBadge, StatusPill } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, useMockStore } from "@/mock";
import type { SmartAlert } from "@/mock/types";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  HardHat,
  IndianRupee,
  ShieldAlert,
  X,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Owner Dashboard | DEZOBUILD" },
      {
        name: "description",
        content: "Monitor construction project health, risks, costs, approvals, and site activity with DEZOBUILD.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { projects, alerts, expenses, payments, dprRecords } = useMockStore();
  const [period, setPeriod] = useState("This month");
  const [selectedRisk, setSelectedRisk] = useState<SmartAlert | null>(null);
  const notify = useNotify();
  const navigate = useNavigate();

  // Connected metrics calculations
  const totalApprovedBudget = projects.reduce((acc, p) => acc + p.budget, 0);
  const totalActualCost = projects.reduce((acc, p) => acc + p.actualCost, 0);
  const budgetUtilisedPercent = ((totalActualCost / totalApprovedBudget) * 100).toFixed(1);

  const pendingPaymentsAmount = payments
    .filter((p) => p.status === "pending" || p.status === "overdue")
    .reduce((acc, p) => acc + p.amount, 0);

  const overduePaymentsAmount = payments
    .filter((p) => p.status === "overdue")
    .reduce((acc, p) => acc + p.amount, 0);

  const pendingApprovalExpensesAmount = expenses
    .filter((e) => e.status === "pending_approval")
    .reduce((acc, e) => acc + e.amount, 0);

  const criticalProjects = projects.filter((p) => p.health === "critical");
  const attentionProjects = projects.filter((p) => p.health === "attention");
  const healthyProjects = projects.filter((p) => p.health === "healthy");

  const openAlerts = alerts.filter((a) => a.status !== "resolved");
  const totalWorkersOnSite = projects.reduce((acc, p) => acc + p.activeWorkersToday, 0);

  return (
    <AppShell crumb="Owner dashboard">
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-sm bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-accent-foreground">
              Connected Data
            </span>
            <span className="text-xs text-muted-foreground">Live operational sync · 8 projects active</span>
          </div>
          <h1 className="text-2xl font-bold sm:text-[30px]">Good morning, Arjun</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here’s what needs your executive attention across the construction portfolio.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <label className="sr-only" htmlFor="period">Dashboard period</label>
          <select
            id="period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="h-10 rounded-md border bg-card px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
          >
            <option>This month</option>
            <option>Last 30 days</option>
            <option>This quarter</option>
          </select>
          <Button asChild>
            <Link to={"/projects/new" as any}>Create Project</Link>
          </Button>
        </div>
      </div>

      {/* Needs Attention Alert Cards */}
      <section aria-labelledby="attention-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="attention-heading" className="text-sm font-bold uppercase text-muted-foreground">
            Needs your attention ({openAlerts.length})
          </h2>
          <Link to={"/alerts" as any} className="text-xs font-semibold text-primary hover:underline">
            View all {openAlerts.length} alerts →
          </Link>
        </div>
        <div className="grid gap-3.5 md:grid-cols-3">
          {openAlerts.slice(0, 3).map((alert) => (
            <article
              key={alert.id}
              className={`group rounded-lg border bg-card p-4 shadow-panel transition-all hover:shadow-float ${
                alert.severity === "critical" ? "border-t-[3px] border-t-danger" : "border-t-[3px] border-t-warning"
              }`}
            >
              <div className="flex gap-3">
                <div
                  className={`grid size-9 shrink-0 place-items-center rounded-md ${
                    alert.severity === "critical" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"
                  }`}
                >
                  {alert.category === "Material" ? (
                    <Boxes className="size-[18px]" />
                  ) : alert.category === "Schedule" ? (
                    <CalendarDays className="size-[18px]" />
                  ) : (
                    <ShieldAlert className="size-[18px]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <StatusPill tone={alert.severity as any}>
                    {alert.severity === "critical" ? "Critical Risk" : "Attention"}
                  </StatusPill>
                  <h3 className="mt-2 text-sm font-bold leading-snug">{alert.title}</h3>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{alert.projectName}</p>
                  <p className="mt-2 font-mono text-[11px] font-semibold text-foreground/80">{alert.impact}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRisk(alert)}
                className="mt-3.5 flex w-full items-center justify-between border-t pt-3 text-xs font-bold text-primary hover:underline"
              >
                <span>Review & Take Action</span>
                <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* Main Grid: Project Health & Financial Health */}
      <section className="mt-8 grid gap-5 xl:grid-cols-[1.45fr_1fr]" aria-label="Business overview">
        {/* Project Health Table */}
        <div className="overflow-hidden rounded-lg border bg-card shadow-panel">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="font-bold text-base">Project Health & Progress</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {projects.length} portfolio projects · {period.toLowerCase()}
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to={"/projects" as any} className="gap-1 text-xs">
                All projects <ChevronRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-3 border-b bg-muted/40 divide-x">
            <div className="px-5 py-3 text-center sm:text-left">
              <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                <span className="size-2 rounded-full bg-danger" />
                <span className="text-xs font-medium text-muted-foreground">Critical</span>
              </div>
              <p className="mt-1 font-mono text-2xl font-bold text-danger">{criticalProjects.length}</p>
            </div>
            <div className="px-5 py-3 text-center sm:text-left">
              <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                <span className="size-2 rounded-full bg-warning" />
                <span className="text-xs font-medium text-muted-foreground">Attention</span>
              </div>
              <p className="mt-1 font-mono text-2xl font-bold text-warning">{attentionProjects.length}</p>
            </div>
            <div className="px-5 py-3 text-center sm:text-left">
              <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                <span className="size-2 rounded-full bg-success" />
                <span className="text-xs font-medium text-muted-foreground">Healthy</span>
              </div>
              <p className="mt-1 font-mono text-2xl font-bold text-success">{healthyProjects.length}</p>
            </div>
          </div>

          <div className="divide-y">
            {projects.slice(0, 5).map((project) => (
              <button
                key={project.id}
                onClick={() => navigate({ to: `/projects/${project.id}` as any })}
                className="grid w-full grid-cols-[1fr_auto] items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-muted/40 sm:grid-cols-[1.3fr_1fr_110px_auto]"
              >
                <div>
                  <p className="text-sm font-semibold">{project.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{project.location}</p>
                </div>
                <div className="hidden sm:block">
                  <div className="mb-1.5 flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Physical progress</span>
                    <span className="font-mono font-semibold">{project.progress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full ${
                        project.health === "critical"
                          ? "bg-danger"
                          : project.health === "attention"
                          ? "bg-warning"
                          : "bg-success"
                      }`}
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
                <div className="hidden sm:block text-right">
                  <p className="font-mono text-xs font-bold">
                    {project.varianceAmount > 0
                      ? `+${formatCurrency(project.varianceAmount)}`
                      : formatCurrency(project.varianceAmount)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Budget: {formatCurrency(project.budget)}</p>
                </div>
                <HealthBadge health={project.health} />
              </button>
            ))}
          </div>

          <div className="border-t bg-muted/20 px-5 py-2.5 text-center">
            <Link to={"/projects" as any} className="text-xs font-semibold text-primary hover:underline">
              View complete project register ({projects.length} total) →
            </Link>
          </div>
        </div>

        {/* Financial Health & Today on Site */}
        <div className="space-y-4">
          {/* Financial Health Panel */}
          <div className="rounded-lg border bg-card p-5 shadow-panel">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-base">Financial Health</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Across active project contracts</p>
              </div>
              <div className="grid size-9 place-items-center rounded-md bg-muted text-muted-foreground">
                <IndianRupee className="size-5" />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Approved Budget</p>
                <p className="mt-1 font-mono text-xl font-bold">{formatCurrency(totalApprovedBudget)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Actual Cost Incurred</p>
                <p className="mt-1 font-mono text-xl font-bold">{formatCurrency(totalActualCost)}</p>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="text-muted-foreground">Budget Utilised</span>
                <span className="font-mono font-bold">{budgetUtilisedPercent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${budgetUtilisedPercent}%` }} />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 divide-x border-t pt-4">
              <div>
                <p className="text-xs text-muted-foreground">Pending Payments</p>
                <p className="mt-1 font-mono text-lg font-bold">{formatCurrency(pendingPaymentsAmount)}</p>
                {overduePaymentsAmount > 0 && (
                  <p className="mt-0.5 text-[11px] font-semibold text-danger">
                    {formatCurrency(overduePaymentsAmount)} overdue
                  </p>
                )}
              </div>
              <div className="pl-5">
                <p className="text-xs text-muted-foreground">Awaiting Approval</p>
                <p className="mt-1 font-mono text-lg font-bold">{formatCurrency(pendingApprovalExpensesAmount)}</p>
                <Link to={"/finance" as any} className="mt-0.5 inline-block text-[11px] font-semibold text-primary hover:underline">
                  Review 4 transactions →
                </Link>
              </div>
            </div>
          </div>

          {/* Today on Site Pulse */}
          <div className="rounded-lg border bg-card p-5 shadow-panel">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base">Today on Site</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Live operational muster roll</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-success">
                <span className="size-2 rounded-full bg-success animate-pulse" />
                6 Sites Active
              </span>
            </div>

            <div className="mt-5 grid grid-cols-3 divide-x text-center">
              <div className="px-2">
                <p className="font-mono text-xl font-bold">{totalWorkersOnSite}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Workers</p>
              </div>
              <div className="px-2">
                <p className="font-mono text-xl font-bold">34</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Active Activities</p>
              </div>
              <div className="px-2">
                <p className="font-mono text-xl font-bold">5/8</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">DPRs Filed</p>
              </div>
            </div>

            <div className="mt-4 border-t pt-3 flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Safety status: <strong>Zero Incidents</strong></span>
              <Link to={"/people" as any} className="font-semibold text-primary hover:underline">
                View Muster Roll →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Alert Detail Drawer Modal */}
      {selectedRisk && (
        <div className="fixed inset-0 z-[60] bg-overlay" onClick={() => setSelectedRisk(null)}>
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Alert details"
            className="absolute inset-y-0 right-0 w-full max-w-md bg-card p-6 shadow-float overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Alert Details</p>
                <h2 className="mt-1 text-lg font-bold">{selectedRisk.title}</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedRisk(null)} aria-label="Close details">
                <X />
              </Button>
            </div>

            <div className="mt-6 space-y-4 rounded-lg border bg-muted/30 p-4.5 text-sm">
              <div className="flex items-center justify-between">
                <StatusPill tone={selectedRisk.severity as any}>
                  {selectedRisk.severity === "critical" ? "Critical Priority" : "Attention"}
                </StatusPill>
                <span className="text-xs text-muted-foreground">{selectedRisk.createdAt}</span>
              </div>

              <div>
                <dt className="text-xs font-semibold text-muted-foreground">Project</dt>
                <dd className="mt-0.5 font-bold">{selectedRisk.projectName}</dd>
              </div>

              <div>
                <dt className="text-xs font-semibold text-muted-foreground">Root Cause</dt>
                <dd className="mt-0.5 text-xs text-foreground/90">{selectedRisk.rootCause}</dd>
              </div>

              <div>
                <dt className="text-xs font-semibold text-muted-foreground">Operational & Financial Impact</dt>
                <dd className="mt-0.5 font-mono font-bold text-danger text-xs">{selectedRisk.impact}</dd>
              </div>

              <div className="rounded-md border bg-card p-3">
                <dt className="text-xs font-bold text-primary">Suggested Corrective Action</dt>
                <dd className="mt-1 text-xs">{selectedRisk.suggestedAction}</dd>
              </div>

              <div>
                <dt className="text-xs font-semibold text-muted-foreground">Traceable Source Record</dt>
                <dd className="mt-0.5 text-xs font-medium text-foreground">
                  {selectedRisk.sourceRef.label}
                </dd>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <Button
                className="w-full"
                onClick={() => {
                  const targetUrl = selectedRisk.sourceRef.to || "/alerts";
                  setSelectedRisk(null);
                  navigate({ to: targetUrl as any });
                }}
              >
                Go to Source Record
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  notify(`Alert "${selectedRisk.title}" acknowledged.`);
                  setSelectedRisk(null);
                }}
              >
                Acknowledge Alert
              </Button>
            </div>

            <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <CircleCheck className="size-4 text-success" />
              Connected to DEZOBUILD Smart Alert Engine
            </p>
          </aside>
        </div>
      )}
    </AppShell>
  );
}