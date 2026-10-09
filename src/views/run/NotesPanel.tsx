import { useState } from "react";
import { Notice, SelectField, TextField, Field } from "../../components/ui";
import { api } from "../../lib/api";
import { useFeedback } from "../../lib/toast";
import type { Finding, NoteView, NotesResponse } from "../../lib/types";

const RESPONSES: [string, string][] = [["", "(no position stated)"], ["agrees", "Agrees with the finding"], ["disagrees", "Disagrees with the finding"], ["will_fix", "Will fix"], ["already_fixed", "Says it has already been fixed"]];

/** Recommended fix per finding and the supplier's response. Shown in the report; a finding is never changed by a reply. */
export function NotesPanel({ runId, findings, data, canEdit, onSaved }: { runId: string; findings: Finding[]; data: NotesResponse; canEdit: boolean; onSaved: () => Promise<void> | void }) {
  const byCase = new Map(data.notes.map((n) => [n.caseId, n]));
  const edit = canEdit && !data.locked;
  return (
    <div className="stack">
      <p className="muted small">Each failed test gets a recommended fix (a suggestion is used if you write nothing). Record the supplier's reply beside it, word for word. The finding itself never changes because of a reply.</p>
      {data.locked && <Notice kind="info">A signed statement is drafted or issued for this check, so fixes and responses are locked. Cancel the draft or revoke the statement to change them.</Notice>}
      <NoteCard key={"overall" + (byCase.get("")?.reply?.recordedAt ?? "")} runId={runId} caseId="" title="Supplier's overall response" note={byCase.get("") ?? null} suggestion="" edit={edit} onSaved={onSaved} />
      {findings.map((f) => <NoteCard key={f.caseId + (byCase.get(f.caseId)?.reply?.recordedAt ?? "") + (byCase.get(f.caseId)?.remediationAt ?? "")} runId={runId} caseId={f.caseId} title={`${f.caseId} · ${f.area.replace(/_/g, " ")} · ${f.severity}`} detail={f.reason} note={byCase.get(f.caseId) ?? null} suggestion={data.suggestions[f.caseId] ?? ""} edit={edit} onSaved={onSaved} />)}
    </div>
  );
}

function NoteCard({ runId, caseId, title, detail, note, suggestion, edit, onSaved }: { runId: string; caseId: string; title: string; detail?: string; note: NoteView | null; suggestion: string; edit: boolean; onSaved: () => Promise<void> | void }) {
  const { toast } = useFeedback();
  const [fix, setFix] = useState(note?.remediation ?? "");
  const [resp, setResp] = useState(note?.reply?.response ?? "");
  const [who, setWho] = useState(note?.reply?.respondent ?? "");
  const [text, setText] = useState(note?.reply?.text ?? "");
  const [busy, setBusy] = useState(false);
  const overall = caseId === "";
  async function save() {
    setBusy(true);
    try {
      const hasReply = !!(resp || who.trim() || text.trim());
      await api(`/api/runs/${runId}/notes/${overall ? "_overall" : encodeURIComponent(caseId)}`, { method: "PUT", body: { ...(overall ? {} : { remediation: fix }), reply: hasReply ? { response: resp || null, respondent: who, text } : null } });
      toast("Saved"); await onSaved();
    } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); }
  }
  return (
    <div className="card stack">
      <strong>{title}</strong>
      {detail && <p className="small muted" style={{ margin: 0 }}>Technical detail: {detail}</p>}
      {!overall && (edit ? (
        <>
          <TextField label="Recommended fix" rows={3} value={fix} onChange={(e) => setFix(e.target.value)} placeholder={suggestion} hint="Leave blank to use the suggested wording shown in grey." />
          {suggestion && !fix && <div><button type="button" className="btn ghost sm" onClick={() => setFix(suggestion)}>Use the suggestion as a starting point</button></div>}
        </>
      ) : <p style={{ margin: 0 }}><strong>Recommended fix{note?.remediation ? "" : " (suggested)"}:</strong> {note?.remediation ?? suggestion}</p>)}
      {edit ? (
        <div className="stack">
          <div className="grid">
            <SelectField label="Supplier's position" value={resp} onChange={(e) => setResp(e.target.value)}>{RESPONSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</SelectField>
            <Field label="Who responded (name, role)" value={who} onChange={(e) => setWho(e.target.value)} maxLength={120} />
          </div>
          <TextField label="Supplier's response (their words)" rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
          <div className="row"><button className="btn" disabled={busy} onClick={() => void save()}>Save</button></div>
        </div>
      ) : note?.reply && <p style={{ margin: 0 }}><strong>Supplier response</strong>{note.reply.respondent ? ` (${note.reply.respondent})` : ""}: {note.reply.text}</p>}
    </div>
  );
}
