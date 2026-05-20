import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

/** Vite inlines `VITE_*` at build time — missing vars cause a blank page in production. */
function assertProductionEnv(mode: string) {
  if (mode !== "production") return;
  const env = loadEnv(mode, process.cwd(), "");
  const required = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"] as const;
  const missing = required.filter((key) => !env[key]?.trim());
  if (missing.length === 0) return;
  throw new Error(
    `Missing required environment variable(s) for production build: ${missing.join(", ")}. ` +
      "Set them in Vercel → Project → Settings → Environment Variables (Production), then redeploy. " +
      "See .env.example for the full list.",
  );
}

// https://vitejs.dev/config/
const vendorApiProxy = {
  "/vendor-api": {
    target: "https://dev.alpha.study",
    changeOrigin: true,
    secure: true,
    rewrite: (p: string) => p.replace(/^\/vendor-api/, "/vendor"),
  },
  /** Course videos/thumbnails (`courses/...` → `/assets/courses/...` on the API host). */
  "/assets": {
    target: "https://dev.alpha.study",
    changeOrigin: true,
    secure: true,
  },
} as const;

export default defineConfig(({ mode }) => {
  assertProductionEnv(mode);
  return {
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    /** Avoid browser CORS during local dev: browser calls same-origin `/vendor-api`, Vite forwards to the vendor API. */
    proxy: vendorApiProxy,
  },
  preview: {
    proxy: vendorApiProxy,
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
};
});
