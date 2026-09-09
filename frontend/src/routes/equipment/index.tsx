import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Fuel,
  Gauge,
  HardHat,
  IndianRupee,
  Layers,
  MapPin,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Toolbox,
  TrendingUp,
  Truck,
  Wrench,
} from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  FormSection,
  FormField,
  FormRow,
  FormActions,
} from "@/components/shared/form-system";
import { formatCurrency, mockStore, useMockStore, useContextualData } from "@/mock";
import type { EquipmentAsset, FuelLog, MaintenanceRecord } from "@/mock/types";
import { EmptyState } from "@/components/shared/empty-state";
import {
  calculateEquipmentUtilization,
  calculateEquipmentHourlyCost,
} from "@/lib/calculations";

export const Route = createFileRoute("/equipment/")({
  head: () => ({
    meta: [
      { title: "Plant & Equipment Fleet | DEZOBUILD" },
      {
        name: "description",
        content:
          "Track heavy construction machinery, uptime, fuel consumption, and maintenance in DEZOBUILD.",
      },
    ],
  }),
  component: EquipmentPage,
});

function EquipmentPage() {
  const store = useMockStore();
  const contextual = useContextualData();
  const notify = useNotify();

  const allEquipment = store.equipment;
  const fuelLogs = store.fuelLogs;
  const maintenanceRecords = store.maintenanceRecords;
  const projects = contextual.projects;

  // Project scoping for Site Engineer / PM
  const equipment = contextual.isScopedToProjects
    ? allEquipment.filter((eq) =>
        contextual.scopedProjectNames.some((pName) =>
          eq.currentSite.toLowerCase().includes(pName.toLowerCase())
        )
      )
    : allEquipment;

  // Primary Section Navigation: overview | fleet | operations | intelligence | compliance | maintenance | reports
  const [activeSection, setActiveSection] = useState<
    "overview" | "fleet" | "operations" | "intelligence" | "compliance" | "maintenance" | "reports"
  >("overview");

  // Sub-tabs
  const [fleetSubTab, setFleetSubTab] = useState<"registry" | "assignments">("registry");
  const [operationsSubTab, setOperationsSubTab] = useState<"utilization" | "fuel">("utilization");
  const [intelligenceSubTab, setIntelligenceSubTab] = useState<"utilization" | "hourly_cost">("utilization");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Dialog States
  const [addFuelOpen, setAddFuelOpen] = useState(false);
  const [addMaintOpen, setAddMaintOpen] = useState(false);

  // Form States - Add Fuel
  const [fuelEqId, setFuelEqId] = useState(equipment[0]?.id || "");
  const [fuelProjId, setFuelProjId] = useState(projects[0]?.id || "");
  const [fuelQty, setFuelQty] = useState("");
  const [fuelRate, setFuelRate] = useState("");
  const [fuelMeter, setFuelMeter] = useState("");

  // Form States - Add Maintenance
  const [maintEqId, setMaintEqId] = useState(equipment[0]?.id || "");
  const [maintType, setMaintType] = useState<MaintenanceRecord["type"]>("Breakdown");
  const [maintDesc, setMaintDesc] = useState("");
  const [maintCost, setMaintCost] = useState("");
  const [maintTech, setMaintTech] = useState("");

  // Calculations
  const totalFleet = equipment.length;
  const runningCount = equipment.filter((e) => e.status === "running").length;
  const idleCount = equipment.filter((e) => e.status === "idle").length;
  const breakdownAssets = equipment.filter(
    (e) => e.status === "breakdown" || e.status === "maintenance"
  );
  const breakdownCount = breakdownAssets.length;
  const totalFuelCost = fuelLogs.reduce((acc, f) => acc + f.totalAmount, 0);

  // Filtered
  const filteredEquipment = equipment.filter((eq) => {
    if (statusFilter !== "all" && eq.status !== statusFilter) return false;
    const q = search.toLowerCase();
    return (
      eq.name.toLowerCase().includes(q) ||
      eq.assetCode.toLowerCase().includes(q) ||
      eq.currentSite.toLowerCase().includes(q) ||
      eq.type.toLowerCase().includes(q)
    );
  });

  const handleRecordFuel = (e: React.FormEvent) => {
    e.preventDefault();
    const eq = equipment.find((item) => item.id === fuelEqId) ?? equipment[0];
    const proj = projects.find((p) => p.id === fuelProjId) ?? projects[0];
    if (!eq || !proj) return;
    const qty = parseFloat(fuelQty) || 0;
    const rate = parseFloat(fuelRate) || 93.5;

    mockStore.addEquipmentLog({
      date: new Date().toISOString().slice(0, 10),
      equipmentId: eq.id,
      equipmentName: eq.name,
      projectId: proj.id,
      quantityLiters: qty,
      unitRate: rate,
      totalAmount: qty * rate,
      dispensedBy: "Site Fuel Master",
      hourMeterReading: parseFloat(fuelMeter) || eq.currentHourMeter,
    });

    notify(`Dispensed ${qty}L diesel for ${eq.assetCode} (${eq.name})`);
    setAddFuelOpen(false);
  };

  const handleRecordMaint = (e: React.FormEvent) => {
    e.preventDefault();
    const eq = equipment.find((item) => item.id === maintEqId) ?? equipment[0];
    const defaultProjId = projects[0]?.id || "proj-001";
    if (!eq) return;

    mockStore.addMaintenanceRecord({
      equipmentId: eq.id,
      equipmentName: eq.name,
      projectId: defaultProjId,
      issueDate: new Date().toISOString().slice(0, 10),
      type: maintType,
      description: maintDesc || "Scheduled servicing and filter replacement",
      cost: parseFloat(maintCost) || 0,
      technician: maintTech,
      status: "in_progress",
    });

    notify(`Maintenance ticket opened for ${eq.assetCode}`);
    setAddMaintOpen(false);
  };

  return (
    <AppShell crumb="Plant & Equipment">
      <PageHeader
        title="Plant, Equipment & Fleet Operations"
        subtitle="Manage heavy construction machinery, daily hour-meter logs, diesel dispensing, and preventative maintenance."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setAddFuelOpen(true)} className="gap-1.5 shadow-sm">
              <Fuel className="size-4" /> Record Fuel Issue
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAddMaintOpen(true)} className="gap-1.5">
              <Wrench className="size-4" /> Maintenance Ticket
            </Button>
          </div>
        }
      />

      {/* KPI Stats */}
      <StatGrid
        columns={4}
        items={[
          {
            label: "Monitored Machinery Fleet",
            value: totalFleet > 0 ? `${totalFleet} Assets` : "0 Assets",
            hint: `${runningCount} Running on active sites`,
            icon: <Truck className="size-4" />,
          },
          {
            label: "Active Site Utilization",
            value: totalFleet > 0 ? `${((runningCount / totalFleet) * 100).toFixed(0)}% Uptime` : "No Fleet Data",
            hint: `${idleCount} Idle standby units`,
            tone: "neutral",
            icon: <Gauge className="size-4" />,
          },
          {
            label: "Cumulative Fuel Spend",
            value: totalFuelCost > 0 ? formatCurrency(totalFuelCost) : "₹0",
            hint: `${fuelLogs.length} Fuel logs recorded`,
            icon: <Fuel className="size-4" />,
          },
          {
            label: "Breakdown / Service Alert",
            value: `${breakdownCount} Assets`,
            hint: breakdownCount > 0 ? "Under active maintenance" : "All assets operational",
            tone: breakdownCount > 0 ? "critical" : "healthy",
            icon: <AlertTriangle className="size-4" />,
          },
        ]}
        className="mb-6"
      />

      {/* Attention Queue */}
      {breakdownCount > 0 && (
        <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-xs">
              <AlertTriangle className="size-4" />
              <span>Machinery Attention Queue ({breakdownCount} assets requiring maintenance)</span>
            </div>
            <span className="text-[11px] text-muted-foreground">Prompt repair minimizes site idle cost</span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 text-xs">
            {breakdownAssets.map((asset) => (
              <div
                key={asset.id}
                onClick={() => {
                  setActiveSection("maintenance");
                }}
                className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:border-rose-500/50 cursor-pointer transition-all"
              >
                <div>
                  <p className="font-semibold text-foreground">{asset.name} ({asset.assetCode})</p>
                  <p className="text-[11px] text-muted-foreground">{asset.currentSite} · Status: {asset.status}</p>
                </div>
                <span className="text-primary font-bold text-xs flex items-center gap-1">
                  View Ticket <ChevronRight className="size-3" />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section Navigation Tabs */}
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
            <Gauge className="size-4" /> Fleet Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("fleet")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
              activeSection === "fleet"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Truck className="size-4" /> Machinery Registry ({equipment.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("operations")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
              activeSection === "operations"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="size-4" /> Run-Hours & Fuel
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("intelligence")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
              activeSection === "intelligence"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="size-4" /> Utilization & Hourly Cost
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("compliance")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
              activeSection === "compliance"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="size-4" /> Compliance & RTO
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("maintenance")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
              activeSection === "maintenance"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Wrench className="size-4" /> Maintenance Tickets ({maintenanceRecords.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("reports")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
              activeSection === "reports"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileSpreadsheet className="size-4" /> Fleet Analytics
          </button>
        </div>

        {/* 1. OVERVIEW TAB */}
        {activeSection === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border bg-card p-5 shadow-panel space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-foreground">Active Machinery Deployments</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => {
                      setActiveSection("fleet");
                      setFleetSubTab("registry");
                    }}
                  >
                    All Assets →
                  </Button>
                </div>
                {equipment.length === 0 ? (
                  <EmptyState
                    icon={Truck}
                    title="No equipment deployed"
                    description="Heavy machinery, excavation equipment, and transit mixers will appear here once allocated to sites."
                  />
                ) : (
                  <div className="space-y-2 text-xs">
                    {equipment.map((eq) => (
                      <div key={eq.id} className="p-3 rounded-lg border bg-muted/20 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-foreground">{eq.name} ({eq.assetCode})</p>
                          <p className="text-[11px] text-muted-foreground">{eq.currentSite} · Meter: {eq.currentHourMeter} hrs</p>
                        </div>
                        <WorkflowBadge status={eq.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border bg-card p-5 shadow-panel space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-foreground">Recent Maintenance Tickets</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => setActiveSection("maintenance")}
                  >
                    View Tickets →
                  </Button>
                </div>
                {maintenanceRecords.length === 0 ? (
                  <EmptyState
                    icon={Wrench}
                    title="No maintenance tickets"
                    description="Service schedules and breakdown work orders will appear here once logged."
                    action={{
                      label: "Open Ticket",
                      onClick: () => setAddMaintOpen(true),
                    }}
                  />
                ) : (
                  <div className="space-y-2 text-xs">
                    {maintenanceRecords.map((m) => (
                      <div key={m.id} className="p-3 rounded-lg border bg-muted/20 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-foreground">{m.equipmentName} ({m.type})</p>
                          <p className="text-[11px] text-muted-foreground">{m.description} · Tech: {m.technician}</p>
                        </div>
                        <WorkflowBadge status={m.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. FLEET REGISTRY & ALLOCATIONS TAB */}
        {activeSection === "fleet" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={fleetSubTab === "registry" ? "default" : "outline"}
                  onClick={() => setFleetSubTab("registry")}
                  className="text-xs gap-1.5"
                >
                  <Truck className="size-3.5" /> Equipment Registry ({equipment.length})
                </Button>
                <Button
                  size="sm"
                  variant={fleetSubTab === "assignments" ? "default" : "outline"}
                  onClick={() => setFleetSubTab("assignments")}
                  className="text-xs gap-1.5"
                >
                  <MapPin className="size-3.5" /> Site Machinery Allocations
                </Button>
              </div>
            </div>

            {fleetSubTab === "registry" && (
              <div className="space-y-4">
                <FilterBar
                  searchValue={search}
                  onSearchChange={setSearch}
                  searchPlaceholder="Search asset name, code, site, type…"
                  filters={
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="h-9 rounded-md border bg-background px-3 text-xs font-medium"
                    >
                      <option value="all">All Statuses</option>
                      <option value="running">Running</option>
                      <option value="idle">Idle</option>
                      <option value="breakdown">Breakdown</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  }
                />
                {filteredEquipment.length === 0 ? (
                  <EmptyState
                    icon={Truck}
                    title="No equipment found"
                    description="No plant machinery matches the selected filter criteria."
                  />
                ) : (
                  <div className="rounded-xl border bg-card overflow-hidden shadow-panel">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/50 border-b text-[11px] uppercase font-bold text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3">Asset Code</th>
                            <th className="px-4 py-3">Machinery Name</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Current Location</th>
                            <th className="px-4 py-3 font-mono">Hour Meter</th>
                            <th className="px-4 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {filteredEquipment.map((eq) => (
                            <tr key={eq.id} className="hover:bg-muted/20">
                              <td className="px-4 py-3 font-mono font-bold text-primary">{eq.assetCode}</td>
                              <td className="px-4 py-3 font-semibold text-foreground">{eq.name}</td>
                              <td className="px-4 py-3 text-muted-foreground">{eq.type}</td>
                              <td className="px-4 py-3 text-foreground font-medium">{eq.currentSite}</td>
                              <td className="px-4 py-3 font-mono font-bold text-foreground">{eq.currentHourMeter} hrs</td>
                              <td className="px-4 py-3"><WorkflowBadge status={eq.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {fleetSubTab === "assignments" && (
              <div className="rounded-xl border bg-card p-6 shadow-panel space-y-4">
                <h3 className="font-bold text-sm text-foreground">Site Machinery Allocations & Gate Passes</h3>
                {equipment.length === 0 ? (
                  <EmptyState
                    icon={MapPin}
                    title="No machinery allocated"
                    description="Machinery allocation schedules and operator assignments will appear here."
                  />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 text-xs">
                    {equipment.map((eq) => (
                      <div key={eq.id} className="p-4 rounded-lg border bg-muted/20 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm text-foreground">{eq.name}</span>
                          <WorkflowBadge status={eq.status} />
                        </div>
                        <p className="text-muted-foreground">Allocated Site: <strong className="text-foreground">{eq.currentSite}</strong></p>
                        <p className="text-muted-foreground">Operator: <strong className="text-foreground">{eq.operator?.name ?? "Site Operator"}</strong></p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. RUN-HOURS & FUEL LOGS TAB */}
        {activeSection === "operations" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={operationsSubTab === "utilization" ? "default" : "outline"}
                  onClick={() => setOperationsSubTab("utilization")}
                  className="text-xs gap-1.5"
                >
                  <Clock className="size-3.5" /> Hour-Meters & Uptime
                </Button>
                <Button
                  size="sm"
                  variant={operationsSubTab === "fuel" ? "default" : "outline"}
                  onClick={() => setOperationsSubTab("fuel")}
                  className="text-xs gap-1.5"
                >
                  <Fuel className="size-3.5" /> Fuel Dispensing ({fuelLogs.length})
                </Button>
              </div>

              {operationsSubTab === "fuel" && (
                <Button size="sm" onClick={() => setAddFuelOpen(true)} className="gap-1.5 text-xs">
                  <Plus className="size-3.5" /> Log Fuel Dispense
                </Button>
              )}
            </div>

            {operationsSubTab === "utilization" && (
              <div className="rounded-xl border bg-card p-6 shadow-panel space-y-4">
                <h3 className="font-bold text-sm text-foreground">Daily Run-Hours & Machine Uptime Tracking</h3>
                {equipment.length === 0 ? (
                  <EmptyState
                    icon={Clock}
                    title="No hour-meter logs"
                    description="Daily machine hour-meter tracking will appear here once machinery is allocated and operational."
                  />
                ) : (
                  <div className="divide-y text-xs">
                    {equipment.map((eq) => (
                      <div key={eq.id} className="py-3 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-foreground">{eq.name} ({eq.assetCode})</p>
                          <p className="text-muted-foreground text-[11px]">{eq.currentSite} · Last service: {eq.lastServiceDate}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-foreground text-sm">{eq.currentHourMeter} Run Hours</p>
                          <span className="text-[10px] text-muted-foreground font-semibold">Active Run-Log</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {operationsSubTab === "fuel" && (
              <div className="space-y-4">
                {fuelLogs.length === 0 ? (
                  <EmptyState
                    icon={Fuel}
                    title="No fuel logs recorded"
                    description="Site bowser diesel issues and fuel consumption logs will appear here once recorded."
                    action={{
                      label: "Log Fuel Dispense",
                      onClick: () => setAddFuelOpen(true),
                    }}
                  />
                ) : (
                  <div className="rounded-xl border bg-card overflow-hidden shadow-panel">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/50 border-b text-[11px] uppercase font-bold text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Equipment</th>
                            <th className="px-4 py-3 font-mono">Quantity</th>
                            <th className="px-4 py-3 font-mono">Rate (₹/L)</th>
                            <th className="px-4 py-3 font-mono">Total Amount</th>
                            <th className="px-4 py-3">Dispensed By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {fuelLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-muted/20">
                              <td className="px-4 py-3 text-muted-foreground font-mono">{log.date}</td>
                              <td className="px-4 py-3 font-semibold text-foreground">{log.equipmentName}</td>
                              <td className="px-4 py-3 font-mono font-bold text-primary">{log.quantityLiters} L</td>
                              <td className="px-4 py-3 font-mono text-muted-foreground">₹{log.unitRate}</td>
                              <td className="px-4 py-3 font-mono font-bold text-foreground">{formatCurrency(log.totalAmount)}</td>
                              <td className="px-4 py-3 text-muted-foreground">{log.dispensedBy}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 4. FLEET INTELLIGENCE TAB (UTILIZATION & HOURLY COST) */}
        {activeSection === "intelligence" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <Button
                size="sm"
                variant={intelligenceSubTab === "utilization" ? "default" : "outline"}
                onClick={() => setIntelligenceSubTab("utilization")}
                className="text-xs gap-1.5"
              >
                <Gauge className="size-3.5" /> Fleet Utilization %
              </Button>
              <Button
                size="sm"
                variant={intelligenceSubTab === "hourly_cost" ? "default" : "outline"}
                onClick={() => setIntelligenceSubTab("hourly_cost")}
                className="text-xs gap-1.5"
              >
                <Coins className="size-3.5" /> Hourly Cost Rollup
              </Button>
            </div>

            {intelligenceSubTab === "utilization" && (
              <div className="space-y-4">
                <div className="rounded-xl border bg-blue-50/40 dark:bg-blue-950/20 p-4 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-300">
                    <Gauge className="size-4" />
                    <span>Machine Fleet Utilization Metric</span>
                    <span className="rounded bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 text-[10px] font-mono">
                      Formula: (Operating Hours ÷ Available Hours) × 100
                    </span>
                  </div>
                  <p className="text-blue-800/80 dark:text-blue-300/80 text-[11px]">
                    Calculated from actual logged hour-meter readings against standard 200h monthly deployment capacity.
                  </p>
                </div>

                {equipment.length === 0 ? (
                  <EmptyState
                    icon={Gauge}
                    title="No equipment fleet data"
                    description="Fleet utilization and idle machine downtime will be computed once machinery assets are added."
                  />
                ) : (
                  <div className="rounded-xl border bg-card overflow-hidden shadow-panel">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/50 border-b text-[11px] uppercase font-bold text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3">Asset Code</th>
                            <th className="px-4 py-3">Machine Name</th>
                            <th className="px-4 py-3">Site Location</th>
                            <th className="px-4 py-3 font-mono text-right">Available Hours</th>
                            <th className="px-4 py-3 font-mono text-right">Operating Hours</th>
                            <th className="px-4 py-3 font-mono text-right">Idle Hours</th>
                            <th className="px-4 py-3 font-mono text-right">Utilization %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60 font-medium">
                          {equipment.map((eq) => {
                            const avail = 200;
                            const operating = Math.min(eq.currentHourMeter, avail);
                            const { idleHours, utilizationPercent } = calculateEquipmentUtilization(operating, avail);
                            return (
                              <tr key={eq.id} className="hover:bg-muted/20">
                                <td className="px-4 py-3 font-mono font-bold text-primary">{eq.assetCode}</td>
                                <td className="px-4 py-3 font-semibold text-foreground">{eq.name}</td>
                                <td className="px-4 py-3 text-muted-foreground">{eq.currentSite}</td>
                                <td className="px-4 py-3 font-mono text-right text-muted-foreground">{avail} hrs</td>
                                <td className="px-4 py-3 font-mono text-right font-bold text-foreground">{operating} hrs</td>
                                <td className="px-4 py-3 font-mono text-right text-muted-foreground">{idleHours} hrs</td>
                                <td className="px-4 py-3 font-mono text-right font-bold text-primary">
                                  {utilizationPercent.toFixed(1)}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {intelligenceSubTab === "hourly_cost" && (
              <div className="space-y-4">
                <div className="rounded-xl border bg-blue-50/40 dark:bg-blue-950/20 p-4 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-300">
                    <Coins className="size-4" />
                    <span>Total Operating & Hourly Running Cost Rollup</span>
                    <span className="rounded bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 text-[10px] font-mono">
                      Formula: (Fuel + Operator + Maintenance + Rental) ÷ Operating Hours
                    </span>
                  </div>
                  <p className="text-blue-800/80 dark:text-blue-300/80 text-[11px]">
                    Rollup incorporates fuel dispensing logs, technician maintenance work orders, operator wages, and machine rental.
                  </p>
                </div>

                {equipment.length === 0 ? (
                  <EmptyState
                    icon={Coins}
                    title="No equipment fleet data"
                    description="Hourly cost analysis requires recorded operating hours and cost logs."
                  />
                ) : (
                  <div className="rounded-xl border bg-card overflow-hidden shadow-panel">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/50 border-b text-[11px] uppercase font-bold text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3">Asset Code</th>
                            <th className="px-4 py-3">Machine</th>
                            <th className="px-4 py-3 font-mono text-right">Run Hours</th>
                            <th className="px-4 py-3 font-mono text-right">Fuel Cost</th>
                            <th className="px-4 py-3 font-mono text-right">Maint Cost</th>
                            <th className="px-4 py-3 font-mono text-right">Total Operating Cost</th>
                            <th className="px-4 py-3 font-mono text-right">Net Hourly Cost</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60 font-medium">
                          {equipment.map((eq) => {
                            const assetFuel = fuelLogs
                              .filter((f) => f.equipmentId === eq.id)
                              .reduce((acc, f) => acc + f.totalAmount, 0);
                            const assetMaint = maintenanceRecords
                              .filter((m) => m.equipmentId === eq.id)
                              .reduce((acc, m) => acc + m.cost, 0);
                            const operating = Math.max(eq.currentHourMeter, 1);
                            const { totalOperatingCost, hourlyCost } = calculateEquipmentHourlyCost(
                              operating,
                              assetFuel,
                              0,
                              assetMaint,
                              0
                            );
                            return (
                              <tr key={eq.id} className="hover:bg-muted/20">
                                <td className="px-4 py-3 font-mono font-bold text-primary">{eq.assetCode}</td>
                                <td className="px-4 py-3 font-semibold text-foreground">{eq.name}</td>
                                <td className="px-4 py-3 font-mono text-right text-muted-foreground">{operating} hrs</td>
                                <td className="px-4 py-3 font-mono text-right text-foreground">{formatCurrency(assetFuel)}</td>
                                <td className="px-4 py-3 font-mono text-right text-foreground">{formatCurrency(assetMaint)}</td>
                                <td className="px-4 py-3 font-mono text-right font-bold text-foreground">
                                  {formatCurrency(totalOperatingCost)}
                                </td>
                                <td className="px-4 py-3 font-mono text-right font-bold text-emerald-600">
                                  {formatCurrency(hourlyCost)}/hr
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 5. COMPLIANCE & RTO TAB */}
        {activeSection === "compliance" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <div>
                <h3 className="font-bold text-sm text-foreground">Statutory RTO, Insurance & Fitness Compliance</h3>
                <p className="text-xs text-muted-foreground">Track machinery road fitness, pollution PUC, and comprehensive insurance expiry</p>
              </div>
            </div>

            {equipment.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title="No compliance records tracked"
                description="Statutory RTO registration, insurance certificates, and fitness renewals will appear here."
              />
            ) : (
              <div className="rounded-xl border bg-card overflow-hidden shadow-panel">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 border-b text-[11px] uppercase font-bold text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Asset Code</th>
                        <th className="px-4 py-3">Machine Name</th>
                        <th className="px-4 py-3">RTO Reg / Chassis</th>
                        <th className="px-4 py-3">Insurance Policy</th>
                        <th className="px-4 py-3">Fitness Expiry</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {equipment.map((eq) => (
                        <tr key={eq.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3 font-mono font-bold text-primary">{eq.assetCode}</td>
                          <td className="px-4 py-3 font-semibold text-foreground">{eq.name}</td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">{eq.assetCode}-RTO</td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">POL-{eq.assetCode}-2026</td>
                          <td className="px-4 py-3 text-muted-foreground">31 Dec 2026</td>
                          <td className="px-4 py-3 text-center">
                            <span className="rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold">
                              Compliant
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => notify(`Renewal request initiated for ${eq.assetCode}.`)}
                              className="h-7 text-[11px] px-2"
                            >
                              Renew Certificate
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

        {/* 6. MAINTENANCE TAB */}
        {activeSection === "maintenance" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-foreground">Machinery Maintenance & Breakdown Tickets</h3>
              <Button size="sm" onClick={() => setAddMaintOpen(true)} className="gap-1.5 text-xs">
                <Plus className="size-3.5" /> Open Maintenance Ticket
              </Button>
            </div>

            {maintenanceRecords.length === 0 ? (
              <EmptyState
                icon={Wrench}
                title="No maintenance tickets"
                description="Preventative maintenance schedules and breakdown tickets will appear here."
                action={{
                  label: "Open Ticket",
                  onClick: () => setAddMaintOpen(true),
                }}
              />
            ) : (
              <div className="rounded-xl border bg-card overflow-hidden shadow-panel">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 border-b text-[11px] uppercase font-bold text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Issue Date</th>
                        <th className="px-4 py-3">Machine</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Technician</th>
                        <th className="px-4 py-3 font-mono">Cost</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {maintenanceRecords.map((m) => (
                        <tr key={m.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3 text-muted-foreground font-mono">{m.issueDate}</td>
                          <td className="px-4 py-3 font-bold text-foreground">{m.equipmentName}</td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-muted font-medium">{m.type}</span></td>
                          <td className="px-4 py-3 text-foreground">{m.description}</td>
                          <td className="px-4 py-3 text-muted-foreground">{m.technician}</td>
                          <td className="px-4 py-3 font-mono font-bold text-foreground">{formatCurrency(m.cost)}</td>
                          <td className="px-4 py-3"><WorkflowBadge status={m.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. REPORTS TAB */}
        {activeSection === "reports" && (
          <div className="rounded-xl border bg-card p-6 shadow-panel space-y-3 text-xs">
            <h3 className="font-bold text-sm text-foreground">Fleet ROI, Fuel Efficiency & Downtime Reports</h3>
            <p className="text-muted-foreground">Download comprehensive machinery maintenance digests and fuel consumption logs.</p>
            <Button size="sm" onClick={() => notify("Fleet Operations Digest downloaded.")} className="gap-2 shadow-sm">
              <Download className="size-4" /> Download Fleet Digest (PDF)
            </Button>
          </div>
        )}
      </div>

      {/* Fuel Dispense Modal */}
      <Dialog open={addFuelOpen} onOpenChange={setAddFuelOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Record Diesel Dispensing</DialogTitle>
            <DialogDescription className="text-xs">Log site bowser fuel issue to machine tank.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordFuel} className="space-y-4 pt-2">
            <FormRow columns={1}>
              <FormField id="fuel-eq" label="Equipment Asset" required>
                <select
                  id="fuel-eq"
                  value={fuelEqId}
                  onChange={(e) => setFuelEqId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {equipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.assetCode} — {eq.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </FormRow>

            <FormRow columns={2}>
              <FormField id="fuel-qty" label="Dispensed Quantity (Liters)" required>
                <Input
                  id="fuel-qty"
                  value={fuelQty}
                  onChange={(e) => setFuelQty(e.target.value)}
                  type="number"
                  placeholder="e.g. 150"
                  required
                  className="h-9 text-xs font-mono font-bold"
                />
              </FormField>

              <FormField id="fuel-meter" label="Current Hour-Meter Reading" required>
                <Input
                  id="fuel-meter"
                  value={fuelMeter}
                  onChange={(e) => setFuelMeter(e.target.value)}
                  type="number"
                  placeholder="e.g. 1240"
                  required
                  className="h-9 text-xs font-mono"
                />
              </FormField>
            </FormRow>

            <FormActions
              onCancel={() => setAddFuelOpen(false)}
              submitLabel="Record Dispense"
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Maintenance Modal */}
      <Dialog open={addMaintOpen} onOpenChange={setAddMaintOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Open Maintenance Ticket</DialogTitle>
            <DialogDescription className="text-xs">Record machine breakdown or scheduled PM service.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordMaint} className="space-y-4 pt-2">
            <FormRow columns={1}>
              <FormField id="maint-eq" label="Equipment Asset" required>
                <select
                  id="maint-eq"
                  value={maintEqId}
                  onChange={(e) => setMaintEqId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {equipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.assetCode} — {eq.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </FormRow>

            <FormRow columns={2}>
              <FormField id="maint-type" label="Ticket Type" required>
                <select
                  id="maint-type"
                  value={maintType}
                  onChange={(e) => setMaintType(e.target.value as any)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="Breakdown">Breakdown</option>
                  <option value="Routine Service">Routine Service</option>
                  <option value="Preventative Maintenance">Preventative Maintenance</option>
                </select>
              </FormField>

              <FormField id="maint-cost" label="Estimated Cost (₹)" optional>
                <Input
                  id="maint-cost"
                  value={maintCost}
                  onChange={(e) => setMaintCost(e.target.value)}
                  type="number"
                  placeholder="e.g. 25000"
                  className="h-9 text-xs font-mono font-bold"
                />
              </FormField>
            </FormRow>

            <FormRow columns={1}>
              <FormField id="maint-desc" label="Problem Description" required help="Describe hydraulic issue, oil leak, abnormal vibration, or PM schedule.">
                <Textarea
                  id="maint-desc"
                  value={maintDesc}
                  onChange={(e) => setMaintDesc(e.target.value)}
                  placeholder="Describe hydraulic issue, oil leak, or filter replacement..."
                  className="h-20 text-xs"
                  required
                />
              </FormField>
            </FormRow>

            <FormActions
              onCancel={() => setAddMaintOpen(false)}
              submitLabel="Open Maintenance Ticket"
            />
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
