import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { HardHat, Eye, EyeOff, LoaderCircle, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { invitationsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({
    meta: [
      { title: "Accept Team Invitation | DEZOBUILD" },
      {
        name: "description",
        content: "Set your password and activate your DEZOBUILD team workspace access.",
      },
    ],
  }),
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validations
    if (!token || token.trim().length === 0) {
      setError("Invalid or missing invitation token. Please check your invitation link.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter your password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await invitationsApi.acceptInvite({
        token: token.trim(),
        password,
        ...(fullName.trim() ? { fullName: fullName.trim() } : {}),
      });


      setIsSuccess(true);
      // Clean memory state
      setPassword("");
      setConfirmPassword("");

      // Brief delay to show success state then redirect to authenticated shell
      setTimeout(() => {
        window.location.href = "/";
      }, 1200);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.statusCode === 404 || err.statusCode === 400) {
          setError(
            err.message ||
              "This invitation link is invalid or has expired. Please ask your administrator for a new invite."
          );
        } else if (err.statusCode === 409) {
          setError(
            err.message ||
              "This invitation has already been accepted or is no longer valid."
          );
        } else {
          setError(err.message || "Failed to activate your account. Please try again.");
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred while accepting the invitation.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8 antialiased">
      {/* Subtle background radial glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 size-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 size-96 rounded-full bg-amber-500/5 blur-3xl" />
      </div>

      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <HardHat className="size-6" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-foreground">
            DEZO<span className="text-primary">BUILD</span>
          </h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Connected Construction Management
          </p>
        </div>

        {isSuccess ? (
          <Card className="border-border/80 bg-card/90 shadow-panel backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-2 grid size-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-6" />
              </div>
              <CardTitle className="text-base font-bold text-foreground">
                Account Activated Successfully!
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Your workspace membership is confirmed. Redirecting you to the dashboard...
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-6">
              <LoaderCircle className="size-5 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/80 bg-card/90 shadow-panel backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                <CardTitle className="text-base font-bold text-foreground">
                  Accept Team Invitation
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Set a secure password to complete your profile and access your projects.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="border-destructive/30 bg-destructive/10 text-destructive text-xs py-2.5">
                    <AlertCircle className="size-4" />
                    <AlertTitle className="text-xs font-bold">Unable to Accept Invitation</AlertTitle>
                    <AlertDescription className="text-[11px] leading-relaxed mt-0.5">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Optional full name confirmation */}
                <div className="space-y-1.5">
                  <Label htmlFor="inv-name" className="text-xs font-medium text-foreground">
                    Full Name <span className="text-muted-foreground text-[10px]">(Optional)</span>
                  </Label>
                  <Input
                    id="inv-name"
                    type="text"
                    placeholder="Confirm or update your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isSubmitting}
                    className="h-9 text-xs"
                    autoComplete="name"
                  />
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="inv-password" className="text-xs font-medium text-foreground">
                    Create Password <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="inv-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isSubmitting}
                      className="h-9 pr-9 text-xs"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="inv-confirm-password" className="text-xs font-medium text-foreground">
                    Confirm Password <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="inv-confirm-password"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isSubmitting}
                      className="h-9 pr-9 text-xs"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground pt-0.5">
                    Must be at least 8 characters. Stored securely via cryptographic hashing.
                  </p>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-9 text-xs font-semibold shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <LoaderCircle className="mr-2 size-4 animate-spin" />
                      Activating Account...
                    </>
                  ) : (
                    "Activate Account & Enter Workspace"
                  )}
                </Button>

                <p className="text-center text-[10px] text-muted-foreground">
                  By joining, you agree to your organization's data privacy and security policy.
                </p>
              </CardFooter>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
