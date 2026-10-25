import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  FileCheck,
  FileText,
  Fuel,
  HardHat,
  IndianRupee,
  Layers,
  MapPin,
  PackageCheck,
  Plus,
  Receipt,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { AppShell, useNotify, useQuickAdd } from "@/components/app-shell";
import { HealthBadge, StatusPill, WorkflowBadge } from "@/components/shared/status-badge";
import { StatGrid } from "@/components/shared/stat-grid";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, mockStore, useMockStore, useContextualData } from "@/mock";
import type { SmartAlert } from "@/mock/types";
import { useCurrentUser } from "@/auth";
import { CustomerRole, getWorkspaceConfig } from "@/authorization";
import { useResolveAlert, useApproveExpense, useRecordPunch } from "@/hooks/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Workspace Command Center | DEZOBUILD" },
      {
        name: "description",
        content:
          "Role-aware construction operations command center for portfolio health, site progress, procurement, and commercial tracking.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const store = useMockStore();
  const contextual = useContextualData();
  const { user } = useCurrentUser();
  const workspaceConfig = getWorkspaceConfig(user.role);
  const notify = useNotify();
  const navigate = useNavigate();
  const resolveAlertMutation = useResolveAlert();

  const [period, setPeriod] = useState("This month");
  const [selectedAlert, setSelectedAlert] = useState<SmartAlert | null>(null);

  // Scoped data
  const projects = contextual.projects;
  const alerts = contextual.alerts;
  const dprs = contextual.dprRecords;
  const indents = contextual.indents;
  const purchaseOrders = contextual.purchaseOrders;
  const expenses = contextual.expenses;
  const attendance = contextual.attendanceRecords;
  const documents = contextual.documents;

  const openAlerts = alerts.filter((a) => a.status !== "resolved");

  return (
    <AppShell crumb={workspaceConfig.crumbLabel}>
      {/* Top Welcome Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span>{user.tenant.name}</span>
            <span>·</span>
            <span className="font-semibold text-primary">{contextual.scopeLabel}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-[28px] text-foreground">
            Good morning, {user.name.split(" ")[0]} · {workspaceConfig.identityTitle}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {workspaceConfig.headerSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <label className="sr-only" htmlFor="period-select">
            Period
          </label>
          <select
            id="period-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="h-9 rounded-lg border border-border/80 bg-card px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-ring"
          >
            <option>This month</option>
            <option>Last 30 days</option>
            <option>This quarter</option>
          </select>
          <Button asChild size="sm" className="font-semibold text-xs h-9 rounded-lg shadow-sm">
            <Link to={workspaceConfig.primaryActionRoute as any}>
              {workspaceConfig.primaryActionLabel}
            </Link>
          </Button>
        </div>
      </div>

      {/* Role-Specific Command Center Content */}
      {user.role === CustomerRole.EMPLOYEE && (
        <EmployeeDashboard user={user} attendance={attendance} notify={notify} />
      )}

      {user.role === CustomerRole.SITE_ENGINEER && (
        <SiteEngineerDashboard
          projects={projects}
          dprs={dprs}
          openAlerts={openAlerts}
          notify={notify}
        />
      )}

      {user.role === CustomerRole.PROCUREMENT_STORE && (
        <ProcurementStoreDashboard
          materials={store.materials}
          indents={indents}
          purchaseOrders={purchaseOrders}
          openAlerts={openAlerts}
          notify={notify}
        />
      )}

      {user.role === CustomerRole.ACCOUNTANT && (
        <AccountantDashboard
          projects={projects}
          expenses={expenses}
          payments={store.payments}
          advances={store.advances}
          notify={notify}
        />
      )}

      {user.role === CustomerRole.HR && (
        <HrDashboard
          employees={store.employees}
          contractors={store.labourContractors}
          attendance={attendance}
          notify={notify}
        />
      )}

      {user.role === CustomerRole.PROJECT_MANAGER && (
        <ProjectManagerDashboard
          projects={projects}
          dprs={dprs}
          indents={indents}
          openAlerts={openAlerts}
          onSelectAlert={setSelectedAlert}
        />
      )}

      {(user.role === CustomerRole.COMPANY_OWNER || user.role === CustomerRole.COMPANY_ADMIN) && (
        <ExecutivePortfolioDashboard
          projects={projects}
          alerts={openAlerts}
          payments={store.payments}
          materials={store.materials}
          onSelectAlert={setSelectedAlert}
          period={period}
        />
      )}

      {user.role === CustomerRole.VIEWER && (
        <ViewerDashboard projects={projects} documents={documents} />
      )}

      {/* Alert Review Modal */}
      <Dialog open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <DialogContent className="max-w-md">
          {selectedAlert && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
                  <DialogTitle className="text-base">{selectedAlert.title}</DialogTitle>
                </div>
                <DialogDescription className="text-xs">
                  {selectedAlert.projectName} · {selectedAlert.category} Exception
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-xs">
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                  <p className="font-semibold text-foreground">Operational Impact</p>
                  <p className="text-muted-foreground">{selectedAlert.impact}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                  <p className="font-semibold text-foreground">Recommended Resolution</p>
                  <p className="text-muted-foreground">{selectedAlert.suggestedAction}</p>
                </div>
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedAlert(null)}
                >
                  Dismiss
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    resolveAlertMutation.mutate(
                      { id: selectedAlert.id },
                      {
                        onSuccess: () => {
                          notify(`Alert "${selectedAlert.title}" marked as resolved.`);
                          setSelectedAlert(null);
                        },
                        onError: (err: any) => {
                          notify(err.message || "Failed to resolve alert.");
                        },
                      }
                    );
                  }}
                >
                  Resolve Alert
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

