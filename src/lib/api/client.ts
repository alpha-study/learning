import { inferHttpStatusFromGatewayHtml } from "@/lib/course-upload-limits";
import { getVendorAuthToken } from "@/lib/mock-auth";

/** Prevents hung UI when the browser blocks or stalls cross-origin requests (e.g. CORS). */
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown
  ) {
    super(`API error ${status}`);
    this.name = "ApiError";
  }
}

export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!raw) {
    throw new Error("VITE_API_BASE_URL is not set in the environment");
  }
  return raw.replace(/\/+$/, "");
}

/** Join base URL with a path like `/api/course_vendor/login`. */
export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

export async function apiPostJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(DEFAULT_REQUEST_TIMEOUT_MS),
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new ApiError(res.status, data);
  }

  return data as T;
}

export async function apiPostJsonAuth<T>(
  path: string,
  body: unknown,
  options?: { timeoutMs?: number }
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: buildJsonAuthHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new ApiError(res.status, data);
  }

  return data as T;
}

function buildAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = getVendorAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function buildJsonAuthHeaders(): Record<string, string> {
  return {
    ...buildAuthHeaders(),
    "Content-Type": "application/json",
  };
}

export async function apiPatchJsonAuth<T>(
  path: string,
  body?: unknown,
  options?: { timeoutMs?: number }
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const init: RequestInit = {
    method: "PATCH",
    headers: buildJsonAuthHeaders(),
    signal: AbortSignal.timeout(timeoutMs),
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const res = await fetch(apiUrl(path), init);

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new ApiError(res.status, data);
  }

  return data as T;
}

export async function apiPutJson<T>(
  path: string,
  body: unknown,
  options?: { timeoutMs?: number }
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const res = await fetch(apiUrl(path), {
    method: "PUT",
    headers: buildJsonAuthHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new ApiError(res.status, data);
  }

  return data as T;
}

export async function apiDeleteJsonAuth<T>(
  path: string,
  options?: { timeoutMs?: number }
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const res = await fetch(apiUrl(path), {
    method: "DELETE",
    headers: buildAuthHeaders(),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new ApiError(res.status, data);
  }

  return data as T;
}

export async function apiGetJson<T>(
  path: string,
  options?: { timeoutMs?: number }
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const res = await fetch(apiUrl(path), {
    method: "GET",
    headers: buildAuthHeaders(),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new ApiError(res.status, data);
  }

  return data as T;
}

function parseFormDataResponse<T>(text: string, status: number): T {
  const gatewayStatus = inferHttpStatusFromGatewayHtml(text, status);
  if (gatewayStatus != null) {
    throw new ApiError(gatewayStatus, text);
  }

  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (status < 200 || status >= 300) {
    throw new ApiError(status, data);
  }

  return data as T;
}

/** Multipart POST — never set `Content-Type`; the browser adds multipart boundary. */
export async function apiPostFormData<T>(
  path: string,
  formData: FormData,
  options?: {
    timeoutMs?: number;
    onUploadProgress?: (loaded: number, total: number) => void;
  }
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;

  if (options?.onUploadProgress) {
    return apiPostFormDataWithUploadProgress<T>(path, formData, {
      timeoutMs,
      onUploadProgress: options.onUploadProgress,
    });
  }

  const headers = new Headers();
  headers.set("Accept", "application/json");
  const token = getVendorAuthToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers,
    body: formData,
    signal: AbortSignal.timeout(timeoutMs),
  });

  const text = await res.text();
  return parseFormDataResponse<T>(text, res.status);
}

function apiPostFormDataWithUploadProgress<T>(
  path: string,
  formData: FormData,
  options: {
    timeoutMs: number;
    onUploadProgress: (loaded: number, total: number) => void;
  }
): Promise<T> {
  const url = apiUrl(path);
  const token = getVendorAuthToken();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Accept", "application/json");
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    const timeoutId = window.setTimeout(() => {
      xhr.abort();
      reject(new DOMException("The operation timed out.", "AbortError"));
    }, options.timeoutMs);

    xhr.upload.addEventListener("progress", (event) => {
      options.onUploadProgress(event.loaded, event.lengthComputable ? event.total : 0);
    });

    xhr.addEventListener("load", () => {
      window.clearTimeout(timeoutId);
      try {
        resolve(parseFormDataResponse<T>(xhr.responseText, xhr.status));
      } catch (e) {
        reject(e);
      }
    });

    xhr.addEventListener("error", () => {
      window.clearTimeout(timeoutId);
      reject(new TypeError("Network request failed"));
    });

    xhr.addEventListener("abort", () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException("The operation was aborted.", "AbortError"));
    });

    xhr.send(formData);
  });
}
