import { ApiError, apiPostJson } from "./client";
import { extractTokenFromLoginResponse } from "@/lib/mock-auth";

/** Shown when the email field fails format checks or the API rejects the address. */
export const INVALID_EMAIL_MESSAGE =
  "Invalid email, enter correct email address";

export function isValidEmailFormat(email: string): boolean {
  const s = email.trim();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export interface ForgotPasswordPayload {
  email: string;
}

export async function forgotPassword(
  payload: ForgotPasswordPayload
): Promise<Record<string, unknown>> {
  return apiPostJson<Record<string, unknown>>(
    "/api/forget_password",
    payload
  );
}

export function getForgotPasswordErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const b = error.body;
    if (b && typeof b === "object" && b !== null) {
      const errs = (b as { errors?: unknown }).errors;
      if (Array.isArray(errs) && errs.length > 0) {
        const first = errs[0];
        if (first && typeof first === "object" && first !== null) {
          const field = (first as { field?: unknown }).field;
          const raw =
            "message" in first &&
            typeof (first as { message: unknown }).message === "string"
              ? (first as { message: string }).message.trim().toLowerCase()
              : "";
          if (
            field === "email" ||
            raw.includes("email") ||
            raw === "invalid email"
          ) {
            return INVALID_EMAIL_MESSAGE;
          }
        }
      }
    }
    return getLoginErrorMessage(error);
  }
  return getLoginErrorMessage(error);
}

export interface LoginCredentials {
  email: string;
  password: string;
}

/** Extend once the backend contract is documented. */
export type LoginResponse = Record<string, unknown>;

export async function login(
  credentials: LoginCredentials
): Promise<LoginResponse> {
  return apiPostJson<LoginResponse>("/api/course_vendor/login", credentials);
}

/**
 * Only treat login as successful when the body indicates an authenticated session.
 * Prevents storing a session on empty bodies or APIs that echo 200 without proof of login.
 */
export function validateLoginResponseBody(
  data: unknown
): { ok: true } | { ok: false; message: string } {
  if (data === null || typeof data !== "object") {
    return {
      ok: false,
      message: "Unexpected server response after login.",
    };
  }

  const r = data as Record<string, unknown>;

  const errors = r.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const first = errors[0];
    const msg =
      first &&
      typeof first === "object" &&
      first !== null &&
      "message" in first &&
      typeof (first as { message: unknown }).message === "string"
        ? (first as { message: string }).message.trim()
        : "";
    return {
      ok: false,
      message: msg || "Invalid email or password",
    };
  }

  if (r.success === false) {
    const m = r.message;
    return {
      ok: false,
      message:
        typeof m === "string" && m.trim() ? m : "Invalid email or password",
    };
  }

  if (extractTokenFromLoginResponse(r)) {
    return { ok: true };
  }

  if (r.success === true) {
    return { ok: true };
  }

  const user = r.user;
  if (user && typeof user === "object") {
    return { ok: true };
  }

  const inner = r.data;
  if (inner && typeof inner === "object" && inner !== null) {
    const innerRec = inner as Record<string, unknown>;
    if (extractTokenFromLoginResponse(innerRec)) {
      return { ok: true };
    }
    const innerUser = innerRec.user;
    if (innerUser && typeof innerUser === "object") {
      return { ok: true };
    }
  }

  return {
    ok: false,
    message: "Invalid email or password",
  };
}

export function getLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const b = error.body;
    if (b && typeof b === "object" && b !== null) {
      const errs = (b as { errors?: unknown }).errors;
      if (Array.isArray(errs) && errs.length > 0) {
        const first = errs[0];
        if (
          first &&
          typeof first === "object" &&
          "message" in first &&
          typeof (first as { message: unknown }).message === "string"
        ) {
          const m = (first as { message: string }).message.trim();
          if (m) return m;
        }
      }
      const msg = (b as { message?: unknown }).message;
      if (typeof msg === "string" && msg.trim()) return msg;
      const err = (b as { error?: unknown }).error;
      if (typeof err === "string" && err.trim()) return err;
    }
    return `Request failed (${error.status})`;
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Request timed out. Check your network and try again.";
  }
  if (error instanceof TypeError) {
    return "Could not reach the API. From localhost, run `npm run dev` so requests use the dev proxy, or the server must allow your site origin (CORS).";
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}
