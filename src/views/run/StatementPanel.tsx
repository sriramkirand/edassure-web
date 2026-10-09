import { useState } from "react";
import { Icon } from "../../components/Icon";
import { Field, Notice, SelectField } from "../../components/ui";
import { api } from "../../lib/api";
import { fmtDay } from "../../lib/format";
import { useLoad } from "../../lib/hooks";
import { canOperate, useUser } from "../../lib/session";
import { useFeedback } from "../../lib/toast";
import type { Declarations, StatementInfo } from "../../lib/types";

const PAYER = { client: "the organisation using the tool", supplier: "the supplier of the tool", other: "someone else" } as const;
const REPLY = { offered: "offered", declined: "offered and declined", not_offered: "not offered" } as const;
interface Person { id: string; name: string; role: string }

/** Sign-off: a named assessor prepares, a different named reviewer countersigns, anyone can then check it. */
export function StatementPanel({ runId, blockers, onChange }: { runId: string; blockers: string[]; onChange: () => Promise<void> | void }) {
  const user = useUser(), operate = canOperate(user), { toast } = useFeedback();
  const st = useLoad(() => api<StatementInfo | null>(`/api/runs/${runId}/statement`), [runId]);
  const people = useLoad(() => (operate ? api<Person[]>("/api/reviewers") : Promise.resolve([])), [runId]);
  const [form, setForm] = useState({ reviewerId: "", payer: "", feeBasis: "fixed", priorWork: "", rightOfReply: "", validMonths: "6", showClient: false });
  const [busy, setBusy] = useState(false), [confirmed, setConfirmed] = useState(false), [revoking, setRevoking] = useState(false), [reason, setReason] = useState(""), [showForm, setShowForm] = useState(false);
  const s = st.data;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value });

  async function act(fn: () => Promise<unknown>, msg: string) {
    setBusy(true);
    try { await fn(); toast(msg); await st.reload(true); await onChange(); setRevoking(false); setShowForm(false); setConfirmed(false); } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); }
  }
  if (st.loading && !s) return null;

  // ---- read-only for clients, and the issued card for everyone ----
  const issued = s?.status === "issued" ? s : null;
  if (!operate && !(user.role === "reviewer" && s?.status === "awaiting" && s.reviewerId === user.id)) {
    if (!issued) return null;
    return <IssuedCard s={issued} />;
  }

  return (
    <section id="signoff" className="card stack anchor">
      <div className="row spread"><div><strong>Sign-off</strong><p className="small muted" style={{ margin: "4px 0 0" }}>A named assessor prepares the statement and a different named reviewer countersigns it. Anyone with the code can then check it. <a href="#/help?s=signoff">How does this work?</a></p></div></div>

      {issued && <IssuedCard s={issued} bare />}
      {issued && operate && (revoking ? (
        <div className="row"><input className="input grow" placeholder="Reason (shown to anyone who checks)" aria-label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button className="btn danger" disabled={busy || !reason.trim()} onClick={() => void act(() => api(`/api/runs/${runId}/statement/revoke`, { method: "POST", body: { reason } }), "Statement revoked")}>Revoke</button>
          <button className="btn ghost" onClick={() => setRevoking(false)}>Cancel</button></div>
      ) : <div className="row"><button className="btn ghost sm" onClick={() => setRevoking(true)}>Revoke</button><button className="btn ghost sm" onClick={() => setShowForm(true)}>Prepare a replacement</button></div>)}

      {s?.status === "awaiting" && (
        <div className="stack">
          <Notice kind="info"><div>Prepared by {s.preparedBy} on {fmtDay(s.preparedAt)}. Waiting for <strong>{s.reviewer}</strong> to review the evidence and countersign.</div></Notice>
          {s.reviewerId === user.id ? (
            <div className="stack">
              <label className="check"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />I have reviewed the evidence, findings and summary for this check, and I stand behind this statement.</label>
              <div className="row"><button className="btn" disabled={busy || !confirmed} onClick={() => void act(() => api(`/api/runs/${runId}/statement/countersign`, { method: "POST", body: { confirmed: true } }), "Statement signed")}><Icon name="check" width={16} height={16} />Countersign</button></div>
            </div>
          ) : operate && <div className="row"><button className="btn ghost sm" disabled={busy} onClick={() => void act(() => api(`/api/runs/${runId}/statement`, { method: "DELETE" }), "Draft cancelled")}>Cancel draft</button></div>}
        </div>
      )}

      {operate && (!s || showForm) && s?.status !== "awaiting" && (
        blockers.length ? (
          <Notice kind="warn"><strong>Not ready to sign.</strong><ul style={{ margin: "6px 0 0", paddingLeft: "1.2em" }}>{blockers.map((b) => <li key={b}>{b}</li>)}</ul></Notice>
        ) : (
          <form className="stack" onSubmit={(e) => { e.preventDefault(); void act(() => api(`/api/runs/${runId}/statement`, { method: "POST", body: { ...form, validMonths: Number(form.validMonths) } }), "Prepared. Waiting for the reviewer"); }}>
            <div className="grid">
              <SelectField label="Independent reviewer" required value={form.reviewerId} onChange={set("reviewerId")} hint="Must be a different person, and not the person who ran the tests.">
                <option value="">(choose)</option>{people.data?.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.role}</option>)}
              </SelectField>
              <SelectField label="Who paid for this assessment?" required value={form.payer} onChange={set("payer")}>
                <option value="">(choose)</option>{(Object.keys(PAYER) as (keyof typeof PAYER)[]).map((k) => <option key={k} value={k}>{PAYER[k]}</option>)}
              </SelectField>
              <SelectField label="Fee basis" required value={form.feeBasis} onChange={set("feeBasis")} hint="Fixed means the fee did not depend on the result.">
                <option value="fixed">Fixed, not dependent on the result</option><option value="other">Something else</option>
              </SelectField>
              <SelectField label="Supplier right of reply" required value={form.rightOfReply} onChange={set("rightOfReply")}>
                <option value="">(choose)</option>{(Object.keys(REPLY) as (keyof typeof REPLY)[]).map((k) => <option key={k} value={k}>{REPLY[k]}</option>)}
              </SelectField>
              <Field label="Other work for this organisation in the last 12 months" required value={form.priorWork} onChange={set("priorWork")} placeholder="Write 'none' if there was none" maxLength={300} />
              <SelectField label="Valid for" value={form.validMonths} onChange={set("validMonths")} hint="For the tested version only; sooner if the tool changes.">
                <option value="3">3 months</option><option value="6">6 months</option><option value="12">12 months</option>
              </SelectField>
            </div>
            <label className="check"><input type="checkbox" checked={form.showClient} onChange={set("showClient")} />Show the client's name on the public check page</label>
            <div className="row"><button className="btn" type="submit" disabled={busy || !form.reviewerId || !form.payer || !form.rightOfReply || !form.priorWork.trim()}>Prepare for countersigning</button>{showForm && <button type="button" className="btn ghost" onClick={() => setShowForm(false)}>Cancel</button>}</div>
          </form>
        )
      )}
    </section>
  );
}

