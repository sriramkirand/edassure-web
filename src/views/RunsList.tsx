import { useMemo, useState } from "react";
import { Hero, Kpi, FilterChips } from "../components/bits";
import { Ring, toneOf } from "../components/charts";
import { Icon } from "../components/Icon";
import { Empty, ErrorNotice, LightChip, PageSkeleton } from "../components/ui";
import { clientName, fmtDay, MODE_LABEL, profileLabel, SECTOR_LABEL } from "../lib/format";
import { useLoad } from "../lib/hooks";
import { api } from "../lib/api";
import { canOperate, isStaff, useUser } from "../lib/session";
import type { RunListItem } from "../lib/types";

type Filter = "all" | "review" | "red" | "amber" | "green" | "private";
const LIGHT_LABEL = { green: "No major problems", amber: "With conditions", red: "Not ready" } as const;

const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };

export function RunsList() {
  const user = useUser();
  const client = !isStaff(user);
  const { data, error, loading } = useLoad(() => api<RunListItem[]>("/api/runs"), []);
  const [filter, setFilter] = useState<Filter>("all");

  const stats = useMemo(() => {
    const d = data ?? [];
    return {
      total: d.length, review: d.reduce((n, r) => n + r.pendingReviews, 0), red: d.filter((r) => r.light === "red").length,
      amber: d.filter((r) => r.light === "amber").length, green: d.filter((r) => r.light === "green").length, shared: d.filter((r) => r.publishedAt).length,
      needsReview: d.filter((r) => r.pendingReviews > 0).length, priv: d.filter((r) => !r.publishedAt).length,
    };
  }, [data]);

  const shown = useMemo(() => (data ?? []).filter((r) =>
    filter === "all" ? true : filter === "review" ? r.pendingReviews > 0 : filter === "private" ? !r.publishedAt : r.light === filter), [data, filter]);

  const first = user.name.split(" ")[0];
  return (
    <div className="stack-lg">
      <Hero>
        <div className="hero-grid">
          <div>
            <div className="eyebrow">{client ? "Independent AI tool checks" : "Assurance workspace"}</div>
            <h1 className="greeting" style={{ margin: "6px 0 8px" }}>{greeting()}, {first}.</h1>
            <p style={{ maxWidth: "36em", margin: 0 }}>{client ? "These are the AI tools we have checked for you, with a plain-English answer for each." : "Every check in one place: what needs a person's eyes, what is ready to share, and what is not ready for use."}</p>
            {!client && <div className="hero-stats">
              <div><b>{stats.total}</b><span>checks</span></div><div><b>{stats.review}</b><span>responses to review</span></div><div><b>{stats.shared}</b><span>shared with clients</span></div>
            </div>}
          </div>
          {canOperate(user) && <a className="btn" href="#/new"><Icon name="plus" width={16} height={16} />New check</a>}
        </div>
      </Hero>

      {loading ? <PageSkeleton /> : error ? <ErrorNotice error={error} /> : !data?.length
        ? <Empty title={client ? "Nothing has been shared with you yet" : "No checks yet"}>{client ? "When your assessor publishes a result, it appears here." : "Create your first check to get started."}</Empty>
        : (<>
          <div className="kpis stagger">
            {[
              <Kpi key="r" icon="alert" label="Not ready for use" value={stats.red} tone="red" />,
              <Kpi key="a" icon="half" label="Use with conditions" value={stats.amber} tone="amber" />,
              <Kpi key="g" icon="check" label="No major problems" value={stats.green} tone="green" />,
              !client ? <Kpi key="v" icon="eye" label="Awaiting review" value={stats.review} tone="gold" /> : <Kpi key="t" icon="file" label="Checks in total" value={stats.total} />,
            ].map((k, i) => <div key={i} style={{ ["--i" as string]: i } as React.CSSProperties}>{k}</div>)}
          </div>

          <div className="stack">
            <div className="row spread"><h2>{client ? "Your checks" : "All checks"}</h2>
              <FilterChips value={filter} onChange={setFilter} items={[
                { key: "all", label: "All", count: stats.total },
                ...(!client ? [{ key: "review" as Filter, label: "Needs review", count: stats.needsReview }] : []),
                { key: "red", label: "Not ready", count: stats.red }, { key: "amber", label: "Conditions", count: stats.amber }, { key: "green", label: "No major problems", count: stats.green },
                ...(!client ? [{ key: "private" as Filter, label: "Private", count: stats.priv }] : []),
              ]} />
            </div>
            {!shown.length ? <Empty icon="inbox" title="Nothing matches that filter">Try another filter above.</Empty>
              : <div className="cards">{shown.map((r, i) => <CheckCard key={r.id} r={r} i={i} client={client} />)}</div>}
          </div>
        </>)}
    </div>
  );
}

function CheckCard({ r, i, client }: { r: RunListItem; i: number; client: boolean }) {
  const tone = toneOf(r.light);
  const complete = r.done >= r.total && r.total > 0;
  return (
    <a className={"check-card " + tone} href={"#/runs/" + r.id} style={{ ["--i" as string]: i } as React.CSSProperties}
      onMouseMove={(e) => { const b = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty("--mx", ((e.clientX - b.left) / b.width) * 100 + "%"); }}>
      <Ring value={r.passRate} size={78} stroke={8} tone={tone} sub="passed" />
      <div className="body">
        <h3 title={r.meta.tool}>{r.meta.tool}</h3>
        <div className="meta">{clientName(r)}{r.departmentName ? " · " + r.departmentName : r.sector ? " · " + SECTOR_LABEL[r.sector] : ""} · {profileLabel(r.meta.profile)}</div>
        <div className="row" style={{ gap: 6 }}>
          {r.light ? <LightChip light={r.light} label={LIGHT_LABEL[r.light]} /> : <span className="chip n">{r.done ? "In progress" : "Not started"}</span>}
          {!client && r.pendingReviews > 0 && <span className="chip a"><Icon name="eye" />{r.pendingReviews} to review</span>}
          {!client && !r.publishedAt && <span className="pill">Private</span>}
        </div>
        <div className="foot">
          <span>{fmtDay(r.createdAt)}{!client && <> · {MODE_LABEL[r.mode]}{!complete && ` · ${r.done}/${r.total}`}</>}</span>
          <span className="go">Open<Icon name="back" width={14} height={14} style={{ transform: "rotate(180deg)" }} /></span>
        </div>
      </div>
    </a>
  );
}
