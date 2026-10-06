import { Icon } from "../../components/Icon";
import { Empty } from "../../components/ui";
import { api } from "../../lib/api";
import { fmtDate } from "../../lib/format";
import { useLoad } from "../../lib/hooks";
import { useFeedback } from "../../lib/toast";
import type { Artifact, Run } from "../../lib/types";

/** Shown for "engine" runs: how to run open-source tools on an assessor's computer, and what has come back so far. */
export function EnginePanel({ run, pending, onRefresh }: { run: Run; pending: number; onRefresh: () => Promise<void> | void }) {
  const { toast } = useFeedback();
  const arts = useLoad(() => api<Artifact[]>(`/api/runs/${run.id}/artifacts`), [run.id, pending]);
  const apiBase = window.EDASSURE_CONFIG?.apiBase || "https://YOUR-API-ADDRESS";
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); toast("Copied"); } catch { toast("Copy failed: select the text and copy it", "error"); } };

  const setup = `export EDASSURE_URL=${apiBase}\nexport EDASSURE_EMAIL=you@example.org        # your assessor account\nexport EDASSURE_PASSWORD=...                 # type it yourself; never paste it into chat or tickets\nexport OPENAI_API_KEY=...                    # key for the tool under test (stays on your computer)`;
  const runCmd = `node tools/bridge/cli.mjs run --run ${run.id} --target openai --model MODEL_ID`;
  const redCmd = `node tools/bridge/cli.mjs redteam --run ${run.id} --target openai --model MODEL_ID --purpose "what this tool is for"`;
  const block = (title: string, text: string, note?: string) => (
    <div className="stack">
      <div className="row spread"><strong className="small">{title}</strong><button className="btn ghost sm" onClick={() => void copy(text)}><Icon name="copy" width={14} height={14} />Copy</button></div>
      <pre className="mono-box" style={{ margin: 0 }}>{text}</pre>{note && <p className="small muted" style={{ margin: 0 }}>{note}</p>}
    </div>
  );

  return (
    <section className="card stack enter">
      <div className="stack">
        <h2>Run it with open-source engines</h2>
        <p className="muted">This check is run on <strong>your own computer</strong> with Promptfoo. The tool's replies come back here, are scored by the same checks as every other mode, and sensitive ones go to human review. Your key for the tool never leaves your computer.</p>
      </div>
      <ol className="stack" style={{ margin: 0, paddingLeft: "1.2em" }}>
        <li>{block("Once per session, in a terminal inside the edassure-api folder (Node 22.18 or newer)", setup)}</li>
        <li>{block("Run the tests", runCmd, "Swap openai for anthropic or http (see tools/bridge/README.md). Promptfoo is downloaded and pinned automatically the first time.")}</li>
        <li>{block("Optional: adversarial (red-team) testing", redCmd, "Needs an attacker model such as an OpenAI key. Findings arrive as candidates that a person must confirm.")}</li>
      </ol>
      <div className="notice info">Only test systems you are authorised to test, and never use real personal data. Attack testing can produce harmful text; it is stored with access controls and is not published.</div>
      <div className="row spread">
        <span className="small muted">{pending > 0 ? `${pending} test(s) still waiting for results.` : "All tests have results."}</span>
        <button className="btn ghost sm" onClick={() => void onRefresh()}>Refresh</button>
      </div>
      <div className="stack">
        <strong className="small">Evidence fingerprints</strong>
        {arts.data?.length ? (
          <div className="table-wrap"><table><thead><tr><th>Tool</th><th>Kind</th><th>File</th><th>SHA-256</th><th>Received</th></tr></thead>
            <tbody>{arts.data.map((a) => <tr key={a.id}><td>{a.tool} {a.toolVersion}</td><td>{a.kind}</td><td>{a.filename}</td><td><code>{a.sha256?.slice(0, 16)}…</code></td><td className="muted">{fmtDate(a.createdAt)}</td></tr>)}</tbody></table></div>
        ) : <Empty icon="file" title="Nothing received yet">After you run the command, the engine's output fingerprint appears here. Keep the raw file: it can be re-checked against this hash.</Empty>}
      </div>
    </section>
  );
}
