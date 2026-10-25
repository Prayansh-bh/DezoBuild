import { ownerApiClient } from "./client";

export interface BackendHealthDto {
  status: "ok" | "degraded" | "error";
  service: string;
  version: string;
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
  database: {
    connected: boolean;
    status: string;
    latencyMs?: number | undefined;
  };
}

export const platformHealthApi = {
  getHealth: async (): Promise<BackendHealthDto> => {
    return ownerApiClient.get<BackendHealthDto>("/health");
  },
};
