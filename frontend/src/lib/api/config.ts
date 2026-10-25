/**
 * DEZOBUILD — Frontend API Base Configuration
 * 
 * Supports environment-based configuration for:
 * - Development (local backend :4000)
 * - Staging
 * - Production
 */

const getApiBaseUrl = (): string => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    if (import.meta.env["VITE_API_BASE_URL"]) return import.meta.env["VITE_API_BASE_URL"] as string;
    if (import.meta.env["VITE_API_URL"]) return import.meta.env["VITE_API_URL"] as string;
  }
  return "http://localhost:4000/api/v1";
};

export const API_CONFIG = {
  baseUrl: getApiBaseUrl(),
  timeoutMs: 30_000,
  storageKeys: {
    accessToken: "dezobuild_access_token",
    refreshToken: "dezobuild_refresh_token",
    activeUser: "dezobuild_active_user",
  },
} as const;
