import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { copyFileSync, mkdirSync } from "node:fs";
import { componentTagger } from "lovable-tagger";

const copyProxyRuntime = () => ({
  name: "copy-proxy-runtime",
  closeBundle() {
    const target = path.resolve(__dirname, "dist/baremux");
    mkdirSync(target, { recursive: true });
    copyFileSync(
      path.resolve(__dirname, "node_modules/@mercuryworkshop/bare-mux/dist/index.mjs"),
      path.join(target, "index.mjs"),
    );
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: process.env.GITHUB_ACTIONS ? "/snoopy-web/" : "/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger(), copyProxyRuntime()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
