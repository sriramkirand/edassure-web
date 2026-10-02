import { api, session } from "./api.js";
import { copyText, errBox, fmtDate, h, mount, note, ROLE_LABEL } from "./ui.js";

export async function adminView(tab = "users") {
  const body = h("div");
  const tabs = h("div", { class: "tabs" }, ...[["users", "Users"], ["orgs", "Client organisations"], ["audit", "Activity log"]].map(([k, label]) =>
    h("a", { href: "#/admin/" + k, class: k === tab ? "tab active" : "tab" }, label)));
  mount(h("h1", {}, "Administration"), tabs, body);
  try {
    if (tab === "orgs") await orgs(body);
    else if (tab === "audit") await audit(body);
    else await users(body);
  } catch (e) { if (e.status !== 401) body.replaceChildren(errBox(e)); }
}

async function orgs(body) {
  const list = await api("/api/admin/orgs");
  const name = h("input", { id: "on", required: true });
  const kind = h("select", { id: "ok" }, ["school", "trust", "college", "university", "supplier", "other"].map((k) => h("option", { value: k }, k)));
  const msg = h("div");
  body.replaceChildren(
    h("p", { class: "muted" }, "A client organisation is a school, trust, college, university or supplier. Client users belong to one, and only see results you publish to it."),
    list.length ? h("table", {}, h("thead", {}, h("tr", {}, ["Name", "Type", "Users", "Checks"].map((t) => h("th", {}, t)))),
      h("tbody", {}, list.map((o) => h("tr", {}, h("td", {}, o.name), h("td", {}, o.kind), h("td", { class: "n" }, o.users), h("td", { class: "n" }, o.runs))))) : h("p", { class: "muted" }, "No organisations yet."),
    h("h2", {}, "Add organisation"),
    h("form", { onsubmit: async (e) => { e.preventDefault(); try { await api("/api/admin/orgs", { method: "POST", body: { name: name.value, kind: kind.value } }); await orgs(body); } catch (err) { msg.replaceChildren(errBox(err)); } } },
      h("div", { class: "grid" }, h("div", {}, h("label", { for: "on" }, "Name"), name), h("div", {}, h("label", { for: "ok" }, "Type"), kind)),
      h("p", {}, h("button", { type: "submit" }, "Add organisation")), msg));
}

async function users(body) {
  const [list, orgList] = await Promise.all([api("/api/admin/users"), api("/api/admin/orgs")]);
  const f = {
    name: h("input", { id: "un", required: true }), email: h("input", { id: "ue", type: "email", required: true }),
    role: h("select", { id: "ur" }, ["assessor", "reviewer", "client", "admin"].map((r) => h("option", { value: r }, ROLE_LABEL[r]))),
    org: h("select", { id: "uo" }, h("option", { value: "" }, "(choose)"), orgList.map((o) => h("option", { value: o.id }, o.name))),
  };
  const orgWrap = h("div", { class: "hidden" }, h("label", { for: "uo" }, "Client organisation"), f.org);
  f.role.addEventListener("change", () => orgWrap.classList.toggle("hidden", f.role.value !== "client"));
  const msg = h("div"), notice = h("div");

  const act = (label, fn, cls = "secondary") => h("button", { class: cls + " small-btn", onclick: async (e) => {
    e.currentTarget.disabled = true;
    try { const r = await fn(); if (r && r.temporaryPassword) notice.replaceChildren(tempBox(r.temporaryPassword)); await users(body); if (r && r.temporaryPassword) body.prepend(tempBox(r.temporaryPassword)); }
    catch (err) { notice.replaceChildren(errBox(err)); e.currentTarget.disabled = false; }
  } }, label);

  body.replaceChildren(
    notice,
    h("table", {}, h("thead", {}, h("tr", {}, ["Name", "Email", "Role", "Organisation", "Last sign-in", "Status", ""].map((t) => h("th", {}, t)))),
      h("tbody", {}, list.map((u) => h("tr", {},
        h("td", {}, u.name), h("td", {}, u.email), h("td", {}, ROLE_LABEL[u.role]), h("td", {}, u.orgName || "—"),
        h("td", {}, u.lastLoginAt ? fmtDate(u.lastLoginAt) : "never"), h("td", {}, u.disabled ? "Disabled" : u.mustChange ? "Must change password" : "Active"),
        h("td", { class: "actions" },
          act("Reset password", () => api(`/api/admin/users/${u.id}/reset-password`, { method: "POST" })),
          u.id === session.user.id ? null : act(u.disabled ? "Enable" : "Disable", () => api(`/api/admin/users/${u.id}/${u.disabled ? "enable" : "disable"}`, { method: "POST" }))))))),
    h("h2", {}, "Add user"),
    h("p", { class: "muted small" }, "You will be shown a one-time password to give them. They must choose their own at first sign-in."),
    h("form", { onsubmit: async (e) => {
      e.preventDefault(); msg.replaceChildren();
      try {
        const r = await api("/api/admin/users", { method: "POST", body: { name: f.name.value, email: f.email.value, role: f.role.value, orgId: f.role.value === "client" ? f.org.value : undefined } });
        await users(body); body.prepend(tempBox(r.temporaryPassword, r.email));
      } catch (err) { msg.replaceChildren(errBox(err)); }
    } },
      h("div", { class: "grid" }, h("div", {}, h("label", { for: "un" }, "Name"), f.name), h("div", {}, h("label", { for: "ue" }, "Email"), f.email), h("div", {}, h("label", { for: "ur" }, "Role"), f.role), orgWrap),
      h("p", { class: "small muted" }, "Administrator: everything. Assessor: runs tests and publishes results. Reviewer: reviews sensitive cases. Client: read-only view of results published to their organisation."),
      h("p", {}, h("button", { type: "submit" }, "Create user")), msg));
}

function tempBox(pw, email) {
  const btn = h("button", { class: "secondary", onclick: () => copyText(pw, btn) }, "Copy");
  return h("div", { class: "notice ok" }, h("p", {}, h("strong", {}, email ? `Account created for ${email}.` : "New temporary password.")),
    h("p", {}, "Temporary password (shown once, give it to them securely): ", h("code", { class: "pw" }, pw), " ", btn));
}

async function audit(body) {
  const rows = await api("/api/admin/audit?limit=200");
  body.replaceChildren(h("p", { class: "muted" }, "Most recent activity first."),
    h("table", {}, h("thead", {}, h("tr", {}, ["When", "Who", "What", "Detail"].map((t) => h("th", {}, t)))),
      h("tbody", {}, rows.map((r) => h("tr", {}, h("td", {}, fmtDate(r.ts)), h("td", {}, r.userEmail || "—"), h("td", {}, r.action.replace(/_/g, " ")), h("td", {}, r.detail || ""))))));
}
