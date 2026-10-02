import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, onSessionEvent, sessionToken } from "./api";
import { navigate } from "./router";
import type { User } from "./types";

type State = { phase: "loading" } | { phase: "setup" } | { phase: "anon" } | { phase: "ready"; user: User };
interface Ctx {
  state: State;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  markPasswordChanged: () => void;
  refreshStatus: () => Promise<void>;
}
const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ phase: "loading" });

  const refreshStatus = useCallback(async () => {
    try {
      if (sessionToken.get()) {
        const { user } = await api<{ user: User }>("/api/auth/me");
        setState({ phase: "ready", user });
        return;
      }
    } catch { /* fall through to anonymous */ }
    sessionToken.set("");
    try {
      const st = await api<{ needsSetup: boolean }>("/api/auth/status", { auth: false });
      setState({ phase: st.needsSetup ? "setup" : "anon" });
    } catch { setState({ phase: "anon" }); }
  }, []);

  useEffect(() => { void refreshStatus(); }, [refreshStatus]);
  useEffect(() => onSessionEvent((e) => {
    if (e === "signed-out") setState({ phase: "anon" });
    if (e === "must-change") setState((s) => (s.phase === "ready" ? { phase: "ready", user: { ...s.user, mustChange: true } } : s));
  }), []);

  const signIn = useCallback(async (email: string, password: string) => {
    const r = await api<{ token: string; user: User }>("/api/auth/login", { method: "POST", auth: false, body: { email, password } });
    sessionToken.set(r.token);
    setState({ phase: "ready", user: r.user });
    navigate("/");
  }, []);

  const signOut = useCallback(async () => {
    try { await api("/api/auth/logout", { method: "POST" }); } catch { /* already gone */ }
    sessionToken.set("");
    setState({ phase: "anon" });
    navigate("/");
  }, []);

  const markPasswordChanged = useCallback(() => setState((s) => (s.phase === "ready" ? { phase: "ready", user: { ...s.user, mustChange: false } } : s)), []);

  const value = useMemo<Ctx>(() => ({ state, user: state.phase === "ready" ? state.user : null, signIn, signOut, markPasswordChanged, refreshStatus }),
    [state, signIn, signOut, markPasswordChanged, refreshStatus]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Ctx {
  const c = useContext(SessionContext);
  if (!c) throw new Error("useSession outside SessionProvider");
  return c;
}
/** For screens only rendered when signed in. */
export function useUser(): User {
  const { user } = useSession();
  if (!user) throw new Error("no user");
  return user;
}
export const canOperate = (u: User) => u.role === "admin" || u.role === "assessor";
export const isStaff = (u: User) => u.role !== "client";
