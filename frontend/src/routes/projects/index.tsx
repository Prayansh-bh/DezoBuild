import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Grid,
  HardHat,
  IndianRupee,
  Layers,
  LayoutList,
  MapPin,
  Plus,
  TrendingDown,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { StatGrid } from "@/components/shared/stat-grid";
import { HealthBadge, StatusPill, WorkflowBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, useMockStore, useContextualData } from "@/mock";
import type { Project } from "@/mock/types";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "Projects Command Center | DEZOBUILD" },
      {
        name: "description",
        content: "Multi-site construction project portfolio, WBS schedule, DPR progress, and engineering drawings.",
      },
    ],
  }),
  component: ProjectsListPage,
});

function ProjectsListPage() {
  const store = useMockStore();
  const contextual = useContextualData();
  const navigate = useNavigate();

  const projects = contextual.projects;
  const dprs = contextual.dprRecords;
  const wbs = store.wbsActivities;
  const documents = contextual.documents;

  // Secondary navigation: overview | active | planning | progress | commercial | documents
  const [workspaceTab, setWorkspaceTab] = useState<string>("overview");

  const [search, setSearch] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedHealth, setSelectedHealth] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Filtered projects
  const filteredProjects = projects.filter((p) => {
    if (workspaceTab === "active" && p.status !== "active") return false;

    const q = search.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.client.toLowerCase().includes(q) ||
      p.location.toLowerCase().includes(q) ||
      p.manager.name.toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (selectedCity !== "all" && p.city !== selectedCity) return false;
    if (selectedHealth !== "all" && p.health !== selectedHealth) return false;

    return true;
  });

  // KPI Calculations
  const totalPortfolioValue = projects.reduce((acc, p) => acc + p.budget, 0);
  const totalSpent = projects.reduce((acc, p) => acc + p.actualCost, 0);
  const activeCount = projects.filter((p) => p.status === "active").length;
  const criticalProjects = projects.filter((p) => p.health === "critical");
  const criticalCount = criticalProjects.length;

  const planName = store.companySettings?.subscription?.planName || "Enterprise Tier";
  const maxProjects = planName.includes("Starter") ? 2 : planName.includes("Professional") ? 10 : Infinity;
  const isLimitReached = activeCount >= maxProjects;

  const cities = Array.from(new Set(projects.map((p) => p.city)));

  return (
    <AppShell crumb="Projects">
      {/* Page Header: Single Primary Action with Plan Guard */}
      <PageHeader
        title="Projects & Construction Portfolio"
        subtitle="Multi-site construction operations command center: WBS work packages, daily site DPRs, and project documentation."
        actions={
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end text-xs">
              <span className="font-semibold text-foreground">
                Capacity: {activeCount} / {maxProjects === Infinity ? "∞" : maxProjects} Active
              </span>
              <span className="text-[10px] text-muted-foreground">{planName}</span>
            </div>
            {isLimitReached ? (
              <Button disabled variant="secondary" className="gap-2 opacity-60 cursor-not-allowed">
                <Plus className="size-4" /> Limit Reached
              </Button>
            ) : (
              <Button asChild className="gap-2 shadow-sm">
                <Link to={"/projects/new" as any}>
                  <Plus className="size-4" /> Create Project
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {/* Plan Entitlement Capacity Banner when Limit Reached */}
      {isLimitReached && (
        <div className="mb-6 rounded-xl border border-warning/40 bg-warning-soft p-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 shrink-0 text-warning mt-0.5" />
              <div>
                <p className="font-bold text-foreground text-sm">
                  Plan Limit Reached: {activeCount} / {maxProjects} Active Projects
                </p>
                <p className="mt-0.5 text-muted-foreground font-medium">
                  Your current {planName} permits up to {maxProjects} concurrently active project sites. (Frontend Entitlement UX Only — Backend Enforcement Required).
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="text-xs h-8 shrink-0" asChild>
              <Link to={"/settings" as any}>View Subscription Plans</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Level 1: Key Metrics (4 Maximum) */}
      <StatGrid
        columns={4}
        items={[
          {
            label: "Total Portfolio Budget",
            value: formatCurrency(totalPortfolioValue),
            hint: `${projects.length} Total registered projects`,
            icon: <IndianRupee className="size-4" />,
          },
          {
            label: "Incurred Actual Cost",
            value: formatCurrency(totalSpent),
            hint: `${((totalSpent / (totalPortfolioValue || 1)) * 100).toFixed(1)}% Budget Utilized`,
            tone: "healthy",
            icon: <TrendingUp className="size-4" />,
          },
          {
            label: "Active Site Projects",
            value: `${activeCount} Sites`,
            hint: "Under active physical execution",
            icon: <Building2 className="size-4" />,
          },
          {
            label: "Projects with Risks",
            value: `${criticalCount} Sites`,
            hint: "Immediate attention required",
            tone: criticalCount > 0 ? "critical" : "healthy",
            icon: <HardHat className="size-4" />,
          },
        ]}
        className="mb-6"
      />

      {/* Level 2: Attention / Work Queue */}
      {criticalCount > 0 && (
        <div className="mb-6 rounded-xl border border-danger/30 bg-danger-soft p-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 shrink-0 text-danger mt-0.5" />
              <div>
                <p className="font-bold text-danger text-sm">
                  Attention Required: {criticalCount} Project{criticalCount > 1 ? "s" : ""} Over Baseline Threshold
                </p>
                <p className="mt-0.5 text-foreground/90 font-medium">
                  {criticalProjects.map((cp) => `${cp.name} (${cp.code})`).join(", ")} exceeded cost/schedule limits.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {criticalProjects.slice(0, 2).map((cp) => (
                <Button
                  key={cp.id}
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 border-danger/40 text-danger hover:bg-danger/10"
                  asChild
                >
                  <Link to={`/projects/${cp.id}` as any}>
                    Review {cp.code} <ChevronRight className="size-3.5 ml-1" />
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Level 3: Workflow-Oriented Secondary Navigation */}
      <Tabs value={workspaceTab} onValueChange={setWorkspaceTab} className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap border-b border-border/60 pb-3">
          <TabsList className="bg-card border shadow-sm p-1 h-auto flex-wrap justify-start">
            <TabsTrigger value="overview" className="text-xs font-semibold py-1.5 px-3">
              Overview / Portfolio ({projects.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="text-xs font-semibold py-1.5 px-3">
              Active Projects ({activeCount})
            </TabsTrigger>
            <TabsTrigger value="planning" className="text-xs font-semibold py-1.5 px-3">
              Planning ({wbs.length} WBS)
            </TabsTrigger>
            <TabsTrigger value="progress" className="text-xs font-semibold py-1.5 px-3">
              Progress ({dprs.length} DPRs)
            </TabsTrigger>
            <TabsTrigger value="commercial" className="text-xs font-semibold py-1.5 px-3">
              Commercial
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs font-semibold py-1.5 px-3">
              Documents ({documents.length})
            </TabsTrigger>
          </TabsList>

          {(workspaceTab === "overview" || workspaceTab === "active") && (
            <div className="flex items-center gap-1.5">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                className="h-8 px-2.5"
                onClick={() => setViewMode("grid")}
                title="Grid Cards"
              >
                <Grid className="size-3.5" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                className="h-8 px-2.5"
                onClick={() => setViewMode("table")}
                title="Table List"
              >
                <LayoutList className="size-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* 1. OVERVIEW & ACTIVE PROJECTS WORKSPACE */}
        {(workspaceTab === "overview" || workspaceTab === "active") && (
          <div className="space-y-4">
            <FilterBar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search project name, code, client, manager…"
              filters={
                <>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="h-9 rounded-md border bg-background px-3 text-xs font-medium"
                  >
                    <option value="all">All Locations</option>
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedHealth}
                    onChange={(e) => setSelectedHealth(e.target.value)}
                    className="h-9 rounded-md border bg-background px-3 text-xs font-medium"
                  >
                    <option value="all">All Health</option>
                    <option value="healthy">On Track</option>
                    <option value="attention">Needs Attention</option>
                    <option value="critical">Critical Risk</option>
                  </select>
                </>
              }
            />

            {filteredProjects.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No projects found"
                description={
                  projects.length === 0
                    ? "Create your first project to start managing construction activity, WBS work packages, and site DPRs."
                    : "No projects match the selected filter criteria. Try adjusting your search query or filters."
                }
                action={
                  projects.length === 0 ? (
                    <Button asChild className="gap-2">
                      <Link to={"/projects/new" as any}>
                        <Plus className="size-4" /> Create Project
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearch("");
                        setSelectedCity("all");
                        setSelectedHealth("all");
                      }}
                    >
                      Reset Filters
                    </Button>
                  )
                }
              />
            ) : viewMode === "grid" ? (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate({ to: `/projects/${p.id}` as any })}
                    className="group rounded-xl border border-border/80 bg-card p-5 shadow-sm hover:border-primary/50 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-[11px] font-bold text-muted-foreground uppercase">
                          {p.code}
                        </span>
                        <HealthBadge health={p.health} />
                      </div>
                      <h3 className="mt-2 text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {p.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="size-3" /> {p.location}
                      </p>

                      <div className="mt-4 space-y-1.5">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-muted-foreground">Physical Progress</span>
                          <span className="font-bold text-foreground">{p.progress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${p.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Budget</span>
                        <p className="font-mono font-bold text-foreground">{formatCurrency(p.budget)}</p>
                      </div>
                      <span className="text-primary font-semibold flex items-center gap-1">
                        Open Command Center <ChevronRight className="size-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 border-b text-[11px] uppercase font-bold text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Code</th>
                        <th className="px-4 py-3">Project Name</th>
                        <th className="px-4 py-3">Location</th>
                        <th className="px-4 py-3">Client</th>
                        <th className="px-4 py-3 font-mono">Budget</th>
                        <th className="px-4 py-3">Progress</th>
                        <th className="px-4 py-3">Health</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredProjects.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-muted-foreground">{p.code}</td>
                          <td className="px-4 py-3 font-semibold text-foreground">{p.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{p.location}</td>
                          <td className="px-4 py-3 text-muted-foreground">{p.client}</td>
                          <td className="px-4 py-3 font-mono font-bold text-foreground">{formatCurrency(p.budget)}</td>
                          <td className="px-4 py-3 font-semibold">{p.progress}%</td>
                          <td className="px-4 py-3"><HealthBadge health={p.health} /></td>
                          <td className="px-4 py-3 text-right">
                            <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                              <Link to={`/projects/${p.id}` as any}>Open 360°</Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. PLANNING WORKSPACE (WBS & Schedules) */}
        {workspaceTab === "planning" && (
          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
            <div className="p-4 border-b bg-muted/20 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-foreground">Consolidated Work Breakdown Structure (WBS)</h3>
                <p className="text-xs text-muted-foreground">Milestones and execution work packages across all projects</p>
              </div>
            </div>
            {wbs.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Layers}
                  title="No WBS activities defined"
                  description="Work Breakdown Structure activities and planned deliverables will appear here once projects are configured with execution packages."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 border-b text-[11px] uppercase font-bold text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">WBS Code</th>
                      <th className="px-4 py-3">Activity Description</th>
                      <th className="px-4 py-3">Package / Category</th>
                      <th className="px-4 py-3 font-mono">Planned Qty</th>
                      <th className="px-4 py-3 font-mono">Completed Qty</th>
                      <th className="px-4 py-3 font-mono">Budget Rate</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {wbs.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono font-bold text-primary">{item.code}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">{item.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                        <td className="px-4 py-3 font-mono">{item.plannedQty} {item.unit}</td>
                        <td className="px-4 py-3 font-mono font-bold text-emerald-600">{item.actualQty} {item.unit}</td>
                        <td className="px-4 py-3 font-mono font-bold text-foreground">{formatCurrency(item.plannedRate)}</td>
                        <td className="px-4 py-3"><WorkflowBadge status={item.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 3. PROGRESS WORKSPACE (DPR & Physical Execution) */}
        {workspaceTab === "progress" && (
          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
            <div className="p-4 border-b bg-muted/20 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-foreground">Daily Progress Reports (DPR) Feed</h3>
                <p className="text-xs text-muted-foreground">Site supervisor field submissions and manpower muster logs</p>
              </div>
            </div>
            {dprs.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={ClipboardCheck}
                  title="No daily progress reports recorded"
                  description="Site engineers and supervisors will submit daily site logs, weather conditions, and work completed here."
                />
              </div>
            ) : (
              <div className="divide-y divide-border/60 text-xs">
                {dprs.map((dpr) => (
                  <div key={dpr.id} className="p-4 hover:bg-muted/20 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{dpr.projectName}</span>
                        <span className="text-muted-foreground font-mono">({dpr.date})</span>
                      </div>
                      <p className="text-muted-foreground mt-0.5">
                        Submitted by <strong className="text-foreground">{dpr.submittedBy?.name || "Site Engineer"}</strong> · Weather: {dpr.temperature} ({dpr.weather})
                      </p>
                      <p className="text-[11px] text-foreground font-medium mt-1">
                        {dpr.safetyRemarks || dpr.delaysObstacles || "Site execution on schedule."}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-muted-foreground font-medium">
                        {dpr.manpower?.reduce((acc, m) => acc + (m.skilled || 0) + (m.unskilled || 0), 0) || 0} Workers
                      </span>
                      <WorkflowBadge status={dpr.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. COMMERCIAL WORKSPACE */}
        {workspaceTab === "commercial" && (
          <div className="rounded-xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
            <div className="border-b pb-3 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-foreground">Project Commercial & Cost Baselines</h3>
                <p className="text-xs text-muted-foreground">Aggregated budget commitments, cost variances, and billings</p>
              </div>
              <Button variant="outline" size="sm" asChild className="text-xs">
                <Link to={"/finance" as any}>Open Full Finance Center →</Link>
              </Button>
            </div>
            {projects.length === 0 ? (
              <EmptyState
                icon={IndianRupee}
                title="No commercial baselines available"
                description="Project financial budgets, committed costs, and variance tracking will appear here once projects are created."
              />
            ) : (
              <div className="divide-y text-xs">
                {projects.map((p) => (
                  <div key={p.id} className="py-3.5 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-foreground text-sm">{p.name}</p>
                      <p className="text-muted-foreground text-[11px]">Approved Baseline: {formatCurrency(p.budget)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-foreground">Actual: {formatCurrency(p.actualCost)}</p>
                      <p className={`text-[10px] font-semibold ${p.varianceAmount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                        {p.varianceAmount > 0 ? `+${formatCurrency(p.varianceAmount)} Overrun` : "Within Budget"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. DOCUMENTS WORKSPACE */}
        {workspaceTab === "documents" && (
          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
            <div className="p-4 border-b bg-muted/20 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-foreground">Project Drawings & GFC Transmittals</h3>
                <p className="text-xs text-muted-foreground">Architectural, structural, and MEP engineering drawings</p>
              </div>
              <Button variant="outline" size="sm" asChild className="text-xs">
                <Link to={"/documents" as any}>Full Vault →</Link>
              </Button>
            </div>
            {documents.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={FileText}
                  title="No project documents or drawings yet"
                  description="Upload structural drawings, GFC transmittals, and site contracts to make them accessible to site teams."
                />
              </div>
            ) : (
              <div className="divide-y divide-border/60 text-xs">
                {documents.map((doc) => (
                  <div key={doc.id} className="p-3.5 flex justify-between items-center hover:bg-muted/20">
                    <div className="flex items-center gap-3">
                      <FileText className="size-5 text-primary shrink-0" />
                      <div>
                        <p className="font-bold text-foreground">{doc.name}</p>
                        <p className="text-[11px] text-muted-foreground">{doc.projectName} · Category: {doc.category} · Rev: {doc.version}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 text-xs">
                      <Download className="size-3.5 mr-1" /> {doc.size}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Tabs>
    </AppShell>
  );
}
