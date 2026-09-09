import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  HardHat,
  IndianRupee,
  MapPin,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  TrendingUp,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  Star,
  BarChart3,
  CalendarDays,
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
import {
  FormSection,
  FormField,
  FormRow,
  FormActions,
} from "@/components/shared/form-system";
import { formatCurrency, mockStore, useMockStore, useContextualData } from "@/mock";
import type { AttendanceEntry, Employee, LabourContractor } from "@/mock/types";
import { useCurrentUser } from "@/auth";
import { CustomerRole } from "@/authorization";
import { EmptyState } from "@/components/shared/empty-state";
import { ExcelImportWizard } from "@/components/shared/excel-import-wizard";
import { calculateWorkforceProductivity } from "@/lib/calculations";

export const Route = createFileRoute("/people/")({
  head: () => ({
    meta: [
      { title: "People & HR Operations | DEZOBUILD" },
      {
        name: "description",
        content:
          "Site engineers, staff directory, subcontractor labour gangs, and mobile attendance muster roll in DEZOBUILD.",
      },
    ],
  }),
  component: PeoplePage,
});

function PeoplePage() {
  const store = useMockStore();
  const contextual = useContextualData();
  const { user } = useCurrentUser();
  const notify = useNotify();

  const employees = store.employees;
  const labourContractors = store.labourContractors;
  const attendanceRecords = contextual.attendanceRecords;
  const projects = contextual.projects;

  // Primary Section: overview | workforce | muster | productivity | compliance
  const [activeSection, setActiveSection] = useState<"overview" | "workforce" | "muster" | "productivity" | "compliance">("overview");

  // Sub-tabs
  const [workforceSubTab, setWorkforceSubTab] = useState<"employees" | "contractors">("employees");
  const [musterSubTab, setMusterSubTab] = useState<"attendance" | "leave">("attendance");
  const [productivitySubTab, setProductivitySubTab] = useState<"productivity" | "scorecard" | "shortage">("productivity");
  const [complianceSubTab, setComplianceSubTab] = useState<"documents" | "reports">("documents");

  // Excel Import
  const [importPeopleOpen, setImportPeopleOpen] = useState(false);
  const [importDataset, setImportDataset] = useState<"employees" | "workers">("employees");

  // Employee Specific Tab: profile | attendance | leave | documents | tasks
  const [employeeTab, setEmployeeTab] = useState("attendance");

  const [search, setSearch] = useState("");

  // Dialog States
  const [addEmpOpen, setAddEmpOpen] = useState(false);
  const [addGangOpen, setAddGangOpen] = useState(false);

  // Form States - Add Employee
  const [empName, setEmpName] = useState("");
  const [empRole, setEmpRole] = useState("");
  const [empPhone, setEmpPhone] = useState("");
  const [empProject, setEmpProject] = useState(projects[0]?.name || "");

  // Form States - Add Contractor Gang
  const [gangName, setGangName] = useState("");
  const [gangTrade, setGangTrade] = useState("");
  const [gangContact, setGangContact] = useState("");
  const [gangStrength, setGangStrength] = useState("");

  // Attendance Marking State
  const [attProjId, setAttProjId] = useState(projects[0]?.id || "");
  const [attDate, setAttDate] = useState(new Date().toISOString().split("T")[0]);

  // Dynamic workers list
  const [workersList, setWorkersList] = useState<AttendanceEntry[]>([]);

  // Handlers
  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName) return;
    notify(`Employee ${empName} onboarded and credentials issued.`);
    setAddEmpOpen(false);
    setEmpName("");
  };

  const handleAddGang = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gangName) return;
    notify(`Subcontractor Gang ${gangName} registered.`);
    setAddGangOpen(false);
    setGangName("");
  };

  const handleSaveAttendance = () => {
    notify(`Muster roll for ${attDate} verified and saved.`);
  };

  // KPIs
  const totalStaff = employees.length;
  const activeStaff = employees.filter((e) => e.status !== "on_leave").length;
  const totalGangWorkers = labourContractors.reduce((acc, c) => acc + c.currentDeployment, 0);

  // Filtered employees
  const filteredEmployees = employees.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      e.role.toLowerCase().includes(q) ||
      e.assignedSite.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q)
    );
  });

  // If role is EMPLOYEE, render simplified My Work experience
  if (user.role === CustomerRole.EMPLOYEE) {
    return (
      <AppShell crumb="My Attendance">
        <PageHeader
          title="My Employee Workspace"
          subtitle={`Personal attendance log, leave records, assigned tasks, and engineering documents for ${user.name}.`}
          actions={
            <Button size="sm" onClick={() => notify("Attendance check-in logged at 08:15 AM.")} className="gap-1.5 shadow-sm">
              <CheckCircle2 className="size-4" /> Punch Check-In
            </Button>
          }
        />

        <Tabs value={employeeTab} onValueChange={setEmployeeTab} className="space-y-6">
          <TabsList className="bg-card border p-1 shadow-sm h-auto flex-wrap">
            <TabsTrigger value="attendance" className="gap-1.5 py-2 text-xs font-semibold">
              <Clock className="size-4" /> My Attendance
            </TabsTrigger>
            <TabsTrigger value="leave" className="gap-1.5 py-2 text-xs font-semibold">
              <Calendar className="size-4" /> My Leave (14 Days)
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5 py-2 text-xs font-semibold">
              <ClipboardCheck className="size-4" /> My Tasks & Shift
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5 py-2 text-xs font-semibold">
              <FileText className="size-4" /> My Documents
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-1.5 py-2 text-xs font-semibold">
              <UserCheck className="size-4" /> My Profile
            </TabsTrigger>
          </TabsList>

          {employeeTab === "attendance" && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-foreground">Monthly Attendance Muster</h3>
                    <p className="text-xs text-muted-foreground">Personal biometric check-in log</p>
                  </div>
                  <span className="font-bold text-muted-foreground bg-muted px-3 py-1 rounded-full text-xs">
                    Not Checked In
                  </span>
                </div>
                {attendanceRecords.length === 0 ? (
                  <EmptyState
                    icon={Clock}
                    title="No attendance recorded today"
                    description="Use the Punch Check-In action when arriving at your assigned project site."
                    action={{
                      label: "Punch Check-In",
                      onClick: () => notify("Attendance check-in logged successfully."),
                    }}
                  />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-3 text-xs">
                    <div className="p-3 rounded-lg border bg-muted/20">
                      <p className="text-muted-foreground">Check-in Time</p>
                      <p className="font-bold text-base text-foreground mt-0.5">--:--</p>
                    </div>
                    <div className="p-3 rounded-lg border bg-muted/20">
                      <p className="text-muted-foreground">Shift Assigned</p>
                      <p className="font-bold text-base text-foreground mt-0.5">Day Shift (08:00 - 17:00)</p>
                    </div>
                    <div className="p-3 rounded-lg border bg-muted/20">
                      <p className="text-muted-foreground">Assigned Site</p>
                      <p className="font-bold text-base text-foreground mt-0.5">{user.assignedProjects[0]?.projectName || "Unassigned"}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {employeeTab === "leave" && (
            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-bold text-sm text-foreground">Leave Balances</h3>
                <Button size="sm" onClick={() => notify("Leave application submitted.")}>Apply for Leave</Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-3 text-xs">
                <div className="p-4 rounded-lg border bg-muted/20">
                  <p className="text-muted-foreground">Earned Leave (EL)</p>
                  <p className="text-xl font-bold text-foreground mt-1">0 Days</p>
                </div>
                <div className="p-4 rounded-lg border bg-muted/20">
                  <p className="text-muted-foreground">Casual Leave (CL)</p>
                  <p className="text-xl font-bold text-foreground mt-1">0 Days</p>
                </div>
                <div className="p-4 rounded-lg border bg-muted/20">
                  <p className="text-muted-foreground">Sick Leave (SL)</p>
                  <p className="text-xl font-bold text-foreground mt-1">0 Days</p>
                </div>
              </div>
            </div>
          )}

          {employeeTab === "tasks" && (
            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
              <h3 className="font-bold text-sm text-foreground">Assigned Shift Work Activities</h3>
              <EmptyState
                icon={ClipboardCheck}
                title="No assigned site activities"
                description="Work activities assigned by the site engineer will appear here for your shift."
              />
            </div>
          )}

          {employeeTab === "documents" && (
            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
              <h3 className="font-bold text-sm text-foreground">My Transmittals & Safety Guidelines</h3>
              <EmptyState
                icon={FileText}
                title="No documents or transmittals"
                description="Safety circulars, job cards, and engineering drawings assigned to your profile will appear here."
              />
            </div>
          )}

          {employeeTab === "profile" && (
            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3 text-xs">
              <h3 className="font-bold text-sm text-foreground">Employee Profile Card</h3>
              <div className="space-y-2">
                <p>Name: <strong className="text-foreground">{user.name}</strong></p>
                <p>Employee ID: <strong className="text-foreground">{user.id}</strong></p>
                <p>Designation: <strong className="text-foreground">{user.title}</strong></p>
                <p>Assigned Site: <strong className="text-foreground">{user.assignedProjects[0]?.projectName || "Unassigned"}</strong></p>
              </div>
            </div>
          )}
        </Tabs>
      </AppShell>
    );
  }

  // HR / Manager View (Full Workspace)
  return (
    <AppShell crumb="People & HR">
      <PageHeader
        title="People & Workforce Operations"
        subtitle="Staff directory, subcontractor labour gangs, daily biometric muster roll, and PF/ESI statutory compliance."
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setImportDataset("employees");
                setImportPeopleOpen(true);
              }}
              className="gap-1.5 shadow-sm text-xs"
            >
              <Upload className="size-3.5" /> Import People
            </Button>
            <Button size="sm" onClick={() => setAddEmpOpen(true)} className="gap-1.5 shadow-sm text-xs">
              <UserPlus className="size-4" /> Onboard Employee
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAddGangOpen(true)} className="gap-1.5 text-xs">
              <HardHat className="size-4" /> Register Gang
            </Button>
          </div>
        }
      />

      {/* KPI Stats */}
      <StatGrid
        columns={4}
        items={[
          {
            label: "Company Staff Headcount",
            value: totalStaff > 0 ? `${activeStaff} Active Staff` : "0 Staff",
            hint: `${totalStaff} Total registered personnel`,
            icon: <Users className="size-4" />,
          },
          {
            label: "Subcontractor Labour Strength",
            value: totalGangWorkers > 0 ? `${totalGangWorkers} Workers` : "0 Workers",
            hint: `${labourContractors.length} Subcontractor agencies on site`,
            icon: <HardHat className="size-4" />,
          },
          {
            label: "Today's Biometric Muster",
            value: totalStaff + totalGangWorkers > 0 ? "0% Recorded" : "No Muster Data",
            hint: "Daily shift muster tracking",
            tone: "neutral",
            icon: <CheckCircle2 className="size-4" />,
          },
          {
            label: "Statutory PF / ESI Compliance",
            value: totalStaff + totalGangWorkers > 0 ? "Pending Audit" : "Not Configured",
            hint: "Statutory records compliance status",
            tone: "neutral",
            icon: <FileCheck className="size-4" />,
          },
        ]}
        className="mb-6"
      />

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
            <Users className="size-4" /> Workforce Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("workforce")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
              activeSection === "workforce"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserCheck className="size-4" /> Staff & Labour Directory ({employees.length + labourContractors.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("muster")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
              activeSection === "muster"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="size-4" /> Attendance Muster & Leave
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("productivity")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
              activeSection === "productivity"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="size-4" /> Productivity & Scorecards
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
            <FileText className="size-4" /> Statutory Compliance & Reports
          </button>
        </div>

        {/* 1. OVERVIEW TAB */}
        {activeSection === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border bg-card p-5 shadow-panel space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-foreground">Active Subcontractor Labour Gangs</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => {
                      setActiveSection("workforce");
                      setWorkforceSubTab("contractors");
                    }}
                  >
                    View All →
                  </Button>
                </div>
                {labourContractors.length === 0 ? (
                  <EmptyState
                    icon={HardHat}
                    title="No subcontractor gangs registered"
                    description="Register labour agencies to allocate manpower across project work packages."
                    action={{
                      label: "Register Gang",
                      onClick: () => setAddGangOpen(true),
                    }}
                  />
                ) : (
                  <div className="space-y-2 text-xs">
                    {labourContractors.map((c) => (
                      <div key={c.id} className="p-3 rounded-lg border bg-muted/20 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-foreground">{c.name}</p>
                          <p className="text-[11px] text-muted-foreground">{c.trade} · Supervisor: {c.supervisorName}</p>
                        </div>
                        <span className="font-bold text-primary">{c.currentDeployment} workers</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border bg-card p-5 shadow-panel space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-foreground">Site Engineering Staff</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => {
                      setActiveSection("workforce");
                      setWorkforceSubTab("employees");
                    }}
                  >
                    Staff Directory →
                  </Button>
                </div>
                {employees.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No staff members registered"
                    description="Onboard engineers, supervisors, and administrative personnel to build your directory."
                    action={{
                      label: "Onboard Employee",
                      onClick: () => setAddEmpOpen(true),
                    }}
                  />
                ) : (
                  <div className="space-y-2 text-xs">
                    {employees.slice(0, 5).map((e) => (
                      <div key={e.id} className="p-3 rounded-lg border bg-muted/20 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-foreground">{e.name}</p>
                          <p className="text-[11px] text-muted-foreground">{e.role} · {e.assignedSite}</p>
                        </div>
                        <WorkflowBadge status={e.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. WORKFORCE DIRECTORY TAB */}
        {activeSection === "workforce" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={workforceSubTab === "employees" ? "default" : "outline"}
                  onClick={() => setWorkforceSubTab("employees")}
                  className="text-xs gap-1.5"
                >
                  <UserCheck className="size-3.5" /> Staff Directory ({employees.length})
                </Button>
                <Button
                  size="sm"
                  variant={workforceSubTab === "contractors" ? "default" : "outline"}
                  onClick={() => setWorkforceSubTab("contractors")}
                  className="text-xs gap-1.5"
                >
                  <HardHat className="size-3.5" /> Labour Contractors ({labourContractors.length})
                </Button>
              </div>

              {workforceSubTab === "employees" ? (
                <Button size="sm" onClick={() => setAddEmpOpen(true)} className="gap-1.5 text-xs">
                  <UserPlus className="size-3.5" /> Add Employee
                </Button>
              ) : (
                <Button size="sm" onClick={() => setAddGangOpen(true)} className="gap-1.5 text-xs">
                  <HardHat className="size-3.5" /> Register Gang
                </Button>
              )}
            </div>

            {/* EMPLOYEES SUB-TAB */}
            {workforceSubTab === "employees" && (
              <div className="space-y-4">
                <FilterBar
                  searchValue={search}
                  onSearchChange={setSearch}
                  searchPlaceholder="Search employee name, role, site, department…"
                />
                {filteredEmployees.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No employees found"
                    description="Add team members or adjust your search keyword to view staff records."
                    action={{
                      label: "Add Employee",
                      onClick: () => setAddEmpOpen(true),
                    }}
                  />
                ) : (
                  <div className="rounded-xl border bg-card overflow-hidden shadow-panel">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/50 border-b text-[11px] uppercase font-bold text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3">Code</th>
                            <th className="px-4 py-3">Employee Name</th>
                            <th className="px-4 py-3">Designation</th>
                            <th className="px-4 py-3">Assigned Site</th>
                            <th className="px-4 py-3">Contact</th>
                            <th className="px-4 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {filteredEmployees.map((emp) => (
                            <tr key={emp.id} className="hover:bg-muted/20">
                              <td className="px-4 py-3 font-mono font-bold text-muted-foreground">{emp.id}</td>
                              <td className="px-4 py-3 font-semibold text-foreground">{emp.name}</td>
                              <td className="px-4 py-3 text-muted-foreground">{emp.role}</td>
                              <td className="px-4 py-3 font-medium text-foreground">{emp.assignedSite}</td>
                              <td className="px-4 py-3 text-muted-foreground font-mono">{emp.phone}</td>
                              <td className="px-4 py-3"><WorkflowBadge status={emp.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CONTRACTORS SUB-TAB */}
            {workforceSubTab === "contractors" && (
              <div className="space-y-4">
                {labourContractors.length === 0 ? (
                  <EmptyState
                    icon={HardHat}
                    title="No labour contractors registered"
                    description="Register subcontractor agencies to track headcounts, trades, and daily gang wage rates."
                    action={{
                      label: "Register Gang",
                      onClick: () => setAddGangOpen(true),
                    }}
                  />
                ) : (
                  <div className="rounded-xl border bg-card overflow-hidden shadow-panel">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/50 border-b text-[11px] uppercase font-bold text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3">Agency Name</th>
                            <th className="px-4 py-3">Specialization</th>
                            <th className="px-4 py-3">Gang Leader</th>
                            <th className="px-4 py-3 font-mono">Workers on Site</th>
                            <th className="px-4 py-3 font-mono">Daily Wage Rate</th>
                            <th className="px-4 py-3">Compliance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {labourContractors.map((c) => (
                            <tr key={c.id} className="hover:bg-muted/20">
                              <td className="px-4 py-3 font-bold text-foreground">{c.name}</td>
                              <td className="px-4 py-3 text-muted-foreground">{c.trade}</td>
                              <td className="px-4 py-3 text-foreground">{c.supervisorName}</td>
                              <td className="px-4 py-3 font-mono font-bold text-primary">{c.currentDeployment}</td>
                              <td className="px-4 py-3 font-mono font-bold text-foreground">{formatCurrency(c.dailyWageRate)}/day</td>
                              <td className="px-4 py-3"><WorkflowBadge status={c.status} /></td>
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

        {/* 3. MUSTER & LEAVE TAB */}
        {activeSection === "muster" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <Button
                size="sm"
                variant={musterSubTab === "attendance" ? "default" : "outline"}
                onClick={() => setMusterSubTab("attendance")}
                className="text-xs gap-1.5"
              >
                <Clock className="size-3.5" /> Daily Muster Roll
              </Button>
              <Button
                size="sm"
                variant={musterSubTab === "leave" ? "default" : "outline"}
                onClick={() => setMusterSubTab("leave")}
                className="text-xs gap-1.5"
              >
                <Calendar className="size-3.5" /> Leave Approvals & Rosters
              </Button>
            </div>

            {musterSubTab === "attendance" && (
              <div className="rounded-xl border bg-card p-5 shadow-panel space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-foreground">Daily Site Labour Attendance Muster</h3>
                    <p className="text-xs text-muted-foreground">Mark daily gang presence, overtime hours, and trade skills</p>
                  </div>
                  <Button size="sm" onClick={handleSaveAttendance} disabled={workersList.length === 0} className="gap-1.5 shadow-sm">
                    <CheckCircle2 className="size-4" /> Save & Lock Muster
                  </Button>
                </div>

                {workersList.length === 0 ? (
                  <EmptyState
                    icon={Clock}
                    title="No labour muster records for this date"
                    description="Subcontractor gang workers will appear here for daily check-in once gangs are deployed on site."
                    action={{
                      label: "Register Gang",
                      onClick: () => setAddGangOpen(true),
                    }}
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 border-b text-[11px] uppercase font-bold text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3">Worker Name</th>
                          <th className="px-4 py-3">Trade / Skill</th>
                          <th className="px-4 py-3">Subcontractor Gang</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 font-mono">Regular Hrs</th>
                          <th className="px-4 py-3 font-mono">OT Hrs</th>
                          <th className="px-4 py-3 font-mono">Daily Wage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {workersList.map((w, idx) => (
                          <tr key={w.workerId} className="hover:bg-muted/20">
                            <td className="px-4 py-3 font-semibold text-foreground">{w.workerName}</td>
                            <td className="px-4 py-3 text-muted-foreground">{w.trade}</td>
                            <td className="px-4 py-3 font-medium text-primary">{w.contractorName}</td>
                            <td className="px-4 py-3">
                              <select
                                value={w.status}
                                onChange={(e) => {
                                  const newStatus = e.target.value as "present" | "absent" | "half_day";
                                  setWorkersList((prev) =>
                                    prev.map((item, i) => (i === idx ? { ...item, status: newStatus } : item))
                                  );
                                }}
                                className="h-7 rounded border bg-background px-2 text-[11px] font-semibold"
                              >
                                <option value="present">Present</option>
                                <option value="half_day">Half Day</option>
                                <option value="absent">Absent</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 font-mono">{w.hours}h</td>
                            <td className="px-4 py-3 font-mono font-bold text-amber-600">{w.otHours}h</td>
                            <td className="px-4 py-3 font-mono font-bold text-foreground">{formatCurrency(w.wageRate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {musterSubTab === "leave" && (
              <div className="rounded-xl border bg-card p-6 shadow-panel space-y-4">
                <h3 className="font-bold text-sm text-foreground">Employee Leave Applications & Rosters</h3>
                <p className="text-xs text-muted-foreground">Pending leave requests awaiting supervisory sign-off</p>
                <EmptyState
                  icon={Calendar}
                  title="No pending leave applications"
                  description="Staff leave requests submitted through the employee portal will appear here for review."
                />
              </div>
            )}
          </div>
        )}

        {/* 4. PRODUCTIVITY & INTELLIGENCE TAB */}
        {activeSection === "productivity" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <Button
                size="sm"
                variant={productivitySubTab === "productivity" ? "default" : "outline"}
                onClick={() => setProductivitySubTab("productivity")}
                className="text-xs gap-1.5"
              >
                <TrendingUp className="size-3.5" /> Workforce Productivity
              </Button>
              <Button
                size="sm"
                variant={productivitySubTab === "scorecard" ? "default" : "outline"}
                onClick={() => setProductivitySubTab("scorecard")}
                className="text-xs gap-1.5"
              >
                <Star className="size-3.5" /> Contractor Scorecard
              </Button>
              <Button
                size="sm"
                variant={productivitySubTab === "shortage" ? "default" : "outline"}
                onClick={() => setProductivitySubTab("shortage")}
                className="text-xs gap-1.5"
              >
                <CalendarDays className="size-3.5" /> Shortage Forecast
              </Button>
            </div>

            {/* PRODUCTIVITY SUB-TAB */}
            {productivitySubTab === "productivity" && (
              <div className="space-y-4">
                <div className="rounded-xl border bg-blue-50/40 dark:bg-blue-950/20 p-4 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-300">
                    <TrendingUp className="size-4" />
                    <span>Workforce Output vs Standard Productivity Norms</span>
                    <span className="rounded bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 text-[10px] font-mono">
                      CPWD Norms — Configuration/Backend Dependent
                    </span>
                  </div>
                  <p className="text-blue-800/80 dark:text-blue-300/80 text-[11px]">
                    Evaluates actual daily execution progress against standard CPWD/DSR labour man-day coefficients.
                  </p>
                </div>

                <div className="rounded-xl border bg-card p-5 shadow-panel space-y-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="font-bold text-sm text-foreground">Labour Activity Productivity Evaluation</h3>
                    <span className="text-[11px] text-muted-foreground font-mono">Formula: Output ÷ Man-Days</span>
                  </div>

                  <EmptyState
                    icon={TrendingUp}
                    title="No daily productivity evaluations logged"
                    description="Log daily progress against assigned subcontractor muster to track output per man-day and benchmark variance."
                  />
                </div>
              </div>
            )}

            {/* SCORECARD SUB-TAB */}
            {productivitySubTab === "scorecard" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <div>
                    <h3 className="font-bold text-sm text-foreground">Subcontractor Multi-Dimensional Scorecards</h3>
                    <p className="text-xs text-muted-foreground">Evaluation across Quality, Timeliness, Safety EHS, and Manpower strength</p>
                  </div>
                </div>

                {labourContractors.length === 0 ? (
                  <EmptyState
                    icon={Star}
                    title="No contractor scorecards available"
                    description="Register labour contractors and record weekly quality and safety audits to generate performance ratings."
                    action={{
                      label: "Register Gang",
                      onClick: () => setAddGangOpen(true),
                    }}
                  />
                ) : (
                  <div className="rounded-xl border bg-card overflow-hidden shadow-panel">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/50 border-b text-[11px] uppercase font-bold text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3">Agency Name</th>
                            <th className="px-4 py-3">Trade</th>
                            <th className="px-4 py-3 text-center">Quality (30%)</th>
                            <th className="px-4 py-3 text-center">Timeliness (30%)</th>
                            <th className="px-4 py-3 text-center">Safety (20%)</th>
                            <th className="px-4 py-3 text-center">Manpower (20%)</th>
                            <th className="px-4 py-3 text-right">Composite Rating</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {labourContractors.map((c) => (
                            <tr key={c.id} className="hover:bg-muted/20">
                              <td className="px-4 py-3 font-bold text-foreground">{c.name}</td>
                              <td className="px-4 py-3 text-muted-foreground">{c.trade}</td>
                              <td className="px-4 py-3 text-center font-mono text-muted-foreground">-- / 100</td>
                              <td className="px-4 py-3 text-center font-mono text-muted-foreground">-- / 100</td>
                              <td className="px-4 py-3 text-center font-mono text-muted-foreground">-- / 100</td>
                              <td className="px-4 py-3 text-center font-mono text-muted-foreground">-- / 100</td>
                              <td className="px-4 py-3 text-right">
                                <span className="rounded bg-muted px-2 py-0.5 font-mono font-bold text-muted-foreground text-[11px]">
                                  Audit Required
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
            )}

            {/* SHORTAGE FORECAST SUB-TAB */}
            {productivitySubTab === "shortage" && (
              <div className="space-y-4">
                <div className="rounded-xl border bg-card p-5 shadow-panel space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b pb-3">
                    <div>
                      <h3 className="font-bold text-sm text-foreground">Look-ahead Workforce Demand & Shortage Forecast</h3>
                      <p className="text-xs text-muted-foreground">Planned gang requirements from WBS activities vs committed contractor manpower</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">Forecast Horizon:</span>
                      <select className="h-8 rounded border bg-background px-2 text-xs font-semibold">
                        <option value="7">Next 7 Days</option>
                        <option value="14">Next 14 Days (2-Week Look-ahead)</option>
                        <option value="30">Next 30 Days (1-Month Plan)</option>
                      </select>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-amber-50/40 dark:bg-amber-950/20 p-3 text-[11px] text-amber-800 dark:text-amber-300">
                    <strong>Notice:</strong> Workforce demand projection requires scheduled Look-ahead activities and trade assignments.
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 border-b text-[11px] uppercase font-bold text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3">Trade / Skill Category</th>
                          <th className="px-4 py-3 font-mono text-right">Required (Man-Days)</th>
                          <th className="px-4 py-3 font-mono text-right">Committed Supply</th>
                          <th className="px-4 py-3 font-mono text-right">Projected Variance</th>
                          <th className="px-4 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 font-medium">
                        {[
                          { trade: "RCC Shuttering & Formwork", req: 0, comm: 0 },
                          { trade: "Bar Bending & Rebar Fixing", req: 0, comm: 0 },
                          { trade: "Concreting Gang", req: 0, comm: 0 },
                          { trade: "Blockwork & Plastering", req: 0, comm: 0 },
                          { trade: "MEP & Electrical", req: 0, comm: 0 },
                        ].map((row, idx) => (
                          <tr key={idx} className="hover:bg-muted/20">
                            <td className="px-4 py-3 font-bold text-foreground">{row.trade}</td>
                            <td className="px-4 py-3 font-mono text-right text-muted-foreground">{row.req}</td>
                            <td className="px-4 py-3 font-mono text-right text-muted-foreground">{row.comm}</td>
                            <td className="px-4 py-3 font-mono text-right text-muted-foreground">0</td>
                            <td className="px-4 py-3 text-center">
                              <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                                No Plan Linked
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. STATUTORY COMPLIANCE & REPORTS TAB */}
        {activeSection === "compliance" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <Button
                size="sm"
                variant={complianceSubTab === "documents" ? "default" : "outline"}
                onClick={() => setComplianceSubTab("documents")}
                className="text-xs gap-1.5"
              >
                <FileText className="size-3.5" /> Compliance Documents
              </Button>
              <Button
                size="sm"
                variant={complianceSubTab === "reports" ? "default" : "outline"}
                onClick={() => setComplianceSubTab("reports")}
                className="text-xs gap-1.5"
              >
                <FileSpreadsheet className="size-3.5" /> Workforce Analytics & Reports
              </Button>
            </div>

            {complianceSubTab === "documents" && (
              <div className="rounded-xl border bg-card p-6 shadow-panel space-y-3">
                <h3 className="font-bold text-sm text-foreground">HR & Labour Compliance Documents</h3>
                <p className="text-xs text-muted-foreground">Labour licenses, PF/ESI challans, and contractor agreements</p>
                <EmptyState
                  icon={FileText}
                  title="No compliance documents uploaded"
                  description="Upload statutory PF/ESI challans, labour licenses, and contractor agreements."
                />
              </div>
            )}

            {complianceSubTab === "reports" && (
              <div className="rounded-xl border bg-card p-6 shadow-panel space-y-3">
                <h3 className="font-bold text-sm text-foreground">Workforce & Labour Productivity Analytics</h3>
                <p className="text-xs text-muted-foreground">Monthly muster roll summaries, contractor man-hours, and wage payouts</p>
                <Button size="sm" onClick={() => notify("Labour Productivity Report downloaded.")} className="gap-2">
                  <Download className="size-4" /> Export Muster Roll (PDF/Excel)
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      <Dialog open={addEmpOpen} onOpenChange={setAddEmpOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Onboard New Employee</DialogTitle>
            <DialogDescription className="text-xs">Provision staff profile and assign construction site.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddEmployee} className="space-y-4 pt-2">
            <FormRow columns={1}>
              <FormField id="emp-name" label="Full Name" required>
                <Input
                  id="emp-name"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder="e.g. Anand Deshmukh"
                  required
                  className="h-9 text-xs"
                />
              </FormField>

              <FormField id="emp-role" label="Designation / Role" required>
                <Input
                  id="emp-role"
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value)}
                  placeholder="e.g. Senior Project Engineer"
                  required
                  className="h-9 text-xs"
                />
              </FormField>
            </FormRow>

            <FormRow columns={2}>
              <FormField id="emp-phone" label="Contact Phone" required>
                <Input
                  id="emp-phone"
                  value={empPhone}
                  onChange={(e) => setEmpPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  required
                  className="h-9 text-xs font-mono"
                />
              </FormField>

              <FormField id="emp-proj" label="Assigned Project Site" required>
                <Input
                  id="emp-proj"
                  value={empProject}
                  onChange={(e) => setEmpProject(e.target.value)}
                  placeholder="e.g. Metro Line 4 Station"
                  required
                  className="h-9 text-xs"
                />
              </FormField>
            </FormRow>

            <FormActions
              onCancel={() => setAddEmpOpen(false)}
              submitLabel="Onboard Employee"
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Contractor Gang Modal */}
      <Dialog open={addGangOpen} onOpenChange={setAddGangOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Register Subcontractor Gang</DialogTitle>
            <DialogDescription className="text-xs">Register labour agency and deploy gang strength.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddGang} className="space-y-4 pt-2">
            <FormRow columns={1}>
              <FormField id="gang-name" label="Contractor / Agency Name" required>
                <Input
                  id="gang-name"
                  value={gangName}
                  onChange={(e) => setGangName(e.target.value)}
                  placeholder="e.g. Apex Civil Works & Labour Corp"
                  required
                  className="h-9 text-xs"
                />
              </FormField>

              <FormField id="gang-trade" label="Trade / Specialization" required>
                <Input
                  id="gang-trade"
                  value={gangTrade}
                  onChange={(e) => setGangTrade(e.target.value)}
                  placeholder="e.g. RCC Formwork & Bar Bending"
                  required
                  className="h-9 text-xs"
                />
              </FormField>
            </FormRow>

            <FormRow columns={2}>
              <FormField id="gang-contact" label="Gang Leader Contact" required>
                <Input
                  id="gang-contact"
                  value={gangContact}
                  onChange={(e) => setGangContact(e.target.value)}
                  placeholder="e.g. Suresh Kumar (+91 98111...)"
                  required
                  className="h-9 text-xs font-mono"
                />
              </FormField>

              <FormField id="gang-strength" label="Initial Worker Count" required>
                <Input
                  id="gang-strength"
                  type="number"
                  value={gangStrength}
                  onChange={(e) => setGangStrength(e.target.value)}
                  placeholder="e.g. 24"
                  required
                  className="h-9 text-xs font-mono font-bold"
                />
              </FormField>
            </FormRow>

            <FormActions
              onCancel={() => setAddGangOpen(false)}
              submitLabel="Register Gang"
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* People Excel Import Wizard */}
      <ExcelImportWizard
        open={importPeopleOpen}
        onOpenChange={setImportPeopleOpen}
        datasetType={importDataset}
        onImportComplete={(summary: { validCount: number; [key: string]: unknown }) => {
          notify(`Import processed: ${summary.validCount} valid records identified.`);
        }}
      />
    </AppShell>
  );
}
