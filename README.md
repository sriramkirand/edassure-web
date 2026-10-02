# edassure-web (Cloudflare Worker: frontend)

The Assurance Console: accounts and roles, checks (direct, manual capture, or imported spreadsheet), human review of sensitive cases, a plain-English
decision summary, publishing results to client organisations, and report download. Clients get a read-only view of what has been published to them.

**React 19 + TypeScript**, built with **Vite**, served by a small Worker using Workers static assets. The look is the *Chalk* design: warm paper, deep teal, serif
headings (Fraunces) with Inter for text, both self-hosted, a gradient hero on the dashboard and each check, traffic-light gauge cards, a radar of results by area,
and a dark theme (follows the system, or use the toggle).

```
index.html            Vite entry
src/
  main.tsx, App.tsx   entry and role-aware routing (tiny hash router, no extra dependency)
  lib/                typed API client, session + roles, toasts/confirm dialogs, hooks (count-up, loading), types
  components/         Layout, Icon, ui (fields, chips, bars, summary card, collapse, skeletons)
  views/              Auth, RunsList, NewRun, RunDetail (+ run/ManualPanel, Results, ReviewQueue), Admin
  styles/             tokens (light + dark), base, components, animations
worker/index.ts       serves /config.js (backend URL from API_BASE_URL) and adds security headers
public/               favicon, dev config.js
```

## Landing page
Visitors who are not signed in see a public landing page at `/` (hero, the problem, how it works, what we test, a sample result, schools vs suppliers,
independence promise, FAQ, footer). Its **Sign in** buttons go to `#/login`; after signing in the console loads. Signing out returns to the landing page.
- The "Request a check" button appears only when a contact address is set: set `vars.CONTACT_EMAIL` in `wrangler.jsonc` (empty hides the button).
- All claims on the page are deliberately modest. Review the copy in `src/views/Landing.tsx` before launch, especially the FAQ and the line about the DfE framework.
- The sample result on the page is illustrative data, labelled as such.

## Design and motion
- Red / amber / green are reserved for meaning and always shown with an icon and a word; the brand colour never competes with them.
- Motion is CSS-only and short: page and row entrance, count-up numbers, animated progress with a "running" shimmer, expanding panels, toasts, dialogs, a ring pulse on
  the decision light. Everything is switched off for visitors who set *reduce motion*. No animation library, so the strict CSP stays strict.
- Dark theme tokens are in `src/styles/tokens.css`; change brand colour there.

## Local development
```bash
npm install
# terminal 1: in the edassure-api repo
npm run dev                         # http://localhost:8787
# terminal 2: here
npm run dev                         # Vite on http://localhost:8788 (hot reload); public/config.js points at the local API
```
Production-like check (built app through the Worker with the real security headers): `npm run build && npm run preview`.
The first time, the console shows a setup screen: enter the API's `API_TOKEN` as the setup token and create the first administrator.

## Deploy
1. Deploy the backend first and copy its URL.
2. In `wrangler.jsonc` set `vars.API_BASE_URL` to that URL (no trailing slash).
3. `npm run build && npx wrangler deploy` (Cloudflare's git-connected build runs `npm run build` for you; `wrangler.jsonc` has the build command).
4. In the API repo set `ALLOWED_ORIGINS` to this Worker's URL and redeploy it.

Build output goes to `dist/` (git-ignored). Build settings for Cloudflare Workers Builds: build command `npm run build`, deploy command `npx wrangler deploy`.

## Notes
- The session token is in `sessionStorage` (gone when the tab closes). Keys for the tool under test stay in memory only, so a reload on a direct run asks for the key again.
- Model replies are untrusted. React escapes all text by default and nothing uses `dangerouslySetInnerHTML`.
- `npm run typecheck` checks both the React app and the Worker.
