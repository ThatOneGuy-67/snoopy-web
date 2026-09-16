import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { componentTagger } from "lovable-tagger";

/**
 * Resolve the public base path.
 *
 * Priority:
 *   1. VITE_BASE_PATH (explicit, works everywhere)
 *   2. GitHub Actions -> "/<repo>/" derived from GITHUB_REPOSITORY
 *      (user/org Pages repos "<owner>.github.io" serve from "/")
 *   3. "/"
 *
 * Nothing here is tied to a specific account or repository name, so a fork
 * builds correctly with zero configuration.
 */
function resolveBase(env: Record<string, string>): string {
  const explicit = env.VITE_BASE_PATH?.trim();
  if (explicit) return explicit.endsWith("/") ? explicit : `${explicit}/`;

  const repository = process.env.GITHUB_REPOSITORY;
  if (process.env.GITHUB_ACTIONS && repository) {
    const [owner, repo] = repository.split("/");
    if (!repo || repo.toLowerCase() === `${owner.toLowerCase()}.github.io`) return "/";
    return `/${repo}/`;
  }

  return "/";
}

/** Absolute public URL of the deployment, used for SEO metadata only. */
function resolveSiteUrl(env: Record<string, string>, base: string): string {
  const explicit = env.VITE_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/*$/, "/");

  const repository = process.env.GITHUB_REPOSITORY;
  if (process.env.GITHUB_ACTIONS && repository) {
    const [owner, repo] = repository.split("/");
    if (owner && repo) {
      return repo.toLowerCase() === `${owner.toLowerCase()}.github.io`
        ? `https://${owner.toLowerCase()}.github.io/`
        : `https://${owner.toLowerCase()}.github.io${base}`;
    }
  }

  return "";
}

/** Copies the bare-mux runtime the proxy needs into the build output. */
const copyProxyRuntime = (): Plugin => ({
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

/**
 * Replaces deployment-specific tokens in index.html and in the static files
 * under public/ so nothing ships a hardcoded origin or backend URL.
 */
const injectDeploymentTokens = (env: Record<string, string>, siteUrl: string): Plugin => {
  const tokens: Record<string, string> = {
    "__SITE_URL__": siteUrl,
    "__SUPABASE_URL__": (env.VITE_SUPABASE_URL || "").replace(/\/*$/, ""),
    "__SUPABASE_PUBLISHABLE_KEY__": env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
  };

  const apply = (input: string) =>
    Object.entries(tokens).reduce(
      (acc, [token, value]) => acc.split(token).join(value),
      input,
    );

  return {
    name: "inject-deployment-tokens",
    transformIndexHtml(html) {
      const replaced = apply(html);
      if (siteUrl) return replaced;
      // No public URL configured: drop the SEO tags that would be empty.
      return replaced
        .split("\n")
        .filter((line) => !/(href|content)="(og-image\.jpg)?"\s*\/?>/.test(line))
        .filter((line) => !/"url":\s*"",?$/.test(line.trim()))
        .join("\n");
    },
    closeBundle() {
      for (const file of ["robots.txt", "sitemap.xml", "ai.html", "llms.txt"]) {
        const out = path.resolve(__dirname, "dist", file);
        if (!existsSync(out)) continue;

        // A sitemap needs absolute URLs; without a configured public URL we
        // ship neither the sitemap nor a reference to it.
        if (!siteUrl && file === "sitemap.xml") {
          rmSync(out, { force: true });
          continue;
        }
        let content = apply(readFileSync(out, "utf8"));
        if (!siteUrl && file === "robots.txt") {
          content = content
            .split("\n")
            .filter((line) => !line.startsWith("Sitemap:"))
            .join("\n");
        }
        writeFileSync(out, content);
      }
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = resolveBase(env);
  const siteUrl = resolveSiteUrl(env, base);

  return {
    base,
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      injectDeploymentTokens(env, siteUrl),
      copyProxyRuntime(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
