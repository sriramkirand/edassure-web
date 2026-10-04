import { useEffect, useState, type FormEvent } from "react";
import { Collapse, ErrorNotice, Field, Notice, PageSkeleton, SelectField, TextField } from "../components/ui";
import { api } from "../lib/api";
import { useLoad } from "../lib/hooks";
import { keys } from "../lib/keys";
import { navigate } from "../lib/router";
import { canOperate, useUser } from "../lib/session";
import { PROFILE_LABEL, SECTORS } from "../lib/format";
import type { Audience, Department, Mode, Org, Pack } from "../lib/types";
import { judgeKeys } from "./run/ManualPanel";

type Kind = "mock-safe" | "mock-unsafe" | "openai" | "anthropic" | "http";
const MODES: [Mode, string, string][] = [
  ["api", "Direct connection", "We send the tests straight to the tool using a test key or test endpoint the supplier gives us."],
  ["manual", "Manual capture", "The tool has no API. We paste each test message into its chat window and paste the reply back."],
  ["import", "Imported spreadsheet", "The client or supplier fills in a spreadsheet of the tool's replies. Lower assurance, because we did not capture them."],
];
const blank = { base: "https://api.openai.com/v1", model: "", key: "", system: "", url: "", tpl: '{"query": "{{message}}", "history": "{{history}}"}', path: "" };

export function NewRun() {
  const user = useUser();
  const { data, error, loading } = useLoad(async () => {
    const [packs, orgs, departments] = await Promise.all([api<Pack[]>("/api/packs"), api<Org[]>("/api/orgs"), api<Department[]>("/api/departments")]);
    return { packs, orgs, departments };
  }, []);
  if (!canOperate(user)) return <ErrorNotice error={new Error("Your role cannot create checks.")} />;
  if (loading) return <PageSkeleton />;
  if (error || !data) return <ErrorNotice error={error ?? new Error("Could not load")} />;
  return <Form packs={data.packs} orgs={data.orgs} departments={data.departments} />;
}

const EDU_PACK = "edu-genai-seed", CORE_PACK = "core-genai-seed";
const audiencesFor = (sector: string): Audience[] => (sector === "education" ? ["learner", "teacher"] : ["public", "staff", "vulnerable"]);

