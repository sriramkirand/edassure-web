import { useState, type FormEvent } from "react";
import { Avatar } from "../components/bits";
import { Empty, ErrorNotice, Field, Notice, PageSkeleton, SelectField, Tabs } from "../components/ui";
import { api } from "../lib/api";
import { fmtDate, ORG_KINDS, ROLE_LABEL } from "../lib/format";
import { useLoad } from "../lib/hooks";
import { useUser } from "../lib/session";
import { useFeedback } from "../lib/toast";
import type { AdminUser, AuditRow, Department, Org, Role } from "../lib/types";

export function Admin({ tab }: { tab: string }) {
  return (
    <div className="stack-lg">
      <div className="stack"><h1>Administration</h1><p className="muted">People, client organisations, and a record of what happened.</p></div>
      <Tabs current={tab} items={[["users", "Users"], ["orgs", "Organisations"], ["departments", "Departments"], ["audit", "Activity log"]]} />
      {tab === "orgs" ? <Orgs /> : tab === "departments" ? <Departments /> : tab === "audit" ? <Audit /> : <Users />}
    </div>
  );
}

function TempPassword({ email, password, onClose }: { email?: string; password: string; onClose: () => void }) {
  const { toast } = useFeedback();
  return (
    <div className="notice ok enter" role="status">
      <div className="stack grow">
        <strong>{email ? `Account created for ${email}.` : "New temporary password."}</strong>
        <div className="row">Give them this one-time password securely:<span className="temp-pw">{password}</span>
          <button className="btn ghost sm" onClick={async () => { await navigator.clipboard.writeText(password); toast("Copied"); }}>Copy</button></div>
        <span className="small muted">It is shown once and cannot be retrieved again. They must choose their own at first sign-in.</span>
      </div>
      <button className="btn link" onClick={onClose} aria-label="Dismiss">✕</button>
    </div>
  );
}

