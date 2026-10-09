import { Icon } from "../components/Icon";
import { ErrorNotice, LightChip, PageSkeleton, StatusChip } from "../components/ui";
import { api } from "../lib/api";
import { fmtDay, MODE_LABEL, SECTOR_LABEL } from "../lib/format";
import { useLoad } from "../lib/hooks";
import type { VerifyResult, VerifyState } from "../lib/types";

const STATE: Record<VerifyState, { tone: "g" | "a" | "r"; title: string; text: string }> = {
  valid: { tone: "g", title: "This statement is genuine and current", text: "It was signed by the two people named below, and the evidence behind it has not changed since." },
  expired: { tone: "a", title: "This statement has expired", text: "It was genuine, but its validity period has ended. The tool may have changed since. Ask for a new assessment." },
  superseded: { tone: "a", title: "This statement has been replaced", text: "A newer signed statement exists for this check. Ask the supplier for the latest one." },
  revoked: { tone: "r", title: "This statement has been withdrawn", text: "Do not rely on it." },
  evidence_changed: { tone: "r", title: "The evidence changed after signing", text: "The results behind this statement are no longer the ones that were signed. Do not rely on it until it is re-issued." },
};
const PAYER = { client: "the organisation using the tool", supplier: "the supplier of the tool", other: "a third party" } as const;
const REPLY = { offered: "offered", declined: "offered and declined", not_offered: "not offered" } as const;

/** Public page: no sign-in. Shows only what the signers chose to disclose. */
export function Verify({ code }: { code: string }) {
  const q = useLoad(() => api<VerifyResult>(`/api/verify/${encodeURIComponent(code)}`, { auth: false }), [code]);
  const v = q.data;
  return (
    <div className="wrap main stack-lg" style={{ maxWidth: 820 }}>
      <a className="brand" href="#/" style={{ alignSelf: "flex-start" }}><span className="logo"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7" /></svg></span>Assurance</a>
      <h1 style={{ margin: 0 }}>Check a signed assessment</h1>
      {q.loading && !v && <PageSkeleton />}
      {q.error && !v && (/not found/i.test((q.error as Error).message)
        ? <div className="notice error"><div><strong>No statement found for this code.</strong> Check the code or link you were given. If it came from a supplier and you cannot find it here, treat it as unverified.</div></div>
        : <ErrorNotice error={q.error} />)}
      {v && (() => {
        const st = STATE[v.state];
        return (
          <>
            <div className={"notice " + (st.tone === "g" ? "ok" : st.tone === "a" ? "warn" : "error")} role="status">
              <div><strong>{st.title}.</strong> {st.text}{v.revokedReason && <> Reason given: {v.revokedReason}</>}</div>
            </div>
            <section className="card stack">
              <div className="row spread" style={{ alignItems: "flex-start" }}>
                <div className="stack">
                  <div className="eyebrow">{v.client ?? "Client not named"}{v.sector ? ` · ${SECTOR_LABEL[v.sector] ?? v.sector}` : ""}</div>
                  <h2 style={{ margin: 0 }}>{v.tool}</h2>
                  <p style={{ margin: 0, fontWeight: 600 }}>{v.headline}</p>
                  <p className="small muted" style={{ margin: 0 }}>Evidence: {MODE_LABEL[v.evidenceMode] ?? v.evidenceMode}, {v.attempts} test attempts · test pack {v.pack.name} v{v.pack.version}</p>
                </div>
                <LightChip light={v.light} label={v.light === "green" ? "Green" : v.light === "amber" ? "Amber" : "Red"} />
              </div>
              {!v.pack.ratified && <div className="notice warn"><div>This assessment used a <strong>draft test pack</strong> that an independent advisory panel has not yet approved. Treat it as an engineering evidence pack, not a certification.</div></div>}
              <div className="table-wrap"><table><thead><tr><th>Area</th><th>Result</th></tr></thead><tbody>{v.areas.map((a) => <tr key={a.label}><td>{a.label}</td><td><StatusChip status={a.status} /></td></tr>)}</tbody></table></div>
            </section>
            <section className="card stack">
              <h3 style={{ margin: 0 }}>Who signed it and on what terms</h3>
              <ul className="stack" style={{ margin: 0, paddingLeft: "1.2em" }}>
                {v.signedBy.map((p) => <li key={p.role}><strong>{p.name}</strong>, {p.role.toLowerCase()}</li>)}
                <li>Signed {fmtDay(v.issuedAt)}; valid until {fmtDay(v.validUntil)} for the tested version only.</li>
                <li>Paid for by {PAYER[v.declarations.payer]}. Fee: {v.declarations.feeBasis === "fixed" ? "fixed, not dependent on the result" : "not fixed"}.</li>
                <li>Other work for this organisation in the last 12 months: {v.declarations.priorWork}.</li>
                <li>Supplier right of reply: {REPLY[v.declarations.rightOfReply]}.</li>
              </ul>
              <p className="small muted" style={{ margin: 0 }}>Signature hash <code style={{ wordBreak: "break-all" }}>{v.contentHash}</code></p>
            </section>
            <p className="small muted"><Icon name="alert" width={14} height={14} /> This is sample-based testing of how the tool replied under test conditions. It is not a guarantee that the tool is safe and it is not legal advice. Real use can differ.</p>
          </>
        );
      })()}
    </div>
  );
}
