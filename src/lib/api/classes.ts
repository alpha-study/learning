import { apiGetJson } from "./client";

export type ClassOption = {
  value: string;
  label: string;
};

export async function fetchClasses(): Promise<unknown> {
  return apiGetJson<unknown>("/api/classes");
}

function pickArray(root: unknown): unknown[] | null {
  if (Array.isArray(root)) return root;
  if (!root || typeof root !== "object") return null;
  const o = root as Record<string, unknown>;
  for (const key of [
    "data",
    "classes",
    "classList",
    "items",
    "results",
    "rows",
    "list",
  ]) {
    const v = o[key];
    if (Array.isArray(v)) return v;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const inner = v as Record<string, unknown>;
      for (const innerKey of ["data", "items", "list", "classes"]) {
        const arr = inner[innerKey];
        if (Array.isArray(arr)) return arr;
      }
    }
  }
  return null;
}

function itemToClassOption(item: unknown): ClassOption | null {
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
    (typeof o.class_name === "string" && o.class_name.trim()) ||
    (typeof o.className === "string" && o.className.trim()) ||
    (typeof o.standard === "string" && o.standard.trim()) ||
    (typeof o.grade === "string" && o.grade.trim()) ||
    "";
  if (!labelRaw) return null;

  const id =
    o.id ??
    o.class_id ??
    o.classId ??
    o.slug ??
    o.code;
  if (id !== undefined && id !== null && String(id).trim() !== "") {
    return { value: String(id).trim(), label: labelRaw };
  }
  return { value: labelRaw, label: labelRaw };
}

/** Maps GET /api/classes JSON to dropdown options. */
export function parseClassesOptions(response: unknown): ClassOption[] {
  const arr = pickArray(response);
  if (!arr?.length) return [];
  const out: ClassOption[] = [];
  const seen = new Set<string>();
  for (const item of arr) {
    const opt = itemToClassOption(item);
    if (opt && !seen.has(opt.value)) {
      seen.add(opt.value);
      out.push(opt);
    }
  }
  return out;
}
