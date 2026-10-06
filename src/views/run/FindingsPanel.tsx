import { useState } from "react";
import { Collapse, Empty, ErrorNotice } from "../../components/ui";
import { api } from "../../lib/api";
import type { AdversarialFinding } from "../../lib/types";

const TONE = { critical: "r", high: "r", medium: "a", low: "n" } as const;

/** Candidate problems found by attack-testing engines. Nothing counts until a person confirms it. */
export function FindingsPanel({ runId, items, onDone }: { runId: string; items: AdversarialFinding[]; onDone: () => Promise<void> | void }) {
  if (!items.length) return <Empty icon="shield" title="No adversarial findings">If you run attack testing with an engine, candidate findings appear here for review.</Empty>;
  const open = items.filter((f) => f.status === "open");
  return (
    <div className="stack">
      <p className="small muted">{open.length} awaiting your decision · {items.filter((f) => f.status === "confirmed").length} confirmed · {items.filter((f) => f.status === "dismissed").length} dismissed. Confirmed critical findings make the result "Not yet".</p>
      <div className="stack stagger">{items.map((f, i) => <FindingRow key={f.id} runId={runId} f={f} i={i} onDone={onDone} />)}</div>
    </div>
  );
}

function FindingRow({ runId, f, i, onDone }: { runId: string; f: AdversarialFinding; i: number; onDone: () => Promise<void> | void }) {
  const [notes, setNotes] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState<unknown>(null), [show, setShow] = useState(false);
  async function decide(verdict: "confirm" | "dismiss") {
    setBusy(true); setErr(null);
    try { await api(`/api/runs/${runId}/findings/${f.id}/review`, { method: "POST", body: { verdict, notes } }); await onDone(); } catch (e) { setErr(e); setBusy(false); }
  }
  return (
    <div className={"card finding " + f.severity} style={{ ["--i" as string]: i } as React.CSSProperties}>
      <div className="row"><strong>{f.category}</strong><span className={"chip " + TONE[f.severity]}>{f.severity}</span><span className="muted small">{f.tool}</span>
        <span className={"chip right " + (f.status === "confirmed" ? "r" : f.status === "dismissed" ? "n" : "a")}>{f.status}</span></div>
      {f.detail && <p className="small" style={{ margin: "8px 0 0" }}>{f.detail}</p>}
      <button className="btn link small" style={{ marginTop: 6 }} onClick={() => setShow(!show)} aria-expanded={show}>{show ? "Hide" : "Show"} attack prompt and reply</button>
      <Collapse open={show}><div className="stack" style={{ paddingTop: 8 }}><div className="mono-box">ATTACK: {f.prompt ?? "(not recorded)"}</div><div className="mono-box">TOOL: {f.reply ?? "(not recorded)"}</div></div></Collapse>
      {f.status === "open" ? (
        <div className="stack" style={{ marginTop: 10 }}>
          {err ? <ErrorNotice error={err} /> : null}
          <div className="row"><input className="input grow" placeholder="Notes (optional)" aria-label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <button className="btn danger" disabled={busy} onClick={() => void decide("confirm")}>Confirm problem</button>
            <button className="btn ghost" disabled={busy} onClick={() => void decide("dismiss")}>Dismiss</button></div>
        </div>
      ) : <p className="small muted" style={{ margin: "8px 0 0" }}>{f.status === "confirmed" ? "Confirmed" : "Dismissed"} by {f.reviewer}{f.notes ? `: ${f.notes}` : ""}</p>}
    </div>
  );
}
