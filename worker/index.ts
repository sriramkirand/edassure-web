interface Env {
  ASSETS: Fetcher;
  API_BASE_URL: string;
  CONTACT_EMAIL?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const apiBase = (env.API_BASE_URL || "").replace(/\/$/, "");

    let res: Response;
    if (url.pathname === "/config.js") {
      // Lets the same build talk to local, staging or production backends.
      res = new Response(`window.EDASSURE_CONFIG = ${JSON.stringify({ apiBase, contactEmail: (env.CONTACT_EMAIL || "").trim() || undefined })};`, {
        headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" },
      });
    } else {
      res = await env.ASSETS.fetch(request);
    }

    const headers = new Headers(res.headers);
    headers.set(
      "content-security-policy",
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self'",
        "img-src 'self' data:",
        `connect-src 'self' ${apiBase}`,
        "frame-ancestors 'none'",
        "base-uri 'none'",
        "form-action 'self'",
      ].join("; "),
    );
    headers.set("x-content-type-options", "nosniff");
    headers.set("referrer-policy", "no-referrer");
    headers.set("x-frame-options", "DENY");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  },
};
