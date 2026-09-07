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
import { formatCurrency, mockStore, useMockStore } from "@/mock";
import type { AttendanceEntry, Employee, LabourContractor } from "@/mock/types";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  HardHat,
  IndianRupee,
  MapPin,
  Phone,
  Plus,
  Search,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/people/")({
  head: () => ({
    meta: [
      { title: "People & Labour Management | DEZOBUILD" },
      { name: "description", content: "Site engineers, staff directory, subcontractor labour gangs, and mobile attendance muster roll in DEZOBUILD." },
    ],
  }),
  component: PeoplePage,
});

function PeoplePage() {
  const { employees, labourContractors, attendanceRecords, projects } = useMockStore();
  const notify = useNotify();

  const [activeTab, setActiveTab] = useState("attendance");
  const [search, setSearch] = useState("");

  // Dialog States
  const [addEmpOpen, setAddEmpOpen] = useState(false);
  const [addGangOpen, setAddGangOpen] = useState(false);

  // Mobile-First Attendance State
  const [attProjId, setAttProjId] = useState(projects[0]?.id || "");
  const [attDate, setAttDate] = useState(new Date().toISOString().split("T")[0]);

  // Sample workers for interactive attendance marking
  const [workersList, setWorkersList] = useState<AttendanceEntry[]>([
    { workerId: "w-01", workerName: "Rameshwar Rao", trade: "Head Mason", contractorName: "Apex Gang", status: "present", hours: 8, otHours: 2, wageRate: 950 },
    { workerId: "w-02", workerName: "Sanjay Kumar", trade: "Barbender", contractorName: "Mahadev Gang", status: "present", hours: 8, otHours: 2, wageRate: 850 },
    { workerId: "w-03", workerName: "Deepak Mandal", trade: "Barbender", contractorName: "Mahadev Gang", status: "present", hours: 8, otHours: 0, wageRate: 850 },
    { workerId: "w-04", workerName: "Mukesh Yadav", trade: "Shuttering Carpenter", contractorName: "Apex Gang", status: "present", hours: 8, otHours: 1, wageRate: 900 },
    { workerId: "w-05", workerName: "Chandan Das", trade: "General Helper", contractorName: "Apex Gang", status: "absent", hours: 0, otHours: 0, wageRate: 550 },
    { workerId: "w-06", workerName: "Rohit Roy", trade: "General Helper", contractorName: "Mahadev Gang", status: "present", hours: 8, otHours: 2, wageRate: 550 },
    { workerId: "w-07", workerName: "Kishore Jena", trade: "Electrician", contractorName: "Apex Gang", status: "present", hours: 8, otHours: 0, wageRate: 900 },
  ]);

  // Add Employee Form State
  const [empName, setEmpName] = useState("");
  const [empRole, setEmpRole] = useState("Site Engineer");
  const [empDept, setEmpDept] = useState("Civil Engineering");
  const [empSite, setEmpSite] = useState(projects[0]?.name || "");
  const [empPhone, setEmpPhone] = useState("");
  const [empEmail, setEmpEmail] = useState("");

  // Add Gang Form State
  const [gangName, setGangName] = useState("");
  const [gangTrade, setGangTrade] = useState("Masons & Plaster");
  const [gangProject, setGangProject] = useState(projects[0]?.name || "");
  const [gangPlanned, setGangPlanned] = useState("45");
  const [gangLead, setGangLead] = useState("");
  const [gangPhone, setGangPhone] = useState("");
  const [gangRate, setGangRate] = useState("850");

  // Calculations
  const totalPlannedLabour = labourContractors.reduce((acc, l) => acc + l.plannedDeployment, 0);
  const totalCurrentLabour = labourContractors.reduce((acc, l) => acc + l.currentDeployment, 0);
  const totalStaff = employees.length;

  const presentCount = workersList.filter((w) => w.status === "present").length;
  const totalDailyWageImpact = workersList.reduce((acc, w) => {
    if (w.status === "present") {
      return acc + w.wageRate + (w.otHours * (w.wageRate / 8) * 1.5);
    }
    return acc;
  }, 0);

  const toggleWorkerStatus = (workerId: string) => {
    setWorkersList((prev) =>
      prev.map((w) => {
        if (w.workerId === workerId) {
          const nextStatus = w.status === "present" ? "absent" : "present";
          return {
            ...w,
            status: nextStatus,
            hours: nextStatus === "present" ? 8 : 0,
            otHours: nextStatus === "present" ? w.otHours : 0,
          };
        }
        return w;
      })
    );
  };

  const updateWorkerOt = (workerId: string, ot: number) => {
    setWorkersList((prev) =>
      prev.map((w) => (w.workerId === workerId ? { ...w, otHours: Math.max(0, ot) } : w))
    );
  };

  const handleSaveAttendance = () => {
    const proj = projects.find((p) => p.id === attProjId) ?? projects[0];
    if (!proj) return;
    mockStore.addAttendanceRecord({
      date: attDate || new Date().toISOString().slice(0, 10),
      projectId: proj.id,
      projectName: proj.name,
      totalWorkforce: workersList.length,
      totalPresent: presentCount,
      totalAbsent: workersList.length - presentCount,
      regularHours: presentCount * 8,
      overtimeHours: workersList.reduce((acc, w) => acc + w.otHours, 0),
      totalWageImpact: Math.round(totalDailyWageImpact),
      submittedBy: "Site Supervisor",
      entries: workersList,
    });
    notify(`Daily muster roll attendance saved for ${proj.name}`);
  };

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    mockStore.addEmployee({
      name: empName,
      role: empRole,
      department: empDept,
      assignedSite: empSite,
      phone: empPhone || "+91 98450 11223",
      email: empEmail || "staff@dezoinfra.com",
      status: "on_site",
      dateOfJoining: new Date().toISOString().slice(0, 10),
    });
    notify(`Staff member "${empName}" onboarded.`);
    setAddEmpOpen(false);
    setEmpName("");
  };

  return (
    <AppShell crumb="People">
      <PageHeader
        title="People & Labour Management"
        subtitle="Mobile-first daily attendance muster rolls, subcontractor labour gangs, and employee staff directory."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setAddEmpOpen(true)} className="gap-1.5">
              <UserPlus className="size-4" /> Add Staff Member
            </Button>
            <Button size="sm" onClick={() => setAddGangOpen(true)} className="gap-1.5">
              <Users className="size-4" /> Register Labour Gang
            </Button>
          </div>
        }
      />

      {/* KPI Stats */}
      <StatGrid
        columns={4}
        items={[
          {
            label: "Total Site Workforce Deployed",
            value: `${totalCurrentLabour} Workers`,
            hint: `Planned Strength: ${totalPlannedLabour}`,
            tone: totalCurrentLabour < totalPlannedLabour ? "attention" : "healthy",
            icon: <HardHat className="size-4" />,
          },
          {
            label: "Staff & Engineering Team",
            value: totalStaff,
            hint: "Site PMs, Engineers & QS",
            icon: <UserCheck className="size-4" />,
          },
          {
            label: "Subcontractor Gangs",
            value: labourContractors.length,
            hint: "Active on 6 project sites",
            icon: <Users className="size-4" />,
          },
          {
            label: "Estimated Daily Wage Impact",
            value: formatCurrency(totalCurrentLabour * 780),
            hint: "Daily operational payroll",
            icon: <IndianRupee className="size-4" />,
          },
        ]}
        className="mb-6"
      />

      {/* Submodule Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto border bg-card p-1 shadow-sm h-auto flex-wrap">
          <TabsTrigger value="attendance" className="gap-1.5 py-2">
            <ClipboardCheck className="size-4" /> Daily Attendance Muster Roll
          </TabsTrigger>
          <TabsTrigger value="labour" className="gap-1.5 py-2">
            <Users className="size-4" /> Labour Gangs ({labourContractors.length})
          </TabsTrigger>
          <TabsTrigger value="employees" className="gap-1.5 py-2">
            <UserCheck className="size-4" /> Staff Directory ({employees.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 py-2">
            <Calendar className="size-4" /> Past Attendance Records ({attendanceRecords.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. ATTENDANCE TAB (MOBILE-FIRST) */}
        <TabsContent value="attendance" className="space-y-4">
          {/* Site Selector Bar */}
          <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-panel sm:flex-row sm:items-center sm:justify-between">
            <div className="grid gap-3 sm:grid-cols-2 flex-1 sm:max-w-md">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Select Project Site</Label>
                <select
                  value={attProjId}
                  onChange={(e) => setAttProjId(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-xs font-bold"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.location})</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Muster Roll Date</Label>
                <Input
                  type="date"
                  value={attDate}
                  onChange={(e) => setAttDate(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs border-t sm:border-t-0 pt-3 sm:pt-0">
              <div className="text-right">
                <span className="text-muted-foreground">Present Today:</span>
                <p className="font-mono font-bold text-base text-success">
                  {presentCount} / {workersList.length}
                </p>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground">Wage Impact:</span>
                <p className="font-mono font-bold text-base text-foreground">
                  {formatCurrency(totalDailyWageImpact)}
                </p>
              </div>
              <Button size="sm" onClick={handleSaveAttendance} className="gap-1 font-bold">
                <CheckCircle2 className="size-4" /> Save Muster Roll
              </Button>
            </div>
          </div>

          {/* Interactive Mobile-First Worker Muster List */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workersList.map((worker) => {
              const isPresent = worker.status === "present";
              return (
                <div
                  key={worker.workerId}
                  className={`rounded-lg border p-4 shadow-panel transition-all ${
                    isPresent
                      ? "bg-card border-success/40"
                      : "bg-muted/30 border-dashed border-border opacity-70"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{worker.workerName}</h4>
                      <p className="text-xs text-muted-foreground">{worker.trade} · {worker.contractorName}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleWorkerStatus(worker.workerId)}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                        isPresent
                          ? "bg-success text-success-foreground"
                          : "bg-danger-soft text-danger border border-danger/30"
                      }`}
                    >
                      {isPresent ? "✓ Present" : "✕ Absent"}
                    </button>
                  </div>

                  {isPresent && (
                    <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs">
                      <div>
                        <span className="text-muted-foreground">Daily Wage</span>
                        <p className="font-mono font-bold">₹{worker.wageRate}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Label className="text-[11px] text-muted-foreground">OT Hours:</Label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateWorkerOt(worker.workerId, worker.otHours - 1)}
                            className="size-6 rounded border bg-muted font-bold"
                          >
                            -
                          </button>
                          <span className="font-mono font-bold px-1">{worker.otHours}h</span>
                          <button
                            type="button"
                            onClick={() => updateWorkerOt(worker.workerId, worker.otHours + 1)}
                            className="size-6 rounded border bg-muted font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* 2. LABOUR GANGS TAB */}
        <TabsContent value="labour" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {labourContractors.map((lc) => (
              <div key={lc.id} className="rounded-lg border bg-card p-5 shadow-panel space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-base text-foreground">{lc.name}</h4>
                    <p className="text-xs text-muted-foreground">{lc.trade}</p>
                  </div>
                  <WorkflowBadge status={lc.status} />
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Building2 className="size-3.5" /> {lc.assignedProject}
                </div>

                <div className="grid grid-cols-2 gap-2 border-t pt-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Deployed Today</span>
                    <p className="font-mono font-bold text-foreground text-sm">{lc.currentDeployment} Workers</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Planned Muster</span>
                    <p className="font-mono font-bold text-muted-foreground text-sm">{lc.plannedDeployment} Workers</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Supervisor</span>
                    <p className="font-medium text-foreground">{lc.supervisorName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Daily Wage Rate</span>
                    <p className="font-mono font-bold text-primary">₹{lc.dailyWageRate}/day</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* 3. STAFF DIRECTORY TAB */}
        <TabsContent value="employees" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {employees.map((emp) => (
              <div key={emp.id} className="rounded-lg border bg-card p-5 shadow-panel space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {emp.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-foreground">{emp.name}</h4>
                      <p className="text-xs text-muted-foreground">{emp.role}</p>
                    </div>
                  </div>
                  <WorkflowBadge status={emp.status} />
                </div>

                <div className="space-y-1 text-xs text-muted-foreground pt-1">
                  <p className="flex items-center gap-1.5">
                    <Building2 className="size-3.5" /> Assigned Site: <strong>{emp.assignedSite}</strong>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="size-3.5" /> {emp.phone}
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground">Code: {emp.empCode}</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* 4. PAST ATTENDANCE RECORDS TAB */}
        <TabsContent value="history" className="space-y-4">
          <div className="overflow-x-auto rounded-lg border bg-card shadow-panel">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Project Site</th>
                  <th className="px-4 py-3">Total Muster</th>
                  <th className="px-4 py-3">Present</th>
                  <th className="px-4 py-3">Absent</th>
                  <th className="px-4 py-3">OT Hours</th>
                  <th className="px-4 py-3">Total Wage Impact</th>
                  <th className="px-4 py-3">Submitted By</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {attendanceRecords.map((att) => (
                  <tr key={att.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3.5 font-bold font-mono text-foreground">{att.date}</td>
                    <td className="px-4 py-3.5 font-semibold text-primary">{att.projectName}</td>
                    <td className="px-4 py-3.5 font-mono font-medium">{att.totalWorkforce}</td>
                    <td className="px-4 py-3.5 font-mono font-bold text-success">{att.totalPresent}</td>
                    <td className="px-4 py-3.5 font-mono text-danger">{att.totalAbsent}</td>
                    <td className="px-4 py-3.5 font-mono">{att.overtimeHours} hrs</td>
                    <td className="px-4 py-3.5 font-mono font-bold text-foreground">{formatCurrency(att.totalWageImpact)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{att.submittedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Staff Dialog */}
      <Dialog open={addEmpOpen} onOpenChange={setAddEmpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Onboard Staff Member</DialogTitle>
            <DialogDescription>Register new project manager, site engineer, surveyor or supervisor.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddEmployee} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Full Name *</Label>
              <Input value={empName} onChange={(e) => setEmpName(e.target.value)} required className="h-9" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Role</Label>
                <select
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
                >
                  <option>Project Manager</option>
                  <option>Site Engineer</option>
                  <option>Safety Officer</option>
                  <option>Quantity Surveyor</option>
                  <option>Store Keeper</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Department</Label>
                <Input value={empDept} onChange={(e) => setEmpDept(e.target.value)} className="h-9" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Assigned Site / Project</Label>
              <select
                value={empSite}
                onChange={(e) => setEmpSite(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Phone</Label>
                <Input value={empPhone} onChange={(e) => setEmpPhone(e.target.value)} placeholder="+91 98450..." className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input value={empEmail} onChange={(e) => setEmpEmail(e.target.value)} placeholder="email@dezoinfra.com" className="h-9" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddEmpOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Onboard Employee
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
