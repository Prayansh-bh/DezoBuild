import { OWNER_API_CONFIG } from "./config";

export class OwnerApiClient {
  private sessionCookie: string | null = null;

  private buildUrl(path: string): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const base = OWNER_API_CONFIG.baseUrl.endsWith("/")
      ? OWNER_API_CONFIG.baseUrl.slice(0, -1)
      : OWNER_API_CONFIG.baseUrl;
    return `${base}${cleanPath}`;
  }

  private getHeaders(customHeaders?: HeadersInit, hasBody = false): HeadersInit {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (hasBody) {
      headers["Content-Type"] = "application/json";
    }

    if (this.sessionCookie) {
      headers["Cookie"] = this.sessionCookie;
    }

    if (customHeaders) {
      Object.assign(headers, customHeaders);
    }

    return headers;
  }

  private captureCookie(res: Response): void {
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      const cookiePart = setCookie.split(";")[0];
      if (cookiePart) {
        this.sessionCookie = cookiePart;
      }
    }
  }

  public async get<T = any>(path: string, customHeaders?: HeadersInit): Promise<T> {
    const url = this.buildUrl(path);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OWNER_API_CONFIG.timeoutMs);

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(customHeaders, false),
        credentials: "include",
        signal: controller.signal,
      });
      clearTimeout(timer);
      this.captureCookie(res);

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        const message = errorBody?.error?.message || `API Request failed with status ${res.status}: ${res.statusText}`;
        throw new Error(message);
      }

      const json = await res.json();
      if (json && typeof json === "object" && "data" in json) {
        return json.data as T;
      }
      return json as T;
    } catch (err: any) {
      clearTimeout(timer);
      throw err;
    }
  }

  public async post<T = any>(path: string, body?: any, customHeaders?: HeadersInit): Promise<T> {
    const url = this.buildUrl(path);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OWNER_API_CONFIG.timeoutMs);

    try {
      const init: RequestInit = {
        method: "POST",
        headers: this.getHeaders(customHeaders, body !== undefined),
        credentials: "include",
        signal: controller.signal,
      };
      if (body !== undefined) {
        init.body = JSON.stringify(body);
      }
      const res = await fetch(url, init);
      clearTimeout(timer);
      this.captureCookie(res);

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        const message = errorBody?.error?.message || `API Request failed with status ${res.status}: ${res.statusText}`;
        throw new Error(message);
      }

      const json = await res.json();
      if (json && typeof json === "object" && "data" in json) {
        return json.data as T;
      }
      return json as T;
    } catch (err: any) {
      clearTimeout(timer);
      throw err;
    }
  }

  public async put<T = any>(path: string, body?: any, customHeaders?: HeadersInit): Promise<T> {
    const url = this.buildUrl(path);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OWNER_API_CONFIG.timeoutMs);

    try {
      const init: RequestInit = {
        method: "PUT",
        headers: this.getHeaders(customHeaders, body !== undefined),
        credentials: "include",
        signal: controller.signal,
      };
      if (body !== undefined) {
        init.body = JSON.stringify(body);
      }
      const res = await fetch(url, init);
      clearTimeout(timer);
      this.captureCookie(res);

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        const message = errorBody?.error?.message || `API Request failed with status ${res.status}: ${res.statusText}`;
        throw new Error(message);
      }

      const json = await res.json();
      if (json && typeof json === "object" && "data" in json) {
        return json.data as T;
      }
      return json as T;
    } catch (err: any) {
      clearTimeout(timer);
      throw err;
    }
  }

  public async delete<T = any>(path: string, customHeaders?: HeadersInit): Promise<T> {
    const url = this.buildUrl(path);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OWNER_API_CONFIG.timeoutMs);

    try {
      const res = await fetch(url, {
        method: "DELETE",
        headers: this.getHeaders(customHeaders, false),
        credentials: "include",
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        const message = errorBody?.error?.message || `API Request failed with status ${res.status}: ${res.statusText}`;
        throw new Error(message);
      }

      const json = await res.json();
      if (json && typeof json === "object" && "data" in json) {
        return json.data as T;
      }
      return json as T;
    } catch (err: any) {
      clearTimeout(timer);
      throw err;
    }
  }
}

export const ownerApiClient = new OwnerApiClient();
