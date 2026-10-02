import { api, session } from "./api.js";
import { judgeKeys, manualPanel } from "./manual.js";
import { errBox, fmtDate, h, MODE_LABEL, mount, note, pct, renderSummary, saveBlob } from "./ui.js";

const memoryKeys = {}; // runId -> { apiKey, judgeApiKey }   (never persisted)
let driving = null;    // run id this tab is currently executing
const isStaff = () => session.user.role !== "client";
const canOperate = () => ["admin", "assessor"].includes(session.user.role);
const targetText = (t) => (t.type === "manual" ? (t.label ? `manual: ${t.label}` : "manual") : t.type + (t.model ? " / " + t.model : t.mode ? " / " + t.mode : ""));

// ---------- list ----------
export async function runsView() {
  const client = !isStaff();
  mount(h("h1", {}, client ? "Your AI tool checks" : "Runs"), h("p", { class: "muted" }, "Loading…"));
  try {
    const runs = await api("/api/runs");
    const table = runs.length
      ? h("table", {}, h("thead", {}, h("tr", {}, (client ? ["Date", "Tool", "Product type", ""] : ["Created", "Tool", "Client", "How tested", "Progress", "Shared with client", ""]).map((t) => h("th", {}, t)))),
        h("tbody", {}, runs.map((r) => h("tr", {},
          h("td", {}, fmtDate(r.createdAt)), h("td", {}, r.meta.tool),
          ...(client ? [h("td", {}, r.meta.profile ? r.meta.profile + "-facing" : "all")]
            : [h("td", {}, r.orgName || r.meta.client), h("td", {}, MODE_LABEL[r.mode] || r.mode), h("td", { class: "n" }, `${r.done}/${r.total}`), h("td", {}, r.publishedAt ? "Yes" : "No")]),
          h("td", {}, h("a", { href: "#/runs/" + r.id }, "Open"))))))
      : h("p", { class: "muted" }, client ? "Nothing has been shared with you yet." : "No runs yet.");
    mount(h("div", { class: "row" }, h("h1", {}, client ? "Your AI tool checks" : "Runs"), canOperate() && h("a", { class: "btn right", href: "#/new" }, "New run")), table);
  } catch (e) { if (e.status !== 401) mount(h("h1", {}, "Runs"), errBox(e)); }
}

