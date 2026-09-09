import { useCurrentUser } from "@/auth";
import { CustomerRole, type CustomerRoleType } from "@/authorization/roles";
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
import { Textarea } from "@/components/ui/textarea";
import { mockStore, useMockStore } from "@/mock";
import type { ExpenseCategory } from "@/mock/types";
import {
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Gauge,
  HardHat,
  PackageMinus,
  ReceiptIndianRupee,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useState } from "react";

export type QuickActionType =
  | "expense"
  | "receipt"
  | "issue"
  | "attendance"
  | "progress"
  | "payment";

const ROLE_ACTIONS_MAP: Record<CustomerRoleType, QuickActionType[]> = {
  [CustomerRole.COMPANY_OWNER]: ["expense", "receipt", "issue", "attendance", "progress", "payment"],
  [CustomerRole.COMPANY_ADMIN]: ["expense", "receipt", "issue", "attendance", "progress", "payment"],
  [CustomerRole.PROJECT_MANAGER]: ["progress", "issue", "attendance", "expense", "payment"],
  [CustomerRole.SITE_ENGINEER]: ["attendance", "receipt", "issue", "progress", "expense"],
  [CustomerRole.PROCUREMENT_STORE]: ["receipt", "issue", "payment"],
  [CustomerRole.ACCOUNTANT]: ["expense", "payment", "receipt"],
  [CustomerRole.HR]: ["attendance"],
  [CustomerRole.EMPLOYEE]: ["attendance"],
  [CustomerRole.VIEWER]: [],
};

