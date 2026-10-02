import { useState, type FormEvent } from "react";
import { Ring } from "../components/charts";
import { ThemeToggle } from "../components/Layout";
import { Icon } from "../components/Icon";
import { ErrorNotice, Field, Notice } from "../components/ui";
import { api } from "../lib/api";
import { navigate } from "../lib/router";
import { useSession, useUser } from "../lib/session";

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth page">
      <aside className="auth-art">
        <div className="brandline"><span className="logo" style={{ background: "rgba(255,255,255,.18)" }}><svg viewBox="0 0 24 24" style={{ stroke: "currentColor" }}><path d="M5 12.5l4.5 4.5L19 7" /></svg></span><strong style={{ fontFamily: "var(--font-head)", fontSize: "1.25rem" }}>Assurance</strong></div>
        <h1>Is this AI tool right for the pupils who will use it?</h1>
        <p>Independent testing of the AI tools used in UK schools and colleges, with a plain-English answer you can take to governors, your data protection lead and your supplier.</p>
        <div className="preview" aria-hidden="true">
          <Ring value={0.72} size={72} stroke={7} tone="tone-brand" sub="passed" />
          <div><div className="t">Acme Homework Helper</div><div className="s">Oakfield Trust · Ages 11–14</div><span className="tag">AMBER · Use with conditions</span></div>
        </div>
        <ul>
          <li><Icon name="shield" />Tested against the DfE generative AI product safety standards</li>
          <li><Icon name="eye" />Sensitive responses are read by a person, not just a script</li>
          <li><Icon name="file" />A clear verdict, the evidence behind it, and what to fix</li>
        </ul>
      </aside>
      <section className="auth-form"><div className="auth-card stack-lg">{children}<div className="row" style={{ justifyContent: "space-between" }}><span className="small muted">Results describe the tested version only.</span><ThemeToggle /></div></div></section>
    </div>
  );
}

export function LoginView() {
  const { signIn } = useSession();
  const [email, setEmail] = useState(""), [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try { await signIn(email, pw); } catch (err) { setError(err); setBusy(false); }
  }
  return (
    <AuthShell>
      <div className="stack"><h1>Sign in</h1><p className="muted">Use the account your administrator created for you.</p></div>
      <form className="stack" onSubmit={submit}>
        <Field label="Email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Password" type="password" autoComplete="current-password" required value={pw} onChange={(e) => setPw(e.target.value)} />
        {error ? <ErrorNotice error={error} /> : null}
        <button className="btn" type="submit" disabled={busy} style={{ width: "100%" }}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </AuthShell>
  );
}

export function SetupView() {
  const { refreshStatus } = useSession();
  const [f, setF] = useState({ setupToken: "", name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try { await api("/api/auth/setup", { method: "POST", auth: false, body: f }); await refreshStatus(); navigate("/"); }
    catch (err) { setError(err); setBusy(false); }
  }
  return (
    <AuthShell>
      <div className="stack"><h1>First-time setup</h1><p className="muted">No accounts exist yet. Create the first administrator. You need the setup token, which is the <code>API_TOKEN</code> secret on the API worker. This screen disappears once an account exists.</p></div>
      <form className="stack" onSubmit={submit}>
        <Field label="Setup token" type="password" autoComplete="off" required value={f.setupToken} onChange={set("setupToken")} />
        <Field label="Your name" autoComplete="name" required value={f.name} onChange={set("name")} />
        <Field label="Email" type="email" autoComplete="username" required value={f.email} onChange={set("email")} />
        <Field label="Password" type="password" autoComplete="new-password" minLength={12} required value={f.password} onChange={set("password")} hint="At least 12 characters. A long passphrase works well." />
        {error ? <ErrorNotice error={error} /> : null}
        <button className="btn" type="submit" disabled={busy} style={{ width: "100%" }}>{busy ? "Creating…" : "Create administrator"}</button>
      </form>
    </AuthShell>
  );
}

export function ChangePasswordView({ forced }: { forced: boolean }) {
  const user = useUser();
  const { markPasswordChanged } = useSession();
  const [cur, setCur] = useState(""), [next, setNext] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null), [done, setDone] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(null); setDone(false);
    try {
      await api("/api/auth/change-password", { method: "POST", body: { currentPassword: cur, newPassword: next } });
      markPasswordChanged(); setDone(true); setCur(""); setNext("");
      if (forced) navigate("/");
    } catch (err) { setError(err); } finally { setBusy(false); }
  }
  return (
    <div className="stack-lg" style={{ maxWidth: 460 }}>
      <div className="stack">
        <h1>{forced ? "Choose a new password" : "Account"}</h1>
        {!forced && <p className="muted">Signed in as {user.email}.</p>}
      </div>
      {forced && <Notice>You are using a temporary password. Choose your own before continuing.</Notice>}
      <form className="stack" onSubmit={submit}>
        <Field label="Current (or temporary) password" type="password" autoComplete="current-password" required value={cur} onChange={(e) => setCur(e.target.value)} />
        <Field label="New password" type="password" autoComplete="new-password" minLength={12} required value={next} onChange={(e) => setNext(e.target.value)} hint="At least 12 characters. Changing it signs you out on other devices." />
        {error ? <ErrorNotice error={error} /> : null}
        {done && !forced ? <Notice kind="ok">Password changed.</Notice> : null}
        <div><button className="btn" type="submit" disabled={busy}>{busy ? "Saving…" : "Change password"}</button></div>
      </form>
    </div>
  );
}
