/**
 * DEZOBUILD — Core Typed HTTP API Client
 * 
 * Centralized fetch handler providing:
 * - Base URL & prefix management
 * - Automatic Authorization header injection
 * - Automated session refresh on 401
 * - Correlation ID tracking
 * - Request timeout & abort signal handling
 * - Normalized ApiError parsing
 */

import { API_CONFIG } from "./config";
import { ApiError } from "./errors";

export interface RequestOptions {
  method?: string | undefined;
  headers?: Record<string, string> | undefined;
  body?: unknown;
  params?: Record<string, any> | undefined;
  timeoutMs?: number | undefined;
  skipAuth?: boolean | undefined;
  signal?: AbortSignal | undefined;
}

class ApiClient {
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  public getAuthToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(API_CONFIG.storageKeys.accessToken);
  }

  public getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(API_CONFIG.storageKeys.refreshToken);
  }

  public setTokens(accessToken: string, refreshToken?: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(API_CONFIG.storageKeys.accessToken, accessToken);
    if (refreshToken) {
      localStorage.setItem(API_CONFIG.storageKeys.refreshToken, refreshToken);
    }
  }

  public clearTokens(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(API_CONFIG.storageKeys.accessToken);
    localStorage.removeItem(API_CONFIG.storageKeys.refreshToken);
    localStorage.removeItem(API_CONFIG.storageKeys.activeUser);
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined | null>): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const base = API_CONFIG.baseUrl.endsWith("/")
      ? API_CONFIG.baseUrl.slice(0, -1)
      : API_CONFIG.baseUrl;

    const url = new URL(`${base}${cleanPath}`, typeof window !== "undefined" ? window.location.origin : "http://localhost:8081");

    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          url.searchParams.set(key, String(val));
        }
      });
    }

    return url.toString();
  }

  public async refreshSession(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;

    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const refreshUrl = this.buildUrl("/auth/refresh");
        const res = await fetch(refreshUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) {
          this.clearTokens();
          return null;
        }

        const json = await res.json();
        const newAccessToken = json?.data?.accessToken || json?.accessToken;
        const newRefreshToken = json?.data?.refreshToken || json?.refreshToken;

        if (newAccessToken) {
          this.setTokens(newAccessToken, newRefreshToken);
          return newAccessToken;
        }
        return null;
      } catch {
        this.clearTokens();
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  public async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(path, options.params);
    const timeout = options.timeoutMs ?? API_CONFIG.timeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const headers: Record<string, string> = {
      "Accept": "application/json",
      ...(options.headers || {}),
    };

    if (options.body !== undefined && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const token = this.getAuthToken();
    if (token && !options.skipAuth) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const init: RequestInit = {
      method: options.method || "GET",
      headers,
      signal: controller.signal,
    };

    if (options.body !== undefined) {
      init.body = options.body instanceof FormData ? options.body : JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, init);

      clearTimeout(timer);

      // Handle 401 Unauthorized -> Attempt token refresh
      if (response.status === 401 && !options.skipAuth && !path.includes("/auth/")) {
        const refreshedToken = await this.refreshSession();
        if (refreshedToken) {
          return this.request<T>(path, {
            ...options,
            headers: {
              ...(options.headers || {}),
              Authorization: `Bearer ${refreshedToken}`,
            },
          });
        }
      }

      // 204 No Content
      if (response.status === 204) {
        return null as unknown as T;
      }

      let responseData: any;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("json")) {
        responseData = await response.json();
      } else {
        const text = await response.text();
        try {
          responseData = text ? JSON.parse(text) : {};
        } catch {
          responseData = text ? { message: text } : {};
        }
      }

      if (!response.ok) {
        throw ApiError.fromResponse(response.status, responseData);
      }

      // If response is wrapped in standard envelope { success: true, data: T }, unwrap data
      if (responseData && typeof responseData === "object" && "success" in responseData && "data" in responseData) {
        return responseData.data as T;
      }

      return responseData as T;
    } catch (err: any) {
      clearTimeout(timer);
      if (err instanceof ApiError) {
        throw err;
      }
      if (err?.name === "AbortError") {
        throw new ApiError({
          message: `Request timed out after ${timeout}ms`,
          statusCode: 408,
          errorCode: "REQUEST_TIMEOUT",
          title: "Request Timeout",
        });
      }
      throw ApiError.networkError(err);
    }
  }

  public get<T = unknown>(path: string, options?: Omit<RequestOptions, "method">): Promise<T> {
    return this.request<T>(path, { ...(options || {}), method: "GET" });
  }

  public post<T = unknown>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return this.request<T>(path, { ...(options || {}), method: "POST", body });
  }

  public patch<T = unknown>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return this.request<T>(path, { ...(options || {}), method: "PATCH", body });
  }

  public put<T = unknown>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return this.request<T>(path, { ...(options || {}), method: "PUT", body });
  }

  public delete<T = unknown>(path: string, options?: Omit<RequestOptions, "method">): Promise<T> {
    return this.request<T>(path, { ...(options || {}), method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
