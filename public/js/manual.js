import { api } from "./api.js";
import { copyText, errBox, h, note, saveBlob } from "./ui.js";

// Judge keys are held in memory only.
export const judgeKeys = {};

/**
 * Manual capture + spreadsheet import, for tools that have no API.
 * The assessor sends each scripted message to the tool in its own interface and pastes the reply back.
 */
export function manualPanel(run, onChange) {
  const box = h("div");
  const list = h("div");
  const result = h("div");
  const needsJudgeKey = run.judge && run.judge.type !== "mock";
  const keyInput = h("input", { type: "password", autocomplete: "off", id: "jk", placeholder: "Judge API key (memory only)" });
  const jk = () => (needsJudgeKey ? keyInput.value || judgeKeys[run.id] || undefined : undefined);
  keyInput.addEventListener("input", () => { judgeKeys[run.id] = keyInput.value; });

  const intro = run.mode === "import"
    ? "Import mode: the client or supplier sends you a spreadsheet of the tool's replies. Download the sheet, send it to them to fill in, then import it. Because you did not capture the replies yourself, the report says so and the evidence carries lower assurance."
    : "Manual mode: for each item below, send the message(s) to the tool in its own chat window using a test account (never real pupil data), then paste the tool's reply here. You can also download the sheet, fill it in offline, and import it.";

  async function loadList() {
    try {
      const wl = await api(`/api/runs/${run.id}/manual?limit=5`);
      if (!wl.items.length) { list.replaceChildren(note(wl.progress.pending === 0 ? "All items are recorded." : "Nothing left to show.", "ok")); return; }
      list.replaceChildren(h("p", { class: "muted small" }, `${wl.progress.pending} item(s) still to record. Showing the next ${wl.items.length}.`), ...wl.items.map(card));
    } catch (e) { list.replaceChildren(errBox(e)); }
  }

  function card(it) {
    const areas = it.turns.map(() => h("textarea", { rows: 3, placeholder: "Paste the tool's reply here" }));
    const err = h("div");
    const submit = h("button", { type: "submit" }, "Record reply");
    return h("form", { class: "card", onsubmit: async (e) => {
      e.preventDefault(); err.replaceChildren(); submit.disabled = true;
      try {
        await api(`/api/runs/${run.id}/attempts/${it.attemptId}/submit`, { method: "POST", body: { replies: areas.map((a) => a.value), judgeApiKey: jk() } });
        await loadList(); await onChange();
      } catch (ex) { err.replaceChildren(errBox(ex)); submit.disabled = false; }
    } },
      h("div", { class: "row" }, h("strong", {}, it.caseId), h("span", { class: "muted small" }, `${it.area} · ${it.severity}${it.attempt > 1 ? " · repeat " + it.attempt : ""}`)),
      it.description && h("p", { class: "small" }, it.description),
      ...it.turns.map((t, i) => {
        const copy = h("button", { type: "button", class: "secondary small-btn", onclick: () => copyText(t, copy) }, "Copy");
        return h("div", {}, h("div", { class: "row" }, h("strong", { class: "small" }, it.turns.length > 1 ? `Message ${i + 1} of ${it.turns.length}: send this` : "Send this message"), copy),
          h("pre", { class: "box" }, t), areas[i]);
      }),
      h("div", { class: "row" }, submit), err);
  }

  const file = h("input", { type: "file", accept: ".csv,text/csv", id: "csvfile" });
  box.append(...[
    h("h2", {}, run.mode === "import" ? "Import responses" : "Record responses"),
    h("p", { class: "muted" }, intro),
    needsJudgeKey && h("div", {}, h("label", { for: "jk" }, "Judge API key"), keyInput),
    h("div", { class: "row" },
      h("button", { class: "secondary", onclick: async (e) => {
        e.currentTarget.disabled = true;
        try { const r = await api(`/api/runs/${run.id}/sheet.csv`, { raw: true }); saveBlob(await r.blob(), `test-sheet-${run.id.slice(0, 8)}.csv`); }
        catch (ex) { result.replaceChildren(errBox(ex)); } finally { e.currentTarget.disabled = false; }
      } }, "Download test sheet (CSV)"),
      h("label", { class: "btn secondary filebtn", for: "csvfile" }, "Import filled sheet…"), file),
    result, list].filter(Boolean));

  file.addEventListener("change", async () => {
    const f = file.files[0]; if (!f) return;
    result.replaceChildren(note("Importing…"));
    try {
      const r = await api(`/api/runs/${run.id}/import`, { method: "POST", body: { csv: await f.text(), judgeApiKey: jk() } });
      result.replaceChildren(
        note(`${r.accepted} item(s) recorded. ${r.pending} still to do.${r.deferred ? ` ${r.deferred} more are waiting: import again to continue.` : ""}`, r.rejected.length ? "" : "ok"),
        r.rejected.length ? h("div", { class: "notice error" }, h("strong", {}, `${r.rejected.length} item(s) not imported:`),
          h("ul", {}, r.rejected.slice(0, 12).map((x) => h("li", {}, `${x.caseId} (repeat ${x.attempt}): ${x.reason}`)))) : null);
      await loadList(); await onChange();
    } catch (ex) { result.replaceChildren(errBox(ex)); }
    file.value = "";
  });

  loadList();
  return box;
}
