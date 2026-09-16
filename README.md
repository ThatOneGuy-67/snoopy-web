# TOG's Web

A browser-style web hub: built-in proxy (Scramjet + Wisp), apps and games
launchers, movies, music, chat, an AI page, cloaking, themes and wallpapers.

Built with Vite, React, TypeScript, Tailwind CSS and shadcn/ui.

---

## Fork and run it yourself

Nothing in this repository is tied to a specific GitHub account, repository
name, domain or backend. Every external service is optional and read from
environment variables; when one isn't configured, that feature shows a setup
notice instead of using someone else's backend.

```sh
# 1. Fork this repository on GitHub, then:
git clone https://github.com/<your-username>/<your-fork>.git
cd <your-fork>

# 2. Install exactly what the lockfile pins
npm ci

# 3. Optional: configure your own services
cp .env.example .env   # then edit .env

# 4. Run it
npm run dev            # http://localhost:8080
npm run build          # production build in dist/
```

> **After forking, replace `.env`.** It is git-ignored going forward, but if a
> copy came with your fork, overwrite it with `cp .env.example .env` and fill
> in your own values. Never commit real credentials.

## Environment variables

All variables are optional — see `.env.example` for the full, commented list.

| Variable | What it does | Without it |
| --- | --- | --- |
| `VITE_BASE_PATH` | Public base path of the build | Auto: `/` locally, `/<repo>/` on GitHub Pages |
| `VITE_SITE_URL` | Absolute public URL (SEO, sitemap, robots) | Auto on GitHub Pages; SEO URLs omitted otherwise |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` | Backend for the AI page | AI page reports "backend not configured" |
| `VITE_FIREBASE_*` | Realtime Database for the Chat page | Chat page shows setup instructions |
| `VITE_CHAT_*_PASSWORD` | Chat staff passwords | Staff commands disabled |
| `VITE_WISP_URL` | Default Wisp relay for the proxy | Public Mercury Workshop relay |
| `VITE_PROXY_URL` | Default external HTTP proxy | Built-in Scramjet proxy only |
| `VITE_ASSET_ORIGIN` | Origin for CDN-offloaded game bundles | Served from your own deployment |
| `VITE_MUSIC_CDN` | CDN base for the music library | Public default library |

Only publishable/anon keys belong in these variables — they ship in the
browser bundle. Server-side keys stay in your backend.

### Your own backend (AI page)

1. Create a free Supabase project.
2. Deploy `supabase/functions/ai-chat` to it and set its `LOVABLE_API_KEY`
   (or swap the gateway call in that function for your own AI provider).
3. Put your project URL and publishable key in `.env`, or add them as GitHub
   Actions **repository variables** so builds pick them up.

`supabase/config.toml` only records a project ref for local tooling; replace
it with your own if you use the Supabase CLI.

## GitHub Actions

Three workflows, none of which require secrets from anyone's account:

- **CI (build)** — `.github/workflows/ci.yml`: `npm ci`, lint, tests, build.
  Runs on every push/PR in any fork with no configuration and no deployment
  permissions, so the project always builds even if you never set up hosting.
- **Deploy to GitHub Pages** — `.github/workflows/static.yml`: builds and
  publishes `dist/`. The base path and public URL are derived from
  `GITHUB_REPOSITORY`, so it works under `https://<you>.github.io/<your-repo>/`
  without edits. Enable it via **Settings → Pages → Source: GitHub Actions**.
- **Smoke test** — `.github/workflows/smoke.yml`: optional post-deploy check
  against your own Pages URL.

To pass configuration to builds, add repository **variables** (Settings →
Secrets and variables → Actions → Variables) using the names above.

## Hosting elsewhere

Any static host works. Build with `npm run build` and serve `dist/`. Set
`VITE_BASE_PATH=/` (the default) for root hosting, and configure an SPA
fallback so client-side routes resolve.
