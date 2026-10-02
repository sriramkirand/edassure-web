const API = ((window.EDASSURE_CONFIG || {}).apiBase || "").replace(/\/$/, "");

export const session = {
  user: null,
  get token() { try { return sessionStorage.getItem("edassure_session") || ""; } catch { return ""; } },
  set token(v) { try { v ? sessionStorage.setItem("edassure_session", v) : sessionStorage.removeItem("edassure_session"); } catch { /* storage blocked */ } },
  clear() { this.token = ""; this.user = null; },
};

export class ApiError extends Error { constructor(status, msg, code) { super(msg); this.status = status; this.code = code; } }
const reroute = () => window.dispatchEvent(new Event("hashchange"));

export async function api(path, { method = "GET", body, raw = false, auth = true } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { ...(auth && session.token ? { Authorization: "Bearer " + session.token } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && auth) { session.clear(); reroute(); throw new ApiError(401, "Your session has ended. Please sign in again."); }
  if (!res.ok) {
    let msg = res.statusText, code;
    try { const j = await res.json(); msg = j.error || msg; code = j.code; } catch { /* not json */ }
    if (res.status === 403 && code === "must_change") { if (session.user) session.user.mustChange = true; reroute(); }
    throw new ApiError(res.status, msg, code);
  }
  return raw ? res : res.json();
}
