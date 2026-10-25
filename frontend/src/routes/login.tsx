import { useState, useEffect, type FormEvent } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { HardHat, Eye, EyeOff, LoaderCircle, AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/auth";
import { ThemeToggle } from "@/components/layout/theme-toggle";

interface LoginSearchParams {
  redirect?: string | undefined;
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearchParams => {
    const redirect = typeof search["redirect"] === "string" && search["redirect"].trim() ? (search["redirect"] as string) : undefined;
    return redirect ? { redirect } : {};
  },
  head: () => ({
    meta: [
      { title: "Sign In | DEZOBUILD Construction Operations" },
      {
        name: "description",
        content: "Secure login for DEZOBUILD multi-site construction management platform.",
      },
    ],
  }),
  component: LoginPage,
});

function getSafeRedirect(redirectParam?: string): string {
  if (!redirectParam) return "/";
  // Enforce local relative URLs only; prevent open redirects
  if (redirectParam.startsWith("/") && !redirectParam.startsWith("//") && !redirectParam.includes("\\")) {
    return redirectParam;
  }
  return "/";
}

interface DemoRoleConfig {
  id: string;
  roleName: string;
  badge: string;
  badgeClass: string;
  email: string;
  initials: string;
  description: string;
}

const DEMO_ROLES: DemoRoleConfig[] = [
  {
    id: "demo-owner",
    roleName: "Company Owner",
    badge: "Owner",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    email: "owner@dezoinfra.com",
    initials: "AK",
    description: "Executive portfolio oversight, board governance, and financial health.",
  },
  {
    id: "demo-admin",
    roleName: "Company Admin",
    badge: "Admin",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    email: "admin@dezoinfra.com",
    initials: "NS",
    description: "Company settings, RBAC access control, user management, and compliance.",
  },
  {
    id: "demo-pm",
    roleName: "Project Manager",
    badge: "PM",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    email: "pm@dezoinfra.com",
    initials: "RM",
    description: "Multi-site project execution, WBS schedules, DPR approvals, and variance.",
  },
  {
    id: "demo-site",
    roleName: "Site Engineer",
    badge: "Site Eng",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    email: "site@dezoinfra.com",
    initials: "VS",
    description: "Daily DPR logging, labor muster, machinery hour logs, and site snags.",
  },
  {
    id: "demo-finance",
    roleName: "Accountant",
    badge: "Finance",
    badgeClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
    email: "finance@dezoinfra.com",
    initials: "KJ",
    description: "Invoicing, payables, material purchase reconciliation, and financial ledgers.",
  },
];

const DEMO_PASSWORD = (import.meta.env as Record<string, string | undefined>)["VITE_DEMO_PASSWORD"] || "Password123!";

function LoginPage() {
  const { login, isAuthenticated, isLoading: isAuthResolving } = useAuth();
  const search = useSearch({ from: "/login" });
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeDemoId, setActiveDemoId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const safeRedirect = getSafeRedirect(search.redirect);

  // If already authenticated, redirect to destination
  useEffect(() => {
    if (isAuthenticated && !isAuthResolving) {
      navigate({ to: safeRedirect as any, replace: true });
    }
  }, [isAuthenticated, isAuthResolving, navigate, safeRedirect]);

  const executeLogin = async (targetEmail: string, targetPass: string) => {
    if (!targetEmail.trim() || !targetPass) {
      setErrorMessage("Please enter both your email address and password.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login({ email: targetEmail.trim(), password: targetPass });
      navigate({ to: safeRedirect as any, replace: true });
    } catch (err: any) {
      const status = err?.statusCode || err?.status;
      if (status === 401) {
        setErrorMessage("Invalid email or password. Please check your credentials and try again.");
      } else if (status === 403) {
        setErrorMessage("Your account is suspended or not active. Please contact your company administrator.");
      } else if (status === 429) {
        setErrorMessage("Too many login attempts. Please wait a few moments before trying again.");
      } else {
        setErrorMessage(err?.message || "An unexpected error occurred while signing in. Please check your network connection.");
      }
    } finally {
      setIsSubmitting(false);
      setActiveDemoId(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await executeLogin(email, password);
  };

  const handleDemoRoleClick = async (demo: DemoRoleConfig) => {
    setEmail(demo.email);
    setPassword(DEMO_PASSWORD);
    setActiveDemoId(demo.id);
    await executeLogin(demo.email, DEMO_PASSWORD);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8 sm:px-6 lg:px-8">
      {/* Top right theme toggle */}
      <div className="absolute right-4 top-4 flex items-center gap-2 sm:right-8 sm:top-8">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md">
            <HardHat className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              DEZO<span className="text-primary">BUILD</span>
            </h1>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mt-0.5">
              Connected Construction Platform
            </p>
          </div>
        </div>

        {/* Login Form Card */}
        <Card className="border-border shadow-lg bg-card/95 backdrop-blur-xs">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-bold text-card-foreground">Sign In to Your Workspace</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Enter your enterprise credentials to access your construction projects, site logs, and commercial subledgers.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {errorMessage && (
                <Alert variant="destructive" className="py-2.5 px-3 text-xs bg-destructive/10 border-destructive/30 text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <AlertTitle className="text-xs font-semibold ml-2">Authentication Failed</AlertTitle>
                  <AlertDescription className="text-xs ml-2 mt-0.5">{errorMessage}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="login-email" className="text-xs font-semibold text-foreground">
                  Work Email
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  disabled={isSubmitting}
                  className="h-10 text-sm bg-background/60"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password" className="text-xs font-semibold text-foreground">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    disabled={isSubmitting}
                    className="h-10 pr-10 text-sm bg-background/60"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 font-semibold text-sm shadow-sm transition-all cursor-pointer"
              >
                {isSubmitting && !activeDemoId ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin mr-2" />
                    Authenticating...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </CardFooter>
          </form>

          {/* Try a Demo Role Section */}
          <div className="px-6 pb-6 pt-2">
            <div className="relative flex items-center justify-center my-3">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <span className="relative bg-card px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Or try a demo role
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              {DEMO_ROLES.map((demo) => {
                const isCurrentActive = isSubmitting && activeDemoId === demo.id;
                return (
                  <button
                    key={demo.id}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleDemoRoleClick(demo)}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border/70 bg-muted/20 hover:bg-muted/60 hover:border-primary/40 text-left transition-all group disabled:opacity-60 cursor-pointer"
                  >
                    <div className="grid size-8 place-items-center rounded-md bg-primary/10 border border-primary/20 text-primary font-bold text-xs shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {isCurrentActive ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        demo.initials
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          {demo.roleName}
                        </p>
                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border shrink-0 ${demo.badgeClass}`}>
                          {demo.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate font-mono">
                        {demo.email}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-center text-muted-foreground/75 mt-3 flex items-center justify-center gap-1">
              <ShieldCheck className="size-3 text-emerald-500" /> Server-authenticated via live REST API & role-based access control.
            </p>
          </div>
        </Card>

        {/* Security & System Info Footer */}
        <div className="text-center text-[11px] text-muted-foreground space-y-1">
          <p>Protected by enterprise session encryption & audit telemetry.</p>
          <p className="text-[10px] opacity-75">
            Platform Governance: <span className="font-semibold text-foreground">owner.dezobuild.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}