// ---------- new run ----------
export async function newView() {
  if (!canOperate()) { mount(h("h1", {}, "New run"), errBox({ message: "Your role cannot create runs." })); return; }
  let packs, orgs;
  try { [packs, orgs] = await Promise.all([api("/api/packs"), api("/api/orgs")]); } catch (e) { if (e.status !== 401) mount(h("h1", {}, "New run"), errBox(e)); return; }

  const f = {};
  const field = (id, label, attrs = {}) => { f[id] = h("input", { id, ...attrs }); return [h("label", { for: id }, label), f[id]]; };
  const targetFields = h("div"), judgeFields = h("div");
  const typeSel = h("select", { id: "ttype" },
    h("option", { value: "mock-safe" }, "Demo: mock tool (safe)"), h("option", { value: "mock-unsafe" }, "Demo: mock tool (unsafe)"),
    h("option", { value: "openai" }, "OpenAI-compatible chat API"), h("option", { value: "anthropic" }, "Anthropic API"), h("option", { value: "http" }, "Custom HTTP endpoint"));
  const judgeType = h("select", { id: "jtype" }, h("option", { value: "" }, "None (rubric checks go to human review)"),
    h("option", { value: "openai" }, "OpenAI-compatible chat API"), h("option", { value: "anthropic" }, "Anthropic API"));
  const modeRadios = [
    ["api", "Direct connection", "We send the tests straight to the tool using a test key or test endpoint the supplier gives us."],
    ["manual", "Manual capture", "The tool has no API. We paste each test message into its chat window and paste the reply back."],
    ["import", "Imported spreadsheet", "The client or supplier fills in a spreadsheet of the tool's replies. Lower assurance, because we did not capture them."],
  ].map(([v, t, d]) => h("label", { class: "choice" }, h("input", { type: "radio", name: "mode", value: v, checked: v === "api" }), h("span", {}, h("strong", {}, t), h("br"), h("span", { class: "muted small" }, d))));
  const apiBlock = h("div"), manualBlock = h("div", { class: "hidden" }, ...field("mlabel", "Which product or interface? (optional)", { placeholder: "e.g. Acme Tutor web chat, test account" }));
  const modeNow = () => document.querySelector("input[name=mode]:checked").value;

  function drawFields(container, prefix, kind) {
    for (const key of Object.keys(f)) if (key.startsWith(prefix + "_")) delete f[key];
    const k = (n) => prefix + "_" + n, parts = [];
    if (kind === "openai") parts.push(...field(k("base"), "Base URL", { value: "https://api.openai.com/v1" }), ...field(k("model"), "Model ID", { required: true }), ...field(k("key"), "API key (kept in this tab's memory only)", { type: "password", autocomplete: "off" }));
    if (kind === "anthropic") parts.push(...field(k("model"), "Model ID", { required: true }), ...field(k("key"), "API key (kept in this tab's memory only)", { type: "password", autocomplete: "off" }));
    if (kind === "http") parts.push(...field(k("url"), "Endpoint URL (https)", { required: true }),
      h("label", { for: k("tpl") }, 'Request JSON template (use "{{message}}" and "{{history}}")'), (f[k("tpl")] = h("textarea", { id: k("tpl"), rows: 4 }, '{"query": "{{message}}", "history": "{{history}}"}')),
      ...field(k("path"), "Response path (e.g. data.answer)", { required: true }), ...field(k("key"), "Bearer key, if needed (memory only)", { type: "password", autocomplete: "off" }));
    if ((kind === "openai" || kind === "anthropic") && prefix === "t") parts.push(h("label", { for: k("sys") }, "System prompt / tool configuration (optional; use the tool's real one)"), (f[k("sys")] = h("textarea", { id: k("sys"), rows: 3 })));
    container.replaceChildren(...parts);
  }
  const redraw = () => { drawFields(targetFields, "t", typeSel.value.startsWith("mock") ? "" : typeSel.value); drawFields(judgeFields, "j", judgeType.value); };
  typeSel.addEventListener("change", redraw); judgeType.addEventListener("change", redraw);
  apiBlock.append(h("label", { for: "ttype" }, "How do we reach the tool?"), typeSel, targetFields);
  document.addEventListener("change", function onMode(e) {
    if (!document.body.contains(apiBlock)) { document.removeEventListener("change", onMode); return; }
    if (e.target.name === "mode") {
      apiBlock.classList.toggle("hidden", modeNow() !== "api"); manualBlock.classList.toggle("hidden", modeNow() === "api");
      if (f.repeats) f.repeats.value = modeNow() === "api" ? 3 : 1;
    }
  });

  const packSel = h("select", { id: "pack" }, packs.map((p) => h("option", { value: p.id }, `${p.name} v${p.version} (${p.cases} cases)`)));
  const profileSel = h("select", { id: "profile" }, h("option", { value: "" }, "Not sure / all cases"), h("option", { value: "learner" }, "Learner-facing (pupils use it directly)"), h("option", { value: "teacher" }, "Teacher-facing (staff use it)"));
  const orgSel = h("select", { id: "org" }, h("option", { value: "" }, "(none yet)"), orgs.map((o) => h("option", { value: o.id }, o.name)));
  const areaBox = h("div");
  const drawAreas = () => { const p = packs.find((x) => x.id === packSel.value); areaBox.replaceChildren(...p.areas.map((a) => h("label", { class: "inline" }, h("input", { type: "checkbox", name: "area", value: a, checked: true }), a))); };
  packSel.addEventListener("change", drawAreas);

  const msg = h("div");
  const form = h("form", { onsubmit: async (e) => {
    e.preventDefault(); msg.replaceChildren();
    const val = (id) => (f[id] ? f[id].value.trim() : "");
    const cfg = (prefix, kind) => {
      if (kind === "mock-safe" || kind === "mock-unsafe") return { type: "mock", mode: kind === "mock-unsafe" ? "unsafe" : "safe" };
      if (kind === "openai") return { type: "openai", baseUrl: val(prefix + "_base"), model: val(prefix + "_model"), system: val(prefix + "_sys") || undefined };
      if (kind === "anthropic") return { type: "anthropic", model: val(prefix + "_model"), system: val(prefix + "_sys") || undefined };
      if (kind === "http") { let tpl; try { tpl = JSON.parse(val(prefix + "_tpl")); } catch { throw new Error("Request template is not valid JSON"); } return { type: "http", url: val(prefix + "_url"), requestTemplate: tpl, responsePath: val(prefix + "_path") }; }
      return null;
    };
    try {
      const mode = modeNow();
      const areas = [...areaBox.querySelectorAll("input[name=area]:checked")].map((i) => i.value);
      if (!areas.length) throw new Error("Select at least one area");
      const created = await api("/api/runs", { method: "POST", body: {
        packId: packSel.value, repeats: Number(f.repeats.value) || 1, areas, profile: profileSel.value || undefined, mode, orgId: orgSel.value || undefined,
        target: mode === "api" ? cfg("t", typeSel.value) : { label: val("mlabel") }, judge: judgeType.value ? cfg("j", judgeType.value) : undefined,
        meta: { client: val("client"), tool: val("tool"), intendedUse: val("use"), ageRange: val("age"), assessor: val("assessor"), reviewer: val("reviewer") },
      } });
      if (mode === "api") memoryKeys[created.id] = { apiKey: val("t_key"), judgeApiKey: val("j_key") };
      else if (val("j_key")) judgeKeys[created.id] = val("j_key");
      location.hash = "#/runs/" + created.id + (mode === "api" ? "?go=1" : "");
    } catch (err) { msg.replaceChildren(errBox(err)); }
  } },
    h("h2", {}, "The AI tool"), ...field("tool", "Tool name", { required: true }),
    h("div", { class: "grid" }, h("div", {}, h("label", { for: "org" }, "Client organisation"), orgSel, h("p", { class: "small muted" }, "Decides who can see the results once published. Add organisations under Administration.")),
      h("div", {}, ...field("client", "Client name for the report", { placeholder: "if different from the organisation" }))),
    h("div", { class: "grid" }, h("div", {}, ...field("use", "Intended use", { placeholder: "e.g. homework helper" })), h("div", {}, ...field("age", "Age range", { placeholder: "e.g. 11-14" }))),
    h("div", { class: "grid" }, h("div", {}, ...field("assessor", "Assessor", { value: session.user.name })), h("div", {}, ...field("reviewer", "Reviewer"))),
    h("h2", {}, "How will we test it?"), h("div", { class: "choices" }, modeRadios), apiBlock, manualBlock,
    note("Only test systems you are authorised to test, and never use real pupil data. Keys are sent with each request and are not stored by the server."),
    h("h2", {}, "Test pack"), h("label", { for: "pack" }, "Pack"), packSel,
    h("label", { for: "profile" }, "What kind of product is it?"), profileSel,
    h("p", { class: "muted small" }, 'Learner-facing tutors are expected to give hints, not final answers, and to avoid human-like wording (DfE standards). Teacher-facing tools are expected to give direct answers. "All" runs every case.'),
    h("label", {}, "Areas"), areaBox,
    h("label", { for: "repeats" }, "Repeats per case (1-5)"), (f.repeats = h("input", { id: "repeats", type: "number", min: 1, max: 5, value: 3 })),
    h("h2", {}, "Judge model (optional)"), h("p", { class: "muted small" }, "Scores rubric checks. Not calibrated against human marks yet; treat results as advisory."), judgeType, judgeFields,
    h("p", {}, h("button", { type: "submit" }, "Create run")), msg);
  redraw(); drawAreas();
  mount(h("h1", {}, "New run"), form);
}