export function IssuedCard({ s, bare }: { s: StatementInfo; bare?: boolean }) {
  const { toast } = useFeedback();
  const d: Declarations | null = s.declarations;
  const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); toast("Copied"); } catch { toast("Copy failed: select the text and copy it", "error"); } };
  const body = (
    <div className="stack">
      <div className="row"><span className="chip g"><Icon name="check" />Signed</span><span className="small muted">Valid until {fmtDay(s.validUntil)} · for the tested version only</span></div>
      <p className="small" style={{ margin: 0 }}>Assessed by <strong>{s.preparedBy}</strong>, independently reviewed and countersigned by <strong>{s.reviewer}</strong> on {fmtDay(s.issuedAt)}.
        {d && <> Paid for by {PAYER[d.payer]}; fee {d.feeBasis === "fixed" ? "fixed" : "not fixed"}; supplier right of reply {REPLY[d.rightOfReply]}.</>}</p>
      {s.verifyUrl && <div className="row"><code className="mono-box grow" style={{ margin: 0 }}>{s.verifyUrl}</code><button className="btn ghost sm" onClick={() => void copy(s.verifyUrl!)}><Icon name="copy" width={14} height={14} />Copy link</button></div>}
      {s.code && <p className="small muted" style={{ margin: 0 }}>Check code: <code>{s.code}</code>. Anyone with the link or code can confirm this statement is genuine and still valid.</p>}
    </div>
  );
  return bare ? body : <section className="card stack">{body}</section>;
}
