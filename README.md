# edassure-web (Cloudflare Worker: frontend)

The Assurance Console UI: accounts and roles, runs (direct, manual capture, or imported spreadsheet), review of sensitive cases, a plain-English decision summary, publishing results to client organisations, and report download. Clients get a read-only view of what has been published to them.
Plain HTML/CSS and ES-module JavaScript in `public/` (no build step) served by a small Worker (`src/index.ts`) that:
- serves `/config.js` containing the backend URL from the `API_BASE_URL` variable, so one build works in every environment;
- adds security headers (CSP limiting connections to itself and the backend, no framing, no referrer).

## Local development
```bash
# terminal 1: in the edassure-api repo
npm run dev                         # http://localhost:8787
# terminal 2: in this repo
npm install && npm run dev          # http://localhost:8788
```
The first time, the console shows a setup screen: enter the API repo's `API_TOKEN` (from `.dev.vars`) as the setup token and create the first administrator. After that, sign in with email and password. Use the demo "mock tool" targets to try it without any external API.
If the browser shows stale files after edits, hard-reload (Cmd+Shift+R).

## Deploy
1. Deploy the backend first and copy its URL.
2. In `wrangler.jsonc` set `vars.API_BASE_URL` to that URL (no trailing slash).
3. `npm run deploy`; note the frontend URL (e.g. `https://edassure-web.<you>.workers.dev`).
4. In the edassure-api repo, in `wrangler.jsonc`, set `vars.ALLOWED_ORIGINS` to the frontend URL and run `npm run deploy` there again.

Custom domains: add them to each Worker in the Cloudflare dashboard, then update `API_BASE_URL` and `ALLOWED_ORIGINS` to match.

## Notes
- The session token is held in `sessionStorage` (gone when the tab closes). Keys for the tool under test are held in memory only, so after a page reload
  a run that needs a key will ask for it again.
- Model replies are untrusted: the UI only ever inserts text with `textContent`, never HTML.
