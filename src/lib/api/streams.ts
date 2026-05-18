import { apiGetJson } from "./client";

export type StreamBranchOption = {
  value: string;
  label: string;
};

export async function fetchStreamsByFacultyIds(
  facultyIds: string
): Promise<unknown> {
  const q = encodeURIComponent(facultyIds.trim());
  return apiGetJson<unknown>(`/api/streams?facultyIds=${q}`);
}

function pickArray(root: unknown): unknown[] | null {
  if (Array.isArray(root)) return root;
  if (!root || typeof root !== "object") return null;
  const o = root as Record<string, unknown>;
  for (const key of [
    "data",
    "streams",
    "branches",
    "items",
    "results",
    "rows",
    "list",
  ]) {
    const v = o[key];
    if (Array.isArray(v)) return v;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const inner = v as Record<string, unknown>;
      for (const innerKey of ["data", "items", "list", "streams"]) {
        const arr = inner[innerKey];
        if (Array.isArray(arr)) return arr;
      }
    }
  }
  return null;
}

function itemToStreamOption(item: unknown): StreamBranchOption | null {
  if (typeof item === "string") {
    const t = item.trim();
    return t ? { value: t, label: t } : null;
  }
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const labelRaw =
    (typeof o.name === "string" && o.name.trim()) ||
    (typeof o.title === "string" && o.title.trim()) ||
    (typeof o.label === "string" && o.label.trim()) ||
    (typeof o.stream_name === "string" && o.stream_name.trim()) ||
    (typeof o.streamName === "string" && o.streamName.trim()) ||
    (typeof o.branch_name === "string" && o.branch_name.trim()) ||
    (typeof o.branchName === "string" && o.branchName.trim()) ||
    "";
  if (!labelRaw) return null;

  const id =
    o.id ??
    o.stream_id ??
    o.streamId ??
    o.branch_id ??
    o.branchId ??
    o.slug ??
    o.code;
  if (id !== undefined && id !== null && String(id).trim() !== "") {
    return { value: String(id).trim(), label: labelRaw };
  }
  return { value: labelRaw, label: labelRaw };
}

/** Maps GET /api/streams?facultyIds=… JSON to branch dropdown options. */
export function parseStreamsBranchOptions(response: unknown): StreamBranchOption[] {
  const arr = pickArray(response);
  if (!arr?.length) return [];
  const out: StreamBranchOption[] = [];
  const seen = new Set<string>();
  for (const item of arr) {
    const opt = itemToStreamOption(item);
    if (opt && !seen.has(opt.value)) {
      seen.add(opt.value);
      out.push(opt);
    }
  }
  return out;
}
