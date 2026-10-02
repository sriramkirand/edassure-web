import { adminView } from "./admin.js";
import { api, session } from "./api.js";
import { changePasswordView, loginView, setupView } from "./auth.js";
import { runsView, newView, runView } from "./runs.js";
import { errBox, h, mount, ROLE_LABEL } from "./ui.js";

const nav = document.getElementById("nav");
let routing = 0;

function drawNav() {
  const u = session.user;
  if (!u) { nav.replaceChildren(); return; }
  const links = u.mustChange ? [] : u.role === "client" ? [["#/", "Your checks"]]
    : [["#/", "Runs"], ...(["admin", "assessor"].includes(u.role) ? [["#/new", "New run"]] : []), ...(u.role === "admin" ? [["#/admin", "Administration"]] : [])];
  nav.replaceChildren(...links.map(([href, label]) => h("a", { href }, label)),
    h("span", { class: "who" }, `${u.name} (${ROLE_LABEL[u.role]})`),
    h("a", { href: "#/account" }, "Account"),
    h("button", { class: "link", onclick: async () => { try { await api("/api/auth/logout", { method: "POST" }); } catch { /* already gone */ } session.clear(); location.hash = "#/"; route(); } }, "Sign out"));
}

async function route() {
  const mine = ++routing;
  try {
    if (!session.token) {
      session.user = null; drawNav();
      const st = await api("/api/auth/status", { auth: false });
      if (mine !== routing) return;
      return st.needsSetup ? setupView() : loginView();
    }
    if (!session.user) session.user = (await api("/api/auth/me")).user;
    if (mine !== routing) return;
    drawNav();
    if (session.user.mustChange) return changePasswordView(true);

    const [path, qs] = (location.hash.slice(1) || "/").split("?");
    const query = new URLSearchParams(qs || "");
    const run = path.match(/^\/runs\/([\w-]+)$/);
    const adm = path.match(/^\/admin(?:\/(\w+))?$/);
    if (path === "/account") return changePasswordView(false);
    if (adm) return session.user.role === "admin" ? adminView(adm[1] || "users") : mount(errBox({ message: "Administrators only." }));
    if (path === "/new") return newView();
    if (run) return runView(run[1], query);
    return runsView();
  } catch (e) {
    if (e.status === 401 || mine !== routing) return;
    mount(h("h1", {}, "Something went wrong"), errBox(e));
  }
}

window.addEventListener("hashchange", route);
route();