// -------------------------------------------------------------
// 1. EXECUTIVE / COMPANY OWNER DASHBOARD
// -------------------------------------------------------------
function ExecutivePortfolioDashboard({
  projects,
  alerts,
  payments,
  materials,
  onSelectAlert,
  period,
}: {
  projects: any[];
  alerts: SmartAlert[];
  payments: any[];
  materials: any[];
  onSelectAlert: (alert: SmartAlert) => void;
  period: string;
}) {
  const navigate = useNavigate();
  const totalApprovedBudget = (projects || []).reduce((acc, p) => acc + (p?.budget || 0), 0);
  const totalActualCost = (projects || []).reduce((acc, p) => acc + (p?.actualCost || 0), 0);
  const totalWorkers = (projects || []).reduce((acc, p) => acc + (p?.activeWorkersToday || 0), 0);
  const lowStockCount = (materials || []).filter((m) => (m?.currentStock ?? 0) <= (m?.reorderLevel ?? 0)).length;

  const criticalProjects = (projects || []).filter((p) => p?.health === "critical");
  const attentionProjects = (projects || []).filter((p) => p?.health === "attention");
  const healthyProjects = (projects || []).filter((p) => p?.health === "healthy");

  return (
    <div className="space-y-8">
      {/* KPI Grid */}
      <StatGrid
        columns={4}
        items={[
          {
            label: "Approved Portfolio Budget",
            value: formatCurrency(totalApprovedBudget),
            hint: totalApprovedBudget > 0 ? `${projects.length} active sites tracked` : "No active projects",
            icon: <IndianRupee className="size-4" />,
          },
          {
            label: "Incurred Cost (YTD)",
            value: formatCurrency(totalActualCost),
            hint: totalApprovedBudget > 0 ? `${((totalActualCost / totalApprovedBudget) * 100).toFixed(1)}% budget utilized` : "No budget utilized",
            tone: totalActualCost > totalApprovedBudget ? "critical" : "healthy",
            icon: <TrendingUp className="size-4" />,
          },
          {
            label: "Active Site Manpower",
            value: `${totalWorkers} Personnel`,
            hint: "Across active site gangs today",
            icon: <HardHat className="size-4" />,
          },
          {
            label: "Active Exceptions",
            value: `${alerts.length} Issues`,
            hint: `${lowStockCount} low stock alerts`,
            tone: alerts.length > 0 ? "attention" : "healthy",
            icon: <AlertTriangle className="size-4" />,
          },
        ]}
      />

      {/* Critical Exceptions Ribbon */}
      {alerts.length > 0 && (
        <section aria-labelledby="attention-heading">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
              <h2 id="attention-heading" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Needs Immediate Attention ({alerts.length})
              </h2>
            </div>
            <Link to={"/alerts" as any} className="text-xs font-semibold text-primary hover:underline">
              View all alerts →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {alerts.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 shadow-sm hover:border-border transition-all"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold truncate">{alert.projectName}</span>
                    <StatusPill tone={alert.severity as any}>
                      {alert.severity === "critical" ? "Critical" : "Attention"}
                    </StatusPill>
                  </div>
                  <h3 className="mt-2 text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                    {alert.title}
                  </h3>
                  <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                    {alert.impact}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between pt-2 border-t text-[11px]">
                  <span className="text-muted-foreground font-medium">{alert.category}</span>
                  <button
                    onClick={() => onSelectAlert(alert)}
                    className="font-semibold text-primary hover:underline"
                  >
                    Action →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Grid: Projects Breakdown */}
      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="font-semibold text-sm text-foreground">Project Portfolio Health</h2>
              <p className="text-xs text-muted-foreground">{projects.length} sites in progress</p>
            </div>
            {projects.length > 0 && (
              <Button variant="ghost" size="sm" asChild className="text-xs">
                <Link to={"/projects" as any}>View all →</Link>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-3 border-b bg-muted/20 divide-x text-center text-xs py-2.5">
            <div>
              <span className="text-muted-foreground">Critical</span>
              <p className="font-bold text-rose-600 text-base">{criticalProjects.length}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Attention</span>
              <p className="font-bold text-amber-600 text-base">{attentionProjects.length}</p>
            </div>
            <div>
              <span className="text-muted-foreground">On Track</span>
              <p className="font-bold text-emerald-600 text-base">{healthyProjects.length}</p>
            </div>
          </div>

          {projects.length > 0 ? (
            <div className="divide-y text-xs">
              {projects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate({ to: `/projects/${p.id}` as any })}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="font-semibold text-foreground truncate">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">{p.location} · {p.manager.name}</p>
                  </div>
                  <div className="flex items-center gap-4 text-right shrink-0">
                    <div>
                      <span className="font-bold text-foreground">{p.progress}%</span>
                      <p className="text-[10px] text-muted-foreground">{formatCurrency(p.actualCost)}</p>
                    </div>
                    <HealthBadge health={p.health} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
              <Building2 className="size-8 mx-auto text-muted-foreground/60" />
              <p className="font-bold text-foreground text-sm">No projects yet</p>
              <p>Create your first project to start managing construction activity.</p>
              <div className="pt-2">
                <Button size="sm" asChild className="text-xs">
                  <Link to={"/projects/new" as any}>Create Project</Link>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Commercial Summary Card */}
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
          <div className="border-b pb-3">
            <h2 className="font-semibold text-sm text-foreground">Commercial & Cash Summary</h2>
            <p className="text-xs text-muted-foreground">Payables, advances & cost control</p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30 border">
              <div>
                <p className="font-semibold text-foreground">Pending Vendor Bills</p>
                <p className="text-[10px] text-muted-foreground">Ready for release</p>
              </div>
              <span className="font-mono font-bold text-sm text-foreground">
                {formatCurrency(payments.filter((p) => p.status === "pending").reduce((a, b) => a + b.amount, 0))}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30 border">
              <div>
                <p className="font-semibold text-foreground">Overdue Payables</p>
                <p className="text-[10px] text-rose-600 font-medium">Exceeds credit cycle</p>
              </div>
              <span className="font-mono font-bold text-sm text-rose-600">
                {formatCurrency(payments.filter((p) => p.status === "overdue").reduce((a, b) => a + b.amount, 0))}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30 border">
              <div>
                <p className="font-semibold text-foreground">Inventory Valuation</p>
                <p className="text-[10px] text-muted-foreground">Central & Site warehouses</p>
              </div>
              <span className="font-mono font-bold text-sm text-primary">
                {formatCurrency(materials.reduce((a, b) => a + b.totalStockValue, 0))}
              </span>
            </div>
          </div>

          <Button asChild variant="outline" size="sm" className="w-full text-xs">
            <Link to={"/finance" as any}>Open Financial Ledger →</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

// -------------------------------------------------------------
// 2. PROJECT MANAGER DASHBOARD
// -------------------------------------------------------------
function ProjectManagerDashboard({
  projects,
  dprs,
  indents,
  openAlerts,
  onSelectAlert,
}: {
  projects: any[];
  dprs: any[];
  indents: any[];
  openAlerts: SmartAlert[];
  onSelectAlert: (alert: SmartAlert) => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <StatGrid
        columns={4}
        items={[
          {
            label: "Assigned Projects",
            value: `${projects.length} Sites`,
            hint: projects.length > 0 ? projects.map((p) => p.name).join(", ") : "No assigned projects",
            icon: <Building2 className="size-4" />,
          },
          {
            label: "DPRs Submitted",
            value: `${dprs.length} DPRs`,
            hint: dprs.length > 0 ? "Daily site logs on schedule" : "No DPRs logged yet",
            tone: dprs.length > 0 ? "healthy" : "default",
            icon: <ClipboardCheck className="size-4" />,
          },
          {
            label: "Pending Site Indents",
            value: `${indents.filter((i) => i.status === "submitted").length} Requisitions`,
            hint: "Awaiting purchase orders",
            icon: <Boxes className="size-4" />,
          },
          {
            label: "Site Risks & Snags",
            value: `${openAlerts.length} Open`,
            hint: openAlerts.length > 0 ? "Immediate attention required" : "Zero open risks",
            tone: openAlerts.length > 0 ? "attention" : "healthy",
            icon: <AlertTriangle className="size-4" />,
          },
        ]}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Assigned Projects Execution Card */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-semibold text-sm text-foreground">Assigned Project Workspaces</h3>
              <p className="text-xs text-muted-foreground">Direct site management scope</p>
            </div>
          </div>
          {projects.length > 0 ? (
            <div className="space-y-3 text-xs">
              {projects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate({ to: `/projects/${p.id}` as any })}
                  className="p-3.5 rounded-lg border hover:bg-muted/30 cursor-pointer transition-colors space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-foreground text-sm">{p.name}</p>
                      <p className="text-muted-foreground text-[11px]">{p.location} · Baseline {p.plannedProgress}%</p>
                    </div>
                    <HealthBadge health={p.health} />
                  </div>
                  <div className="flex justify-between text-[11px] pt-1">
                    <span>Actual Progress: <strong className="text-foreground">{p.progress}%</strong></span>
                    <span className="text-primary font-semibold">Open Workspace →</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground space-y-2">
              <Building2 className="size-7 mx-auto text-muted-foreground/50" />
              <p className="font-semibold text-foreground">No assigned projects yet</p>
              <p className="text-[11px]">Projects assigned to your manager profile will appear here.</p>
            </div>
          )}
        </div>

        {/* Site Exceptions & Indents */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-semibold text-sm text-foreground">Recent Site Requisitions</h3>
              <p className="text-xs text-muted-foreground">Material indents for active packages</p>
            </div>
            {indents.length > 0 && (
              <Button variant="ghost" size="sm" asChild className="text-xs">
                <Link to={"/materials" as any}>View Store →</Link>
              </Button>
            )}
          </div>
          {indents.length > 0 ? (
            <div className="space-y-2 text-xs">
              {indents.slice(0, 4).map((ind) => (
                <div key={ind.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                  <div>
                    <p className="font-semibold text-foreground">{ind.indentNumber} · {ind.projectName}</p>
                    <p className="text-[10px] text-muted-foreground">{ind.items.map((i: any) => `${i.quantity} ${i.unit} ${i.materialName}`).join(", ")}</p>
                  </div>
                  <WorkflowBadge status={ind.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground space-y-2">
              <Boxes className="size-7 mx-auto text-muted-foreground/50" />
              <p className="font-semibold text-foreground">No site requisitions yet</p>
              <p className="text-[11px]">Material indents submitted from active sites will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 3. SITE ENGINEER DASHBOARD
// -------------------------------------------------------------
function SiteEngineerDashboard({
  projects,
  dprs,
  openAlerts,
  notify,
}: {
  projects: any[];
  dprs: any[];
  openAlerts: SmartAlert[];
  notify: (msg: string) => void;
}) {
  const { openQuickAdd } = useQuickAdd();
  const activeProj = projects[0];
  return (
    <div className="space-y-6">
      <StatGrid
        columns={4}
        items={[
          {
            label: "Assigned Construction Site",
            value: activeProj ? activeProj.name : "No Assigned Site",
            hint: activeProj ? activeProj.location : "Awaiting site assignment",
            icon: <Building2 className="size-4" />,
          },
          {
            label: "Today's Site Labour",
            value: activeProj ? `${activeProj.activeWorkersToday} Workers` : "0 Workers",
            hint: activeProj ? "Subcontractor gangs checked-in" : "No muster logged today",
            icon: <HardHat className="size-4" />,
          },
          {
            label: "Daily DPR Log",
            value: dprs.length > 0 ? "Submitted Today" : "Pending Submission",
            hint: dprs.length > 0 ? "Shift logs recorded" : "Daily progress log not submitted",
            tone: dprs.length > 0 ? "healthy" : "default",
            icon: <ClipboardCheck className="size-4" />,
          },
          {
            label: "Active Site Snags",
            value: `${openAlerts.length} Snags`,
            hint: "Quality & Safety inspections",
            tone: openAlerts.length > 0 ? "attention" : "healthy",
            icon: <AlertTriangle className="size-4" />,
          },
        ]}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Action Card: DPR Logging */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
          <div className="border-b pb-2.5 flex items-center justify-between">
            <h3 className="font-semibold text-sm text-foreground">Field Operations Action Card</h3>
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold uppercase">Today</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Record physical progress for pier casting, rebar tying, and concrete pouring activities.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <Button
              size="sm"
              onClick={() => openQuickAdd("progress")}
              className="gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="size-3.5" /> Submit Daily DPR
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openQuickAdd("receipt")}
              className="gap-1.5 cursor-pointer"
            >
              <Boxes className="size-3.5" /> Site Indent
            </Button>
          </div>
        </div>

        {/* Site Snags */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
          <div className="border-b pb-2.5 flex items-center justify-between">
            <h3 className="font-semibold text-sm text-foreground">Site Snags & Alerts</h3>
            {openAlerts.length > 0 && (
              <Link to={"/alerts" as any} className="text-xs text-primary font-semibold hover:underline">
                View all →
              </Link>
            )}
          </div>
          {openAlerts.length > 0 ? (
            <div className="space-y-2 text-xs">
              {openAlerts.slice(0, 3).map((al) => (
                <div key={al.id} className="p-2.5 rounded-lg border bg-muted/20 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-foreground">{al.title}</p>
                    <p className="text-[10px] text-muted-foreground">{al.impact}</p>
                  </div>
                  <StatusPill tone={al.severity as any}>{al.severity}</StatusPill>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground">
              <ShieldAlert className="size-7 mx-auto text-muted-foreground/50 mb-2" />
              <p className="font-semibold text-foreground">No active snags</p>
              <p className="text-[11px] mt-0.5">All field execution parameters within safe limits.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 4. PROCUREMENT & STORE DASHBOARD
// -------------------------------------------------------------
function ProcurementStoreDashboard({
  materials,
  indents,
  purchaseOrders,
  openAlerts,
  notify,
}: {
  materials: any[];
  indents: any[];
  purchaseOrders: any[];
  openAlerts: SmartAlert[];
  notify: (msg: string) => void;
}) {
  const totalStockValue = materials.reduce((acc, m) => acc + m.totalStockValue, 0);
  const lowStockMaterials = materials.filter((m) => m.currentStock <= m.reorderLevel);

  return (
    <div className="space-y-6">
      <StatGrid
        columns={4}
        items={[
          {
            label: "Total Warehouse Stock Value",
            value: formatCurrency(totalStockValue),
            hint: `${materials.length} Active Material SKUs`,
            icon: <IndianRupee className="size-4" />,
          },
          {
            label: "Low Stock Items",
            value: `${lowStockMaterials.length} Items`,
            hint: lowStockMaterials.length > 0 ? "Below minimum reorder point" : "All SKUs nominal",
            tone: lowStockMaterials.length > 0 ? "critical" : "healthy",
            icon: <AlertTriangle className="size-4" />,
          },
          {
            label: "Pending Indents",
            value: `${indents.filter((i) => i.status === "submitted").length} Requisitions`,
            hint: "Awaiting PO issuance",
            icon: <Boxes className="size-4" />,
          },
          {
            label: "Committed PO Orders",
            value: `${purchaseOrders.filter((po) => po.status === "issued").length} Open POs`,
            hint: "Expected deliveries",
            icon: <Truck className="size-4" />,
          },
        ]}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Low Stock Alerts */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-semibold text-sm text-foreground">Critical Reorder Items</h3>
            {materials.length > 0 && (
              <Link to={"/materials" as any} className="text-xs text-primary font-semibold hover:underline">
                View Store →
              </Link>
            )}
          </div>
          {lowStockMaterials.length > 0 ? (
            <div className="space-y-2 text-xs">
              {lowStockMaterials.slice(0, 4).map((m) => (
                <div key={m.id} className="flex justify-between items-center p-2.5 rounded-lg border bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40">
                  <div>
                    <p className="font-bold text-foreground">{m.name} ({m.code})</p>
                    <p className="text-[10px] text-muted-foreground">Current: {m.currentStock} {m.unit} (Reorder at: {m.reorderLevel})</p>
                  </div>
                  <Button size="sm" variant="outline" asChild className="h-7 text-[11px] cursor-pointer">
                    <Link to={"/materials" as any}>
                      Create PO
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground">
              <PackageCheck className="size-7 mx-auto text-muted-foreground/50 mb-2" />
              <p className="font-semibold text-foreground">No low stock items</p>
              <p className="text-[11px] mt-0.5">Inventory balances are healthy across warehouse bins.</p>
            </div>
          )}
        </div>

        {/* Recent Material Indents */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-semibold text-sm text-foreground">Open Site Indents</h3>
            {indents.length > 0 && (
              <Link to={"/materials" as any} className="text-xs text-primary font-semibold hover:underline">
                All Indents →
              </Link>
            )}
          </div>
          {indents.length > 0 ? (
            <div className="space-y-2 text-xs">
              {indents.slice(0, 4).map((ind) => (
                <div key={ind.id} className="flex justify-between items-center p-2.5 rounded-lg border bg-muted/20">
                  <div>
                    <p className="font-semibold text-foreground">{ind.indentNumber} · {ind.projectName}</p>
                    <p className="text-[10px] text-muted-foreground">{ind.items.map((i: any) => `${i.quantity} ${i.unit} ${i.materialName}`).join(", ")}</p>
                  </div>
                  <WorkflowBadge status={ind.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground">
              <Boxes className="size-7 mx-auto text-muted-foreground/50 mb-2" />
              <p className="font-semibold text-foreground">No open indents</p>
              <p className="text-[11px] mt-0.5">Site engineers have not submitted any requisitions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 5. ACCOUNTANT DASHBOARD
// -------------------------------------------------------------
function AccountantDashboard({
  projects,
  expenses,
  payments,
  advances,
  notify,
}: {
  projects: any[];
  expenses: any[];
  payments: any[];
  advances: any[];
  notify: (msg: string) => void;
}) {
  const totalBudget = projects.reduce((acc, p) => acc + p.budget, 0);
  const totalActual = projects.reduce((acc, p) => acc + p.actualCost, 0);
  const pendingExpenses = expenses.filter((e) => e.status === "pending_approval");
  const pendingPayments = payments.filter((p) => p.status === "pending");
  const approveExpenseMutation = useApproveExpense();
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const handleApproveExpense = async (ex: any) => {
    setApprovingId(ex.id);
    try {
      await approveExpenseMutation.mutateAsync({ id: ex.id });
      mockStore.updateExpenseStatus(ex.id, "approved");
      notify(`Voucher ${ex.expenseNumber} approved successfully.`);
    } catch (err: any) {
      notify(err?.message || `Failed to approve voucher ${ex.expenseNumber}.`);
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <StatGrid
        columns={4}
        items={[
          {
            label: "Total Committed Budget",
            value: formatCurrency(totalBudget),
            hint: `${formatCurrency(totalActual)} Incurred`,
            icon: <IndianRupee className="size-4" />,
          },
          {
            label: "Pending Expense Approvals",
            value: `${pendingExpenses.length} Vouchers`,
            hint: `${formatCurrency(pendingExpenses.reduce((a, b) => a + b.amount, 0))} Total`,
            tone: pendingExpenses.length > 0 ? "attention" : "healthy",
            icon: <WalletCards className="size-4" />,
          },
          {
            label: "Vendor Payables Due",
            value: formatCurrency(pendingPayments.reduce((a, b) => a + b.amount, 0)),
            hint: `${pendingPayments.length} Invoices pending release`,
            icon: <FileText className="size-4" />,
          },
          {
            label: "Contractor Advances Active",
            value: `${advances.filter((a) => a.status === "active").length} Advances`,
            hint: "Under recovery schedule",
            icon: <UserCheck className="size-4" />,
          },
        ]}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-semibold text-sm text-foreground">Expense Vouchers Awaiting Audit</h3>
            {pendingExpenses.length > 0 && (
              <Link to={"/finance" as any} className="text-xs text-primary font-semibold hover:underline">
                Ledger →
              </Link>
            )}
          </div>
          {pendingExpenses.length > 0 ? (
            <div className="space-y-2 text-xs">
              {pendingExpenses.slice(0, 4).map((ex) => (
                <div key={ex.id} className="flex justify-between items-center p-2.5 rounded-lg border bg-muted/20">
                  <div>
                    <p className="font-semibold text-foreground">{ex.expenseNumber} · {ex.projectName}</p>
                    <p className="text-[10px] text-muted-foreground">{ex.category} · Claimed by {ex.paidTo}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-foreground">{formatCurrency(ex.amount)}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] cursor-pointer"
                      disabled={approvingId === ex.id}
                      onClick={() => handleApproveExpense(ex)}
                    >
                      {approvingId === ex.id ? "Approving…" : "Approve"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground">
              <Receipt className="size-7 mx-auto text-muted-foreground/50 mb-2" />
              <p className="font-semibold text-foreground">No pending expense vouchers</p>
              <p className="text-[11px] mt-0.5">All field expenses and petty cash claims are verified.</p>
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-semibold text-sm text-foreground">Vendor Invoices Due for Payment</h3>
            {pendingPayments.length > 0 && (
              <Link to={"/finance" as any} className="text-xs text-primary font-semibold hover:underline">
                Disbursements →
              </Link>
            )}
          </div>
          {pendingPayments.length > 0 ? (
            <div className="space-y-2 text-xs">
              {pendingPayments.slice(0, 4).map((py) => (
                <div key={py.id} className="flex justify-between items-center p-2.5 rounded-lg border bg-muted/20">
                  <div>
                    <p className="font-semibold text-foreground">{py.invoiceNumber} · {py.vendorName}</p>
                    <p className="text-[10px] text-muted-foreground">{py.projectName} · Due {py.dueDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-foreground">{formatCurrency(py.amount)}</p>
                    <WorkflowBadge status={py.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground">
              <WalletCards className="size-7 mx-auto text-muted-foreground/50 mb-2" />
              <p className="font-semibold text-foreground">No invoices due for payment</p>
              <p className="text-[11px] mt-0.5">No pending vendor disbursements require authorization.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 6. HR DASHBOARD
// -------------------------------------------------------------
function HrDashboard({
  employees,
  contractors,
  attendance,
  notify,
}: {
  employees: any[];
  contractors: any[];
  attendance: any[];
  notify: (msg: string) => void;
}) {
  const activeStaff = employees.filter((e) => e.status === "active").length;
  const totalContractWorkers = contractors.reduce((acc, c) => acc + (c.activeWorkersToday || 0), 0);

  return (
    <div className="space-y-6">
      <StatGrid
        columns={4}
        items={[
          {
            label: "Company Staff Headcount",
            value: `${activeStaff} Employees`,
            hint: "Engineering, Store, Commercial",
            icon: <Users className="size-4" />,
          },
          {
            label: "Contractor Labour Force",
            value: `${totalContractWorkers} Workers`,
            hint: `${contractors.length} active subcontractor agencies`,
            icon: <HardHat className="size-4" />,
          },
          {
            label: "Today's Attendance Muster",
            value: `${attendance.length} Logged`,
            hint: attendance.length > 0 ? "Daily shift records" : "No muster records today",
            tone: attendance.length > 0 ? "healthy" : "default",
            icon: <CheckCircle2 className="size-4" />,
          },
          {
            label: "Subcontractor Compliance",
            value: contractors.length > 0 ? `${contractors.length} Agencies` : "0 Agencies",
            hint: "Statutory documentation",
            tone: contractors.length > 0 ? "healthy" : "default",
            icon: <FileCheck className="size-4" />,
          },
        ]}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-semibold text-sm text-foreground">Active Labour Contractors</h3>
            {contractors.length > 0 && (
              <Link to={"/people" as any} className="text-xs text-primary font-semibold hover:underline">
                Muster Roll →
              </Link>
            )}
          </div>
          {contractors.length > 0 ? (
            <div className="space-y-2 text-xs">
              {contractors.slice(0, 4).map((c) => (
                <div key={c.id} className="flex justify-between items-center p-2.5 rounded-lg border bg-muted/20">
                  <div>
                    <p className="font-bold text-foreground">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.specialization} · Gang Leader: {c.contactPerson}</p>
                  </div>
                  <span className="font-bold text-primary">{c.activeWorkersToday} on site</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground">
              <HardHat className="size-7 mx-auto text-muted-foreground/50 mb-2" />
              <p className="font-semibold text-foreground">No subcontractor labour gangs</p>
              <p className="text-[11px] mt-0.5">Subcontractor agencies registered for project sites will appear here.</p>
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-semibold text-sm text-foreground">Key Technical Staff</h3>
            {employees.length > 0 && (
              <Link to={"/people" as any} className="text-xs text-primary font-semibold hover:underline">
                Staff Directory →
              </Link>
            )}
          </div>
          {employees.length > 0 ? (
            <div className="space-y-2 text-xs">
              {employees.slice(0, 4).map((emp) => (
                <div key={emp.id} className="flex justify-between items-center p-2.5 rounded-lg border bg-muted/20">
                  <div>
                    <p className="font-bold text-foreground">{emp.name}</p>
                    <p className="text-[10px] text-muted-foreground">{emp.role} · {emp.assignedProject}</p>
                  </div>
                  <WorkflowBadge status={emp.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground">
              <Users className="size-7 mx-auto text-muted-foreground/50 mb-2" />
              <p className="font-semibold text-foreground">No staff members registered</p>
              <p className="text-[11px] mt-0.5">Employees added to your organization will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 7. EMPLOYEE DASHBOARD (Simplified Self-Service)
// -------------------------------------------------------------
function EmployeeDashboard({
  user,
  attendance,
  notify,
}: {
  user: any;
  attendance: any[];
  notify: (msg: string) => void;
}) {
  const recordPunchMutation = useRecordPunch();
  const [isPunching, setIsPunching] = useState(false);
  const hasProject = user.assignedProjects && user.assignedProjects.length > 0;

  const handlePunchAttendance = async () => {
    setIsPunching(true);
    try {
      const timestamp = new Date().toISOString();
      await recordPunchMutation.mutateAsync({
        employeeId: user.id || "emp-1",
        type: "IN",
        timestamp,
      });
      mockStore.addAttendanceRecord({
        date: new Date().toISOString().slice(0, 10),
        projectId: user.assignedProjects?.[0]?.projectId || "prj-1",
        projectName: user.assignedProjects?.[0]?.projectName || "Site HQ",
        totalWorkforce: 1,
        totalPresent: 1,
        totalAbsent: 0,
        regularHours: 8,
        overtimeHours: 0,
        totalWageImpact: 850,
        submittedBy: user.name,
        entries: [
          {
            workerId: user.id,
            workerName: user.name,
            trade: user.title,
            contractorName: "Direct Staff",
            status: "present",
            hours: 8,
            otHours: 0,
            wageRate: 850,
          },
        ],
      });
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      notify(`Attendance punch-in confirmed at ${timeStr}.`);
    } catch (err: any) {
      notify(err?.message || "Failed to record attendance punch.");
    } finally {
      setIsPunching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Personal Employee Workspace</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Emp Code: <strong className="text-foreground">{user.id}</strong> · Role: <strong className="text-foreground">{user.title}</strong>
            </p>
          </div>
          <Button
            size="sm"
            disabled={isPunching}
            onClick={handlePunchAttendance}
            className="gap-1.5 cursor-pointer shadow-sm"
          >
            <CheckCircle2 className="size-4" /> {isPunching ? "Punching in…" : "Punch Today's Attendance"}
          </Button>
        </div>
      </div>

      <StatGrid
        columns={4}
        items={[
          {
            label: "Today's Attendance Status",
            value: attendance.length > 0 ? "Present (On-Site)" : "Not Punched",
            hint: attendance.length > 0 ? "Logged today" : "Awaiting punch-in",
            tone: attendance.length > 0 ? "healthy" : "default",
            icon: <CheckCircle2 className="size-4" />,
          },
          {
            label: "Assigned Project Work",
            value: hasProject ? user.assignedProjects[0].projectName : "No Assigned Site",
            hint: hasProject ? "Active project site" : "Awaiting work allocation",
            icon: <Building2 className="size-4" />,
          },
          {
            label: "Leave Balance",
            value: "14 Days",
            hint: "Standard annual leave allocation",
            icon: <Calendar className="size-4" />,
          },
          {
            label: "Assigned Documents",
            value: "0 Documents",
            hint: "No active execution drawings",
            icon: <FileText className="size-4" />,
          },
        ]}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3 text-xs">
          <h3 className="font-semibold text-sm text-foreground">Today's Shift Activities</h3>
          <div className="p-6 text-center text-xs text-muted-foreground">
            <ClipboardCheck className="size-7 mx-auto text-muted-foreground/50 mb-2" />
            <p className="font-semibold text-foreground">No shift activities assigned</p>
            <p className="text-[11px] mt-0.5">Tasks assigned by your site engineer will appear here.</p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3 text-xs">
          <h3 className="font-semibold text-sm text-foreground">My Documents & Site Transmittals</h3>
          <div className="p-6 text-center text-xs text-muted-foreground">
            <FileText className="size-7 mx-auto text-muted-foreground/50 mb-2" />
            <p className="font-semibold text-foreground">No documents attached</p>
            <p className="text-[11px] mt-0.5">Drawings and safety manuals shared with you will appear here.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 8. VIEWER DASHBOARD (Read-Only)
// -------------------------------------------------------------
function ViewerDashboard({
  projects,
  documents,
}: {
  projects: any[];
  documents: any[];
}) {
  const avgProgress =
    projects.length > 0
      ? `${(projects.reduce((acc, p) => acc + p.progress, 0) / projects.length).toFixed(1)}% Avg`
      : "0% Avg";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-muted bg-muted/20 p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">Read-Only Stakeholder & Auditor Workspace</p>
        <p>You have read-only inspection access across active construction milestones, drawings, and executive reports.</p>
      </div>

      <StatGrid
        columns={3}
        items={[
          {
            label: "Monitored Projects",
            value: `${projects.length} Sites`,
            hint: "Read-only inspection access",
            icon: <Building2 className="size-4" />,
          },
          {
            label: "Portfolio Milestone Progress",
            value: avgProgress,
            hint: "Planned vs Actual on track",
            tone: projects.length > 0 ? "healthy" : "default",
            icon: <Layers className="size-4" />,
          },
          {
            label: "Verified Drawings Vault",
            value: `${documents.length} Drawings`,
            hint: "GFC & Structural records",
            icon: <FileText className="size-4" />,
          },
        ]}
      />

      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
        <h3 className="font-semibold text-sm text-foreground">Monitored Construction Sites</h3>
        {projects.length > 0 ? (
          <div className="divide-y text-xs">
            {projects.map((p) => (
              <div key={p.id} className="py-3 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-foreground">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">{p.location} · Budget {formatCurrency(p.budget)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-foreground">{p.progress}% Progress</span>
                  <HealthBadge health={p.health} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-muted-foreground">
            <Building2 className="size-7 mx-auto text-muted-foreground/50 mb-2" />
            <p className="font-semibold text-foreground">No monitored projects available</p>
            <p className="text-[11px] mt-0.5">Projects within your auditor scope will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
