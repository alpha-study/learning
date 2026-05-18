import {
  ApiError,
  apiGetJson,
  apiPostFormData,
  apiPostJsonAuth,
  apiPutJson,
  getApiBaseUrl,
} from "./client";

export type AccountMeResponse = Record<string, unknown>;

export async function fetchAccountMe(): Promise<AccountMeResponse> {
  return apiGetJson<AccountMeResponse>("/api/account/me");
}

/** Matches PUT /api/account/update_profile (backend uses `avtarUrl` spelling). */
export interface UpdateProfilePayload {
  name: string;
  email: string;
  avtarUrl?: string;
}

/**
 * GET /me and POST upload sometimes return `https://host/assets/https://host/assets/users_avtars/...`.
 * Strip the outer `/assets/` + duplicate URL wrapper.
 */
export function normalizeDuplicatedAssetAvatarUrl(input: string): string {
  let s = input.trim();
  for (let i = 0; i < 6; i += 1) {
    const m = s.match(/^(https?:\/\/[^/\s#?]+)\/assets\/(https?:\/\/.+)$/i);
    if (!m) break;
    s = m[2].trim();
  }
  return s;
}

/**
 * POST update_profile_picture uses form field `avtarFile` (see Postman).
 * Override via VITE_PROFILE_PICTURE_UPLOAD_FIELD.
 */
function profilePictureFormField(): string {
  const fromEnv = import.meta.env.VITE_PROFILE_PICTURE_UPLOAD_FIELD?.trim();
  return fromEnv || "avtarFile";
}

/**
 * Parse path or URL from POST /api/account/update_profile_picture JSON (backend often uses `avtarPath`).
 */
export function extractAvtarUrlFromResponse(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const r = data as Record<string, unknown>;
  const pick = (o: Record<string, unknown>) => {
    const v =
      o.avtarPath ??
      o.avtarUrl ??
      o.avatarUrl ??
      o.profile_picture ??
      o.profilePicture ??
      o.profile_image ??
      o.profileImage ??
      o.photo ??
      o.picture ??
      o.image ??
      o.imagePath ??
      o.image_url ??
      o.url ??
      o.path ??
      o.file ??
      o.filename;
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  let found = pick(r);
  if (!found) {
    for (const nest of [
      "data",
      "result",
      "payload",
      "user",
      "instructor",
      "account",
      "profile",
    ]) {
      const inner = r[nest];
      if (inner && typeof inner === "object" && inner !== null && !Array.isArray(inner)) {
        found = pick(inner as Record<string, unknown>);
        if (found) break;
      }
    }
  }
  return found ? normalizeDuplicatedAssetAvatarUrl(found) : undefined;
}

/** Patch GET /me cache after a successful profile-picture upload (before or without PUT update_profile). */
export function mergeProfilePictureUploadIntoAccountMeCache(
  previous: AccountMeResponse | undefined,
  pathOrUrl: string
): AccountMeResponse {
  const path = pathOrUrl.trim();
  if (!path) {
    return (previous ?? {}) as AccountMeResponse;
  }
  const patch: Record<string, unknown> = {
    avtarUrl: path,
    avtarPath: path,
  };
  const clone = (): Record<string, unknown> => {
    if (previous && typeof previous === "object") {
      try {
        return JSON.parse(JSON.stringify(previous)) as Record<string, unknown>;
      } catch {
        /* fall through */
      }
    }
    return {};
  };
  const base = clone();
  Object.assign(base, patch);
  function patchNested(obj: Record<string, unknown>) {
    for (const key of [
      "data",
      "user",
      "instructor",
      "account",
      "profile",
      "vendor",
    ]) {
      const v = obj[key];
      if (v && typeof v === "object" && v !== null && !Array.isArray(v)) {
        Object.assign(v as Record<string, unknown>, patch);
        patchNested(v as Record<string, unknown>);
      }
    }
  }
  patchNested(base);
  return base as AccountMeResponse;
}

/**
 * POST `multipart/form-data` to `/api/account/update_profile_picture`.
 * Default file field: `avtarFile` (override with `VITE_PROFILE_PICTURE_UPLOAD_FIELD`).
 * Success JSON often includes `avtarPath` or `avtarUrl` — parsed by {@link extractAvtarUrlFromResponse}.
 */
export async function updateProfilePicture(
  file: File
): Promise<Record<string, unknown>> {
  const fd = new FormData();
  fd.append(profilePictureFormField(), file, file.name);
  return apiPostFormData<Record<string, unknown>>(
    "/api/account/update_profile_picture",
    fd
  );
}

export async function updateProfile(
  payload: UpdateProfilePayload
): Promise<Record<string, unknown>> {
  const body: Record<string, unknown> = {
    name: payload.name,
    email: payload.email,
  };
  if (payload.avtarUrl !== undefined && payload.avtarUrl !== "") {
    body.avtarUrl = payload.avtarUrl;
  }
  return apiPutJson<Record<string, unknown>>(
    "/api/account/update_profile",
    body
  );
}

/** Overlay saved profile fields onto cached GET /me JSON so parsers see updates even when names live under nested `instructor`. */
export function mergeSavedProfileIntoAccountMeCache(
  previous: AccountMeResponse | undefined,
  payload: UpdateProfilePayload
): AccountMeResponse {
  const patch: Record<string, unknown> = {
    name: payload.name,
    email: payload.email,
  };
  if (payload.avtarUrl !== undefined && payload.avtarUrl !== "") {
    patch.avtarUrl = payload.avtarUrl;
    patch.avtarPath = payload.avtarUrl;
  }

  const clone = (): Record<string, unknown> => {
    if (previous && typeof previous === "object") {
      try {
        return JSON.parse(JSON.stringify(previous)) as Record<string, unknown>;
      } catch {
        /* fall through */
      }
    }
    return {};
  };

  const base = clone();
  Object.assign(base, patch);

  function patchNested(obj: Record<string, unknown>) {
    for (const key of [
      "data",
      "user",
      "instructor",
      "account",
      "profile",
      "vendor",
    ]) {
      const v = obj[key];
      if (v && typeof v === "object" && v !== null && !Array.isArray(v)) {
        const rec = v as Record<string, unknown>;
        Object.assign(rec, patch);
        patchNested(rec);
      }
    }
    const directInstructor = obj.instructor;
    if (
      directInstructor &&
      typeof directInstructor === "object" &&
      !Array.isArray(directInstructor)
    ) {
      Object.assign(directInstructor as Record<string, unknown>, patch);
    }
  }

  patchNested(base);
  return base as AccountMeResponse;
}

export type ParsedAccountProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
};

/** Combined instructor name for read-only display. */
export function formatInstructorFullName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

/** Uploaded avatars live under this folder on the API host (not under `/vendor`). */
const USERS_AVATARS_PREFIX = /^users_avtars\//i;

/**
 * API often returns a relative storage path (e.g. `users_avtars/photo.jpeg`).
 * Those files are usually served at the **API site origin** (`https://host/...`), not `https://host/vendor/...`.
 * Encodes each path segment so filenames with spaces load correctly.
 */
export function resolveAvatarSrc(pathOrUrl: string | undefined): string | undefined {
  if (!pathOrUrl?.trim()) return undefined;
  const raw = normalizeDuplicatedAssetAvatarUrl(pathOrUrl);
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;

  const pathOnly = raw.replace(/^\/+/, "");
  const encodedPath = pathOnly
    .split("/")
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join("/");

  const mediaBase = import.meta.env.VITE_VENDOR_MEDIA_BASE_URL?.trim().replace(
    /\/+$/,
    ""
  );
  if (mediaBase) {
    if (mediaBase.startsWith("http")) {
      return `${mediaBase}/${encodedPath}`;
    }
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      const prefix = mediaBase.startsWith("/") ? mediaBase : `/${mediaBase}`;
      return `${origin}${prefix}/${encodedPath}`;
    }
  }

  const base = getApiBaseUrl().replace(/\/+$/, "");

  if (base.startsWith("http")) {
    try {
      const u = new URL(base);
      if (USERS_AVATARS_PREFIX.test(pathOnly)) {
        return `${u.origin}/${encodedPath}`;
      }
      return `${base}/${encodedPath}`;
    } catch {
      return `${base}/${encodedPath}`;
    }
  }

  const assetOrigin = import.meta.env.VITE_VENDOR_ASSET_ORIGIN?.trim().replace(
    /\/+$/,
    ""
  );
  if (assetOrigin && USERS_AVATARS_PREFIX.test(pathOnly)) {
    if (assetOrigin.startsWith("http")) {
      return `${assetOrigin}/${encodedPath}`;
    }
  }

  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    const prefix = base.startsWith("/") ? base : `/${base}`;
    return `${origin}${prefix}/${encodedPath}`;
  }

  return `${base}/${encodedPath}`;
}

/** Walk known relation keys so nested `instructor` / vendor account objects are included. */
function collectRecordSources(
  root: Record<string, unknown>
): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const seen = new Set<unknown>();

  function walk(obj: Record<string, unknown>) {
    if (seen.has(obj)) return;
    seen.add(obj);
    out.push(obj);
    const nestedKeys = [
      "data",
      "user",
      "vendor",
      "account",
      "profile",
      "me",
      "instructor",
      "author",
    ];
    for (const key of nestedKeys) {
      const v = obj[key];
      if (v && typeof v === "object" && v !== null && !Array.isArray(v)) {
        walk(v as Record<string, unknown>);
      }
    }
  }

  walk(root);
  return out;
}

