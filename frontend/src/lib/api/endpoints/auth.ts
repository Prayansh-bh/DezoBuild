import { apiClient } from "../client";
import type { LoginRequest, LoginResponse, RefreshResponse, UserDto } from "../types";

export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>("/auth/login", credentials, { skipAuth: true });
    if (res?.accessToken) {
      apiClient.setTokens(res.accessToken, res.refreshToken);
    }
    return res;
  },

  refresh: async (refreshToken: string): Promise<RefreshResponse> => {
    return apiClient.post<RefreshResponse>("/auth/refresh", { refreshToken }, { skipAuth: true });
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post("/auth/logout", {});
    } finally {
      apiClient.clearTokens();
    }
  },

  getMe: async (): Promise<UserDto> => {
    return apiClient.get<UserDto>("/auth/me");
  },
};
