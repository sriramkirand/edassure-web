import { useCallback, useEffect, useRef, useState } from "react";
import { Hero, SectionNav } from "../components/bits";
import { Ring, toneOf } from "../components/charts";
import { Icon } from "../components/Icon";
import { Bar, ErrorNotice, Field, Notice, PageSkeleton, SelectField } from "../components/ui";
import { api, apiBlob } from "../lib/api";
import { clientName, fmtDate, MODE_LABEL, profileLabel, SECTOR_LABEL, saveBlob, targetText } from "../lib/format";
import { useLoad } from "../lib/hooks";
import { keys } from "../lib/keys";
import { navigate, replaceRoute, type Route } from "../lib/router";
import { canOperate, isStaff, useUser } from "../lib/session";
import { useFeedback } from "../lib/toast";
import type { AdversarialFinding, Org, Progress, Results as ResultsT, ReviewAttempt, Run } from "../lib/types";
import { EnginePanel } from "./run/EnginePanel";
import { FindingsPanel } from "./run/FindingsPanel";
import { ManualPanel } from "./run/ManualPanel";
import { Results } from "./run/Results";
import { ReviewQueue } from "./run/ReviewQueue";

export function RunDetail({ id, route }: { id: string; route: Route }) {
  const user = useUser();
  const staff = isStaff(user), operate = canOperate(user);
  const { toast, confirm } = useFeedback();
  const run = useLoad(() => api<Run>("/api/runs/" + id), [id]);
  const results = useLoad(() => api<ResultsT>(`/api/runs/${id}/results`), [id]);
  const review = useLoad(() => (staff ? api<ReviewAttempt[]>(`/api/runs/${id}/attempts?needs_review=1`) : Promise.resolve([])), [id]);
  const findings = useLoad(() => (staff ? api<AdversarialFinding[]>(`/api/runs/${id}/findings`) : Promise.resolve([])), [id]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [running, setRunning] = useState(false), [driveError, setDriveError] = useState<unknown>(null);
  const [keyTick, setKeyTick] = useState(0);
  const stop = useRef(false), started = useRef(false);

  useEffect(() => { if (run.data) setProgress(run.data.progress); }, [run.data]);
  const refreshAll = useCallback(async () => {
    await Promise.all([results.reload(true), review.reload(true), run.reload(true), findings.reload(true)]);
  }, [results, review, run]);

  const r = run.data;
  const needsKey = !!r && r.mode === "api" && r.target.type !== "mock" && !keys.has(id) && keyTick >= 0;

  const drive = useCallback(async () => {
    if (!r || running) return;
    stop.current = false; setRunning(true); setDriveError(null);
    let idle = 0;
    try {
      while (!stop.current) {
        const k = keys.get(id) ?? {};
        const p = await api<Progress & { processed: number }>(`/api/runs/${id}/step`, { method: "POST", body: { batch: 3, apiKey: k.apiKey || undefined, judgeApiKey: k.judgeApiKey || undefined } });
        setProgress({ done: p.done, pending: p.pending, total: p.total });
        if (p.pending === 0) break;
        idle = p.processed === 0 ? idle + 1 : 0;
        if (idle > 5) throw new Error("No progress: attempts may be claimed by another session. Try again shortly.");
        if (p.processed === 0) await new Promise((res) => setTimeout(res, 2000));
      }
    } catch (e) { setDriveError(e); }
    setRunning(false); await refreshAll();
  }, [r, running, id, refreshAll]);

  // Start automatically right after creating a direct run.
  useEffect(() => {
    if (r && route.query.get("go") === "1" && !started.current && !needsKey && (progress?.pending ?? 0) > 0) {
      started.current = true; replaceRoute("/runs/" + id); void drive();
    }
  }, [r, route, needsKey, progress, id, drive]);
  useEffect(() => () => { stop.current = true; }, []);

  if (run.loading && !r) return <PageSkeleton />;
  if (run.error || !r) return <div className="stack"><a className="crumb" href="#/"><Icon name="back" width={15} height={15} />All checks</a><ErrorNotice error={run.error ?? new Error("Not found")} /></div>;

  const ev = results.data?.evaluation;
  const overall = ev ? (() => { const pa = ev.areas.reduce((n, x) => n + x.passed, 0), fa = ev.areas.reduce((n, x) => n + x.failed, 0); return pa + fa ? pa / (pa + fa) : null; })() : null;
  const p = progress ?? r.progress, complete = p.pending === 0, pctDone = p.total ? (100 * p.done) / p.total : 0;
  const m = r.meta;

  async function download(path: string, name: string, open: boolean) {
    try {
      const blob = await apiBlob(path);
      if (open) window.open(URL.createObjectURL(new Blob([await blob.text()], { type: "text/html" })), "_blank", "noopener");
      else saveBlob(blob, name);
    } catch (e) { toast((e as Error).message, "error"); }
  }
  async function remove() {
    if (!(await confirm({ title: "Delete this check?", body: "The run, its transcripts and the evidence are removed permanently.", confirmLabel: "Delete", danger: true }))) return;
    try { await api("/api/runs/" + id, { method: "DELETE" }); toast("Check deleted"); navigate("/"); } catch (e) { toast((e as Error).message, "error"); }
  }
  async function retryErrors() {
    try { const x = await api<{ requeued: number }>(`/api/runs/${id}/retry-errors`, { method: "POST" }); toast(`${x.requeued} errored test(s) re-queued`); await refreshAll(); } catch (e) { toast((e as Error).message, "error"); }
  }

  return (
    <div className="stack-lg">
      <Hero>
        <div className="hero-grid">
          <div className="stack">
            <a className="crumb" href="#/"><Icon name="back" width={15} height={15} />{staff ? "All checks" : "Your checks"}</a>
            <div className="eyebrow">{clientName(r)}</div>
            <h1>{m.tool}</h1>
            <p className="muted" style={{ margin: 0 }}>{r.packId} v{r.packVersion} · {targetText(r.target)} · {r.repeats} repeat(s) · {fmtDate(r.createdAt)}</p>
            <div className="row"><span className="pill">{MODE_LABEL[r.mode]}</span><span className="pill">{profileLabel(m.profile)}</span>{r.sector && <span className="pill">{SECTOR_LABEL[r.sector]}</span>}{r.departmentName && <span className="pill">{r.departmentName}</span>}{r.publishedAt && <span className="pill">Shared with client</span>}</div>
            {staff && <p className="small muted" style={{ margin: 0, maxWidth: "46em" }}>{r.evidenceSource}</p>}
            <div className="dl-actions" style={{ marginTop: 6 }}>
              <button className="btn" onClick={() => void download(`/api/runs/${id}/report?format=html`, "report.html", true)}><Icon name="file" width={16} height={16} />Open report</button>
              <button className="btn ghost" onClick={() => void download(`/api/runs/${id}/report?format=md`, "report.md", false)}><Icon name="download" width={16} height={16} />Markdown</button>
              {staff && <button className="btn ghost" onClick={() => void download(`/api/runs/${id}/evidence.jsonl`, "evidence.jsonl", false)}>Evidence</button>}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <Ring value={overall} size={150} stroke={12} tone={toneOf(results.data?.summary.light)} glow sub={results.data ? "passed" : undefined} />
            {results.data && <div style={{ marginTop: 10, fontWeight: 600, maxWidth: 170 }}>{results.data.summary.headline}</div>}
          </div>
        </div>
      </Hero>
      <SectionNav items={[{ id: "summary", label: "Summary" }, { id: "areas", label: "Areas" }, ...(results.data?.evaluation.findings.length ? [{ id: "findings", label: "Findings" }] : []), ...(staff && findings.data?.length ? [{ id: "adversarial", label: "Adversarial" }] : []), ...(staff ? [{ id: "review", label: "Review" }] : [])]} />

      {staff && (
        <section className="card stack">
          <div className="row spread">
            <div><strong>{complete ? "All tests complete" : running ? "Running tests…" : `${p.done} of ${p.total} tests complete`}</strong>{!complete && <span className="muted small"> · {p.total - p.done} to go</span>}</div>
            <div className="row">
              {operate && r.mode === "api" && (running
                ? <button className="btn ghost" onClick={() => { stop.current = true; }}>Pause</button>
                : <button className="btn" disabled={complete || needsKey} onClick={() => void drive()}>{complete ? "Complete" : p.done ? "Resume" : "Start"}</button>)}
              {operate && r.mode === "api" && <button className="btn ghost" onClick={() => void retryErrors()}>Retry errored</button>}
              {operate && <button className="btn link" onClick={() => void remove()} style={{ color: "var(--red)" }}>Delete</button>}
            </div>
          </div>
          <Bar value={pctDone} live={running} />
        </section>
      )}

      {needsKey && operate && <KeyPrompt runId={id} judge={r.judge} onSet={() => setKeyTick((t) => t + 1)} />}
      {driveError ? <ErrorNotice error={driveError} /> : null}
      {operate && <SharePanel run={r} onChange={() => run.reload(true)} />}
      {operate && (r.mode === "manual" || r.mode === "import") && <ManualPanel run={r} onChange={refreshAll} />}
      {operate && r.mode === "engine" && <EnginePanel run={r} pending={p.pending} onRefresh={refreshAll} />}

      {results.loading && !results.data ? <PageSkeleton /> : results.error ? <ErrorNotice error={results.error} /> : results.data && <Results ev={results.data.evaluation} summary={results.data.summary} adversarial={results.data.adversarial} staff={staff} />}

      {staff && (findings.data?.length ?? 0) > 0 && (
        <section id="adversarial" className="anchor stack">
          <h2>Adversarial findings</h2>
          <p className="muted small">Candidate problems from attack-testing engines. Confirm real problems and dismiss false alarms; nothing counts until a person decides.</p>
          <FindingsPanel runId={id} items={findings.data ?? []} onDone={refreshAll} />
        </section>
      )}

      {staff && (
        <section id="review" className="anchor stack">
          <h2>Human review queue</h2>
          <p className="muted small">Sensitive cases and anything the automated checks could not decide. Your verdict is recorded under your name and replaces the automated outcome.</p>
          {review.error ? <ErrorNotice error={review.error} /> : <ReviewQueue runId={id} items={review.data ?? []} onDone={refreshAll} />}
        </section>
      )}
    </div>
  );
}

function KeyPrompt({ runId, judge, onSet }: { runId: string; judge: Run["judge"]; onSet: () => void }) {
  const [k, setK] = useState(""), [jk, setJk] = useState("");
  return (
    <section className="card stack enter">
      <div><strong>This run needs an API key</strong><p className="muted small" style={{ margin: "4px 0 0" }}>For the tool under test. Keys are held in this tab's memory only and are forgotten if you reload.</p></div>
      <Field label="API key for the tool (leave blank if it needs none)" type="password" autoComplete="off" value={k} onChange={(e) => setK(e.target.value)} />
      {judge && judge.type !== "mock" && <Field label="API key for the judge" type="password" autoComplete="off" value={jk} onChange={(e) => setJk(e.target.value)} />}
      <div><button className="btn" onClick={() => { keys.set(runId, { apiKey: k, judgeApiKey: jk }); onSet(); }}>Use key</button></div>
    </section>
  );
}

function SharePanel({ run, onChange }: { run: Run; onChange: () => Promise<void> | void }) {
  const orgs = useLoad(() => api<Org[]>("/api/orgs"), []);
  const [orgId, setOrgId] = useState(run.orgId ?? ""), [busy, setBusy] = useState(false);
  const { toast } = useFeedback();
  useEffect(() => setOrgId(run.orgId ?? ""), [run.orgId]);
  async function act(path: string, withOrg: boolean, msg: string) {
    setBusy(true);
    try { await api(path, { method: "POST", body: withOrg ? { orgId: orgId || undefined } : {} }); toast(msg); await onChange(); } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); }
  }
  const published = !!run.publishedAt;
  return (
    <section className="card soft stack">
      <div className="row spread">
        <div><strong>Share with the client</strong>
          <p className="small muted" style={{ margin: "4px 0 0" }}>{published ? `Published ${fmtDate(run.publishedAt)} to ${run.orgName}. Their users see the summary, results and report, not the raw transcripts or review notes.` : "Private. Client users cannot see this check until you publish it."}</p></div>
        <div className="row">
          <SelectField label="Organisation" value={orgId} onChange={(e) => setOrgId(e.target.value)} disabled={published}>
            <option value="">(choose organisation)</option>{orgs.data?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </SelectField>
          {published ? <button className="btn ghost" disabled={busy} onClick={() => void act(`/api/runs/${run.id}/unpublish`, false, "Unpublished")}>Unpublish</button>
            : <button className="btn" disabled={busy || !orgId} onClick={() => void act(`/api/runs/${run.id}/publish`, true, "Published to client")}>Publish to client</button>}
        </div>
      </div>
      {!published && !orgId && <Notice kind="info">Choose the client organisation to enable publishing.</Notice>}
    </section>
  );
}