function Users() {
  const me = useUser();
  const users = useLoad(() => api<AdminUser[]>("/api/admin/users"), []);
  const orgs = useLoad(() => api<Org[]>("/api/admin/orgs"), []);
  const { toast } = useFeedback();
  const [shown, setShown] = useState<{ email?: string; password: string } | null>(null);
  const [f, setF] = useState({ name: "", email: "", role: "assessor" as Role, orgId: "" }), [busy, setBusy] = useState(false), [err, setErr] = useState<unknown>(null);

  async function create(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const r = await api<{ email: string; temporaryPassword: string }>("/api/admin/users", { method: "POST", body: { ...f, orgId: f.role === "client" ? f.orgId : undefined } });
      setShown({ email: r.email, password: r.temporaryPassword }); setF({ name: "", email: "", role: "assessor", orgId: "" }); await users.reload(true);
    } catch (ex) { setErr(ex); } finally { setBusy(false); }
  }
  async function act(u: AdminUser, what: "reset-password" | "disable" | "enable") {
    try {
      const r = await api<{ temporaryPassword?: string }>(`/api/admin/users/${u.id}/${what}`, { method: "POST" });
      if (r.temporaryPassword) setShown({ email: u.email, password: r.temporaryPassword }); else toast(what === "disable" ? "User disabled and signed out" : "User enabled");
      await users.reload(true);
    } catch (ex) { toast((ex as Error).message, "error"); }
  }

  if (users.loading && !users.data) return <PageSkeleton />;
  if (users.error) return <ErrorNotice error={users.error} />;
  return (
    <div className="stack-lg">
      {shown && <TempPassword {...shown} onClose={() => setShown(null)} />}
      <div className="card table-wrap" style={{ padding: 6 }}>
        <table>
          <thead><tr><th>Person</th><th>Role</th><th>Organisation</th><th>Last sign-in</th><th>Status</th><th /></tr></thead>
          <tbody>{users.data?.map((u, i) => (
            <tr key={u.id} style={{ ["--i" as string]: i } as React.CSSProperties}>
              <td><div className="person"><Avatar name={u.name} /><div><div style={{ fontWeight: 600 }}>{u.name}</div><div className="sub">{u.email}</div></div></div></td><td><span className={"chip " + (u.role === "admin" ? "a" : u.role === "client" ? "n" : "g")}>{ROLE_LABEL[u.role]}</span></td><td>{u.orgName || "—"}</td>
              <td className="muted">{u.lastLoginAt ? fmtDate(u.lastLoginAt) : "never"}</td>
              <td>{u.disabled ? <span className="chip r">Disabled</span> : u.mustChange ? <span className="chip a">Must change password</span> : <span className="chip g">Active</span>}</td>
              <td className="n" style={{ whiteSpace: "nowrap" }}>
                <button className="btn ghost sm" onClick={() => void act(u, "reset-password")}>Reset password</button>{" "}
                {u.id !== me.id && <button className="btn ghost sm" onClick={() => void act(u, u.disabled ? "enable" : "disable")}>{u.disabled ? "Enable" : "Disable"}</button>}
              </td>
            </tr>))}</tbody>
        </table>
      </div>
      <form className="card stack" onSubmit={create}>
        <div className="stack"><h2>Add a user</h2><p className="muted small">You will be shown a one-time password to give them. They choose their own at first sign-in.</p></div>
        <div className="grid">
          <Field label="Name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Field label="Email" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <SelectField label="Role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
            {(["assessor", "reviewer", "client", "admin"] as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </SelectField>
          {f.role === "client" && <SelectField label="Client organisation" required value={f.orgId} onChange={(e) => setF({ ...f, orgId: e.target.value })}><option value="">(choose)</option>{orgs.data?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</SelectField>}
        </div>
        <p className="small muted">Administrator: everything. Assessor: runs tests and publishes results. Reviewer: reviews sensitive cases. Client: read-only view of results published to their organisation.</p>
        {err ? <ErrorNotice error={err} /> : null}
        <div><button className="btn" type="submit" disabled={busy}>{busy ? "Creating…" : "Create user"}</button></div>
      </form>
    </div>
  );
}

function Orgs() {
  const orgs = useLoad(() => api<Org[]>("/api/admin/orgs"), []);
  const [name, setName] = useState(""), [kind, setKind] = useState("school"), [err, setErr] = useState<unknown>(null);
  async function add(e: FormEvent) {
    e.preventDefault(); setErr(null);
    try { await api("/api/admin/orgs", { method: "POST", body: { name, kind } }); setName(""); await orgs.reload(true); } catch (ex) { setErr(ex); }
  }
  if (orgs.loading && !orgs.data) return <PageSkeleton />;
  return (
    <div className="stack-lg">
      <p className="muted">An organisation is a school, trust, council, NHS body, company, charity or supplier. Client users belong to one, and only see results you publish to it.</p>
      {orgs.data?.length ? (
        <div className="card table-wrap" style={{ padding: 6 }}><table><thead><tr><th>Name</th><th>Type</th><th className="n">Users</th><th className="n">Checks</th></tr></thead>
          <tbody>{orgs.data.map((o, i) => <tr key={o.id} style={{ ["--i" as string]: i } as React.CSSProperties}><td style={{ fontWeight: 600 }}>{o.name}</td><td>{o.kind}</td><td className="n">{o.users}</td><td className="n">{o.runs}</td></tr>)}</tbody></table></div>
      ) : <Empty icon="users" title="No organisations yet">Add the first one below.</Empty>}
      <form className="card stack" onSubmit={add}>
        <h2>Add organisation</h2>
        <div className="grid"><Field label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
          <SelectField label="Type" value={kind} onChange={(e) => setKind(e.target.value)}>{ORG_KINDS.map((k) => <option key={k}>{k}</option>)}</SelectField></div>
        {err ? <ErrorNotice error={err} /> : null}
        <div><button className="btn" type="submit">Add organisation</button></div>
      </form>
    </div>
  );
}

function Audit() {
  const rows = useLoad(() => api<AuditRow[]>("/api/admin/audit?limit=200"), []);
  if (rows.loading && !rows.data) return <PageSkeleton />;
  if (rows.error) return <ErrorNotice error={rows.error} />;
  return (
    <div className="stack"><Notice kind="info">Most recent activity first.</Notice>
      <div className="card table-wrap" style={{ padding: 6 }}><table><thead><tr><th>When</th><th>Who</th><th>What</th><th>Detail</th></tr></thead>
        <tbody>{rows.data?.map((r, i) => <tr key={i}><td className="muted" style={{ whiteSpace: "nowrap" }}>{fmtDate(r.ts)}</td><td>{r.userEmail || "—"}</td><td>{r.action.replace(/_/g, " ")}</td><td className="muted">{r.detail || ""}</td></tr>)}</tbody></table></div>
    </div>
  );
}

function Departments() {
  const deps = useLoad(() => api<Department[]>("/api/admin/departments"), []);
  const orgs = useLoad(() => api<Org[]>("/api/admin/orgs"), []);
  const [name, setName] = useState(""), [orgId, setOrgId] = useState(""), [err, setErr] = useState<unknown>(null);
  async function add(e: FormEvent) {
    e.preventDefault(); setErr(null);
    try { await api("/api/admin/departments", { method: "POST", body: { name, orgId } }); setName(""); await deps.reload(true); } catch (ex) { setErr(ex); }
  }
  if (deps.loading && !deps.data) return <PageSkeleton />;
  return (
    <div className="stack-lg">
      <p className="muted">A department is a team inside an organisation, such as HR, Finance, Customer Services, Legal or a school's pastoral team. Each check can be filed under a department so you can see which team uses which AI tool.</p>
      {deps.data?.length ? (
        <div className="card table-wrap" style={{ padding: 6 }}><table><thead><tr><th>Department</th><th>Organisation</th><th className="n">Checks</th></tr></thead>
          <tbody>{deps.data.map((d, i) => <tr key={d.id} style={{ ["--i" as string]: i } as React.CSSProperties}><td style={{ fontWeight: 600 }}>{d.name}</td><td>{d.orgName}</td><td className="n">{d.runs}</td></tr>)}</tbody></table></div>
      ) : <Empty icon="users" title="No departments yet">Add the first one below. Add organisations first if you have none.</Empty>}
      <form className="card stack" onSubmit={add}>
        <h2>Add department</h2>
        <div className="grid"><Field label="Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HR, Customer Services" />
          <SelectField label="Organisation" required value={orgId} onChange={(e) => setOrgId(e.target.value)}><option value="">(choose)</option>{orgs.data?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</SelectField></div>
        {err ? <ErrorNotice error={err} /> : null}
        <div><button className="btn" type="submit" disabled={!name.trim() || !orgId}>Add department</button></div>
      </form>
    </div>
  );
}