// ---------- run detail ----------
export async function runView(id, query) {
  let run;
  try { run = await api("/api/runs/" + id); } catch (e) { if (e.status !== 401) mount(h("p", {}, h("a", { href: "#/" }, "← Back")), errBox(e)); return; }
  const staff = isStaff();

  const bar = h("div", {}, h("div", { class: "progress", role: "progressbar" }, h("div")));
  const status = h("div", { class: "muted small" });
  const controls = h("div", { class: "row" });
  const resultsBox = h("div"), reviewBox = h("div"), keyBox = h("div"), errEl = h("div"), manualBox = h("div"), shareBox = h("div");
  let lastProgress = run.progress;
  const needsKeyNow = () => run.mode === "api" && run.target.type !== "mock" && !memoryKeys[id];

  const updateProgress = (p) => {
    lastProgress = p;
    bar.firstChild.firstChild.style.width = (p.total ? (100 * p.done) / p.total : 0) + "%";
    bar.firstChild.setAttribute("aria-valuenow", String(p.done)); bar.firstChild.setAttribute("aria-valuemax", String(p.total));
    status.textContent = `${p.done} of ${p.total} tests complete` + (driving === id ? " (running)" : "");
  };
  updateProgress(run.progress);

  async function refreshResults() {
    try {
      const { evaluation: ev, summary, progress } = await api(`/api/runs/${id}/results`);
      updateProgress(progress);
      resultsBox.replaceChildren(ev.areas.length ? renderSummary(summary) : null, renderResults(ev, staff));
    } catch (e) { if (e.status !== 401) resultsBox.replaceChildren(errBox(e)); }
  }
  async function refreshReview() {
    if (!staff) return;
    try { reviewBox.replaceChildren(renderReview(await api(`/api/runs/${id}/attempts?needs_review=1`), id, async () => { await refreshReview(); await refreshResults(); })); }
    catch (e) { if (e.status !== 401) reviewBox.replaceChildren(errBox(e)); }
  }
  const refreshAll = async () => { await refreshResults(); await refreshReview(); drawControls(); };

  async function drive() {
    if (driving) return;
    driving = id; drawControls(); errEl.replaceChildren();
    let idle = 0;
    try {
      while (driving === id) {
        const k = memoryKeys[id] || {};
        const r = await api(`/api/runs/${id}/step`, { method: "POST", body: { batch: 3, apiKey: k.apiKey || undefined, judgeApiKey: k.judgeApiKey || undefined } });
        updateProgress(r);
        if (r.pending === 0) break;
        idle = r.processed === 0 ? idle + 1 : 0;
        if (idle > 5) throw new Error("No progress: attempts may be claimed by another session. Try again shortly.");
        if (r.processed === 0) await new Promise((res) => setTimeout(res, 2000));
      }
    } catch (e) { if (e.status !== 401) errEl.replaceChildren(errBox(e)); }
    driving = null; updateProgress(lastProgress); await refreshAll();
  }

  const dl = (label, path, ext) => h("button", { class: "secondary", onclick: async (e) => {
    const btn = e.currentTarget; btn.disabled = true;
    try {
      const blob = await (await api(path, { raw: true })).blob();
      if (ext === "html") window.open(URL.createObjectURL(new Blob([await blob.text()], { type: "text/html" })), "_blank", "noopener");
      else saveBlob(blob, "report." + ext);
    } catch (err) { errEl.replaceChildren(errBox(err)); } finally { btn.disabled = false; }
  } }, label);

  function drawControls() {
    const complete = lastProgress.pending === 0;
    const items = [];
    if (canOperate() && run.mode === "api") {
      items.push(driving === id ? h("button", { class: "secondary", onclick: () => { driving = null; drawControls(); } }, "Pause")
        : h("button", { disabled: complete || needsKeyNow(), onclick: drive }, complete ? "Complete" : lastProgress.done ? "Resume" : "Start"),
        h("button", { class: "secondary", onclick: async () => {
          try { const r = await api(`/api/runs/${id}/retry-errors`, { method: "POST" }); updateProgress((await api("/api/runs/" + id)).progress); drawControls(); errEl.replaceChildren(note(r.requeued + " errored attempt(s) re-queued")); }
          catch (e) { errEl.replaceChildren(errBox(e)); }
        } }, "Retry errored"));
    }
    items.push(h("span", { class: "right" }), dl("Report (HTML)", `/api/runs/${id}/report?format=html`, "html"), dl("Report (Markdown)", `/api/runs/${id}/report?format=md`, "md"));
    if (staff) items.push(dl("Evidence (JSONL)", `/api/runs/${id}/evidence.jsonl`, "jsonl"));
    if (canOperate()) items.push(h("button", { class: "danger", onclick: async () => { if (confirm("Delete this run and its evidence?")) { await api("/api/runs/" + id, { method: "DELETE" }); location.hash = "#/"; } } }, "Delete"));
    controls.replaceChildren(...items);
  }

  function drawKeyBox() {
    if (!needsKeyNow()) { keyBox.replaceChildren(); return; }
    const k1 = h("input", { type: "password", autocomplete: "off", id: "rk" });
    const k2 = run.judge && run.judge.type !== "mock" ? h("input", { type: "password", autocomplete: "off", id: "rjk" }) : null;
    keyBox.replaceChildren(h("div", { class: "card" }, h("p", {}, "This run needs an API key for the tool under test. Keys are held in memory only and are lost if you reload."),
      h("label", { for: "rk" }, "API key for the tool (leave blank if it needs none)"), k1, k2 && h("label", { for: "rjk" }, "API key for the judge"), k2,
      h("p", {}, h("button", { onclick: () => { memoryKeys[id] = { apiKey: k1.value, judgeApiKey: k2 ? k2.value : "" }; drawKeyBox(); drawControls(); } }, "Use key"))));
  }

  async function drawShare() {
    if (!canOperate()) return;
    let orgs = [];
    try { orgs = await api("/api/orgs"); } catch { /* ignore */ }
    const sel = h("select", { id: "shareorg" }, h("option", { value: "" }, "(choose organisation)"), orgs.map((o) => h("option", { value: o.id, selected: o.id === run.orgId }, o.name)));
    const msg = h("div");
    const act = (path, withOrg) => async () => {
      try { await api(path, { method: "POST", body: withOrg ? { orgId: sel.value || undefined } : {} }); run = await api("/api/runs/" + id); await drawShare(); }
      catch (e) { msg.replaceChildren(errBox(e)); }
    };
    shareBox.replaceChildren(h("div", { class: "card" }, h("strong", {}, "Share with the client"),
      h("p", { class: "small muted" }, run.publishedAt ? `Published ${fmtDate(run.publishedAt)} to ${run.orgName}. Their users can see the summary, results and report (not the raw transcripts or review notes).` : "Not shared. Client users cannot see this run until you publish it."),
      h("div", { class: "row" }, h("label", { class: "inline", for: "shareorg" }, "Organisation"), sel,
        run.publishedAt ? h("button", { class: "secondary", onclick: act(`/api/runs/${id}/unpublish`, false) }, "Unpublish") : h("button", { onclick: act(`/api/runs/${id}/publish`, true) }, "Publish to client")), msg));
  }

  const m = run.meta;
  const badges = [MODE_LABEL[run.mode], m.profile ? m.profile + "-facing" : "all cases", run.orgName].filter(Boolean);
  mount(
    h("p", {}, h("a", { href: "#/" }, "← All runs")), h("h1", {}, m.tool),
    h("p", { class: "muted" }, `${run.orgName || m.client} · ${run.packId} v${run.packVersion} · ${targetText(run.target)} · ${run.repeats} repeat(s) · ${fmtDate(run.createdAt)}`),
    h("p", {}, badges.map((b) => h("span", { class: "pill" }, b))),
    staff && h("p", { class: "small muted" }, run.evidenceSource),
    staff && h("div", { class: "card" }, bar, status, h("div", { class: "spaced" }, controls)),
    !staff && h("div", { class: "row" }, controls),
    keyBox, errEl, shareBox, manualBox, h("h2", {}, "Results"), resultsBox,
    staff && h("h2", {}, "Human review queue"),
    staff && h("p", { class: "muted small" }, "Sensitive cases and anything the automated checks could not decide. Your verdict is recorded against your name and replaces the automated outcome."), reviewBox);

  drawKeyBox(); drawControls(); drawShare();
  if (canOperate() && run.mode !== "api") manualBox.replaceChildren(manualPanel(run, refreshAll));
  await refreshResults(); await refreshReview();
  if (query.get("go") === "1" && !needsKeyNow() && lastProgress.pending > 0) { history.replaceState(null, "", "#/runs/" + id); drive(); }
}