const AVATAR_PATH_KEYS = new Set([
  "avtarPath",
  "avtarUrl",
  "avatarUrl",
  "profile_picture",
  "profilePicture",
]);

/** Fallback when the path is nested or uses an unexpected key. */
function findAvatarPathDeep(node: unknown): string | undefined {
  if (!node || typeof node !== "object") return undefined;
  if (Array.isArray(node)) {
    for (const item of node) {
      const f = findAvatarPathDeep(item);
      if (f) return f;
    }
    return undefined;
  }
  const o = node as Record<string, unknown>;
  for (const k of AVATAR_PATH_KEYS) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  for (const v of Object.values(o)) {
    if (v && typeof v === "object") {
      const f = findAvatarPathDeep(v);
      if (f) return f;
    }
  }
  return undefined;
}

function pickString(
  sources: Record<string, unknown>[],
  keys: string[]
): string | undefined {
  for (const src of sources) {
    for (const k of keys) {
      const v = src[k];
      if (typeof v === "string" && v.trim()) {
        return v.trim();
      }
    }
  }
  return undefined;
}

function pickFullNameFromParts(
  sources: Record<string, unknown>[]
): string | undefined {
  for (const src of sources) {
    const fn =
      (typeof src.first_name === "string" && src.first_name.trim()) ||
      (typeof src.firstName === "string" && src.firstName.trim()) ||
      "";
    const ln =
      (typeof src.last_name === "string" && src.last_name.trim()) ||
      (typeof src.lastName === "string" && src.lastName.trim()) ||
      "";
    if (fn && ln) return `${fn} ${ln}`;
    if (fn) return fn;
    if (ln) return ln;
  }
  return undefined;
}

