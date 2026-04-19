const STORAGE_KEY = "learning-mock-auth-v1";

/** Dispatched when mock login state changes (login or logout). */
export const MOCK_AUTH_EVENT = "learning-mock-auth";

export const DEMO_LOGIN_EMAIL = "admin";
export const DEMO_LOGIN_PASSWORD = "admin";

export function isMockAuthenticated(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "1";
}

export function setMockAuthenticated(active: boolean): void {
  if (active) localStorage.setItem(STORAGE_KEY, "1");
  else localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(MOCK_AUTH_EVENT));
}

export function matchesDemoLogin(email: string, password: string): boolean {
  return (
    email.trim() === DEMO_LOGIN_EMAIL && password.trim() === DEMO_LOGIN_PASSWORD
  );
}
