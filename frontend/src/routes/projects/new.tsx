import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, useMockStore, useContextualData } from "@/mock";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCreateProject } from "@/hooks/api";
import { useNotify } from "@/components/app-shell";
import { useCurrentUser } from "@/auth";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  FileCheck,
  FileText,
  HardHat,
  IndianRupee,
  Loader2,
  MapPin,
  ShieldAlert,
  Trash2,
  Upload,
  UserCheck,
  X,
} from "lucide-react";
import { useState, useRef } from "react";

export const Route = createFileRoute("/projects/new")({
  head: () => ({
    meta: [
      { title: "Create New Project | DEZOBUILD" },
      {
        name: "description",
        content: "Set up a new construction project and budget in DEZOBUILD.",
      },
    ],
  }),
  component: CreateProjectWizard,
});

function CreateProjectWizard() {
  const navigate = useNavigate();
  const contextual = useContextualData();
  const createProjectMutation = useCreateProject();
  const notify = useNotify();
  const { user } = useCurrentUser();
  const { companySettings } = useMockStore();
  const activeProjectsCount = contextual.projects.filter((p) => p.status === "active").length;
  const planName = companySettings?.subscription?.planName || "Enterprise Tier";
  const maxProjects = planName.includes("Starter") ? 2 : planName.includes("Professional") ? 10 : Infinity;
  const isLimitReached = activeProjectsCount >= maxProjects;

  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState(
    `PRJ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
  );
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
  const [kickoffFiles, setKickoffFiles] = useState<{ name: string; size: string; type: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Error & Validation State
  interface FieldErrors {
    name?: string | undefined;
    code?: string | undefined;
    client?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    startDate?: string | undefined;
    targetCompletion?: string | undefined;
    budget?: string | undefined;
  }

  const [apiError, setApiError] = useState<{
    title: string;
    message: string;
    statusCode?: number;
    errorCode?: string;
    requestId?: string;
    invalidParams?: Array<{ name: string; reason: string }>;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const errorBannerRef = useRef<HTMLDivElement>(null);

  const validateStep = (step: number): boolean => {
    const errors: FieldErrors = {};
    if (step === 1 || step === 7) {
      if (!name.trim()) errors.name = "Project Name is required.";
      if (!code.trim()) errors.code = "Project Code is required.";
      if (!client.trim()) errors.client = "Client / Principal Employer is required.";
    }
    if (step === 2 || step === 7) {
      if (!city.trim()) errors.city = "City is required.";
      if (!state.trim()) errors.state = "State is required.";
    }
    if (step === 3 || step === 7) {
      if (!startDate) errors.startDate = "Start Date is required.";
      if (!targetCompletion) errors.targetCompletion = "Target Completion Date is required.";
      if (startDate && targetCompletion && new Date(startDate) > new Date(targetCompletion)) {
        errors.targetCompletion = "Target Completion Date must be after Start Date.";
      }
    }
    if (step === 4 || step === 7) {
      const b = parseFloat(budget);
      if (isNaN(b) || b <= 0) errors.budget = "Approved Budget must be a positive number.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const allowed = [".pdf", ".dwg", ".dxf", ".xlsx", ".zip", ".png", ".jpg", ".jpeg"];
    const added: { name: string; size: string; type: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f) continue;
      const ext = "." + (f.name.split(".").pop()?.toLowerCase() || "");
      if (!allowed.includes(ext)) {
        notify({
          title: "Unsupported File Format",
          message: `File "${f.name}" format not supported. Upload PDF, DWG, DXF, XLSX, or ZIP.`,
          type: "warning",
        });
        continue;
      }
      if (f.size > 25 * 1024 * 1024) {
        notify({
          title: "File Size Exceeded",
          message: `File "${f.name}" exceeds 25 MB limit.`,
          type: "warning",
        });
        continue;
      }
      const sizeStr =
        f.size > 1024 * 1024
          ? `${(f.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(f.size / 1024)} KB`;
      added.push({ name: f.name, size: sizeStr, type: ext.toUpperCase().replace(".", "") });
    }
    if (added.length > 0) {
      setKickoffFiles((prev) => [...prev, ...added]);
      notify({
        title: "Files Attached",
        message: `${added.length} file(s) attached to project kickoff package.`,
        type: "info",
      });
    }
  };

  const removeFile = (idx: number) => {
    setKickoffFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const steps = [
    { num: 1, label: "Basic Info", icon: Building2 },
    { num: 2, label: "Location & Site", icon: MapPin },
    { num: 3, label: "Timeline", icon: Calendar },
    { num: 4, label: "Budget & BOQ", icon: IndianRupee },
    { num: 5, label: "Site Team", icon: UserCheck },
    { num: 6, label: "Documents", icon: FileText },
    { num: 7, label: "Review & Create", icon: CheckCircle2 },
  ];

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (currentStep < 7) {
      if (!validateStep(currentStep)) {
        notify({
          title: "Validation Incomplete",
          message: "Please resolve the highlighted required fields before advancing.",
          type: "warning",
        });
        return;
      }
      setFieldErrors({});
      setCurrentStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Step 7: Final Review & Publish
      if (!validateStep(7)) {
        setApiError({
          title: "Validation Error",
          message: "Mandatory project parameters are missing or invalid. Please check previous steps.",
        });
        notify({
          title: "Validation Error",
          message: "Please complete all mandatory parameters before publishing.",
          type: "warning",
        });
        errorBannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      const rawBudget = parseFloat(budget) || 10000000;
      try {
        const created = await createProjectMutation.mutateAsync({
          name: name.trim(),
          code: code.trim(),
          description: description.trim() || `${projectType} construction project.`,
          startDate: startDate || new Date().toISOString().slice(0, 10),
          targetDate: targetCompletion || "2028-06-30",
          totalBudget: rawBudget,
          clientName: client.trim(),
          location: `${city}, ${state}`,
          city: city.trim(),
          state: state.trim(),
          address: address.trim() || `${city} Construction Site`,
        });

        notify({
          title: "Project Created Successfully",
          message: `Project "${name.trim()}" published to the active portfolio.`,
          type: "success",
        });

        const targetId = (created as any)?.id || "proj-001";
        navigate({ to: `/projects/${targetId}` as any });
      } catch (err: any) {
        const errorMsg =
          err.message ||
          (err.statusCode === 403
            ? "Forbidden: User lacks required permission 'projects:create'."
            : "Failed to create project on backend service.");

        setApiError({
          title: "Error",
          message: errorMsg,
          statusCode: err.statusCode,
          errorCode: err.errorCode,
        });

        notify({
          title: err.statusCode === 403 ? "Access Denied" : "Project Creation Failed",
          message: errorMsg,
          type: "error",
        });

        setTimeout(() => {
          errorBannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
      }
    }
  };

  return (
    <AppShell crumb="Create Project">
      <PageHeader
        title="Create New Project"
        subtitle="Step-by-step project onboarding wizard: Define site specifications, budget baseline, team and milestones."
        breadcrumbs={[{ label: "Projects", href: "/projects" }, { label: "New Project Wizard" }]}
      />

      {/* Simple On-Screen Alert Banner */}
      {apiError && (
        <div
          ref={errorBannerRef}
          role="alert"
          className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-sm animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="size-5 shrink-0 text-destructive" />
            <p className="font-medium text-destructive leading-snug">
              {apiError.message}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setApiError(null)}
            className="size-7 shrink-0 text-destructive/70 hover:text-destructive hover:bg-destructive/20"
          >
            <X className="size-4" />
          </Button>
        </div>
      )}

      {isLimitReached && (
        <div className="mb-6 rounded-xl border border-warning/40 bg-warning-soft p-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 shrink-0 text-warning mt-0.5" />
              <div>
                <p className="font-bold text-foreground text-sm">
                  Active Project Capacity Limit Reached ({activeProjectsCount} / {maxProjects} Projects)
                </p>
                <p className="mt-0.5 text-muted-foreground font-medium">
                  Your current {planName} has reached its maximum quota of active construction projects. Please upgrade your subscription or archive an existing project to create new sites.
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="text-xs h-8 shrink-0" asChild>
              <Link to={"/settings" as any}>View Plans</Link>
            </Button>
          </div>
        </div>
      )}

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
                  onClick={() => {
                    setApiError(null);
                    setCurrentStep(step.num);
                  }}
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
                        ? "bg-primary-foreground text-primary"
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
            <p>
              <strong>Strict Validation:</strong> Budget and schedule baselines cannot be modified
              after initial signoff without owner change order.
            </p>
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
                  <p className="text-xs text-muted-foreground">
                    Enter primary project title, code, and client details.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 pt-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="projName" className={fieldErrors.name ? "text-destructive font-bold" : ""}>
                      Project Name *
                    </Label>
                    <Input
                      id="projName"
                      placeholder="e.g. Zenith Commercial Hub / Palm Meadows"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: "" }));
                      }}
                      className={fieldErrors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                      required
                    />
                    {fieldErrors.name && (
                      <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="size-3.5" /> {fieldErrors.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="projCode" className={fieldErrors.code ? "text-destructive font-bold" : ""}>
                      Project Code / Job Number *
                    </Label>
                    <Input
                      id="projCode"
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value);
                        if (fieldErrors.code) setFieldErrors((prev) => ({ ...prev, code: "" }));
                      }}
                      className={fieldErrors.code ? "border-destructive focus-visible:ring-destructive font-mono" : "font-mono"}
                      required
                    />
                    {fieldErrors.code && (
                      <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="size-3.5" /> {fieldErrors.code}
                      </p>
                    )}
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
                    <Label htmlFor="clientName" className={fieldErrors.client ? "text-destructive font-bold" : ""}>
                      Client / Principal Employer *
                    </Label>
                    <Input
                      id="clientName"
                      placeholder="e.g. Prestige Estates / Godrej Properties"
                      value={client}
                      onChange={(e) => {
                        setClient(e.target.value);
                        if (fieldErrors.client) setFieldErrors((prev) => ({ ...prev, client: "" }));
                      }}
                      className={fieldErrors.client ? "border-destructive focus-visible:ring-destructive" : ""}
                      required
                    />
                    {fieldErrors.client && (
                      <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="size-3.5" /> {fieldErrors.client}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Location */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">Step 2: Location & Site Specifications</h2>
                  <p className="text-xs text-muted-foreground">
                    Geographic coordinates and plot footprint measurements.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 pt-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="siteAddress">Site Address</Label>
                    <Input
                      id="siteAddress"
                      placeholder="Survey No, Main Road, Landmark"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="city" className={fieldErrors.city ? "text-destructive font-bold" : ""}>
                      City *
                    </Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        if (fieldErrors.city) setFieldErrors((prev) => ({ ...prev, city: "" }));
                      }}
                      className={fieldErrors.city ? "border-destructive focus-visible:ring-destructive" : ""}
                      required
                    />
                    {fieldErrors.city && (
                      <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="size-3.5" /> {fieldErrors.city}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="state" className={fieldErrors.state ? "text-destructive font-bold" : ""}>
                      State *
                    </Label>
                    <Input
                      id="state"
                      value={state}
                      onChange={(e) => {
                        setState(e.target.value);
                        if (fieldErrors.state) setFieldErrors((prev) => ({ ...prev, state: "" }));
                      }}
                      className={fieldErrors.state ? "border-destructive focus-visible:ring-destructive" : ""}
                      required
                    />
                    {fieldErrors.state && (
                      <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="size-3.5" /> {fieldErrors.state}
                      </p>
                    )}
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
                  <p className="text-xs text-muted-foreground">
                    Contractual commencement date and target handover date.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="startDate" className={fieldErrors.startDate ? "text-destructive font-bold" : ""}>
                      Mobilization / Start Date *
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (fieldErrors.startDate) setFieldErrors((prev) => ({ ...prev, startDate: "" }));
                      }}
                      className={fieldErrors.startDate ? "border-destructive focus-visible:ring-destructive" : ""}
                      required
                    />
                    {fieldErrors.startDate && (
                      <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="size-3.5" /> {fieldErrors.startDate}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="targetDate" className={fieldErrors.targetCompletion ? "text-destructive font-bold" : ""}>
                      Target Completion Date *
                    </Label>
                    <Input
                      id="targetDate"
                      type="date"
                      value={targetCompletion}
                      onChange={(e) => {
                        setTargetCompletion(e.target.value);
                        if (fieldErrors.targetCompletion) setFieldErrors((prev) => ({ ...prev, targetCompletion: "" }));
                      }}
                      className={fieldErrors.targetCompletion ? "border-destructive focus-visible:ring-destructive" : ""}
                      required
                    />
                    {fieldErrors.targetCompletion && (
                      <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="size-3.5" /> {fieldErrors.targetCompletion}
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2 rounded-lg border bg-muted/30 p-4 text-xs space-y-2">
                    <p className="font-bold text-foreground">
                      Standard Baseline Milestones created automatically:
                    </p>
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
                  <p className="text-xs text-muted-foreground">
                    Contract value and package-wise financial ceiling.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 pt-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="budget" className={fieldErrors.budget ? "text-destructive font-bold" : ""}>
                      Approved Contract Budget (INR) *
                    </Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="budget"
                        type="number"
                        placeholder="e.g. 280000000"
                        value={budget}
                        onChange={(e) => {
                          setBudget(e.target.value);
                          if (fieldErrors.budget) setFieldErrors((prev) => ({ ...prev, budget: "" }));
                        }}
                        className={`pl-9 font-mono font-bold text-base ${fieldErrors.budget ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        required
                      />
                    </div>
                    {fieldErrors.budget && (
                      <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="size-3.5" /> {fieldErrors.budget}
                      </p>
                    )}
                    <p className="text-xs font-medium text-primary mt-1">
                      Formatted: {formatCurrency(parseFloat(budget) || 0)}
                    </p>
                  </div>

                  <div className="rounded-md border p-3 text-xs">
                    <span className="text-muted-foreground">Civil & Structural Works</span>
                    <p className="font-bold font-mono text-sm mt-0.5">
                      {formatCurrency((parseFloat(budget) || 0) * 0.55)} (55%)
                    </p>
                  </div>

                  <div className="rounded-md border p-3 text-xs">
                    <span className="text-muted-foreground">Finishing & Facade</span>
                    <p className="font-bold font-mono text-sm mt-0.5">
                      {formatCurrency((parseFloat(budget) || 0) * 0.22)} (22%)
                    </p>
                  </div>

                  <div className="rounded-md border p-3 text-xs">
                    <span className="text-muted-foreground">MEP & Firefighting</span>
                    <p className="font-bold font-mono text-sm mt-0.5">
                      {formatCurrency((parseFloat(budget) || 0) * 0.15)} (15%)
                    </p>
                  </div>

                  <div className="rounded-md border p-3 text-xs">
                    <span className="text-muted-foreground">Contingency Reserve</span>
                    <p className="font-bold font-mono text-sm mt-0.5">
                      {formatCurrency((parseFloat(budget) || 0) * 0.08)} (8%)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Team */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">Step 5: Project Team Assignment</h2>
                  <p className="text-xs text-muted-foreground">
                    Assign responsible key leads and site supervisory personnel.
                  </p>
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
                  <h2 className="text-lg font-bold">
                    Step 6: Initial Project Documents & Drawings
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Attach contract letter of intent, baseline GFC drawings, and statutory permits.
                  </p>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept=".pdf,.dwg,.dxf,.xlsx,.zip,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />

                <div
                  className="rounded-lg border-2 border-dashed bg-muted/20 p-8 text-center hover:bg-muted/30 transition-colors cursor-pointer"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleFiles(e.dataTransfer.files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="grid size-12 mx-auto place-items-center rounded-full bg-primary/10 text-primary">
                    <Upload className="size-6" />
                  </div>
                  <h3 className="mt-3 font-semibold text-sm">Upload Project Kickoff Package</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Drag and drop Contract Agreement (PDF), Structural Drawings (DWG/PDF), or Soil
                    Reports.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4 gap-2 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    <FileText className="size-4" /> Browse Files
                  </Button>
                </div>

                {kickoffFiles.length > 0 && (
                  <div className="rounded-lg border border-border/80 bg-card p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        Attached Kickoff Documents ({kickoffFiles.length})
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] text-muted-foreground hover:text-destructive"
                        onClick={() => setKickoffFiles([])}
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="divide-y divide-border/60 text-xs">
                      {kickoffFiles.map((file, idx) => (
                        <div key={idx} className="py-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileCheck className="size-4 text-emerald-500 shrink-0" />
                            <div>
                              <p className="font-semibold text-foreground">{file.name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                Format: {file.type} · Size: {file.size}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive"
                            onClick={() => removeFile(idx)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 7: Review */}
            {currentStep === 7 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">Step 7: Final Review & Create</h2>
                  <p className="text-xs text-muted-foreground">
                    Verify project parameters before publishing to the portfolio.
                  </p>
                </div>

                <div className="space-y-3 rounded-lg border bg-muted/30 p-5 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground">Project Name</span>
                      <p className="font-bold text-sm text-foreground">
                        {name || "Untitled Project"}
                      </p>
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
                      <p className="font-semibold text-foreground">
                        {city}, {state}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Approved Budget</span>
                      <p className="font-mono font-bold text-sm text-primary">
                        {formatCurrency(parseFloat(budget) || 0)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Timeline</span>
                      <p className="font-semibold text-foreground">
                        {startDate} to {targetCompletion}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Project Manager</span>
                      <p className="font-semibold text-foreground">{pmName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Site Engineer</span>
                      <p className="font-semibold text-foreground">{siteEngineer}</p>
                    </div>
                    <div className="col-span-2 border-t pt-3">
                      <span className="text-muted-foreground">Attached Kickoff Documents</span>
                      <p className="font-semibold text-foreground mt-0.5">
                        {kickoffFiles.length > 0
                          ? `${kickoffFiles.length} file(s) attached (${kickoffFiles.map((f) => f.name).join(", ")})`
                          : "No initial documents attached (optional)"}
                      </p>
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
                  onClick={() => {
                    setApiError(null);
                    setCurrentStep((s) => s - 1);
                  }}
                  disabled={createProjectMutation.isPending}
                  className="gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="size-4" /> Previous
                </Button>
              ) : (
                <Button variant="outline" size="sm" asChild>
                  <Link to={"/projects" as any}>Cancel</Link>
                </Button>
              )}

              <Button
                type="submit"
                size="sm"
                disabled={createProjectMutation.isPending || isLimitReached}
                className={`gap-1.5 font-semibold cursor-pointer ${
                  currentStep === 7
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                    : ""
                }`}
              >
                {createProjectMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Publishing Project...</span>
                  </>
                ) : currentStep === 7 ? (
                  <>
                    <CheckCircle2 className="size-4" />
                    <span>Publish & Create Project</span>
                  </>
                ) : (
                  <>
                    <span>Next Step</span>
                    <ChevronRight className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