function splitCombinedName(combined: string): { firstName: string; lastName: string } {
  const t = combined.trim();
  if (!t) return { firstName: "", lastName: "" };
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function pickFirstLastNames(
  sources: Record<string, unknown>[]
): { firstName: string; lastName: string } {
  const fn =
    pickString(sources, ["first_name", "firstName", "firstname"]) ?? "";
  const ln =
    pickString(sources, ["last_name", "lastName", "lastname"]) ?? "";
  if (fn || ln) {
    const firstName = fn.trim();
    const lastName = ln.trim();
    /** Backend often sends the full display name only in `firstName` and leaves `lastName` empty. */
    if (!lastName && /\s/.test(firstName)) {
      return splitCombinedName(firstName);
    }
    return { firstName, lastName };
  }

  const fromParts = pickFullNameFromParts(sources);
  if (fromParts) {
    return splitCombinedName(fromParts);
  }

  const combined =
    pickString(sources, [
      "name",
      "instructor_name",
      "instructorName",
      "instructor_full_name",
      "display_name",
      "displayName",
      "full_name",
      "fullName",
      "legal_name",
      "nickname",
      "username",
    ]) ?? "";
  if (combined) {
    return splitCombinedName(combined);
  }

  return { firstName: "", lastName: "" };
}

/** Map common API shapes to fields for the Settings profile tab. */
export function parseAccountMePayload(
  data: unknown
): ParsedAccountProfile {
  const empty: ParsedAccountProfile = {
    firstName: "",
    lastName: "",
    email: "",
  };
  if (!data || typeof data !== "object") {
    return empty;
  }
  const root = data as Record<string, unknown>;
  const sources = collectRecordSources(root);

  const { firstName, lastName } = pickFirstLastNames(sources);
  const email = pickString(sources, ["email"]) ?? "";
  const phone = pickString(sources, ["phone", "mobile", "phone_number"]);
  let avatarUrl = pickString(sources, [
    "avtarPath",
    "avtarUrl",
    "avatarUrl",
    "profile_picture",
    "profilePicture",
    "profile_photo",
    "profilePhoto",
    "avatar",
    "avatar_url",
    "photo",
    "photo_url",
    "picture",
    "thumbnail",
    "thumbnail_url",
    "profile_image",
    "image",
    "image_url",
  ]);

  if (!avatarUrl) {
    avatarUrl = findAvatarPathDeep(data);
  }

  if (avatarUrl) {
    avatarUrl = normalizeDuplicatedAssetAvatarUrl(avatarUrl);
  }

  return {
    firstName,
    lastName,
    email,
    phone,
    avatarUrl,
  };
}

/** POST /api/account/add_bank — business, address, tax IDs, and payout account. */
export interface AddBankAddress {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
}

export interface AddBankLegalInfo {
  pan: string;
  gst?: string;
}

export interface AddBankAccountDetails {
  account_number: string;
  ifsc_code: string;
  beneficiary_name: string;
}

export interface AddBankPayload {
  businessName: string;
  businessType: string;
  address: AddBankAddress;
  legalInfo: AddBankLegalInfo;
  bankAccount: AddBankAccountDetails;
}

export async function addBankAccount(
  payload: AddBankPayload
): Promise<Record<string, unknown>> {
  return apiPostJsonAuth<Record<string, unknown>>("/api/account/add_bank", payload);
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export async function changePassword(
  payload: ChangePasswordPayload
): Promise<Record<string, unknown>> {
  return apiPostJsonAuth<Record<string, unknown>>(
    "/api/account/change_password",
    payload
  );
}

export function getAccountMeErrorMessage(error: unknown): string {
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
    }
    if (error.status === 401) {
      return "Session expired or not signed in. Please sign in again.";
    }
    return `Request failed (${error.status})`;
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Request timed out. Check your network and try again.";
  }
  if (error instanceof TypeError) {
    return "Could not reach the API. Check your connection or dev proxy / CORS.";
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}