function Form({ packs, orgs, departments }: { packs: Pack[]; orgs: Org[]; departments: Department[] }) {
  const user = useUser();
  const [tool, setTool] = useState(""), [orgId, setOrgId] = useState(""), [client, setClient] = useState("");
  const [use, setUse] = useState(""), [age, setAge] = useState(""), [assessor, setAssessor] = useState(user.name), [reviewer, setReviewer] = useState("");
  const [mode, setMode] = useState<Mode>("api"), [kind, setKind] = useState<Kind>("mock-safe"), [t, setT] = useState(blank), [mlabel, setMlabel] = useState("");
  const [sector, setSector] = useState(""), [deptId, setDeptId] = useState(""), [affects, setAffects] = useState<"information" | "decisions">("information");
  const [packId, setPackId] = useState(packs.find((p) => p.id === CORE_PACK)?.id ?? packs[0]?.id ?? ""), [profile, setProfile] = useState(""), [repeats, setRepeats] = useState(3);
  const pack = packs.find((p) => p.id === packId)!;
  const [areas, setAreas] = useState<string[]>(pack?.areas ?? []);
  const [jKind, setJKind] = useState<"" | "openai" | "anthropic">(""), [j, setJ] = useState(blank);
  const [busy, setBusy] = useState(false), [err, setErr] = useState<unknown>(null);

  useEffect(() => setAreas(pack?.areas ?? []), [packId]); // eslint-disable-line react-hooks/exhaustive-deps
  // Recommend the test pack from the sector; the assessor can still override it under "Test pack".
  useEffect(() => {
    if (!sector) return;
    const want = sector === "education" ? EDU_PACK : CORE_PACK;
    if (packs.some((p) => p.id === want)) setPackId(want);
    setProfile("");
  }, [sector]); // eslint-disable-line react-hooks/exhaustive-deps
  const deptOptions = departments.filter((d) => !orgId || d.orgId === orgId);
  const pickMode = (m: Mode) => { setMode(m); setRepeats(m === "api" ? 3 : 1); };
  const tset = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setT({ ...t, [k]: e.target.value });
  const jset = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement>) => setJ({ ...j, [k]: e.target.value });

  function cfg(k: string, f: typeof blank, withSystem: boolean) {
    if (k === "mock-safe" || k === "mock-unsafe") return { type: "mock", mode: k === "mock-unsafe" ? "unsafe" : "safe" };
    if (k === "openai") return { type: "openai", baseUrl: f.base, model: f.model, system: withSystem ? f.system || undefined : undefined };
    if (k === "anthropic") return { type: "anthropic", model: f.model, system: withSystem ? f.system || undefined : undefined };
    let tpl: unknown; try { tpl = JSON.parse(f.tpl); } catch { throw new Error("The request template is not valid JSON."); }
    return { type: "http", url: f.url, requestTemplate: tpl, responsePath: f.path };
  }

  async function submit(e: FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true);
    try {
      if (!areas.length) throw new Error("Select at least one area.");
      const created = await api<{ id: string }>("/api/runs", { method: "POST", body: {
        packId, repeats, areas, mode, profile: profile || undefined, orgId: orgId || undefined, sector: sector || undefined, departmentId: deptId || undefined, affects,
        target: mode === "api" ? cfg(kind, t, true) : { label: mlabel },
        judge: jKind ? cfg(jKind, j, false) : undefined,
        meta: { client, tool, intendedUse: use, ageRange: age, assessor, reviewer },
      } });
      if (mode === "api") keys.set(created.id, { apiKey: t.key, judgeApiKey: j.key });
      else if (j.key) judgeKeys[created.id] = j.key;
      navigate("/runs/" + created.id + (mode === "api" ? "?go=1" : ""));
    } catch (ex) { setErr(ex); setBusy(false); }
  }

  const needsConn = (k: Kind) => k === "openai" || k === "anthropic" || k === "http";
  return (
    <form className="stack-lg" onSubmit={submit}>
      <div className="stack"><h1>New check</h1><p className="muted">Set up the tool, choose how we will test it, then start.</p></div>

      <section className="card stack">
        <h2>The AI tool</h2>
        <Field label="Tool name" required value={tool} onChange={(e) => setTool(e.target.value)} placeholder="e.g. Acme Virtual Assistant" />
        <div className="grid">
          <SelectField label="Sector" required value={sector} onChange={(e) => setSector(e.target.value)} hint="Chooses the recommended test pack. Education uses the DfE-based pack; every other sector uses the Universal Core.">
            <option value="">(choose)</option>{SECTORS.map((x) => <option key={x.key} value={x.key}>{x.label}: {x.blurb}</option>)}
          </SelectField>
          <SelectField label="Department" value={deptId} onChange={(e) => setDeptId(e.target.value)} hint="Which team uses it, for example HR or Customer Services. Add departments under Administration.">
            <option value="">(none)</option>{deptOptions.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.orgName})</option>)}
          </SelectField>
        </div>
        <div className="grid">
          <SelectField label="Client organisation" value={orgId} onChange={(e) => setOrgId(e.target.value)} hint="Decides who can see the result once you publish it. Add organisations under Administration.">
            <option value="">(none yet)</option>{orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </SelectField>
          <Field label="Client name for the report" value={client} onChange={(e) => setClient(e.target.value)} placeholder="if different from the organisation" />
          <Field label="Intended use" value={use} onChange={(e) => setUse(e.target.value)} placeholder="e.g. answering citizens' questions" />
          <Field label="Who uses it? (ages, roles)" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. adults, HR staff, ages 11-14" />
          <Field label="Assessor" value={assessor} onChange={(e) => setAssessor(e.target.value)} />
          <Field label="Reviewer" value={reviewer} onChange={(e) => setReviewer(e.target.value)} />
        </div>
      </section>

      <section className="card stack">
        <h2>How will we test it?</h2>
        <div className="stack">
          {MODES.map(([v, title, desc]) => (
            <label key={v} className="choice"><input type="radio" name="mode" checked={mode === v} onChange={() => pickMode(v)} /><span><strong>{title}</strong><br /><span className="muted small">{desc}</span></span></label>
          ))}
        </div>
        <Collapse open={mode === "api"}>
          <div className="stack" style={{ paddingTop: 6 }}>
            <SelectField label="How do we reach the tool?" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
              <option value="mock-safe">Demo: mock tool (safe)</option><option value="mock-unsafe">Demo: mock tool (unsafe)</option>
              <option value="openai">OpenAI-compatible chat API</option><option value="anthropic">Anthropic API</option><option value="http">Custom HTTP endpoint</option>
            </SelectField>
            {kind === "openai" && <Field label="Base URL" value={t.base} onChange={tset("base")} />}
            {(kind === "openai" || kind === "anthropic") && <Field label="Model ID" required={mode === "api"} value={t.model} onChange={tset("model")} />}
            {kind === "http" && <>
              <Field label="Endpoint URL (https)" required={mode === "api"} value={t.url} onChange={tset("url")} />
              <TextField label={'Request JSON template (use "{{message}}" and "{{history}}")'} rows={4} value={t.tpl} onChange={tset("tpl")} />
              <Field label="Response path" required={mode === "api"} value={t.path} onChange={tset("path")} placeholder="e.g. data.answer" />
            </>}
            {needsConn(kind) && <Field label="API key" type="password" autoComplete="off" value={t.key} onChange={tset("key")} hint="Kept in this tab's memory only. It is sent with each request and never stored on the server." />}
            {(kind === "openai" || kind === "anthropic") && <TextField label="System prompt / tool configuration (optional)" rows={3} value={t.system} onChange={tset("system")} hint="Paste the tool's real configuration so the test matches what pupils get." />}
          </div>
        </Collapse>
        <Collapse open={mode !== "api"}>
          <div style={{ paddingTop: 6 }}><Field label="Which product or interface? (optional)" value={mlabel} onChange={(e) => setMlabel(e.target.value)} placeholder="e.g. Acme Tutor web chat, test account" /></div>
        </Collapse>
        <Notice kind="info">Only test systems you are authorised to test, and never use real personal data.</Notice>
      </section>

      <section className="card stack">
        <h2>What we test</h2>
        <div className="grid">
          <SelectField label="Test pack" value={packId} onChange={(e) => setPackId(e.target.value)}>{packs.map((p) => <option key={p.id} value={p.id}>{p.name} v{p.version} ({p.cases} cases)</option>)}</SelectField>
          <SelectField label="Who does it talk to?" value={profile} onChange={(e) => setProfile(e.target.value)} hint={sector === "education" ? "Learner-facing tutors should give hints, not final answers, and avoid human-like wording (DfE standards). Teacher-facing tools should give direct answers." : "Choose the group it mainly serves, or leave as all cases."}>
            <option value="">Not sure / all cases</option>{audiencesFor(sector).map((a) => <option key={a} value={a}>{PROFILE_LABEL[a]}</option>)}
          </SelectField>
          <SelectField label="What does it affect?" value={affects} onChange={(e) => setAffects(e.target.value as "information" | "decisions")}>
            <option value="information">Information only (answers questions, drafts, summaries)</option><option value="decisions">Decisions about people (hiring, benefits, triage, credit)</option>
          </SelectField>
        </div>
        {affects === "decisions" && <Notice kind="warn">Tools that affect decisions about people also need fairness testing (matched prompts that differ only in a protected characteristic). That is planned but not in this test pack yet, so the report will list it as <strong>not assessed</strong>.</Notice>}
        <div><span className="lbl" style={{ fontWeight: 600, fontSize: ".88rem", display: "block", marginBottom: 6 }}>Areas</span>
          {pack?.areas.map((a) => <label key={a} className="check"><input type="checkbox" checked={areas.includes(a)} onChange={() => setAreas(areas.includes(a) ? areas.filter((x) => x !== a) : [...areas, a])} />{a.replace(/_/g, " ")}</label>)}
        </div>
        <Field label="Repeats per case (1–5)" type="number" min={1} max={5} value={repeats} onChange={(e) => setRepeats(Number(e.target.value))} style={{ maxWidth: 140 }} hint="AI answers vary, so direct runs repeat each case. Manual and import runs default to 1." />
      </section>

      <section className="card stack">
        <h2>Judge model <span className="muted small" style={{ fontWeight: 400 }}>(optional)</span></h2>
        <p className="muted small">Scores written criteria such as "does not flatter". Not yet checked against human marks, so treat its verdicts as advisory. Without one, those checks go to human review.</p>
        <SelectField label="Judge" value={jKind} onChange={(e) => setJKind(e.target.value as "" | "openai" | "anthropic")}>
          <option value="">None (send to human review)</option><option value="openai">OpenAI-compatible chat API</option><option value="anthropic">Anthropic API</option>
        </SelectField>
        <Collapse open={!!jKind}>
          <div className="stack" style={{ paddingTop: 6 }}>
            {jKind === "openai" && <Field label="Base URL" value={j.base} onChange={jset("base")} />}
            <Field label="Model ID" value={j.model} onChange={jset("model")} />
            <Field label="Judge API key" type="password" autoComplete="off" value={j.key} onChange={jset("key")} hint="Memory only." />
          </div>
        </Collapse>
      </section>

      {err ? <ErrorNotice error={err} /> : null}
      <div className="row"><button className="btn" type="submit" disabled={busy || !tool.trim() || !sector}>{busy ? "Creating…" : mode === "api" ? "Create and start" : "Create check"}</button><a className="btn ghost" href="#/">Cancel</a></div>
    </form>
  );
}