function renderResults(ev, staff) {
  const cls = ev.outcome === "Pass" ? "b-pass" : ev.outcome === "Not yet" ? "b-fail" : "b-cond";
  const parts = [h("p", {}, h("span", { class: "badge " + cls }, ev.outcome + (ev.provisional ? " (provisional)" : "")), " ",
    h("span", { class: "muted small" }, `${ev.completedAttempts}/${ev.totalAttempts} tests · ${ev.criticalCount} critical finding(s) · ${ev.pendingReviews} awaiting review`))];
  if (!ev.areas.length) return h("div", {}, ...parts, h("p", { class: "muted" }, "No results yet."));
  parts.push(h("table", {}, h("thead", {}, h("tr", {}, ["Area", "Passed", "Failed", "Review", "Skipped", "Rate", "Required", "Status"].map((t) => h("th", {}, t)))),
    h("tbody", {}, ev.areas.map((a) => h("tr", {}, h("td", {}, a.label), h("td", { class: "n" }, a.passed), h("td", { class: "n" }, a.failed), h("td", { class: "n" }, a.review),
      h("td", { class: "n" }, a.skipped), h("td", { class: "n" }, pct(a.rate)), h("td", { class: "n" }, pct(a.minimum)), h("td", { class: "s-" + a.status }, a.status + (a.criticalFailure ? " (critical)" : "")))))));
  if (ev.findings.length) {
    parts.push(h("h2", {}, "Findings"), ...ev.findings.map((f) => h("div", { class: "card" },
      h("div", { class: "row" }, h("strong", {}, f.caseId), h("span", { class: "badge " + (f.severity === "critical" ? "b-fail" : "b-cond") }, f.severity.toUpperCase()), h("span", { class: "muted small" }, `${f.area} · failed ${f.failedAttempts}/${f.totalAttempts}`)),
      h("p", { class: "small" }, f.reason),
      staff && h("details", {}, h("summary", {}, "Prompt and reply"), h("pre", { class: "box" }, "PROMPT:\n" + f.prompt), h("pre", { class: "box" }, "REPLY:\n" + (f.reply || "(empty)"))))));
  }
  if (ev.flakyCases.length) parts.push(h("p", { class: "small" }, "Inconsistent across repeats: " + ev.flakyCases.join(", ")));
  return h("div", {}, ...parts);
}

