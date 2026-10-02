import { Icon } from "../components/Icon";
import { Empty, ErrorNotice, LightChip, PageSkeleton } from "../components/ui";
import { fmtDate, MODE_LABEL, profileLabel } from "../lib/format";
import { useLoad } from "../lib/hooks";
import { api } from "../lib/api";
import { canOperate, isStaff, useUser } from "../lib/session";
import type { RunListItem } from "../lib/types";

export function RunsList() {
  const user = useUser();
  const client = !isStaff(user);
  const { data, error, loading } = useLoad(() => api<RunListItem[]>("/api/runs"), []);
  return (
    <div className="stack-lg">
      <div className="row spread">
        <div className="stack"><h1>{client ? "Your AI tool checks" : "Runs"}</h1><p className="muted">{client ? "Independent checks of the AI tools used with your pupils." : "Every check, newest first."}</p></div>
        {canOperate(user) && <a className="btn" href="#/new"><Icon name="plus" width={16} height={16} />New check</a>}
      </div>
      {loading ? <PageSkeleton /> : error ? <ErrorNotice error={error} /> : !data?.length
        ? <Empty title={client ? "Nothing has been shared with you yet" : "No checks yet"}>{client ? "When your assessor publishes a result, it appears here." : "Create your first check to get started."}</Empty>
        : (
          <div className="card table-wrap" style={{ padding: 6 }}>
            <table>
              <thead><tr><th>Tool</th>{!client && <th>Client</th>}<th>{client ? "Product type" : "How tested"}</th><th>Date</th>{!client && <th className="n">Progress</th>}{!client && <th>Shared</th>}<th /></tr></thead>
              <tbody>
                {data.map((r, i) => (
                  <tr key={r.id} style={{ ["--i" as string]: i } as React.CSSProperties}>
                    <td><a href={"#/runs/" + r.id} style={{ fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>{r.meta.tool}</a><div className="small muted">{profileLabel(r.meta.profile)}</div></td>
                    {!client && <td>{r.orgName || r.meta.client}</td>}
                    <td>{client ? profileLabel(r.meta.profile) : MODE_LABEL[r.mode]}</td>
                    <td className="muted">{fmtDate(r.createdAt)}</td>
                    {!client && <td className="n">{r.done}/{r.total}</td>}
                    {!client && <td>{r.publishedAt ? <LightChip light="green" label="Shared" /> : <span className="chip n">Private</span>}</td>}
                    <td className="n"><a href={"#/runs/" + r.id}>Open</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