export function QuickAddDialog({
  isOpen,
  onClose,
  initialType = "expense",
}: {
  isOpen: boolean;
  onClose: () => void;
  initialType?: QuickActionType;
}) {
  const { user } = useCurrentUser();
  const { projects, materials, wbsActivities, vendors, contractors, employees } = useMockStore();

  const allowedActions = ROLE_ACTIONS_MAP[user?.role || CustomerRole.VIEWER] || [];
  const defaultTab = allowedActions.includes(initialType) ? initialType : (allowedActions[0] || "expense");

  const [activeTab, setActiveTab] = useState<QuickActionType>(defaultTab);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || "");
  const [successMessage, setSuccessMessage] = useState<string>("");

  useEffect(() => {
    if (allowedActions.length > 0 && allowedActions[0] && !allowedActions.includes(activeTab)) {
      setActiveTab(allowedActions[0]);
    }
  }, [user?.role, allowedActions, activeTab]);

  // Form states
  // 1. Expense
  const [expCategory, setExpCategory] = useState<ExpenseCategory>("Fuel");
  const [expAmount, setExpAmount] = useState<string>("");
  const [expVendor, setExpVendor] = useState<string>("");
  const [expNotes, setExpNotes] = useState<string>("");

  // 2. Material Receipt (GRN)
  const [grnMaterialId, setGrnMaterialId] = useState<string>(materials[0]?.id || "");
  const [grnQty, setGrnQty] = useState<string>("");
  const [grnVendor, setGrnVendor] = useState<string>("");
  const [grnChallan, setGrnChallan] = useState<string>("");

  // 3. Material Issue
  const [issMaterialId, setIssMaterialId] = useState<string>(materials[0]?.id || "");
  const [issActivityId, setIssActivityId] = useState<string>(wbsActivities[0]?.id || "");
  const [issQty, setIssQty] = useState<string>("");
  const [issTo, setIssTo] = useState<string>("");

  // 4. Attendance
  const [attWorkers, setAttWorkers] = useState<string>("45");
  const [attPresent, setAttPresent] = useState<string>("42");
  const [attOT, setAttOT] = useState<string>("16");

  // 5. Progress Update
  const [progActivityId, setProgActivityId] = useState<string>(wbsActivities[0]?.id || "");
  const [progNotes, setProgNotes] = useState<string>("");
  const [progQty, setProgQty] = useState<string>("");
  const [progPercent, setProgPercent] = useState<string>("100");

  // 6. Payment / Payment Request
  const [payPayeeType, setPayPayeeType] = useState<"Vendor" | "Contractor" | "Staff">("Vendor");
  const [payPayeeName, setPayPayeeName] = useState<string>("");
  const [payAmount, setPayAmount] = useState<string>("");
  const [payInvoiceRef, setPayInvoiceRef] = useState<string>("");
  const [payDueDate, setPayDueDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [payMode, setPayMode] = useState<string>("Bank Transfer");
  const [payNotes, setPayNotes] = useState<string>("");

  const project = projects.find((p) => p.id === selectedProjectId) ?? projects[0];

  const handleResetAndClose = () => {
    setSuccessMessage("");
    onClose();
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    const amount = parseFloat(expAmount) || 0;
    if (amount <= 0) return;

    mockStore.addExpense({
      projectId: project.id,
      projectName: project.name,
      category: expCategory,
      amount,
      vendorContractor: expVendor || "Site Cash Counter",
      paidBy: "Site Engineer",
      paymentMode: "Petty Cash",
      date: new Date().toISOString().slice(0, 10),
      receiptAttached: true,
      receiptName: "voucher_receipt.jpg",
      status: "approved",
      notes: expNotes || "Recorded via mobile quick add",
    });

    setSuccessMessage(
      `Expense of ₹${amount.toLocaleString("en-IN")} recorded successfully for ${project.name}`,
    );
    setTimeout(handleResetAndClose, 1200);
  };

  const handleGrnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    const qty = parseFloat(grnQty) || 0;
    const mat = materials.find((m) => m.id === grnMaterialId) ?? materials[0];
    if (qty <= 0 || !mat) return;

    mockStore.addGrn({
      poNumber: "PO-2026-DIRECT",
      projectId: project.id,
      projectName: project.name,
      vendorName: grnVendor || "Direct Site Delivery",
      challanNumber: grnChallan || `CH-${Date.now().toString().slice(-5)}`,
      invoiceNumber: `INV-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().slice(0, 10),
      warehouse: `${project.name} Store`,
      vehicleNo: "KA 01 TR 1234",
      receivedBy: "Site Storekeeper",
      items: [
        {
          materialId: mat.id,
          materialName: mat.name,
          orderedQty: qty,
          receivedQty: qty,
          acceptedQty: qty,
          rejectedQty: 0,
          unit: mat.unit,
        },
      ],
      status: "verified",
    });

    setSuccessMessage(`GRN created: Received ${qty} ${mat.unit} of ${mat.name}`);
    setTimeout(handleResetAndClose, 1200);
  };

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    const qty = parseFloat(issQty) || 0;
    const mat = materials.find((m) => m.id === issMaterialId) ?? materials[0];
    const act = wbsActivities.find((a) => a.id === issActivityId) ?? wbsActivities[0];
    if (qty <= 0 || !mat || !act) return;

    mockStore.addMaterialIssue({
      projectId: project.id,
      projectName: project.name,
      activityId: act.id,
      activityName: act.name,
      issuedTo: issTo || "Site Gang Supervisor",
      date: new Date().toISOString().slice(0, 10),
      items: [{ materialId: mat.id, materialName: mat.name, quantity: qty, unit: mat.unit }],
      requisitionNo: `REQ-${Date.now().toString().slice(-4)}`,
      issuedBy: "Site Storekeeper",
    });

    setSuccessMessage(`Issued ${qty} ${mat.unit} of ${mat.name} to ${act.name}`);
    setTimeout(handleResetAndClose, 1200);
  };

  const handleProgressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    const act = wbsActivities.find((a) => a.id === progActivityId) ?? wbsActivities[0];
    if (!act) return;
    const qtyDone = parseFloat(progQty) || 1;

    mockStore.addDpr({
      projectId: project.id,
      projectName: project.name,
      date: new Date().toISOString().slice(0, 10),
      weather: "sunny",
      temperature: "29°C",
      shift: "General Shift (8 AM - 6 PM)",
      manpower: [{ trade: "Civil Crew", skilled: 12, unskilled: 18, supervisor: 1 }],
      equipment: [{ name: "Tower Crane", hours: 8, status: "running" }],
      materials: [{ materialName: "RMC M40", quantity: 24, unit: "cum" }],
      progressItems: [
        {
          activityId: act.id,
          activityName: act.name,
          workCompleted: progNotes || "Work completed per daily schedule and specifications.",
          quantityDone: qtyDone,
          unit: act.unit,
          progressPercentage: parseFloat(progPercent) || 100,
        },
      ],
      photos: [],
      safetyRemarks: "Safe execution with zero incidents.",
      delaysObstacles: "None.",
      submittedBy: { name: "Site Engineer", role: "Field Lead" },
      status: "submitted",
    });

    setSuccessMessage(`Progress updated for ${act.name}`);
    setTimeout(handleResetAndClose, 1200);
  };

  const handleAttendanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    const total = parseInt(attWorkers) || 30;
    const pres = parseInt(attPresent) || 28;
    const ot = parseInt(attOT) || 0;

    mockStore.addAttendanceRecord({
      date: new Date().toISOString().slice(0, 10),
      projectId: project.id,
      projectName: project.name,
      totalWorkforce: total,
      totalPresent: pres,
      totalAbsent: total - pres,
      regularHours: pres * 8,
      overtimeHours: ot,
      totalWageImpact: pres * 850 + ot * 120,
      submittedBy: "Field Supervisor",
      entries: [
        {
          workerId: "w1",
          workerName: "Gang Lead",
          trade: "Mason",
          contractorName: "Apex Gang",
          status: "present",
          hours: 8,
          otHours: 2,
          wageRate: 900,
        },
      ],
    });

    setSuccessMessage(`Attendance marked for ${project.name}: ${pres}/${total} workers present`);
    setTimeout(handleResetAndClose, 1200);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    const amount = parseFloat(payAmount) || 0;
    if (amount <= 0) return;

    mockStore.addPayment({
      projectId: project.id,
      projectName: project.name,
      payeeName: payPayeeName || "Designated Payee",
      payeeType: payPayeeType,
      invoiceRef: payInvoiceRef || `REQ-${Date.now().toString().slice(-4)}`,
      amount,
      dueDate: payDueDate,
      status: "pending",
      paymentMethod: payMode,
    });

    setSuccessMessage(
      `Payment Request of ₹${amount.toLocaleString("en-IN")} submitted for ${project.name} (Pending Approval · Backend Required)`,
    );
    setTimeout(handleResetAndClose, 1200);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleResetAndClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <HardHat className="size-5 text-primary" /> Quick Add Site Transaction
          </DialogTitle>
          <DialogDescription>
            Record field operations, inventory movements, and payment requests in 2 fast steps.
          </DialogDescription>
        </DialogHeader>

        {successMessage ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="grid size-14 place-items-center rounded-full bg-success-soft text-success">
              <CheckCircle2 className="size-8" />
            </div>
            <p className="mt-3 text-base font-bold text-foreground">{successMessage}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Updating project data across all views…
            </p>
          </div>
        ) : allowedActions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <ShieldAlert className="size-6" />
            </div>
            <p className="mt-3 text-sm font-bold text-foreground">Read-Only Workspace</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              Your active role has view-only auditing privileges. Field creation and transaction entry are disabled.
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {/* Project Selector */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">
                Target Project / Site
              </Label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.location})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Action Navigation Buttons (Mandatory 6 Actions) */}
            <div className={`grid gap-2 ${allowedActions.length <= 3 ? "grid-cols-3" : allowedActions.length <= 4 ? "grid-cols-4" : "grid-cols-3 sm:grid-cols-6"}`}>
              {[
                { type: "expense", label: "Expense", icon: ReceiptIndianRupee },
                { type: "receipt", label: "Receipt (GRN)", icon: Boxes },
                { type: "issue", label: "Issue", icon: PackageMinus },
                { type: "attendance", label: "Muster", icon: ClipboardCheck },
                { type: "progress", label: "Progress", icon: Gauge },
                { type: "payment", label: "Payment Req", icon: CreditCard },
              ]
                .filter((item) => allowedActions.includes(item.type as QuickActionType))
                .map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setActiveTab(item.type as QuickActionType)}
                      className={`flex flex-col items-center justify-center gap-1 rounded-md border p-2 text-xs font-semibold transition-colors ${
                        active
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-card text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
            </div>

            {/* Active Subform */}
            {activeTab === "expense" && (
              <form
                onSubmit={handleExpenseSubmit}
                className="space-y-3 rounded-lg border bg-muted/20 p-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Category</Label>
                    <select
                      value={expCategory}
                      onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                      className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-sm"
                    >
                      <option>Fuel</option>
                      <option>Labour Wages</option>
                      <option>Site Amenities</option>
                      <option>Equipment Hire</option>
                      <option>Materials</option>
                      <option>Permits & Statutory</option>
                      <option>Miscellaneous</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Amount (₹)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 25000"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      required
                      className="mt-1 h-9"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Paid To / Vendor</Label>
                  <Input
                    placeholder="e.g. Fuel Station / Labour Contractor"
                    value={expVendor}
                    onChange={(e) => setExpVendor(e.target.value)}
                    className="mt-1 h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Notes / Voucher Reference</Label>
                  <Input
                    placeholder="Purpose of expense"
                    value={expNotes}
                    onChange={(e) => setExpNotes(e.target.value)}
                    className="mt-1 h-9"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleResetAndClose}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">
                    Record Expense
                  </Button>
                </div>
              </form>
            )}

            {activeTab === "receipt" && (
              <form
                onSubmit={handleGrnSubmit}
                className="space-y-3 rounded-lg border bg-muted/20 p-4"
              >
                <div>
                  <Label className="text-xs">Received Material</Label>
                  <select
                    value={grnMaterialId}
                    onChange={(e) => setGrnMaterialId(e.target.value)}
                    className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-sm"
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
                    <Label className="text-xs">Received Quantity</Label>
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={grnQty}
                      onChange={(e) => setGrnQty(e.target.value)}
                      required
                      className="mt-1 h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Challan / Bill No</Label>
                    <Input
                      placeholder="e.g. CH-8910"
                      value={grnChallan}
                      onChange={(e) => setGrnChallan(e.target.value)}
                      className="mt-1 h-9"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Supplier / Vendor Name</Label>
                  <Input
                    placeholder="e.g. Shreeji Ready Mix"
                    value={grnVendor}
                    onChange={(e) => setGrnVendor(e.target.value)}
                    className="mt-1 h-9"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleResetAndClose}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">
                    Record Material Receipt (GRN)
                  </Button>
                </div>
              </form>
            )}

            {activeTab === "issue" && (
              <form
                onSubmit={handleIssueSubmit}
                className="space-y-3 rounded-lg border bg-muted/20 p-4"
              >
                <div>
                  <Label className="text-xs">Material to Issue</Label>
                  <select
                    value={issMaterialId}
                    onChange={(e) => setIssMaterialId(e.target.value)}
                    className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-sm"
                  >
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (Stock: {m.currentStock} {m.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Assigned WBS Activity</Label>
                  <select
                    value={issActivityId}
                    onChange={(e) => setIssActivityId(e.target.value)}
                    className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-sm"
                  >
                    {wbsActivities.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} · {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Issue Quantity</Label>
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={issQty}
                      onChange={(e) => setIssQty(e.target.value)}
                      required
                      className="mt-1 h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Issued To (Gang/Supervisor)</Label>
                    <Input
                      placeholder="e.g. Mahadev Gang"
                      value={issTo}
                      onChange={(e) => setIssTo(e.target.value)}
                      className="mt-1 h-9"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleResetAndClose}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">
                    Issue Material to Site
                  </Button>
                </div>
              </form>
            )}

            {activeTab === "progress" && (
              <form
                onSubmit={handleProgressSubmit}
                className="space-y-3 rounded-lg border bg-muted/20 p-4"
              >
                <div>
                  <Label className="text-xs">WBS Activity</Label>
                  <select
                    value={progActivityId}
                    onChange={(e) => setProgActivityId(e.target.value)}
                    className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-sm"
                  >
                    {wbsActivities.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} · {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Quantity Completed Today</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 420"
                      value={progQty}
                      onChange={(e) => setProgQty(e.target.value)}
                      className="mt-1 h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Progress (% Target)</Label>
                    <Input
                      type="number"
                      placeholder="100"
                      value={progPercent}
                      onChange={(e) => setProgPercent(e.target.value)}
                      className="mt-1 h-9"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Work Completed Summary</Label>
                  <Textarea
                    placeholder="Describe specific area, grid lines, or floor worked on"
                    value={progNotes}
                    onChange={(e) => setProgNotes(e.target.value)}
                    className="mt-1 h-18 text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleResetAndClose}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">
                    Update Progress
                  </Button>
                </div>
              </form>
            )}

            {activeTab === "attendance" && (
              <form
                onSubmit={handleAttendanceSubmit}
                className="space-y-3 rounded-lg border bg-muted/20 p-4"
              >
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Total Muster</Label>
                    <Input
                      type="number"
                      value={attWorkers}
                      onChange={(e) => setAttWorkers(e.target.value)}
                      className="mt-1 h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Present Today</Label>
                    <Input
                      type="number"
                      value={attPresent}
                      onChange={(e) => setAttPresent(e.target.value)}
                      className="mt-1 h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">OT Hours</Label>
                    <Input
                      type="number"
                      value={attOT}
                      onChange={(e) => setAttOT(e.target.value)}
                      className="mt-1 h-9"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleResetAndClose}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">
                    Submit Attendance Roll
                  </Button>
                </div>
              </form>
            )}

            {activeTab === "payment" && (
              <form
                onSubmit={handlePaymentSubmit}
                className="space-y-3 rounded-lg border bg-muted/20 p-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Payee Type</Label>
                    <select
                      value={payPayeeType}
                      onChange={(e) => setPayPayeeType(e.target.value as "Vendor" | "Contractor" | "Staff")}
                      className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-sm"
                    >
                      <option value="Vendor">Vendor (Materials / Hire)</option>
                      <option value="Contractor">Subcontractor (Work Orders)</option>
                      <option value="Staff">Staff / Employee (Expense Claim)</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Payee Name</Label>
                    <Input
                      placeholder={
                        payPayeeType === "Vendor"
                          ? "e.g. UltraTech Cement Ltd"
                          : payPayeeType === "Contractor"
                            ? "e.g. Apex Formwork Gang"
                            : "e.g. Site Engineer"
                      }
                      value={payPayeeName}
                      onChange={(e) => setPayPayeeName(e.target.value)}
                      required
                      className="mt-1 h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Amount (₹)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 150000"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      required
                      className="mt-1 h-9 font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Invoice / Bill Reference</Label>
                    <Input
                      placeholder="e.g. INV-2026-981"
                      value={payInvoiceRef}
                      onChange={(e) => setPayInvoiceRef(e.target.value)}
                      className="mt-1 h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Due Date</Label>
                    <Input
                      type="date"
                      value={payDueDate}
                      onChange={(e) => setPayDueDate(e.target.value)}
                      className="mt-1 h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Payment Mode</Label>
                    <select
                      value={payMode}
                      onChange={(e) => setPayMode(e.target.value)}
                      className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-sm"
                    >
                      <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                      <option value="UPI">UPI / Digital Immediate</option>
                      <option value="Cheque">Account Payee Cheque</option>
                      <option value="Petty Cash">Site Petty Cash</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Justification / Payment Notes</Label>
                  <Textarea
                    placeholder="Provide justification or scope reference for accounting verification"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    className="mt-1 h-16 text-xs"
                  />
                </div>

                <div className="rounded-md border border-border/60 bg-muted/40 p-2 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Workflow:</span> Submitted → Pending Approval → Approved → Paid · <span className="font-mono text-primary font-semibold">Backend Persistence Required</span>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleResetAndClose}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">
                    Submit Payment Request
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
