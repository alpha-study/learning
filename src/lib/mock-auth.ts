const STORAGE_KEY = "learning-mock-auth-v1";
const VENDOR_TOKEN_KEY = "learning-vendor-auth-token-v1";

/** Dispatched when mock login state changes (login or logout). */
export const MOCK_AUTH_EVENT = "learning-mock-auth";

export const DEMO_LOGIN_EMAIL = "admin";
export const DEMO_LOGIN_PASSWORD = "admin";

export function isMockAuthenticated(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "1";
}

export function getVendorAuthToken(): string | null {
  return localStorage.getItem(VENDOR_TOKEN_KEY);
}

export function extractTokenFromLoginResponse(
  response: Record<string, unknown>
): string | null {
  const keys = [
    "token",
    "access_token",
    "accessToken",
    "jwt",
    "id_token",
  ] as const;

  function search(obj: Record<string, unknown>): string | null {
    for (const k of keys) {
      const v = obj[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    for (const nest of ["data", "user", "vendor", "account", "auth"]) {
      const v = obj[nest];
      if (v && typeof v === "object" && v !== null && !Array.isArray(v)) {
        const found = search(v as Record<string, unknown>);
        if (found) return found;
      }
    }
    return null;
  }

  return search(response);
}

/** Store session after a successful POST /api/course_vendor/login (optional Bearer token). */
export function persistVendorLogin(response: Record<string, unknown>): void {
  localStorage.setItem(STORAGE_KEY, "1");
  const token = extractTokenFromLoginResponse(response);
  if (token) localStorage.setItem(VENDOR_TOKEN_KEY, token);
  else localStorage.removeItem(VENDOR_TOKEN_KEY);
  window.dispatchEvent(new Event(MOCK_AUTH_EVENT));
}

export function setMockAuthenticated(active: boolean): void {
  if (active) localStorage.setItem(STORAGE_KEY, "1");
  else {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(VENDOR_TOKEN_KEY);
  }
  window.dispatchEvent(new Event(MOCK_AUTH_EVENT));
}

export function matchesDemoLogin(email: string, password: string): boolean {
  return (
    email.trim() === DEMO_LOGIN_EMAIL && password.trim() === DEMO_LOGIN_PASSWORD
  );
}
