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
import type { Indent, MaterialItem, PurchaseOrder } from "@/mock/types";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeftRight,
  Boxes,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileSpreadsheet,
  HardHat,
  IndianRupee,
  Layers,
  PackageCheck,
  PackageMinus,
  PackagePlus,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  TrendingDown,
  Truck,
  Warehouse,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/materials/")({
  head: () => ({
    meta: [
      { title: "Materials & Inventory Management | DEZOBUILD" },
      { name: "description", content: "Procure, track, issue, and reconcile construction materials across projects in DEZOBUILD." },
    ],
  }),
  component: MaterialsPage,
});

function MaterialsPage() {
  const {
    materials,
    indents,
    purchaseOrders,
    grnRecords,
    materialIssues,
    materialReturns,
    stockTransfers,
    projects,
    vendors,
    wbsActivities,
  } = useMockStore();

  const notify = useNotify();
  const [activeTab, setActiveTab] = useState("inventory");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Dialog States
  const [newIndentOpen, setNewIndentOpen] = useState(false);
  const [newPoOpen, setNewPoOpen] = useState(false);
  const [newGrnOpen, setNewGrnOpen] = useState(false);
  const [newIssueOpen, setNewIssueOpen] = useState(false);

  // New Indent Form State
  const [indentProjectId, setIndentProjectId] = useState(projects[0]?.id || "");
  const [indentMaterialId, setIndentMaterialId] = useState(materials[0]?.id || "");
  const [indentQty, setIndentQty] = useState("500");
  const [indentDate, setIndentDate] = useState(new Date().toISOString().split("T")[0]);
  const [indentPriority, setIndentPriority] = useState<Indent["priority"]>("urgent");
  const [indentPurpose, setIndentPurpose] = useState("");

  // New PO Form State
  const [poProjectId, setPoProjectId] = useState(projects[0]?.id || "");
  const [poVendorId, setPoVendorId] = useState(vendors[0]?.id || "");
  const [poMaterialId, setPoMaterialId] = useState(materials[0]?.id || "");
  const [poQty, setPoQty] = useState("1000");
  const [poDeliveryDate, setPoDeliveryDate] = useState("2026-09-15");

  // New GRN Form State
  const [grnProjectId, setGrnProjectId] = useState(projects[0]?.id || "");
  const [grnVendorName, setGrnVendorName] = useState("Shreeji Ready Mix");
  const [grnChallanNo, setGrnChallanNo] = useState("CH-2026-9921");
  const [grnMaterialId, setGrnMaterialId] = useState(materials[0]?.id || "");
  const [grnRecQty, setGrnRecQty] = useState("500");
  const [grnAccQty, setGrnAccQty] = useState("495");
  const [grnRejQty, setGrnRejQty] = useState("5");

  // New Issue Form State
  const [issProjectId, setIssProjectId] = useState(projects[0]?.id || "");
  const [issActivityId, setIssActivityId] = useState(wbsActivities[0]?.id || "");
  const [issMaterialId, setIssMaterialId] = useState(materials[0]?.id || "");
  const [issQty, setIssQty] = useState("20");
  const [issTo, setIssTo] = useState("Mahadev Barbending Gang");

  // Calculate Materials KPIs
  const totalStockValue = materials.reduce((acc, m) => acc + m.totalStockValue, 0);
  const lowStockCount = materials.filter((m) => m.status !== "healthy").length;
  const pendingIndentsCount = indents.filter((i) => i.status === "submitted" || i.status === "approved").length;
  const openPoValue = purchaseOrders
    .filter((p) => p.status === "issued" || p.status === "partially_received")
    .reduce((acc, p) => acc + p.grandTotal, 0);

  // Filtered Materials
  const filteredMaterials = materials.filter((m) => {
    if (categoryFilter !== "all" && m.category !== categoryFilter) return false;
    const q = search.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q) || m.primaryWarehouse.toLowerCase().includes(q);
  });

  const handleCreateIndent = (e: React.FormEvent) => {
    e.preventDefault();
    const proj = projects.find((p) => p.id === indentProjectId) ?? projects[0];
    const mat = materials.find((m) => m.id === indentMaterialId) ?? materials[0];
    if (!proj || !mat) return;
    const qty = parseFloat(indentQty) || 100;

    mockStore.addIndent({
      projectId: proj.id,
      projectName: proj.name,
      requestedBy: "Site Engineer",
      requiredDate: indentDate || new Date().toISOString().slice(0, 10),
      priority: indentPriority,
      items: [{ materialId: mat.id, materialName: mat.name, quantity: qty, unit: mat.unit, purpose: indentPurpose || "Site execution" }],
      status: "submitted",
      notes: indentPurpose,
    });

    notify(`Indent created for ${qty} ${mat.unit} of ${mat.name}`);
    setNewIndentOpen(false);
  };

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    const proj = projects.find((p) => p.id === poProjectId) ?? projects[0];
    const ven = vendors.find((v) => v.id === poVendorId) ?? vendors[0];
    const mat = materials.find((m) => m.id === poMaterialId) ?? materials[0];
    if (!proj || !ven || !mat) return;
    const qty = parseFloat(poQty) || 100;
    const total = qty * mat.unitRate;
    const tax = total * 0.18;

    mockStore.addPurchaseOrder({
      projectId: proj.id,
      projectName: proj.name,
      vendorId: ven.id,
      vendorName: ven.name,
      totalAmount: total,
      taxAmount: tax,
      grandTotal: total + tax,
      issueDate: new Date().toISOString().slice(0, 10),
      expectedDelivery: poDeliveryDate || new Date().toISOString().slice(0, 10),
      status: "issued",
      items: [{ materialId: mat.id, materialName: mat.name, quantity: qty, unit: mat.unit, rate: mat.unitRate, amount: total }],
      paymentTerms: "30 Days from GRN verification",
    });

    notify(`Purchase Order issued to ${ven.name} for ${formatCurrency(total + tax)}`);
    setNewPoOpen(false);
  };

  const handleRecordGrn = (e: React.FormEvent) => {
    e.preventDefault();
    const proj = projects.find((p) => p.id === grnProjectId) ?? projects[0];
    const mat = materials.find((m) => m.id === grnMaterialId) ?? materials[0];
    if (!proj || !mat) return;
    const recQty = parseFloat(grnRecQty) || 100;
    const accQty = parseFloat(grnAccQty) || recQty;
    const rejQty = parseFloat(grnRejQty) || 0;

    mockStore.addGrn({
      poNumber: "PO-2026-INSPECT",
      projectId: proj.id,
      projectName: proj.name,
      vendorName: grnVendorName,
      challanNumber: grnChallanNo,
      invoiceNumber: `INV-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().slice(0, 10),
      warehouse: `${proj.name} Store`,
      vehicleNo: "MH 12 QW 5544",
      receivedBy: "Store Manager",
      items: [
        {
          materialId: mat.id,
          materialName: mat.name,
          orderedQty: recQty,
          receivedQty: recQty,
          acceptedQty: accQty,
          rejectedQty: rejQty,
          unit: mat.unit,
          ...(rejQty > 0 ? { rejectionReason: "Minor damage during unloading" } : {}),
        },
      ],
      status: rejQty > 0 ? "flagged" : "verified",
    });

    notify(`GRN recorded: ${accQty} ${mat.unit} of ${mat.name} added to stock`);
    setNewGrnOpen(false);
  };

  const handleIssueMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    const proj = projects.find((p) => p.id === issProjectId) ?? projects[0];
    const act = wbsActivities.find((a) => a.id === issActivityId) ?? wbsActivities[0];
    const mat = materials.find((m) => m.id === issMaterialId) ?? materials[0];
    if (!proj || !act || !mat) return;
    const qty = parseFloat(issQty) || 10;

    mockStore.addMaterialIssue({
      projectId: proj.id,
      projectName: proj.name,
      activityId: act.id,
      activityName: act.name,
      issuedTo: issTo,
      date: new Date().toISOString().slice(0, 10),
      items: [{ materialId: mat.id, materialName: mat.name, quantity: qty, unit: mat.unit }],
      requisitionNo: `REQ-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      issuedBy: "Central Storekeeper",
    });

    notify(`Issued ${qty} ${mat.unit} of ${mat.name} to ${act.name}`);
    setNewIssueOpen(false);
  };

  return (
    <AppShell crumb="Materials">
      <PageHeader
        title="Materials & Inventory Management"
        subtitle="End-to-end procurement and site consumption: Material Master, Indents, POs, GRN, Stock Transfers, and Consumption."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setNewIndentOpen(true)} className="gap-1.5">
              <ClipboardList className="size-4" /> New Indent
            </Button>
            <Button size="sm" variant="outline" onClick={() => setNewPoOpen(true)} className="gap-1.5">
              <ShoppingCart className="size-4" /> Create PO
            </Button>
            <Button size="sm" variant="outline" onClick={() => setNewGrnOpen(true)} className="gap-1.5">
              <PackageCheck className="size-4" /> Goods Receipt (GRN)
            </Button>
            <Button size="sm" onClick={() => setNewIssueOpen(true)} className="gap-1.5">
              <PackageMinus className="size-4" /> Issue Material
            </Button>
          </div>
        }
      />

      {/* KPI Stats */}
      <StatGrid
        columns={4}
        items={[
          {
            label: "Total Stock Valuation",
            value: formatCurrency(totalStockValue),
            hint: `${materials.length} Managed material items`,
            icon: <Boxes className="size-4" />,
          },
          {
            label: "Low Stock Alert Items",
            value: lowStockCount,
            hint: "Under reorder threshold",
            tone: lowStockCount > 0 ? "critical" : "healthy",
            icon: <AlertTriangle className="size-4" />,
          },
          {
            label: "Open Site Indents",
            value: pendingIndentsCount,
            hint: "Awaiting approval / PO",
            icon: <ClipboardList className="size-4" />,
          },
          {
            label: "Committed Open POs",
            value: formatCurrency(openPoValue),
            hint: `${purchaseOrders.length} Active purchase orders`,
            icon: <Truck className="size-4" />,
          },
        ]}
        className="mb-6"
      />

      {/* Submodule Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto border bg-card p-1 shadow-sm h-auto flex-wrap">
          <TabsTrigger value="inventory" className="gap-1.5 py-2">
            <Warehouse className="size-4" /> Inventory Stock ({materials.length})
          </TabsTrigger>
          <TabsTrigger value="master" className="gap-1.5 py-2">
            <Boxes className="size-4" /> Material Master
          </TabsTrigger>
          <TabsTrigger value="indents" className="gap-1.5 py-2">
            <ClipboardList className="size-4" /> Indents ({indents.length})
          </TabsTrigger>
          <TabsTrigger value="purchases" className="gap-1.5 py-2">
            <ShoppingCart className="size-4" /> Purchases & POs ({purchaseOrders.length})
          </TabsTrigger>
          <TabsTrigger value="grn" className="gap-1.5 py-2">
            <PackageCheck className="size-4" /> Goods Receipt / GRN ({grnRecords.length})
          </TabsTrigger>
          <TabsTrigger value="issues" className="gap-1.5 py-2">
            <PackageMinus className="size-4" /> Material Issues ({materialIssues.length})
          </TabsTrigger>
          <TabsTrigger value="returns" className="gap-1.5 py-2">
            <PackagePlus className="size-4" /> Material Returns ({materialReturns.length})
          </TabsTrigger>
          <TabsTrigger value="transfers" className="gap-1.5 py-2">
            <ArrowLeftRight className="size-4" /> Stock Transfers ({stockTransfers.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. INVENTORY TAB */}
        <TabsContent value="inventory" className="space-y-4">
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search materials by name, code, warehouse…"
            filters={
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-xs font-medium"
              >
                <option value="all">All Categories</option>
                <option value="Cement">Cement</option>
                <option value="Steel">Steel</option>
                <option value="Aggregates">Aggregates</option>
                <option value="Masonry">Masonry</option>
                <option value="Finishing">Finishing</option>
                <option value="Consumables">Consumables</option>
              </select>
            }
            onReset={() => {
              setSearch("");
              setCategoryFilter("all");
            }}
          />

          <div className="overflow-x-auto rounded-lg border bg-card shadow-panel">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3">Code / Item</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Primary Warehouse</th>
                  <th className="px-4 py-3">Stock Level</th>
                  <th className="px-4 py-3">Reorder Point</th>
                  <th className="px-4 py-3">Unit Rate</th>
                  <th className="px-4 py-3">Total Value</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredMaterials.map((mat) => (
                  <tr key={mat.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-foreground">{mat.name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{mat.code}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold">{mat.category}</span>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">{mat.primaryWarehouse}</td>
                    <td className="px-4 py-3.5 font-mono font-bold text-foreground text-sm">
                      {mat.currentStock.toLocaleString("en-IN")} {mat.unit}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-muted-foreground">
                      {mat.reorderLevel.toLocaleString("en-IN")} {mat.unit}
                    </td>
                    <td className="px-4 py-3.5 font-mono">₹{mat.unitRate.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3.5 font-mono font-bold text-foreground">
                      {formatCurrency(mat.totalStockValue)}
                    </td>
                    <td className="px-4 py-3.5">
                      <HealthBadge health={mat.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:underline h-7 px-2 text-xs"
                        onClick={() => {
                          setIssMaterialId(mat.id);
                          setNewIssueOpen(true);
                        }}
                      >
                        Issue →
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 2. MATERIAL MASTER TAB */}
        <TabsContent value="master" className="space-y-4">
          <div className="rounded-lg border bg-card p-5 shadow-panel">
            <h3 className="font-bold text-base mb-1">Standard Material Specifications & Catalog</h3>
            <p className="text-xs text-muted-foreground mb-4">Standardized construction grade parameters and quality assurance benchmarks.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {materials.map((mat) => (
                <div key={mat.id} className="rounded-md border p-4 bg-muted/20 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-[10px] text-muted-foreground">{mat.code}</span>
                      <h4 className="font-bold text-sm">{mat.name}</h4>
                    </div>
                    <span className="font-mono font-bold text-xs">₹{mat.unitRate}/{mat.unit}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{mat.specification}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* 3. INDENTS TAB */}
        <TabsContent value="indents" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">Site Requisition Indents</h3>
            <Button size="sm" onClick={() => setNewIndentOpen(true)} className="gap-1.5">
              <Plus className="size-4" /> Create Indent
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border bg-card shadow-panel">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3">Indent #</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Requested Items</th>
                  <th className="px-4 py-3">Required By</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {indents.map((ind) => (
                  <tr key={ind.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-bold text-primary">{ind.indentNumber}</td>
                    <td className="px-4 py-3 font-semibold">{ind.projectName}</td>
                    <td className="px-4 py-3">
                      {ind.items.map((i) => `${i.quantity} ${i.unit} ${i.materialName}`).join(", ")}
                    </td>
                    <td className="px-4 py-3">{ind.requiredDate}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                          ind.priority === "critical"
                            ? "bg-danger-soft text-danger"
                            : ind.priority === "urgent"
                            ? "bg-warning-soft text-warning"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {ind.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <WorkflowBadge status={ind.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 4. PURCHASES / POS TAB */}
        <TabsContent value="purchases" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">Purchase Orders (PO)</h3>
            <Button size="sm" onClick={() => setNewPoOpen(true)} className="gap-1.5">
              <Plus className="size-4" /> New PO
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border bg-card shadow-panel">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3">PO #</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Items Ordered</th>
                  <th className="px-4 py-3">Grand Total</th>
                  <th className="px-4 py-3">Delivery Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-bold text-primary">{po.poNumber}</td>
                    <td className="px-4 py-3 font-semibold">{po.projectName}</td>
                    <td className="px-4 py-3">{po.vendorName}</td>
                    <td className="px-4 py-3">
                      {po.items.map((i) => `${i.quantity} ${i.unit} of ${i.materialName}`).join(", ")}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold">{formatCurrency(po.grandTotal)}</td>
                    <td className="px-4 py-3">{po.expectedDelivery}</td>
                    <td className="px-4 py-3">
                      <WorkflowBadge status={po.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 5. GRN TAB */}
        <TabsContent value="grn" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">Goods Receipt Notes (GRN)</h3>
            <Button size="sm" onClick={() => setNewGrnOpen(true)} className="gap-1.5">
              <Plus className="size-4" /> Record GRN
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border bg-card shadow-panel">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3">GRN #</th>
                  <th className="px-4 py-3">Project / Warehouse</th>
                  <th className="px-4 py-3">Vendor & Challan</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Inspection Summary</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {grnRecords.map((grn) => (
                  <tr key={grn.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-bold text-primary">{grn.grnNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{grn.projectName}</p>
                      <p className="text-[11px] text-muted-foreground">{grn.warehouse}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{grn.vendorName}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{grn.challanNumber} · {grn.vehicleNo}</p>
                    </td>
                    <td className="px-4 py-3">{grn.date}</td>
                    <td className="px-4 py-3">
                      {grn.items.map((i) => (
                        <div key={i.materialId}>
                          <span>Rec: {i.receivedQty} | Acc: {i.acceptedQty} | Rej: {i.rejectedQty} {i.unit}</span>
                          {i.rejectionReason && <p className="text-[10px] text-danger">{i.rejectionReason}</p>}
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-3">
                      <WorkflowBadge status={grn.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 6. ISSUES TAB */}
        <TabsContent value="issues" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">Material Issue Vouchers to Site WBS Activities</h3>
            <Button size="sm" onClick={() => setNewIssueOpen(true)} className="gap-1.5">
              <Plus className="size-4" /> Issue Material
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border bg-card shadow-panel">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3">Issue #</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">WBS Activity Target</th>
                  <th className="px-4 py-3">Issued To</th>
                  <th className="px-4 py-3">Issued Material & Qty</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {materialIssues.map((iss) => (
                  <tr key={iss.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-bold text-primary">{iss.issueNumber}</td>
                    <td className="px-4 py-3 font-semibold">{iss.projectName}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{iss.activityName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{iss.issuedTo}</td>
                    <td className="px-4 py-3 font-mono font-bold">
                      {iss.items.map((i) => `${i.quantity} ${i.unit} of ${i.materialName}`).join(", ")}
                    </td>
                    <td className="px-4 py-3">{iss.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 7. RETURNS TAB */}
        <TabsContent value="returns" className="space-y-4">
          <div className="overflow-x-auto rounded-lg border bg-card shadow-panel">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3">Return #</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Returned By</th>
                  <th className="px-4 py-3">Material & Qty</th>
                  <th className="px-4 py-3">Condition</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {materialReturns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-bold text-primary">{ret.returnNumber}</td>
                    <td className="px-4 py-3 font-semibold">{ret.projectName}</td>
                    <td className="px-4 py-3">{ret.returnedBy}</td>
                    <td className="px-4 py-3 font-mono font-bold">
                      {ret.items.map((i) => `${i.quantity} ${i.unit} ${i.materialName}`).join(", ")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold capitalize">{ret.items[0]?.condition}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{ret.reason}</td>
                    <td className="px-4 py-3">{ret.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 8. TRANSFERS TAB */}
        <TabsContent value="transfers" className="space-y-4">
          <div className="overflow-x-auto rounded-lg border bg-card shadow-panel">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3">Transfer #</th>
                  <th className="px-4 py-3">Source Warehouse</th>
                  <th className="px-4 py-3">Destination Warehouse</th>
                  <th className="px-4 py-3">Transferred Items</th>
                  <th className="px-4 py-3">Dispatch Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stockTransfers.map((st) => (
                  <tr key={st.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-bold text-primary">{st.transferNumber}</td>
                    <td className="px-4 py-3 font-semibold">{st.sourceWarehouse}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{st.destinationWarehouse}</td>
                    <td className="px-4 py-3 font-mono font-bold">
                      {st.items.map((i) => `${i.quantity} ${i.unit} ${i.materialName}`).join(", ")}
                    </td>
                    <td className="px-4 py-3">{st.dispatchDate}</td>
                    <td className="px-4 py-3">
                      <WorkflowBadge status={st.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* New Indent Dialog */}
      <Dialog open={newIndentOpen} onOpenChange={setNewIndentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Site Material Indent</DialogTitle>
            <DialogDescription>Request material requisition for site execution.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateIndent} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Project Site</Label>
              <select
                value={indentProjectId}
                onChange={(e) => setIndentProjectId(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Required Material</Label>
              <select
                value={indentMaterialId}
                onChange={(e) => setIndentMaterialId(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
              >
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.unit})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Quantity</Label>
                <Input value={indentQty} onChange={(e) => setIndentQty(e.target.value)} required className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Required By Date</Label>
                <Input type="date" value={indentDate} onChange={(e) => setIndentDate(e.target.value)} required className="h-9" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Priority</Label>
              <select
                value={indentPriority}
                onChange={(e) => setIndentPriority(e.target.value as Indent["priority"])}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
              >
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Purpose / Specific Location</Label>
              <Input
                placeholder="e.g. Tower A 23rd floor slab casting"
                value={indentPurpose}
                onChange={(e) => setIndentPurpose(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setNewIndentOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Submit Indent
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* New PO Dialog */}
      <Dialog open={newPoOpen} onOpenChange={setNewPoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Issue Purchase Order (PO)</DialogTitle>
            <DialogDescription>Commit purchase contract with selected approved vendor.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePO} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Target Project</Label>
              <select
                value={poProjectId}
                onChange={(e) => setPoProjectId(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Vendor / Supplier</Label>
              <select
                value={poVendorId}
                onChange={(e) => setPoVendorId(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name} ({v.category})</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Material</Label>
              <select
                value={poMaterialId}
                onChange={(e) => setPoMaterialId(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
              >
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} (₹{m.unitRate}/{m.unit})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Order Quantity</Label>
                <Input value={poQty} onChange={(e) => setPoQty(e.target.value)} required className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Expected Delivery</Label>
                <Input type="date" value={poDeliveryDate} onChange={(e) => setPoDeliveryDate(e.target.value)} required className="h-9" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setNewPoOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Issue Purchase Order
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* New GRN Dialog */}
      <Dialog open={newGrnOpen} onOpenChange={setNewGrnOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Goods Receipt Note (GRN)</DialogTitle>
            <DialogDescription>Verify and record incoming material delivery on site.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordGrn} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Project Site</Label>
              <select
                value={grnProjectId}
                onChange={(e) => setGrnProjectId(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Vendor Name</Label>
                <Input value={grnVendorName} onChange={(e) => setGrnVendorName(e.target.value)} required className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Challan / Bill No</Label>
                <Input value={grnChallanNo} onChange={(e) => setGrnChallanNo(e.target.value)} required className="h-9" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Material Received</Label>
              <select
                value={grnMaterialId}
                onChange={(e) => setGrnMaterialId(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
              >
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Received Qty</Label>
                <Input value={grnRecQty} onChange={(e) => setGrnRecQty(e.target.value)} required className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Accepted Qty</Label>
                <Input value={grnAccQty} onChange={(e) => setGrnAccQty(e.target.value)} required className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Rejected Qty</Label>
                <Input value={grnRejQty} onChange={(e) => setGrnRejQty(e.target.value)} className="h-9" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setNewGrnOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Accept & Record GRN
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Issue Dialog */}
      <Dialog open={newIssueOpen} onOpenChange={setNewIssueOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Issue Material to Site Activity</DialogTitle>
            <DialogDescription>Deduct from central warehouse and allocate to work package.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleIssueMaterial} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Project Site</Label>
              <select
                value={issProjectId}
                onChange={(e) => setIssProjectId(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Target WBS Activity</Label>
              <select
                value={issActivityId}
                onChange={(e) => setIssActivityId(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
              >
                {wbsActivities.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Material</Label>
              <select
                value={issMaterialId}
                onChange={(e) => setIssMaterialId(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
              >
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} (Stock: {m.currentStock} {m.unit})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Quantity to Issue</Label>
                <Input value={issQty} onChange={(e) => setIssQty(e.target.value)} required className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Issued To (Gang/Lead)</Label>
                <Input value={issTo} onChange={(e) => setIssTo(e.target.value)} required className="h-9" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setNewIssueOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Issue Material
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
