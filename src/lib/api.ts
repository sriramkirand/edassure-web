declare global { interface Window { EDASSURE_CONFIG?: { apiBase?: string; contactEmail?: string } } }
const API = (window.EDASSURE_CONFIG?.apiBase ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}

const KEY = "edassure_session";
export const sessionToken = {
  get: () => { try { return sessionStorage.getItem(KEY) ?? ""; } catch { return ""; } },
  set: (v: string) => { try { v ? sessionStorage.setItem(KEY, v) : sessionStorage.removeItem(KEY); } catch { /* storage blocked */ } },
};

// Lets the session provider react when the server says the session is over or a password change is required.
type Event = "signed-out" | "must-change";
const listeners = new Set<(e: Event) => void>();
export const onSessionEvent = (fn: (e: Event) => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const emit = (e: Event) => listeners.forEach((fn) => fn(e));

interface Options { method?: string; body?: unknown; auth?: boolean }

async function request(path: string, { method = "GET", body, auth = true }: Options = {}): Promise<Response> {
  const token = sessionToken.get();
  const res = await fetch(API + path, {
    method,
    headers: { ...(auth && token ? { Authorization: "Bearer " + token } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && auth) { sessionToken.set(""); emit("signed-out"); throw new ApiError(401, "Your session has ended. Please sign in again."); }
  if (!res.ok) {
    let message = res.statusText, code: string | undefined;
    try { const j = await res.json(); message = j.error || message; code = j.code; } catch { /* not json */ }
    if (res.status === 403 && code === "must_change") emit("must-change");
    throw new ApiError(res.status, message, code);
  }
  return res;
}

export const api = async <T = unknown>(path: string, opts?: Options): Promise<T> => (await request(path, opts)).json() as Promise<T>;
export const apiBlob = async (path: string): Promise<Blob> => (await request(path)).blob();
