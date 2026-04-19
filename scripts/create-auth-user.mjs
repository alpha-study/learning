/**
 * Creates or updates a Supabase Auth user (requires service role key).
 * Usage: npm run auth:seed
 * Env: VITE_SUPABASE_URL from .env, plus in .env.local:
 *   SUPABASE_SERVICE_ROLE_KEY (Dashboard → Settings → API)
 *   SEED_EMAIL (optional, default rohit@uneto.co)
 *   SEED_PASSWORD (required)
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadDotEnv(name) {
  const p = resolve(root, name);
  if (!existsSync(p)) return;
  const content = readFileSync(p, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotEnv(".env");
loadDotEnv(".env.local");

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SEED_EMAIL || "rohit@uneto.co";
const password = process.env.SEED_PASSWORD;

if (!url || !serviceKey) {
  console.error(
    "Missing VITE_SUPABASE_URL (or SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase Dashboard → Settings → API → service_role).",
  );
  process.exit(1);
}
if (!password) {
  console.error("Missing SEED_PASSWORD in .env.local.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { error: createErr } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (!createErr) {
  console.log("Created user:", email);
  process.exit(0);
}

const alreadyExists =
  createErr.message?.includes("already been registered") ||
  createErr.message?.includes("already registered") ||
  createErr.status === 422;

if (!alreadyExists) {
  console.error(createErr.message || createErr);
  process.exit(1);
}

const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 200,
});
if (listErr) {
  console.error(listErr.message || listErr);
  process.exit(1);
}

const user = list.users.find((u) => u.email === email);
if (!user) {
  console.error("User exists but could not be listed for:", email);
  process.exit(1);
}

const { error: updErr } = await supabase.auth.admin.updateUserById(user.id, {
  password,
  email_confirm: true,
});

if (updErr) {
  console.error(updErr.message || updErr);
  process.exit(1);
}

console.log("Updated password for:", email);
