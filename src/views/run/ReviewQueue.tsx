import { useMemo, useState } from "react";
import { Empty, ErrorNotice } from "../../components/ui";
import { api } from "../../lib/api";
import type { ReviewAttempt } from "../../lib/types";

export function ReviewQueue({ runId, items, onDone }: { runId: string; items: ReviewAttempt[]; onDone: () => Promise<void> }) {
  // Identical repeats are reviewed once; the verdict applies to all of them.
  const groups = useMemo(() => {
    const m = new Map<string, ReviewAttempt[]>();
    for (const a of items) { const k = a.caseId + "\u0000" + JSON.stringify(a.replies) + "\u0000" + a.outcome; m.set(k, [...(m.get(k) ?? []), a]); }
    return [...m.values()];
  }, [items]);
  if (!groups.length) return <Empty icon="shield" title="Nothing waiting for review">Sensitive responses appear here for a person to read.</Empty>;
  return <div className="stack stagger">{groups.map((g, i) => <ReviewCard key={g[0].id} runId={runId} group={g} i={i} onDone={onDone} />)}</div>;
}

function ReviewCard({ runId, group, i, onDone }: { runId: string; group: ReviewAttempt[]; i: number; onDone: () => Promise<void> }) {
  const a = group[0];
  const [notes, setNotes] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState<unknown>(null), [leaving, setLeaving] = useState(false);
  async function send(verdict: "pass" | "fail") {
    setBusy(true); setErr(null);
    try {
      for (const g of group) await api(`/api/runs/${runId}/attempts/${g.id}/review`, { method: "POST", body: { verdict, notes } });
      setLeaving(true); setTimeout(() => void onDone(), 220);
    } catch (e) { setErr(e); setBusy(false); }
  }
  return (
    <div className="card stack" style={{ ["--i" as string]: i, transition: "opacity .2s, transform .2s", opacity: leaving ? 0 : 1, transform: leaving ? "translateX(12px)" : "none" } as React.CSSProperties}>
      <div className="row"><strong>{a.caseId}</strong><span className="muted small">{a.area.replace(/_/g, " ")} · {a.severity} · automated: {a.outcome}{group.length > 1 ? ` · ${group.length} identical attempts` : ` · attempt ${a.attempt}`}</span></div>
      <p className="small" style={{ margin: 0 }}>{a.description}</p>
      {a.turns.map((t, k) => <div key={k} className="stack"><div className="mono-box">USER: {t}</div><div className="mono-box">TOOL: {a.replies[k] ?? "(no reply)"}</div></div>)}
      {a.error && <p className="small">Error: {a.error}</p>}
      <ul className="small muted" style={{ margin: 0, paddingLeft: "1.2em" }}>{a.checks.map((c, k) => <li key={k}>{c.type}: {c.outcome} ({c.detail})</li>)}</ul>
      {err ? <ErrorNotice error={err} /> : null}
      <div className="row"><input className="input grow" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Notes" />
        <button className="btn" disabled={busy} onClick={() => void send("pass")}>Pass</button><button className="btn danger" disabled={busy} onClick={() => void send("fail")}>Fail</button></div>
    </div>
  );
}
