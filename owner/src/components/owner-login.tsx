import React, { useState } from "react";
import {
  Eye,
  EyeOff,
  HardHat,
  Lock,
  Mail,
  Shield,
  ShieldAlert,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { usePlatformAuth } from "../auth";
import { ThemeToggle } from "./theme-toggle";

const VALID_OWNER_ROUTES = new Set([
  "overview",
  "tenants",
  "subscriptions",
  "billing",
  "users",
  "entitlements",
  "analytics",
  "health",
  "audit",
  "support",
  "settings",
]);

/**
 * Validates and sanitizes a target hash route to prevent open redirects.
 * Only internal owner section tabs are permitted.
 */
export function sanitizeOwnerRedirect(rawHash: string): string {
  if (!rawHash) return "overview";

  const clean = rawHash.replace(/^#\/?/, "").trim().toLowerCase();

  // Reject external schemes or malformed URIs
  if (
    clean.includes("://") ||
    clean.startsWith("//") ||
    clean.startsWith("javascript:") ||
    clean.startsWith("data:")
  ) {
    return "overview";
  }

  // Extract base route before query params or slashes
  const rawBase = clean.split(/[/?#]/)[0];
  const baseRoute = rawBase || "";
  if (VALID_OWNER_ROUTES.has(baseRoute)) {
    return baseRoute;
  }

  return "overview";
}

interface OwnerLoginProps {
  onSuccessRedirect?: (tabId: string) => void;
}

export function OwnerLogin({ onSuccessRedirect }: OwnerLoginProps) {
  const { login } = usePlatformAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage("Please enter your platform administrator email.");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your platform administrator password.");
      return;
    }

    setIsSubmitting(true);

    try {
      await login({ email: trimmedEmail, password });

      // Determine redirect route from initial hash or default to overview
      const targetRoute = sanitizeOwnerRedirect(window.location.hash);
      window.location.hash = targetRoute;
      if (onSuccessRedirect) {
        onSuccessRedirect(targetRoute);
      }
    } catch (err: any) {
      const message =
        err?.message ||
        "Invalid platform administrator credentials. Access to owner governance console is strictly restricted.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-card/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <HardHat className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-foreground">
                DEZO<span className="text-primary">BUILD</span>
              </span>
              <span className="rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-red-600 dark:text-red-400">
                PLATFORM OWNER
              </span>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Root Governance Console
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          {/* Platform Console Header Card */}
          <div className="mb-6 text-center space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-600 dark:text-red-400">
              <Shield className="size-3.5" />
              <span>Super Administrator Access Only</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Owner Portal Sign In
            </h1>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Authenticate with your root platform credentials to access multi-tenant infrastructure, billing, and global tier governance.
            </p>
          </div>

          {/* Login Form Card */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-panel backdrop-blur-xl">
            {errorMessage && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-5 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-destructive animate-in fade-in slide-in-from-top-1 duration-200"
              >
                <ShieldAlert className="size-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Authentication Failed</p>
                  <p className="mt-0.5 leading-relaxed text-destructive/90">{errorMessage}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Email Address */}
              <div className="space-y-1.5">
                <label
                  htmlFor="owner-email"
                  className="block text-xs font-semibold text-foreground"
                >
                  Platform Administrator Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    id="owner-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    required
                    disabled={isSubmitting}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="superadmin@dezobuild.com"
                    className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="owner-password"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Root Platform Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    id="owner-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    disabled={isSubmitting}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-10 text-xs text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={isSubmitting}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Authenticating Credentials…</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Platform Owner</span>
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Architecture Boundary Note */}
            <div className="mt-6 pt-4 border-t border-border/60 text-center">
              <p className="text-[11px] text-muted-foreground">
                Looking for customer construction workspaces?
              </p>
              <a
                href="http://localhost:8081"
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                Go to Customer Portal (app.dezobuild.com)
              </a>
            </div>
          </div>

          {/* Security Notice Footer */}
          <div className="mt-6 text-center">
            <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
              Protected by DEZOBUILD Platform Security. All authentication attempts and administrative actions are cryptographically signed and logged to the global immutable audit trail.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-muted-foreground border-t border-border/40">
        DEZOBUILD Construction OS · Platform Control Plane · owner.dezobuild.com
      </footer>
    </div>
  );
}