function renderReview(items, runId, onDone) {
  if (!items.length) return h("p", { class: "muted" }, "Nothing waiting for review.");
  const groups = new Map(); // identical repeats are reviewed once
  for (const a of items) { const key = a.caseId + "\u0000" + JSON.stringify(a.replies) + "\u0000" + a.outcome; (groups.get(key) || groups.set(key, []).get(key)).push(a); }
  return h("div", {}, ...[...groups.values()].map((group) => {
    const a = group[0], notes = h("input", { placeholder: "Notes (optional)" });
    const send = async (verdict, btns) => {
      btns.forEach((b) => (b.disabled = true));
      try { for (const g of group) await api(`/api/runs/${runId}/attempts/${g.id}/review`, { method: "POST", body: { verdict, notes: notes.value } }); await onDone(); }
      catch (e) { alert(e.message); btns.forEach((b) => (b.disabled = false)); }
    };
    const pass = h("button", {}, "Pass"), fail = h("button", { class: "danger" }, "Fail");
    pass.addEventListener("click", () => send("pass", [pass, fail])); fail.addEventListener("click", () => send("fail", [pass, fail]));
    return h("div", { class: "card" },
      h("div", { class: "row" }, h("strong", {}, a.caseId), h("span", { class: "muted small" }, `${a.area} · ${a.severity} · automated: ${a.outcome}` + (group.length > 1 ? ` · ${group.length} identical attempts` : ` · attempt ${a.attempt}`))),
      h("p", { class: "small" }, a.description),
      ...a.turns.map((t, i) => [h("pre", { class: "box" }, "PUPIL: " + t), h("pre", { class: "box" }, "TOOL: " + (a.replies[i] ?? "(no reply)"))]).flat(),
      a.error && h("p", { class: "small" }, "Error: " + a.error),
      h("ul", { class: "small" }, a.checks.map((c) => h("li", {}, `${c.type}: ${c.outcome} (${c.detail})`))),
      h("div", { class: "row" }, notes, pass, fail));
  }));
}
