import { AppShell, useNotify } from "@/components/app-shell";
import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { StatGrid } from "@/components/shared/stat-grid";
import { HealthBadge, StatusPill, WorkflowBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, mockStore, useMockStore } from "@/mock";
import type { EquipmentAsset, FuelLog, MaintenanceRecord } from "@/mock/types";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Fuel,
  Gauge,
  HardHat,
  IndianRupee,
  Plus,
  Search,
  Toolbox,
  Truck,
  Wrench,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/equipment/")({
  head: () => ({
    meta: [
      { title: "Plant & Machinery Management | DEZOBUILD" },
      { name: "description", content: "Track heavy construction machinery, uptime, fuel consumption, and maintenance in DEZOBUILD." },
    ],
  }),
  component: EquipmentPage,
});

function EquipmentPage() {
  const { equipment, fuelLogs, maintenanceRecords, projects } = useMockStore();
  const notify = useNotify();

  const [activeTab, setActiveTab] = useState("fleet");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Dialog States
  const [addFuelOpen, setAddFuelOpen] = useState(false);
  const [addMaintOpen, setAddMaintOpen] = useState(false);

  // Add Fuel Form State
  const [fuelEqId, setFuelEqId] = useState(equipment[0]?.id || "");
  const [fuelProjId, setFuelProjId] = useState(projects[0]?.id || "");
  const [fuelQty, setFuelQty] = useState("120");
  const [fuelRate, setFuelRate] = useState("93.5");
  const [fuelMeter, setFuelMeter] = useState("1250");

  // Add Maintenance Ticket Form State
  const [maintEqId, setMaintEqId] = useState(equipment[1]?.id || "");
  const [maintType, setMaintType] = useState<MaintenanceRecord["type"]>("Breakdown");
  const [maintDesc, setMaintDesc] = useState("");
  const [maintCost, setMaintCost] = useState("15000");
  const [maintTech, setMaintTech] = useState("Komatsu Service Engineer");

  // Calculations
  const totalFleet = equipment.length;
  const runningCount = equipment.filter((e) => e.status === "running").length;
  const idleCount = equipment.filter((e) => e.status === "idle").length;
  const breakdownCount = equipment.filter((e) => e.status === "breakdown" || e.status === "maintenance").length;

  const totalFuelCost = fuelLogs.reduce((acc, f) => acc + f.totalAmount, 0);

  // Filtered Equipment
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
      description: maintDesc || "Maintenance inspection and component service.",
      cost: parseFloat(maintCost) || 0,
      partsReplaced: "Standard service replacement kit",
      status: "open",
      technician: maintTech,
    });

    notify(`Maintenance ticket logged for ${eq.assetCode}`);
    setAddMaintOpen(false);
    setMaintDesc("");
  };

  return (
    <AppShell crumb="Equipment">
      <PageHeader
        title="Plant & Machinery Management"
        subtitle="Heavy machinery tracking, utilization hours, specific fuel efficiency, and breakdown maintenance."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setAddFuelOpen(true)} className="gap-1.5">
              <Fuel className="size-4" /> Issue Fuel
            </Button>
            <Button size="sm" onClick={() => setAddMaintOpen(true)} className="gap-1.5">
              <Wrench className="size-4" /> Log Service / Breakdown
            </Button>
          </div>
        }
      />

      {/* KPI Stats */}
      <StatGrid
        columns={4}
        items={[
          {
            label: "Total Equipment Fleet",
            value: totalFleet,
            hint: "Active on 6 project sites",
            icon: <Truck className="size-4" />,
          },
          {
            label: "Running Machinery",
            value: runningCount,
            hint: `${((runningCount / totalFleet) * 100).toFixed(0)}% Fleet Uptime`,
            tone: "healthy",
            icon: <Gauge className="size-4" />,
          },
          {
            label: "Idle Equipment",
            value: idleCount,
            hint: "Standby capacity",
            tone: idleCount > 0 ? "attention" : "healthy",
            icon: <Clock className="size-4" />,
          },
          {
            label: "Breakdown / In Service",
            value: breakdownCount,
            hint: breakdownCount > 0 ? "EX-220 critical downtime" : "All assets operational",
            tone: breakdownCount > 0 ? "critical" : "healthy",
            icon: <AlertTriangle className="size-4" />,
          },
        ]}
        className="mb-6"
      />

      {/* Submodule Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto border bg-card p-1 shadow-sm h-auto flex-wrap">
          <TabsTrigger value="fleet" className="gap-1.5 py-2">
            <Truck className="size-4" /> Fleet Master ({equipment.length})
          </TabsTrigger>
          <TabsTrigger value="fuel" className="gap-1.5 py-2">
            <Fuel className="size-4" /> Fuel Dispensing Logbook ({fuelLogs.length})
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-1.5 py-2">
            <Wrench className="size-4" /> Maintenance & Breakdown ({maintenanceRecords.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. FLEET MASTER TAB */}
        <TabsContent value="fleet" className="space-y-4">
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search machine name, asset code, site, type…"
            filters={
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-xs font-medium"
              >
                <option value="all">All Asset Statuses</option>
                <option value="running">Running</option>
                <option value="idle">Idle</option>
                <option value="breakdown">Breakdown</option>
                <option value="maintenance">Maintenance</option>
              </select>
            }
            onReset={() => {
              setSearch("");
              setStatusFilter("all");
            }}
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEquipment.map((eq) => (
              <div
                key={eq.id}
                className={`rounded-lg border bg-card p-5 shadow-panel space-y-4 ${
                  eq.status === "breakdown"
                    ? "border-t-4 border-t-danger"
                    : eq.status === "idle"
                    ? "border-t-4 border-t-warning"
                    : "border-t-4 border-t-success"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-muted-foreground">{eq.assetCode}</span>
                    <h4 className="font-bold text-base text-foreground">{eq.name}</h4>
                    <p className="text-xs text-muted-foreground">{eq.type} · {eq.ownership}</p>
                  </div>
                  <WorkflowBadge status={eq.status} />
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Building2 className="size-3.5 shrink-0" />
                  <span className="truncate">Site: <strong>{eq.currentSite}</strong></span>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t pt-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Total Running Hours</span>
                    <p className="font-mono font-bold text-foreground text-sm">{eq.totalOperatingHours} hrs</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Next Service In</span>
                    <p className={`font-mono font-bold text-sm ${eq.nextServiceInHours === 0 ? "text-danger" : "text-foreground"}`}>
                      {eq.nextServiceInHours === 0 ? "OVERDUE" : `${eq.nextServiceInHours} hrs`}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Hourly Rate</span>
                    <p className="font-mono font-bold text-primary">₹{eq.hourlyRate}/hr</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Operator</span>
                    <p className="font-medium truncate">{eq.operator.name}</p>
                  </div>
                </div>

                <div className="border-t pt-3 flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Last Service: {eq.lastServiceDate}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-primary"
                    onClick={() => {
                      setFuelEqId(eq.id);
                      setAddFuelOpen(true);
                    }}
                  >
                    Log Fuel →
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* 2. FUEL LOGBOOK TAB */}
        <TabsContent value="fuel" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">Diesel Dispensing & Specific Fuel Consumption Register</h3>
            <Button size="sm" onClick={() => setAddFuelOpen(true)} className="gap-1.5">
              <Plus className="size-4" /> Issue Fuel
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border bg-card shadow-panel">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Machinery / Equipment</th>
                  <th className="px-4 py-3">Hour Meter</th>
                  <th className="px-4 py-3">Quantity (Liters)</th>
                  <th className="px-4 py-3">Unit Rate</th>
                  <th className="px-4 py-3">Total Amount</th>
                  <th className="px-4 py-3">Dispensed By</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {fuelLogs.map((fl) => (
                  <tr key={fl.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3.5 font-mono font-bold text-foreground">{fl.date}</td>
                    <td className="px-4 py-3.5 font-semibold text-primary">{fl.equipmentName}</td>
                    <td className="px-4 py-3.5 font-mono">{fl.hourMeterReading} hrs</td>
                    <td className="px-4 py-3.5 font-mono font-bold text-sm">{fl.quantityLiters} L</td>
                    <td className="px-4 py-3.5 font-mono">₹{fl.unitRate}/L</td>
                    <td className="px-4 py-3.5 font-mono font-bold text-foreground text-sm">{formatCurrency(fl.totalAmount)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{fl.dispensedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 3. MAINTENANCE TAB */}
        <TabsContent value="maintenance" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">Preventative & Breakdown Maintenance Tickets</h3>
            <Button size="sm" onClick={() => setAddMaintOpen(true)} className="gap-1.5">
              <Plus className="size-4" /> Create Ticket
            </Button>
          </div>

          <div className="space-y-3">
            {maintenanceRecords.map((rec) => (
              <div key={rec.id} className="rounded-lg border bg-card p-5 shadow-panel space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">{rec.ticketNumber}</span>
                      <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-bold">{rec.type}</span>
                    </div>
                    <h4 className="font-bold text-base text-foreground mt-1">{rec.equipmentName}</h4>
                  </div>
                  <WorkflowBadge status={rec.status} />
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>

                {rec.partsReplaced && (
                  <div className="rounded border bg-muted/20 p-2.5 text-xs">
                    <span className="font-semibold text-muted-foreground">Parts Replaced / Scope: </span>
                    <span className="text-foreground">{rec.partsReplaced}</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 border-t pt-3 text-xs text-muted-foreground">
                  <div>
                    <span>Issue Date: <strong>{rec.issueDate}</strong></span>
                  </div>
                  <div>
                    <span>Technician: <strong>{rec.technician}</strong></span>
                  </div>
                  <div className="text-right">
                    <span>Cost: <strong className="font-mono font-bold text-foreground">{formatCurrency(rec.cost)}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Issue Fuel Dialog */}
      <Dialog open={addFuelOpen} onOpenChange={setAddFuelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Diesel Issue / Refuel</DialogTitle>
            <DialogDescription>Dispense fuel and update equipment hour meter.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordFuel} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Equipment Asset</Label>
              <select
                value={fuelEqId}
                onChange={(e) => setFuelEqId(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
              >
                {equipment.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.assetCode} · {eq.name} ({eq.currentSite})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Project Site</Label>
              <select
                value={fuelProjId}
                onChange={(e) => setFuelProjId(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Diesel Quantity (L)</Label>
                <Input value={fuelQty} onChange={(e) => setFuelQty(e.target.value)} required className="h-9 font-mono font-bold" />
              </div>
              <div>
                <Label className="text-xs">Hour Meter Reading</Label>
                <Input value={fuelMeter} onChange={(e) => setFuelMeter(e.target.value)} required className="h-9 font-mono" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Fuel Rate (₹/L)</Label>
              <Input value={fuelRate} onChange={(e) => setFuelRate(e.target.value)} className="h-9 font-mono" />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddFuelOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Record Fuel Issue
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Log Maintenance Dialog */}
      <Dialog open={addMaintOpen} onOpenChange={setAddMaintOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Equipment Maintenance / Breakdown</DialogTitle>
            <DialogDescription>Create service ticket and alert plant supervisor.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordMaint} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Equipment</Label>
              <select
                value={maintEqId}
                onChange={(e) => setMaintEqId(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
              >
                {equipment.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.assetCode} · {eq.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Ticket Type</Label>
                <select
                  value={maintType}
                  onChange={(e) => setMaintType(e.target.value as MaintenanceRecord["type"])}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
                >
                  <option>Breakdown</option>
                  <option>Preventative</option>
                  <option>Routine Service</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Estimated Cost (₹)</Label>
                <Input value={maintCost} onChange={(e) => setMaintCost(e.target.value)} className="h-9 font-mono" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Issue Description *</Label>
              <Textarea
                value={maintDesc}
                onChange={(e) => setMaintDesc(e.target.value)}
                placeholder="Describe failure symptom, ruptured component, or maintenance checklist."
                required
                className="h-18 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Assigned Technician</Label>
              <Input value={maintTech} onChange={(e) => setMaintTech(e.target.value)} className="h-9" />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddMaintOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Create Ticket
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
