import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../../components/Icon";
import { ErrorNotice, Notice, Spinner } from "../../components/ui";
import { api, apiBlob } from "../../lib/api";
import { saveBlob } from "../../lib/format";
import { useFeedback } from "../../lib/toast";
import type { ManualItem, Progress, Run } from "../../lib/types";

/** Judge keys are held in memory only. */
export const judgeKeys: Record<string, string> = {};

interface Worklist { progress: Progress; items: ManualItem[] }
interface ImportResult { accepted: number; rejected: { caseId: string; attempt: number; reason: string }[]; deferred: number; pending: number }

export function ManualPanel({ run, onChange }: { run: Run; onChange: () => Promise<void> | void }) {
  const [wl, setWl] = useState<Worklist | null>(null), [error, setError] = useState<unknown>(null);
  const [imp, setImp] = useState<ImportResult | null>(null), [busy, setBusy] = useState(false);
  const [jk, setJk] = useState(judgeKeys[run.id] ?? "");
  const file = useRef<HTMLInputElement>(null);
  const { toast } = useFeedback();
  const needsJudgeKey = !!run.judge && run.judge.type !== "mock";

  const load = useCallback(async () => {
    try { setWl(await api<Worklist>(`/api/runs/${run.id}/manual?limit=5`)); setError(null); } catch (e) { setError(e); }
  }, [run.id]);
  useEffect(() => { void load(); }, [load]);

  async function importFile(f: File) {
    setBusy(true); setImp(null);
    try {
      setImp(await api<ImportResult>(`/api/runs/${run.id}/import`, { method: "POST", body: { csv: await f.text(), judgeApiKey: needsJudgeKey ? jk || undefined : undefined } }));
      await load(); await onChange();
    } catch (e) { setError(e); } finally { setBusy(false); if (file.current) file.current.value = ""; }
  }

  const intro = run.mode === "import"
    ? "Import mode: the client or supplier sends you a spreadsheet of the tool's replies. Download the sheet, send it to them to fill in, then import it. Because you did not capture the replies yourself, the report says so and the evidence carries lower assurance."
    : "Manual mode: for each item, send the message(s) to the tool in its own chat window using a test account (never real personal data), then paste the tool's reply here. You can also download the sheet, fill it in offline, and import it.";

  return (
    <section className="card stack enter">
      <div className="stack"><h2>{run.mode === "import" ? "Import responses" : "Record responses"}</h2><p className="muted">{intro}</p></div>
      {needsJudgeKey && (
        <label className="field"><span className="lbl">Judge API key</span>
          <input className="input" type="password" autoComplete="off" value={jk} onChange={(e) => { setJk(e.target.value); judgeKeys[run.id] = e.target.value; }} placeholder="Memory only" /></label>
      )}
      <div className="row">
        <button className="btn ghost" onClick={async () => { try { saveBlob(await apiBlob(`/api/runs/${run.id}/sheet.csv`), `test-sheet-${run.id.slice(0, 8)}.csv`); } catch (e) { toast((e as Error).message, "error"); } }}><Icon name="download" width={16} height={16} />Download test sheet (CSV)</button>
        <button className="btn ghost" disabled={busy} onClick={() => file.current?.click()}><Icon name="upload" width={16} height={16} />{busy ? "Importing…" : "Import filled sheet"}</button>
        <input ref={file} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f); }} />
      </div>
      {imp && (
        <div className="stack">
          <Notice kind={imp.rejected.length ? "warn" : "ok"}>{imp.accepted} item(s) recorded. {imp.pending} still to do.{imp.deferred ? ` ${imp.deferred} more are waiting: import again to continue.` : ""}</Notice>
          {imp.rejected.length > 0 && <Notice kind="error"><div><strong>{imp.rejected.length} item(s) not imported:</strong><ul style={{ margin: "6px 0 0", paddingLeft: "1.2em" }}>{imp.rejected.slice(0, 12).map((x) => <li key={x.caseId + x.attempt}>{x.caseId} (repeat {x.attempt}): {x.reason}</li>)}</ul></div></Notice>}
        </div>
      )}
      {error ? <ErrorNotice error={error} /> : null}
      {!wl && !error ? <Spinner /> : wl && (wl.items.length === 0
        ? <Notice kind="ok">{wl.progress.pending === 0 ? "All items are recorded." : "Nothing left to show."}</Notice>
        : <div className="stack">
            <p className="muted small">{wl.progress.pending} item(s) still to record. Showing the next {wl.items.length}.</p>
            {wl.items.map((it) => <ItemCard key={it.attemptId} run={run} item={it} judgeKey={needsJudgeKey ? jk : ""} onDone={async () => { await load(); await onChange(); }} />)}
          </div>)}
    </section>
  );
}

function ItemCard({ run, item, judgeKey, onDone }: { run: Run; item: ManualItem; judgeKey: string; onDone: () => Promise<void> }) {
  const [vals, setVals] = useState<string[]>(item.turns.map(() => ""));
  const [busy, setBusy] = useState(false), [err, setErr] = useState<unknown>(null);
  const { toast } = useFeedback();
  const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); toast("Message copied"); } catch { toast("Copy failed: select and copy the text manually", "error"); } };
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try { await api(`/api/runs/${run.id}/attempts/${item.attemptId}/submit`, { method: "POST", body: { replies: vals, judgeApiKey: judgeKey || undefined } }); await onDone(); }
    catch (ex) { setErr(ex); setBusy(false); }
  }
  return (
    <form className="card soft stack enter" onSubmit={submit}>
      <div className="row"><strong>{item.caseId}</strong><span className="muted small">{item.area.replace(/_/g, " ")} · {item.severity}{item.attempt > 1 ? ` · repeat ${item.attempt}` : ""}</span></div>
      {item.description && <p className="small" style={{ margin: 0 }}>{item.description}</p>}
      {item.turns.map((t, i) => (
        <div key={i} className="stack">
          <div className="row spread"><span className="small" style={{ fontWeight: 600 }}>{item.turns.length > 1 ? `Message ${i + 1} of ${item.turns.length}: send this` : "Send this message"}</span>
            <button type="button" className="btn ghost sm" onClick={() => void copy(t)}><Icon name="copy" width={14} height={14} />Copy</button></div>
          <div className="mono-box">{t}</div>
          <textarea className="textarea" required placeholder="Paste the tool's reply here" value={vals[i]} onChange={(e) => setVals(vals.map((v, k) => (k === i ? e.target.value : v)))} />
        </div>
      ))}
      {err ? <ErrorNotice error={err} /> : null}
      <div><button className="btn" type="submit" disabled={busy}>{busy ? "Recording…" : "Record reply"}</button></div>
    </form>
  );
}
