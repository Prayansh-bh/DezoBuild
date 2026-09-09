/**
 * DEZOBUILD Client Runtime Error Logging
 */

export function reportRuntimeError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  console.error("[DEZOBUILD Error]", {
    error,
    context,
    url: window.location.href,
    timestamp: new Date().toISOString(),
  });
}
