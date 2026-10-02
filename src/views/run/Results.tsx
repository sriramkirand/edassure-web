import { useState } from "react";
import { Radar, toneOf } from "../../components/charts";
import { Icon } from "../../components/Icon";
import { Collapse, CountUp, Empty, StatusChip, SummaryCard, Bar } from "../../components/ui";
import { pct } from "../../lib/format";
import type { Area, Evaluation, Finding, Summary } from "../../lib/types";

const areaTone = (s: Area["status"]) => (s === "Pass" ? "tone-green" : s === "Conditions" ? "tone-amber" : s === "Fail" ? "tone-red" : "tone-none");

export function Results({ ev, summary, staff }: { ev: Evaluation; summary: Summary; staff: boolean }) {
  if (!ev.areas.length) return <Empty icon="shield" title="No results yet">Results appear here as tests are completed.</Empty>;
  return (
    <div className="stack-lg">
      <section id="summary" className="anchor stack">
        <SummaryCard s={summary} />
        <div className="kpis">
          {([["Tests complete", ev.completedAttempts, `of ${ev.totalAttempts}`], ["Critical findings", ev.criticalCount, ev.criticalCount ? "fix these first" : "none found"], ["Awaiting review", ev.pendingReviews, "sensitive responses"]] as const).map(([label, n, sub]) => (
            <div key={label} className="card"><div className="eyebrow">{label}</div>
              <div style={{ font: "560 2.3rem/1.1 var(--font-head)", margin: "4px 0 2px" }}><CountUp value={n} /></div><div className="small muted">{sub}</div></div>
          ))}
        </div>
      </section>

      <section id="areas" className="anchor stack">
        <div className="stack"><h2>Results by area</h2><p className="muted small">Each area has a required pass rate. Critical areas fail the whole check if any critical test fails.</p></div>
        <div className="areas-layout">
          {ev.areas.length >= 3 && <div className="card radar-card"><Radar areas={ev.areas} /></div>}
          <div className="area-grid">
            {ev.areas.map((a, i) => (
              <div key={a.area} className={"area-card " + areaTone(a.status)} style={{ ["--i" as string]: i } as React.CSSProperties}>
                <div className="top"><span className="name">{a.label}</span><StatusChip status={a.status} critical={a.criticalFailure} /></div>
                <Bar value={(a.rate ?? 0) * 100} tone={a.status === "Fail" ? "bad" : a.status === "Conditions" ? "warn" : undefined} />
                <div className="nums"><span><b>{pct(a.rate)}</b> passed</span><span>needs <b>{pct(a.minimum)}</b></span></div>
                <div className="nums"><span><b><CountUp value={a.passed} /></b> pass</span><span><b><CountUp value={a.failed} /></b> fail</span>{a.review > 0 && <span><b>{a.review}</b> review</span>}{a.skipped > 0 && <span><b>{a.skipped}</b> skipped</span>}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {ev.findings.length > 0 && (
        <section id="findings" className="anchor stack">
          <h2>What went wrong</h2>
          <div className="stack stagger">{ev.findings.map((f, i) => <FindingCard key={f.caseId} f={f} staff={staff} i={i} />)}</div>
          {ev.flakyCases.length > 0 && <p className="small muted">Inconsistent across repeats (passed sometimes, failed others): {ev.flakyCases.join(", ")}</p>}
        </section>
      )}
    </div>
  );
}

function FindingCard({ f, staff, i }: { f: Finding; staff: boolean; i: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={"card finding " + f.severity} style={{ ["--i" as string]: i } as React.CSSProperties}>
      <div className="row"><strong>{f.caseId}</strong><span className={"chip " + (f.severity === "critical" ? "r" : "a")}>{f.severity}</span><span className="muted small">{f.area.replace(/_/g, " ")} · failed {f.failedAttempts}/{f.totalAttempts}</span></div>
      <p className="small" style={{ margin: "8px 0 0" }}>{f.reason}</p>
      {staff && <>
        <button className="btn link small" style={{ marginTop: 8 }} onClick={() => setOpen(!open)} aria-expanded={open}><Icon name="back" width={13} height={13} style={{ transform: open ? "rotate(-90deg)" : "rotate(180deg)", transition: "transform .25s" }} />{open ? "Hide" : "Show"} prompt and reply</button>
        <Collapse open={open}><div className="stack" style={{ paddingTop: 8 }}><div className="mono-box">PROMPT:{"\n"}{f.prompt}</div><div className="mono-box">REPLY:{"\n"}{f.reply || "(empty)"}</div></div></Collapse>
      </>}
    </div>
  );
}
export { toneOf };
