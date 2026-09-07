import { AppShell } from "@/components/app-shell";
import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { StatGrid } from "@/components/shared/stat-grid";
import { HealthBadge, WorkflowBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, useMockStore } from "@/mock";
import type { Project, ProjectHealth, ProjectStatus } from "@/mock/types";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  Calendar,
  ChevronRight,
  Grid,
  HardHat,
  IndianRupee,
  LayoutList,
  MapPin,
  Plus,
  TrendingUp,
  User,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "Projects Directory | DEZOBUILD" },
      { name: "description", content: "Active and upcoming construction projects portfolio in DEZOBUILD." },
    ],
  }),
  component: ProjectsListPage,
});

function ProjectsListPage() {
  const { projects } = useMockStore();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedHealth, setSelectedHealth] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const navigate = useNavigate();

  // Filter logic
  const filteredProjects = projects.filter((p) => {
    // Status tab filter
    if (activeTab === "active" && p.status !== "active") return false;
    if (activeTab === "planning" && p.status !== "planning") return false;
    if (activeTab === "completed" && p.status !== "completed") return false;
    if (activeTab === "archived" && p.status !== "archived") return false;

    // Search
    const q = search.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.client.toLowerCase().includes(q) ||
      p.location.toLowerCase().includes(q) ||
      p.manager.name.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    // City
    if (selectedCity !== "all" && p.city !== selectedCity) return false;

    // Health
    if (selectedHealth !== "all" && p.health !== selectedHealth) return false;

    return true;
  });

  // KPI Calculations
  const totalPortfolioValue = projects.reduce((acc, p) => acc + p.budget, 0);
  const totalSpent = projects.reduce((acc, p) => acc + p.actualCost, 0);
  const activeCount = projects.filter((p) => p.status === "active").length;
  const criticalCount = projects.filter((p) => p.health === "critical").length;

  const cities = Array.from(new Set(projects.map((p) => p.city)));

  return (
    <AppShell crumb="Projects">
      {/* Page Header */}
      <PageHeader
        title="Projects Portfolio"
        subtitle="Manage active construction sites, cost baselines, physical progress, and site teams."
        actions={
          <Button asChild className="gap-2">
            <Link to={"/projects/new" as any}>
              <Plus className="size-4" /> Create Project
            </Link>
          </Button>
        }
      />

      {/* KPI Stats */}
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
            hint: `${((totalSpent / totalPortfolioValue) * 100).toFixed(1)}% Budget Utilized`,
            tone: "healthy",
            icon: <TrendingUp className="size-4" />,
          },
          {
            label: "Active Site Projects",
            value: activeCount,
            hint: "Currently under active execution",
            icon: <Building2 className="size-4" />,
          },
          {
            label: "Projects with Risks",
            value: criticalCount,
            hint: "Immediate attention required",
            tone: criticalCount > 0 ? "critical" : "healthy",
            icon: <HardHat className="size-4" />,
          },
        ]}
        className="mb-6"
      />

      {/* Filter and View Bar */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Status Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-card border shadow-sm">
              <TabsTrigger value="all">All ({projects.length})</TabsTrigger>
              <TabsTrigger value="active">Active ({projects.filter((p) => p.status === "active").length})</TabsTrigger>
              <TabsTrigger value="planning">Planning ({projects.filter((p) => p.status === "planning").length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({projects.filter((p) => p.status === "completed").length})</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Grid / Table Toggle */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              className="h-8 px-2.5"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="size-3.5" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              className="h-8 px-2.5"
              onClick={() => setViewMode("table")}
            >
              <LayoutList className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Search & Select Filters */}
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
                <option value="all">All Health Tones</option>
                <option value="critical">Critical</option>
                <option value="attention">Attention</option>
                <option value="healthy">Healthy (On track)</option>
              </select>
            </>
          }
          onReset={() => {
            setSearch("");
            setSelectedCity("all");
            setSelectedHealth("all");
          }}
        />
      </div>

      {/* Projects Display: Grid or Table */}
      {filteredProjects.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 p-12 text-center">
          <Building2 className="size-10 text-muted-foreground" />
          <h3 className="mt-3 text-base font-bold">No Projects Found</h3>
          <p className="mt-1 text-sm text-muted-foreground">Try clearing filters or search with a different keyword.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              setSearch("");
              setSelectedCity("all");
              setSelectedHealth("all");
              setActiveTab("all");
            }}
          >
            Clear all filters
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => navigate({ to: `/projects/${project.id}` as any })}
              className={`group flex flex-col justify-between rounded-lg border bg-card p-5 shadow-panel transition-all hover:shadow-float cursor-pointer ${
                project.health === "critical"
                  ? "border-t-4 border-t-danger"
                  : project.health === "attention"
                  ? "border-t-4 border-t-warning"
                  : "border-t-4 border-t-success"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-muted-foreground">{project.code}</span>
                    <h3 className="text-base font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                      {project.name}
                    </h3>
                  </div>
                  <HealthBadge health={project.health} />
                </div>

                <p className="mt-1 text-xs text-muted-foreground font-medium">{project.client}</p>

                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0 text-muted-foreground/70" />
                  <span className="truncate">{project.location}</span>
                </div>

                <div className="mt-4 rounded-md bg-muted/40 p-3">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground font-medium">Physical Progress</span>
                    <span className="font-mono font-bold text-foreground">{project.progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
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
                  <div className="mt-2 flex justify-between text-[11px] text-muted-foreground font-medium">
                    <span>Planned: {project.plannedProgress}%</span>
                    <span>Target: {project.targetCompletion}</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Budget</p>
                    <p className="font-mono font-bold">{formatCurrency(project.budget)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Incurred Cost</p>
                    <p className="font-mono font-bold">{formatCurrency(project.actualCost)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 truncate">
                  <User className="size-3.5 shrink-0" />
                  <span className="truncate">{project.manager.name}</span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                  Project 360° <ChevronRight className="size-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border bg-card shadow-panel">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase font-bold text-muted-foreground border-b">
              <tr>
                <th className="px-5 py-3">Project / Code</th>
                <th className="px-4 py-3">Client & Location</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Budget</th>
                <th className="px-4 py-3">Actual Cost</th>
                <th className="px-4 py-3">Manager</th>
                <th className="px-4 py-3">Health</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs">
              {filteredProjects.map((project) => (
                <tr
                  key={project.id}
                  onClick={() => navigate({ to: `/projects/${project.id}` as any })}
                  className="hover:bg-muted/40 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-foreground">{project.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{project.code}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-foreground">{project.client}</p>
                    <p className="text-muted-foreground">{project.location}</p>
                  </td>
                  <td className="px-4 py-3.5 min-w-[140px]">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span>{project.progress}%</span>
                      <span className="text-muted-foreground">Plan: {project.plannedProgress}%</span>
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
                  </td>
                  <td className="px-4 py-3.5 font-mono font-bold">{formatCurrency(project.budget)}</td>
                  <td className="px-4 py-3.5 font-mono font-bold">{formatCurrency(project.actualCost)}</td>
                  <td className="px-4 py-3.5">{project.manager.name}</td>
                  <td className="px-4 py-3.5">
                    <HealthBadge health={project.health} />
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-primary">
                    View 360° →
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
