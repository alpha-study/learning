import { apiGetJson } from "./client";

export type FacultyDepartmentOption = {
  value: string;
  label: string;
};

export async function fetchFaculties(): Promise<unknown> {
  return apiGetJson<unknown>("/api/faculties");
}

function pickArray(root: unknown): unknown[] | null {
  if (Array.isArray(root)) return root;
  if (!root || typeof root !== "object") return null;
  const o = root as Record<string, unknown>;
  for (const key of ["data", "faculties", "departments", "items", "results", "rows"]) {
    const v = o[key];
    if (Array.isArray(v)) return v;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const inner = v as Record<string, unknown>;
      for (const innerKey of ["data", "items", "list"]) {
        const arr = inner[innerKey];
        if (Array.isArray(arr)) return arr;
      }
    }
  }
  return null;
}

function itemToDepartmentOption(item: unknown): FacultyDepartmentOption | null {
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
    (typeof o.department_name === "string" && o.department_name.trim()) ||
    (typeof o.departmentName === "string" && o.departmentName.trim()) ||
    (typeof o.faculty_name === "string" && o.faculty_name.trim()) ||
    (typeof o.facultyName === "string" && o.facultyName.trim()) ||
    "";
  if (!labelRaw) return null;

  const id =
    o.id ??
    o.department_id ??
    o.departmentId ??
    o.faculty_id ??
    o.facultyId ??
    o.slug ??
    o.code;
  if (id !== undefined && id !== null && String(id).trim() !== "") {
    return { value: String(id).trim(), label: labelRaw };
  }
  return { value: labelRaw, label: labelRaw };
}

/**
 * Maps GET /api/faculties JSON to dropdown options. Supports several common envelope and field shapes.
 */
export function parseFacultiesDepartmentOptions(
  response: unknown
): FacultyDepartmentOption[] {
  const arr = pickArray(response);
  if (!arr?.length) return [];
  const out: FacultyDepartmentOption[] = [];
  const seen = new Set<string>();
  for (const item of arr) {
    const opt = itemToDepartmentOption(item);
    if (opt && !seen.has(opt.value)) {
      seen.add(opt.value);
      out.push(opt);
    }
  }
  return out;
}
