// Tiny DOM helpers. Everything user- or model-supplied goes in with textContent, never innerHTML.
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "value") el.value = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat(2)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}
export const app = () => document.getElementById("app");
export const mount = (...nodes) => app().replaceChildren(...nodes.flat(2).filter((n) => n != null && n !== false));
export const fmtDate = (s) => { try { return new Date(s).toLocaleString("en-GB"); } catch { return s; } };
export const pct = (x) => (x == null ? "n/a" : Math.round(x * 100) + "%");
export const errBox = (e) => h("div", { class: "notice error", role: "alert" }, (e && e.message) || String(e));
export const note = (text, cls = "") => h("div", { class: "notice " + cls }, text);

export async function copyText(text, btn) {
  try { await navigator.clipboard.writeText(text); if (btn) { const old = btn.textContent; btn.textContent = "Copied"; setTimeout(() => (btn.textContent = old), 1200); } }
  catch { window.prompt("Copy this text:", text); }
}

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = h("a", { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export const ROLE_LABEL = { admin: "Administrator", assessor: "Assessor", reviewer: "Reviewer", client: "Client" };
export const MODE_LABEL = { api: "Direct connection", manual: "Manual capture", import: "Imported spreadsheet" };

export function renderSummary(s) {
  const word = { green: "GREEN", amber: "AMBER", red: "RED" }[s.light];
  return h("div", { class: "summary light-" + s.light },
    h("div", { class: "summary-head" }, h("span", { class: "dot" }), h("strong", {}, `${word}: ${s.headline}`)),
    h("ul", {}, s.reasons.map((r) => h("li", {}, r))),
    h("p", { class: "small" }, h("strong", {}, "Before relying on this:")),
    h("ul", { class: "small" }, s.conditions.map((c) => h("li", {}, c))),
    h("p", { class: "small muted" }, `Re-test by ${s.reviewBy}, or sooner if the supplier changes the AI model or major features.`));
}
