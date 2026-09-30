// Assurance Console: vanilla JS, no build step.
// Security notes:
//  - Model replies and tool names are untrusted. All text is inserted with textContent (see h()), never innerHTML.
//  - The API token lives in sessionStorage (cleared when the tab closes). Keys for the tool under test live in memory only.
(() => {
  "use strict";
  const API = ((window.EDASSURE_CONFIG || {}).apiBase || "").replace(/\/$/, "");
  const app = document.getElementById("app");
  const signout = document.getElementById("signout");

  const store = {
    get token() { try { return sessionStorage.getItem("edassure_token") || ""; } catch { return ""; } },
    set token(v) { try { v ? sessionStorage.setItem("edassure_token", v) : sessionStorage.removeItem("edassure_token"); } catch { /* storage blocked */ } },
    get reviewer() { try { return sessionStorage.getItem("edassure_reviewer") || ""; } catch { return ""; } },
    set reviewer(v) { try { sessionStorage.setItem("edassure_reviewer", v); } catch { /* ignore */ } },
  };
  const memoryKeys = {}; // runId -> { apiKey, judgeApiKey }
  let driving = null;    // run id currently being executed by this tab

  // ---------- helpers ----------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === false || v == null) continue;
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "value") el.value = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return el;
  }
  const mount = (...nodes) => { app.replaceChildren(...nodes.flat().filter((n) => n != null && n !== false)); };
  const fmtDate = (s) => { try { return new Date(s).toLocaleString("en-GB"); } catch { return s; } };
  const pct = (x) => (x == null ? "n/a" : Math.round(x * 100) + "%");

  class ApiError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
  async function api(path, { method = "GET", body, raw = false } = {}) {
    const res = await fetch(API + path, {
      method,
      headers: { Authorization: "Bearer " + store.token, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) { store.token = ""; route(); throw new ApiError(401, "Unauthorised"); }
    if (!res.ok) {
      let msg = res.statusText;
      try { msg = (await res.json()).error || msg; } catch { /* not json */ }
      throw new ApiError(res.status, msg);
    }
    return raw ? res : res.json();
  }
  const errBox = (e) => h("div", { class: "notice error", role: "alert" }, e.message || String(e));

  // ---------- sign in ----------
  function loginView(message) {
    const input = h("input", { type: "password", id: "tok", autocomplete: "current-password", required: true });
    const box = h("div");
    mount(h("h1", {}, "Sign in"),
      h("p", { class: "muted" }, "Enter the API token configured on the backend worker. It is kept for this browser tab only."),
      message && errBox({ message }),
      h("form", {
        onsubmit: async (e) => {
          e.preventDefault();
          store.token = input.value.trim();
          try { await api("/api/packs"); route(); } catch (err) { box.replaceChildren(errBox(err)); }
        },
      }, h("label", { for: "tok" }, "API token"), input, h("p", {}, h("button", { type: "submit" }, "Sign in")), box));
  }

  // ---------- runs list ----------
  async function runsView() {
    mount(h("h1", {}, "Runs"), h("p", { class: "muted" }, "Loading…"));
    try {
      const runs = await api("/api/runs");
      const table = runs.length
        ? h("table", {}, h("thead", {}, h("tr", {}, ...["Created", "Tool", "Client", "Target", "Pack", "Progress", ""].map((t) => h("th", {}, t)))),
          h("tbody", {}, runs.map((r) => h("tr", {},
            h("td", {}, fmtDate(r.createdAt)), h("td", {}, r.meta.tool), h("td", {}, r.meta.client),
            h("td", {}, r.target.type + (r.target.model ? " / " + r.target.model : r.target.mode ? " / " + r.target.mode : "")),
            h("td", {}, r.packId + " v" + r.packVersion), h("td", { class: "n" }, r.done + "/" + r.total),
            h("td", {}, h("a", { href: "#/runs/" + r.id }, "Open"))))))
        : h("p", { class: "muted" }, "No runs yet.");
      mount(h("div", { class: "row" }, h("h1", {}, "Runs"), h("a", { class: "btn right", href: "#/new" }, "New run")), table);
    } catch (e) { if (e.status !== 401) mount(h("h1", {}, "Runs"), errBox(e)); }
  }

  // ---------- new run ----------
  async function newView() {
    let packs;
    try { packs = await api("/api/packs"); } catch (e) { if (e.status !== 401) mount(h("h1", {}, "New run"), errBox(e)); return; }

    const f = {};
    const field = (id, label, attrs = {}) => { f[id] = h("input", { id, ...attrs }); return [h("label", { for: id }, label), f[id]]; };
    const targetFields = h("div");
    const judgeFields = h("div");
    const typeSel = (id, withHttp) => h("select", { id },
      h("option", { value: "mock-safe" }, "Demo: mock tool (safe)"), h("option", { value: "mock-unsafe" }, "Demo: mock tool (unsafe)"),
      h("option", { value: "openai" }, "OpenAI-compatible chat API"), h("option", { value: "anthropic" }, "Anthropic API"),
      withHttp && h("option", { value: "http" }, "Custom HTTP endpoint"));
    const targetType = typeSel("ttype", true);
    const judgeType = h("select", { id: "jtype" }, h("option", { value: "" }, "None (rubric checks go to human review)"),
      h("option", { value: "openai" }, "OpenAI-compatible chat API"), h("option", { value: "anthropic" }, "Anthropic API"));

    function drawFields(container, prefix, kind) {
      for (const key of Object.keys(f)) if (key.startsWith(prefix + "_")) delete f[key]; // drop fields from the previous type
      const k = (n) => prefix + "_" + n;
      const parts = [];
      if (kind === "openai") parts.push(...field(k("base"), "Base URL", { value: "https://api.openai.com/v1" }), ...field(k("model"), "Model ID", { required: true }),
        ...field(k("key"), "API key (kept in this tab's memory only)", { type: "password", autocomplete: "off" }));
      if (kind === "anthropic") parts.push(...field(k("model"), "Model ID", { required: true }),
        ...field(k("key"), "API key (kept in this tab's memory only)", { type: "password", autocomplete: "off" }));
      if (kind === "http") {
        parts.push(...field(k("url"), "Endpoint URL (https)", { required: true }),
          h("label", { for: k("tpl") }, "Request JSON template (use \"{{message}}\" and \"{{history}}\")"),
          (f[k("tpl")] = h("textarea", { id: k("tpl"), rows: 4 }, '{"query": "{{message}}", "history": "{{history}}"}')),
          ...field(k("path"), "Response path (e.g. data.answer)", { required: true }),
          ...field(k("key"), "Bearer key, if needed (memory only)", { type: "password", autocomplete: "off" }));
      }
      if (kind === "openai" || kind === "anthropic") {
        if (prefix === "t") parts.push(h("label", { for: k("sys") }, "System prompt / tool configuration (optional; use the tool's real one)"),
          (f[k("sys")] = h("textarea", { id: k("sys"), rows: 3 })));
      }
      container.replaceChildren(...parts);
    }
    const redraw = () => { drawFields(targetFields, "t", targetType.value.startsWith("mock") ? "" : targetType.value); drawFields(judgeFields, "j", judgeType.value); };
    targetType.addEventListener("change", redraw); judgeType.addEventListener("change", redraw);

    const packSel = h("select", { id: "pack" }, packs.map((p) => h("option", { value: p.id }, `${p.name} v${p.version} (${p.cases} cases)`)));
    const areaBox = h("div");
    const drawAreas = () => {
      const p = packs.find((x) => x.id === packSel.value);
      areaBox.replaceChildren(...p.areas.map((a) => h("label", { class: "inline" }, h("input", { type: "checkbox", name: "area", value: a, checked: true }), a)));
    };
    packSel.addEventListener("change", drawAreas);

    const msg = h("div");
    const form = h("form", {
      onsubmit: async (e) => {
        e.preventDefault();
        msg.replaceChildren();
        const val = (id) => (f[id] ? f[id].value.trim() : "");
        const cfg = (prefix, kind) => {
          if (kind === "mock-safe" || kind === "mock-unsafe") return { type: "mock", mode: kind === "mock-unsafe" ? "unsafe" : "safe" };
          if (kind === "openai") return { type: "openai", baseUrl: val(prefix + "_base"), model: val(prefix + "_model"), system: val(prefix + "_sys") || undefined };
          if (kind === "anthropic") return { type: "anthropic", model: val(prefix + "_model"), system: val(prefix + "_sys") || undefined };
          if (kind === "http") {
            let tpl; try { tpl = JSON.parse(val(prefix + "_tpl")); } catch { throw new Error("Request template is not valid JSON"); }
            return { type: "http", url: val(prefix + "_url"), requestTemplate: tpl, responsePath: val(prefix + "_path") };
          }
          return null;
        };
        try {
          const areas = [...areaBox.querySelectorAll("input[name=area]:checked")].map((i) => i.value);
          if (!areas.length) throw new Error("Select at least one area");
          const body = {
            packId: packSel.value, repeats: Number(f.repeats.value) || 1, areas,
            target: cfg("t", targetType.value), judge: judgeType.value ? cfg("j", judgeType.value) : undefined,
            meta: { client: val("client"), tool: val("tool"), intendedUse: val("use"), ageRange: val("age"), assessor: val("assessor"), reviewer: val("reviewer") },
          };
          const created = await api("/api/runs", { method: "POST", body });
          memoryKeys[created.id] = { apiKey: val("t_key"), judgeApiKey: val("j_key") };
          location.hash = "#/runs/" + created.id + "?go=1";
        } catch (err) { msg.replaceChildren(errBox(err)); }
      },
    },
      h("h2", {}, "Tool under test"), ...field("tool", "Tool name", { required: true }), ...field("client", "Client (school, trust or supplier)"),
      h("div", { class: "grid" }, h("div", {}, ...field("use", "Intended use", { placeholder: "e.g. homework helper" })), h("div", {}, ...field("age", "Age range", { placeholder: "e.g. 11-14" }))),
      h("div", { class: "grid" }, h("div", {}, ...field("assessor", "Assessor")), h("div", {}, ...field("reviewer", "Reviewer"))),
      h("label", { for: "ttype" }, "How do we reach the tool?"), targetType, targetFields,
      h("div", { class: "notice" }, "Only test systems you are authorised to test. Never send real pupil data. Keys are sent with each request and are not stored by the backend."),
      h("h2", {}, "Test pack"), h("label", { for: "pack" }, "Pack"), packSel,
      h("label", {}, "Areas"), areaBox,
      h("label", { for: "repeats" }, "Repeats per case (1-5)"), (f.repeats = h("input", { id: "repeats", type: "number", min: 1, max: 5, value: 3 })),
      h("h2", {}, "Judge model (optional)"), h("p", { class: "muted small" }, "Scores rubric checks. Not calibrated against human marks yet; treat results as advisory."), judgeType, judgeFields,
      h("p", {}, h("button", { type: "submit" }, "Create run and start")), msg);
    redraw(); drawAreas();
    mount(h("h1", {}, "New run"), form);
  }

  // ---------- run detail ----------
  async function runView(id, query) {
    let run;
    try { run = await api("/api/runs/" + id); } catch (e) { if (e.status !== 401) mount(errBox(e)); return; }

    const needsKey = run.target.type !== "mock" && !memoryKeys[id];
    const bar = h("div", {}, h("div", { class: "progress", role: "progressbar" }, h("div")));
    const status = h("div", { class: "muted small" });
    const controls = h("div", { class: "row" });
    const resultsBox = h("div");
    const reviewBox = h("div");
    const keyBox = h("div");
    const errBoxEl = h("div");

    const updateProgress = (p) => {
      const inner = bar.firstChild.firstChild;
      inner.style.width = (p.total ? (100 * p.done) / p.total : 0) + "%";
      bar.firstChild.setAttribute("aria-valuenow", String(p.done)); bar.firstChild.setAttribute("aria-valuemax", String(p.total));
      status.textContent = `${p.done} of ${p.total} attempts complete` + (driving === id ? " (running)" : "");
    };
    let lastProgress = run.progress; updateProgress(lastProgress);

    async function refreshResults() {
      try {
        const { evaluation: ev } = await api(`/api/runs/${id}/results`);
        resultsBox.replaceChildren(renderResults(ev));
      } catch (e) { if (e.status !== 401) resultsBox.replaceChildren(errBox(e)); }
    }
    async function refreshReview() {
      try {
        const items = await api(`/api/runs/${id}/attempts?needs_review=1`);
        reviewBox.replaceChildren(renderReview(items, id, async () => { await refreshReview(); await refreshResults(); }));
      } catch (e) { if (e.status !== 401) reviewBox.replaceChildren(errBox(e)); }
    }

    async function drive() {
      if (driving) return;
      driving = id; drawControls(); errBoxEl.replaceChildren();
      let idle = 0;
      try {
        while (driving === id) {
          const k = memoryKeys[id] || {};
          const r = await api(`/api/runs/${id}/step`, { method: "POST", body: { batch: 3, apiKey: k.apiKey || undefined, judgeApiKey: k.judgeApiKey || undefined } });
          lastProgress = r; updateProgress(r);
          if (r.pending === 0) break;
          idle = r.processed === 0 ? idle + 1 : 0;
          if (idle > 5) throw new Error("No progress: attempts may be claimed by another session. Try again shortly.");
          if (r.processed === 0) await new Promise((res) => setTimeout(res, 2000));
        }
      } catch (e) { if (e.status !== 401) errBoxEl.replaceChildren(errBox(e)); }
      driving = null; drawControls(); updateProgress(lastProgress);
      await refreshResults(); await refreshReview();
    }

    function drawControls() {
      const complete = lastProgress.pending === 0;
      controls.replaceChildren(
        driving === id
          ? h("button", { class: "secondary", onclick: () => { driving = null; drawControls(); } }, "Pause")
          : h("button", { disabled: complete || needsKeyNow(), onclick: drive }, complete ? "Complete" : lastProgress.done ? "Resume" : "Start"),
        h("button", { class: "secondary", onclick: async () => {
          try { const r = await api(`/api/runs/${id}/retry-errors`, { method: "POST" }); lastProgress = (await api("/api/runs/" + id)).progress; updateProgress(lastProgress); drawControls(); errBoxEl.replaceChildren(h("div", { class: "notice" }, r.requeued + " errored attempt(s) re-queued")); }
          catch (e) { errBoxEl.replaceChildren(errBox(e)); }
        } }, "Retry errored"),
        h("span", { class: "right" }),
        dlButton("Report (HTML)", `/api/runs/${id}/report?format=html`, "html"),
        dlButton("Report (Markdown)", `/api/runs/${id}/report?format=md`, "md"),
        dlButton("Evidence (JSONL)", `/api/runs/${id}/evidence.jsonl`, "jsonl"),
        h("button", { class: "danger", onclick: async () => { if (confirm("Delete this run and its evidence?")) { await api("/api/runs/" + id, { method: "DELETE" }); location.hash = "#/"; } } }, "Delete"));
    }
    const needsKeyNow = () => run.target.type !== "mock" && !memoryKeys[id];

    function drawKeyBox() {
      if (!needsKeyNow()) { keyBox.replaceChildren(); return; }
      const k1 = h("input", { type: "password", autocomplete: "off", id: "rk" });
      const k2 = run.judge && run.judge.type !== "mock" ? h("input", { type: "password", autocomplete: "off", id: "rjk" }) : null;
      keyBox.replaceChildren(h("div", { class: "card" },
        h("p", {}, "This run needs an API key for the tool under test. Keys are held in memory only and are lost if you reload."),
        h("label", { for: "rk" }, "API key for the tool (leave blank if it needs none)"), k1,
        k2 && h("label", { for: "rjk" }, "API key for the judge"), k2,
        h("p", {}, h("button", { onclick: () => { memoryKeys[id] = { apiKey: k1.value, judgeApiKey: k2 ? k2.value : "" }; drawKeyBox(); drawControls(); } }, "Use key"))));
    }

    const m = run.meta;
    mount(
      h("p", {}, h("a", { href: "#/" }, "← All runs")),
      h("h1", {}, m.tool),
      h("p", { class: "muted" }, `${m.client} · ${run.packId} v${run.packVersion} · ${run.target.type}${run.target.model ? " / " + run.target.model : run.target.mode ? " / " + run.target.mode : ""} · ${run.repeats} repeat(s) · ${fmtDate(run.createdAt)}`),
      h("div", { class: "card" }, bar, status, h("div", { style: "margin-top:10px" }, controls)), keyBox, errBoxEl,
      h("h2", {}, "Results"), resultsBox,
      h("h2", {}, "Human review queue"), h("p", { class: "muted small" }, "Sensitive cases and anything the automated checks could not decide. A completed verdict replaces the automated outcome."), reviewBox);

    drawKeyBox(); drawControls();
    await refreshResults(); await refreshReview();
    if (query.get("go") === "1" && !needsKeyNow() && lastProgress.pending > 0) { history.replaceState(null, "", "#/runs/" + id); drive(); }
  }

  function dlButton(label, path, ext) {
    return h("button", { class: "secondary", onclick: async (e) => {
      const btn = e.currentTarget; btn.disabled = true;
      try {
        const res = await api(path, { raw: true });
        const blob = await res.blob();
        const url = URL.createObjectURL(ext === "html" ? new Blob([await blob.text()], { type: "text/html" }) : blob);
        if (ext === "html") window.open(url, "_blank", "noopener");
        else { const a = h("a", { href: url, download: "report." + ext }); document.body.append(a); a.click(); a.remove(); }
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } catch (err) { alert(err.message); } finally { btn.disabled = false; }
    } }, label);
  }

  function renderResults(ev) {
    const cls = ev.outcome === "Pass" ? "b-pass" : ev.outcome === "Not yet" ? "b-fail" : "b-cond";
    const parts = [
      h("p", {}, h("span", { class: "badge " + cls }, ev.outcome + (ev.provisional ? " (provisional)" : "")), " ",
        h("span", { class: "muted small" }, `${ev.completedAttempts}/${ev.totalAttempts} attempts · ${ev.criticalCount} critical finding(s) · ${ev.pendingReviews} awaiting review`)),
    ];
    if (!ev.areas.length) return h("div", {}, ...parts, h("p", { class: "muted" }, "No results yet."));
    parts.push(h("table", {}, h("thead", {}, h("tr", {}, ...["Area", "Passed", "Failed", "Review", "Skipped", "Rate", "Required", "Status"].map((t) => h("th", {}, t)))),
      h("tbody", {}, ev.areas.map((a) => h("tr", {}, h("td", {}, a.label), h("td", { class: "n" }, a.passed), h("td", { class: "n" }, a.failed), h("td", { class: "n" }, a.review),
        h("td", { class: "n" }, a.skipped), h("td", { class: "n" }, pct(a.rate)), h("td", { class: "n" }, pct(a.minimum)),
        h("td", { class: "s-" + a.status }, a.status + (a.criticalFailure ? " (critical)" : "")))))));
    if (ev.findings.length) {
      parts.push(h("h2", {}, "Findings"), ...ev.findings.map((f) => h("div", { class: "card" },
        h("div", { class: "row" }, h("strong", {}, f.caseId), h("span", { class: "badge " + (f.severity === "critical" ? "b-fail" : "b-cond") }, f.severity.toUpperCase()),
          h("span", { class: "muted small" }, `${f.area} · failed ${f.failedAttempts}/${f.totalAttempts}`)),
        h("p", { class: "small" }, f.reason),
        h("details", {}, h("summary", {}, "Prompt and reply"), h("pre", { class: "box" }, "PROMPT:\n" + f.prompt), h("pre", { class: "box" }, "REPLY:\n" + (f.reply || "(empty)"))))));
    }
    if (ev.flakyCases.length) parts.push(h("p", { class: "small" }, "Inconsistent across repeats: " + ev.flakyCases.join(", ")));
    return h("div", {}, ...parts);
  }

  function renderReview(items, runId, onDone) {
    if (!items.length) return h("p", { class: "muted" }, "Nothing waiting for review.");
    // Repeats of a case that got an identical conversation are reviewed once; the verdict applies to all of them.
    const groups = new Map();
    for (const a of items) {
      const key = a.caseId + "\u0000" + JSON.stringify(a.replies) + "\u0000" + a.outcome;
      (groups.get(key) || groups.set(key, []).get(key)).push(a);
    }
    const reviewer = h("input", { id: "rev", value: store.reviewer, placeholder: "Your name" });
    reviewer.addEventListener("input", () => { store.reviewer = reviewer.value; });
    return h("div", {}, h("label", { for: "rev" }, "Reviewer"), reviewer,
      ...[...groups.values()].map((group) => {
        const a = group[0];
        const notes = h("input", { placeholder: "Notes (optional)" });
        const send = async (verdict, btns) => {
          btns.forEach((b) => (b.disabled = true));
          try {
            for (const g of group) await api(`/api/runs/${runId}/attempts/${g.id}/review`, { method: "POST", body: { verdict, reviewer: reviewer.value, notes: notes.value } });
            await onDone();
          } catch (e) { alert(e.message); btns.forEach((b) => (b.disabled = false)); }
        };
        const pass = h("button", {}, "Pass"), fail = h("button", { class: "danger" }, "Fail");
        pass.addEventListener("click", () => send("pass", [pass, fail])); fail.addEventListener("click", () => send("fail", [pass, fail]));
        return h("div", { class: "card" },
          h("div", { class: "row" }, h("strong", {}, a.caseId),
            h("span", { class: "muted small" }, `${a.area} · ${a.severity} · automated: ${a.outcome}` + (group.length > 1 ? ` · ${group.length} identical attempts` : ` · attempt ${a.attempt}`))),
          h("p", { class: "small" }, a.description),
          ...a.turns.map((t, i) => [h("pre", { class: "box" }, "PUPIL: " + t), h("pre", { class: "box" }, "TOOL: " + (a.replies[i] ?? "(no reply)"))]).flat(),
          a.error && h("p", { class: "small" }, "Error: " + a.error),
          h("ul", { class: "small" }, a.checks.map((c) => h("li", {}, `${c.type}: ${c.outcome} (${c.detail})`))),
          h("div", { class: "row" }, notes, pass, fail));
      }));
  }

  // ---------- router ----------
  function route() {
    signout.hidden = !store.token;
    if (!store.token) return loginView();
    const [path, qs] = (location.hash.slice(1) || "/").split("?");
    const query = new URLSearchParams(qs || "");
    const m = path.match(/^\/runs\/([\w-]+)$/);
    if (path === "/new") return newView();
    if (m) return runView(m[1], query);
    return runsView();
  }
  signout.addEventListener("click", () => { store.token = ""; driving = null; route(); });
  window.addEventListener("hashchange", route);
  route();
})();
