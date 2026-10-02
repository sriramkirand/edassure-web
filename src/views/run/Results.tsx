import { useState } from "react";
import { Icon } from "../../components/Icon";
import { Collapse, CountUp, Empty, RateCell, StatusChip, SummaryCard } from "../../components/ui";
import { pct } from "../../lib/format";
import type { Evaluation, Finding, Summary } from "../../lib/types";

export function Results({ ev, summary, staff }: { ev: Evaluation; summary: Summary; staff: boolean }) {
  if (!ev.areas.length) return <Empty icon="shield" title="No results yet">Results appear here as tests are completed.</Empty>;
  return (
    <div className="stack-lg">
      <SummaryCard s={summary} />
      <div className="grid stagger">
        {([["Tests complete", ev.completedAttempts, `of ${ev.totalAttempts}`], ["Critical findings", ev.criticalCount, ev.criticalCount ? "need fixing first" : "none"], ["Awaiting review", ev.pendingReviews, "sensitive responses"]] as const).map(([label, n, sub], i) => (
          <div key={label} className="card" style={{ ["--i" as string]: i } as React.CSSProperties}>
            <div className="eyebrow">{label}</div>
            <div style={{ fontFamily: "var(--font-head)", fontSize: "2.2rem", lineHeight: 1.1, margin: "4px 0" }}><CountUp value={n} /></div>
            <div className="small muted">{sub}</div>
          </div>
        ))}
      </div>
      <div className="card table-wrap" style={{ padding: 6 }}>
        <table>
          <thead><tr><th>Area</th><th className="n">Passed</th><th className="n">Failed</th><th className="n">Review</th><th className="n">Skipped</th><th>Pass rate</th><th className="n">Required</th><th>Status</th></tr></thead>
          <tbody>
            {ev.areas.map((a, i) => (
              <tr key={a.area} style={{ ["--i" as string]: i } as React.CSSProperties}>
                <td style={{ fontWeight: 600 }}>{a.label}</td><td className="n"><CountUp value={a.passed} /></td><td className="n"><CountUp value={a.failed} /></td><td className="n">{a.review}</td><td className="n">{a.skipped}</td>
                <td><RateCell rate={a.rate} status={a.status} /></td><td className="n muted">{pct(a.minimum)}</td><td><StatusChip status={a.status} critical={a.criticalFailure} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ev.findings.length > 0 && (
        <div className="stack">
          <h2>Findings</h2>
          <div className="stack stagger">{ev.findings.map((f, i) => <FindingCard key={f.caseId} f={f} staff={staff} i={i} />)}</div>
        </div>
      )}
      {ev.flakyCases.length > 0 && <p className="small muted">Inconsistent across repeats (passed sometimes, failed others): {ev.flakyCases.join(", ")}</p>}
    </div>
  );
}

function FindingCard({ f, staff, i }: { f: Finding; staff: boolean; i: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card" style={{ ["--i" as string]: i } as React.CSSProperties}>
      <div className="row"><strong>{f.caseId}</strong><span className={"chip " + (f.severity === "critical" ? "r" : "a")}>{f.severity}</span><span className="muted small">{f.area.replace(/_/g, " ")} · failed {f.failedAttempts}/{f.totalAttempts}</span></div>
      <p className="small" style={{ margin: "8px 0 0" }}>{f.reason}</p>
      {staff && <>
        <button className="btn link small" style={{ marginTop: 8 }} onClick={() => setOpen(!open)} aria-expanded={open}><Icon name="back" width={13} height={13} style={{ transform: open ? "rotate(-90deg)" : "rotate(180deg)", transition: "transform .25s" }} />{open ? "Hide" : "Show"} prompt and reply</button>
        <Collapse open={open}><div className="stack" style={{ paddingTop: 8 }}><div className="mono-box">PROMPT:{"\n"}{f.prompt}</div><div className="mono-box">REPLY:{"\n"}{f.reply || "(empty)"}</div></div></Collapse>
      </>}
    </div>
  );
}
