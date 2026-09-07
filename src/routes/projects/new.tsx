import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, mockStore } from "@/mock";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  FileText,
  HardHat,
  IndianRupee,
  MapPin,
  Shield,
  Upload,
  UserCheck,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/projects/new")({
  head: () => ({
    meta: [
      { title: "Create New Project | DEZOBUILD" },
      { name: "description", content: "Set up a new construction project and budget in DEZOBUILD." },
    ],
  }),
  component: CreateProjectWizard,
});

function CreateProjectWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState(`PRJ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [client, setClient] = useState("");
  const [projectType, setProjectType] = useState("Residential High-Rise");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Bengaluru");
  const [state, setState] = useState("Karnataka");
  const [siteArea, setSiteArea] = useState("3.5 Acres");
  const [builtUpArea, setBuiltUpArea] = useState("4,50,000 sq.ft");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [targetCompletion, setTargetCompletion] = useState("2028-06-30");
  const [budget, setBudget] = useState("280000000"); // ₹28 Cr default
  const [pmName, setPmName] = useState("Rahul Menon");
  const [siteEngineer, setSiteEngineer] = useState("Vikram Shenoy");
  const [description, setDescription] = useState("");

  const steps = [
    { num: 1, label: "Basic Info", icon: Building2 },
    { num: 2, label: "Location & Site", icon: MapPin },
    { num: 3, label: "Timeline", icon: Calendar },
    { num: 4, label: "Budget & BOQ", icon: IndianRupee },
    { num: 5, label: "Site Team", icon: UserCheck },
    { num: 6, label: "Documents", icon: FileText },
    { num: 7, label: "Review & Create", icon: CheckCircle2 },
  ];

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep < 7) {
      setCurrentStep((s) => s + 1);
    } else {
      // Create project
      const rawBudget = parseFloat(budget) || 10000000;
      const newProj = mockStore.addProject({
        name: name || "New Project",
        code,
        client: client || "Client Real Estate Ltd.",
        location: `${city}`,
        address: address || `${city} Construction Site`,
        city,
        state,
        startDate: startDate || new Date().toISOString().slice(0, 10),
        targetCompletion: targetCompletion || "2028-06-30",
        status: "active",
        health: "healthy",
        budget: rawBudget,
        actualCost: 0,
        committedCost: rawBudget * 0.15,
        progress: 0,
        plannedProgress: 5,
        manager: {
          id: "usr-pm-new",
          name: pmName,
          role: "Project Manager",
          phone: "+91 98450 99001",
          email: `${pmName.toLowerCase().replace(/\s+/g, ".")}@dezoinfra.com`,
        },
        team: [
          { id: "usr-pm-new", name: pmName, role: "Project Manager", phone: "+91 98450 99001", email: "pm@dezoinfra.com" },
          { id: "usr-se-new", name: siteEngineer, role: "Site Engineer", phone: "+91 98450 99002", email: "se@dezoinfra.com" },
        ],
        siteArea,
        builtUpArea,
        description: description || `${projectType} construction project.`,
      });

      navigate({ to: `/projects/${newProj.id}` as any });
    }
  };

  return (
    <AppShell crumb="Create Project">
      <PageHeader
        title="Create New Project"
        subtitle="Step-by-step project onboarding wizard: Define site specifications, budget baseline, team and milestones."
        breadcrumbs={[
          { label: "Projects", href: "/projects" },
          { label: "New Project Wizard" },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Step Indicator Sidebar */}
        <div className="rounded-lg border bg-card p-4 shadow-panel h-fit">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            Setup Progress
          </p>
          <div className="space-y-1">
            {steps.map((step) => {
              const Icon = step.icon;
              const isDone = currentStep > step.num;
              const isCurrent = currentStep === step.num;
              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => setCurrentStep(step.num)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-xs font-medium transition-colors text-left ${
                    isCurrent
                      ? "bg-primary text-primary-foreground font-bold shadow-sm"
                      : isDone
                      ? "text-foreground hover:bg-muted font-semibold"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <div
                    className={`grid size-6 place-items-center rounded-full text-[11px] font-bold ${
                      isCurrent
                        ? "bg-white text-primary"
                        : isDone
                        ? "bg-success text-success-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="size-3.5" /> : step.num}
                  </div>
                  <span className="truncate">{step.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 border-t pt-4 text-xs text-muted-foreground">
            <p><strong>Strict Validation:</strong> Budget and schedule baselines cannot be modified after initial signoff without owner change order.</p>
          </div>
        </div>

        {/* Wizard Form Body */}
        <div className="rounded-lg border bg-card p-6 shadow-panel">
          <form onSubmit={handleNext}>
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">Step 1: Project Information</h2>
                  <p className="text-xs text-muted-foreground">Enter primary project title, code, and client details.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 pt-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="projName">Project Name *</Label>
                    <Input
                      id="projName"
                      placeholder="e.g. Zenith Commercial Hub / Palm Meadows"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="projCode">Project Code / Job Number</Label>
                    <Input
                      id="projCode"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="projType">Project Type</Label>
                    <select
                      id="projType"
                      value={projectType}
                      onChange={(e) => setProjectType(e.target.value)}
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option>Residential High-Rise</option>
                      <option>Commercial IT/ITES Park</option>
                      <option>Industrial Logistics & Warehouse</option>
                      <option>Infrastructure & Highway Viaduct</option>
                      <option>Hospitality & Institutional</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="clientName">Client / Principal Employer *</Label>
                    <Input
                      id="clientName"
                      placeholder="e.g. Prestige Estates / Godrej Properties"
                      value={client}
                      onChange={(e) => setClient(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Location */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">Step 2: Location & Site Specifications</h2>
                  <p className="text-xs text-muted-foreground">Geographic coordinates and plot footprint measurements.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 pt-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="siteAddress">Site Address *</Label>
                    <Input
                      id="siteAddress"
                      placeholder="Survey No, Main Road, Landmark"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="siteArea">Plot / Site Area</Label>
                    <Input
                      id="siteArea"
                      placeholder="e.g. 5.2 Acres / 22,000 sq.m"
                      value={siteArea}
                      onChange={(e) => setSiteArea(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="builtUpArea">Total Built-up Area (BUA)</Label>
                    <Input
                      id="builtUpArea"
                      placeholder="e.g. 5,20,000 sq.ft"
                      value={builtUpArea}
                      onChange={(e) => setBuiltUpArea(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Timeline */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">Step 3: Timeline & Milestones</h2>
                  <p className="text-xs text-muted-foreground">Contractual commencement date and target handover date.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="startDate">Mobilization / Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="targetDate">Target Completion Date *</Label>
                    <Input
                      id="targetDate"
                      type="date"
                      value={targetCompletion}
                      onChange={(e) => setTargetCompletion(e.target.value)}
                      required
                    />
                  </div>

                  <div className="sm:col-span-2 rounded-lg border bg-muted/30 p-4 text-xs space-y-2">
                    <p className="font-bold text-foreground">Standard Baseline Milestones created automatically:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>M1: Site Mobilization & Soil Testing (Month 1)</li>
                      <li>M2: Excavation & Raft Foundation Concrete (Month 4)</li>
                      <li>M3: Superstructure RCC Top-Out (Month 18)</li>
                      <li>M4: Finishing, Facade & MEP Commissioning (Month 26)</li>
                      <li>M5: Occupancy Certificate & Handover (Month 30)</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Budget */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">Step 4: Approved Budget & BOQ Allocation</h2>
                  <p className="text-xs text-muted-foreground">Contract value and package-wise financial ceiling.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 pt-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="budget">Approved Contract Budget (INR) *</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="budget"
                        type="number"
                        placeholder="e.g. 280000000"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        className="pl-9 font-mono font-bold text-base"
                        required
                      />
                    </div>
                    <p className="text-xs font-medium text-primary mt-1">
                      Formatted: {formatCurrency(parseFloat(budget) || 0)}
                    </p>
                  </div>

                  <div className="rounded-md border p-3 text-xs">
                    <span className="text-muted-foreground">Civil & Structural Works</span>
                    <p className="font-bold font-mono text-sm mt-0.5">{formatCurrency((parseFloat(budget) || 0) * 0.55)} (55%)</p>
                  </div>

                  <div className="rounded-md border p-3 text-xs">
                    <span className="text-muted-foreground">Finishing & Facade</span>
                    <p className="font-bold font-mono text-sm mt-0.5">{formatCurrency((parseFloat(budget) || 0) * 0.22)} (22%)</p>
                  </div>

                  <div className="rounded-md border p-3 text-xs">
                    <span className="text-muted-foreground">MEP & Firefighting</span>
                    <p className="font-bold font-mono text-sm mt-0.5">{formatCurrency((parseFloat(budget) || 0) * 0.15)} (15%)</p>
                  </div>

                  <div className="rounded-md border p-3 text-xs">
                    <span className="text-muted-foreground">Contingency Reserve</span>
                    <p className="font-bold font-mono text-sm mt-0.5">{formatCurrency((parseFloat(budget) || 0) * 0.08)} (8%)</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Team */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">Step 5: Project Team Assignment</h2>
                  <p className="text-xs text-muted-foreground">Assign responsible key leads and site supervisory personnel.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="pmName">Project Manager / Director *</Label>
                    <select
                      id="pmName"
                      value={pmName}
                      onChange={(e) => setPmName(e.target.value)}
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option>Rahul Menon</option>
                      <option>Sunita Deshpande</option>
                      <option>Anita Reddy</option>
                      <option>Tanvi Sharma</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="siteEngineer">Lead Site Engineer *</Label>
                    <select
                      id="siteEngineer"
                      value={siteEngineer}
                      onChange={(e) => setSiteEngineer(e.target.value)}
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option>Vikram Shenoy</option>
                      <option>Girish Kulkarni</option>
                      <option>Karthik Iyer</option>
                      <option>Prakash Rao</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="desc">Project Scope & Executive Summary</Label>
                    <Textarea
                      id="desc"
                      placeholder="Brief summary of construction scope, structural systems, and client requirements."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="h-20 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Documents */}
            {currentStep === 6 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">Step 6: Initial Project Documents & Drawings</h2>
                  <p className="text-xs text-muted-foreground">Attach contract letter of intent, baseline GFC drawings, and statutory permits.</p>
                </div>

                <div className="rounded-lg border-2 border-dashed bg-muted/20 p-8 text-center">
                  <div className="grid size-12 mx-auto place-items-center rounded-full bg-primary/10 text-primary">
                    <Upload className="size-6" />
                  </div>
                  <h3 className="mt-3 font-semibold text-sm">Upload Project Kickoff Package</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Drag and drop Contract Agreement (PDF), Structural Drawings (DWG/PDF), or Soil Reports.
                  </p>
                  <Button type="button" variant="outline" size="sm" className="mt-4 gap-2">
                    <FileText className="size-4" /> Browse Files
                  </Button>
                </div>
              </div>
            )}

            {/* Step 7: Review */}
            {currentStep === 7 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">Step 7: Final Review & Create</h2>
                  <p className="text-xs text-muted-foreground">Verify project parameters before publishing to the portfolio.</p>
                </div>

                <div className="space-y-3 rounded-lg border bg-muted/30 p-5 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground">Project Name</span>
                      <p className="font-bold text-sm text-foreground">{name || "Untitled Project"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Project Code</span>
                      <p className="font-mono font-bold text-sm text-foreground">{code}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Client</span>
                      <p className="font-semibold text-foreground">{client || "Not specified"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Location</span>
                      <p className="font-semibold text-foreground">{city}, {state}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Approved Budget</span>
                      <p className="font-mono font-bold text-sm text-primary">
                        {formatCurrency(parseFloat(budget) || 0)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Timeline</span>
                      <p className="font-semibold text-foreground">{startDate} to {targetCompletion}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Project Manager</span>
                      <p className="font-semibold text-foreground">{pmName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Site Engineer</span>
                      <p className="font-semibold text-foreground">{siteEngineer}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Wizard Navigation Buttons */}
            <div className="mt-8 flex items-center justify-between border-t pt-4">
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep((s) => s - 1)}
                  className="gap-1.5"
                >
                  <ArrowLeft className="size-4" /> Previous
                </Button>
              ) : (
                <Button variant="outline" size="sm" asChild>
                  <Link to={"/projects" as any}>Cancel</Link>
                </Button>
              )}

              <Button type="submit" size="sm" className="gap-1.5 font-semibold">
                {currentStep === 7 ? "Publish & Create Project" : "Next Step"}
                {currentStep < 7 && <ChevronRight className="size-4" />}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
