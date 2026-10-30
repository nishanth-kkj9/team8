import { ApiError } from "./apiErrors";
import { getValidToken, notifySessionExpired } from "./sessionStore";

const DEFAULT_BASE_URL = "https://api.campusos.edu";

export function getApiBaseUrl(): string {
  const envUrl = typeof import.meta !== "undefined" ? import.meta.env?.VITE_API_BASE_URL : undefined;
  const base = envUrl && envUrl.trim() ? envUrl.trim() : DEFAULT_BASE_URL;
  return base.replace(/\/+$/, "");
}

export function resolveEndpointUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const baseUrl = getApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (normalizedPath.startsWith("/api/v1")) {
    return `${baseUrl}${normalizedPath}`;
  }
  return `${baseUrl}/api/v1${normalizedPath}`;
}

export function parseFilenameFromContentDisposition(
  header: string | null,
  fallback: string,
): string {
  if (!header) return fallback;

  // UTF-8 filename pattern filename*=utf-8''encoded_name
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      // fallback if decoding fails
    }
  }

  // Standard pattern filename="name" or filename=name
  const standardMatch = /filename="?([^";]+)"?/i.exec(header);
  if (standardMatch && standardMatch[1]) {
    return standardMatch[1].trim();
  }

  return fallback;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  timeoutMs = 30000,
): Promise<Response> {
  const url = resolveEndpointUrl(path);
  const headers = new Headers(options.headers || {});

  const token = getValidToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const mergedOptions: RequestInit = {
    ...options,
    headers,
    signal: options.signal || controller.signal,
  };

  let response: Response;
  try {
    response = await fetch(url, mergedOptions);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError(0, "TIMEOUT", "Request timed out after 30 seconds");
    }
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      err instanceof Error ? err.message : "Network error occurred",
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401) {
    notifySessionExpired();
  }

  return response;
}

export async function requestJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await apiFetch(path, options);

  if (!response.ok) {
    throw await ApiError.fromResponse(response);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(
      response.status,
      "INVALID_JSON",
      "Failed to parse server JSON response",
    );
  }
}

export const campusOsClient = {
  async get<T>(
    path: string,
    queryParams?: Record<string, unknown>,
  ): Promise<T> {
    let finalPath = path;
    if (queryParams) {
      const searchParams = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        finalPath += (finalPath.includes("?") ? "&" : "?") + queryString;
      }
    }
    return requestJson<T>(finalPath, { method: "GET" });
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    return requestJson<T>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return requestJson<T>(path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  async put<T>(path: string, body?: unknown): Promise<T> {
    return requestJson<T>(path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  async delete<T>(path: string): Promise<T> {
    return requestJson<T>(path, { method: "DELETE" });
  },

  /**
   * Multipart Form-Data POST (e.g. answer submission with document)
   * Note: Do NOT set Content-Type header manually; browser sets boundary.
   */
  async postForm<T>(path: string, formData: FormData): Promise<T> {
    return requestJson<T>(path, {
      method: "POST",
      body: formData,
    });
  },

  /**
   * Multipart Form-Data PATCH (e.g. answer edit with document)
   */
  async patchForm<T>(path: string, formData: FormData): Promise<T> {
    return requestJson<T>(path, {
      method: "PATCH",
      body: formData,
    });
  },

  /**
   * Multipart Form-Data PUT (e.g. filled-form upload)
   */
  async putForm<T>(path: string, formData: FormData): Promise<T> {
    return requestJson<T>(path, {
      method: "PUT",
      body: formData,
    });
  },

  /**
   * Binary File Download Transport
   * Downloads file with Bearer auth, extracts filename from Content-Disposition.
   */
  async downloadFile(
    path: string,
    defaultFilename = "download.pdf",
  ): Promise<{ blob: Blob; filename: string }> {
    const response = await apiFetch(path, {
      method: "GET",
      headers: {
        Accept: "*/*",
      },
    });

    if (!response.ok) {
      throw await ApiError.fromResponse(response);
    }

    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition");
    const filename = parseFilenameFromContentDisposition(
      disposition,
      defaultFilename,
    );

    return { blob, filename };
  },
};
