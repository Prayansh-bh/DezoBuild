export const OWNER_API_CONFIG = {
  baseUrl: (import.meta as any).env?.VITE_API_URL || "http://localhost:4000/api/v1",
  timeoutMs: 10000,
};
