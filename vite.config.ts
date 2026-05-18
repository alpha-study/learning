import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

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

export default defineConfig(({ mode }) => ({
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
}));
