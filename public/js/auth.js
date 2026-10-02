import { api, session } from "./api.js";
import { errBox, h, mount, note } from "./ui.js";

const field = (id, label, attrs = {}) => [h("label", { for: id }, label), h("input", { id, ...attrs })];

export function loginView(message) {
  const msg = h("div");
  const email = h("input", { id: "email", type: "email", autocomplete: "username", required: true });
  const pw = h("input", { id: "pw", type: "password", autocomplete: "current-password", required: true });
  const btn = h("button", { type: "submit" }, "Sign in");
  mount(
    h("div", { class: "narrow" },
      h("h1", {}, "Sign in"),
      h("p", { class: "muted" }, "Use the account your administrator created for you."),
      message && note(message),
      h("form", {
        onsubmit: async (e) => {
          e.preventDefault(); btn.disabled = true; msg.replaceChildren();
          try {
            const r = await api("/api/auth/login", { method: "POST", auth: false, body: { email: email.value, password: pw.value } });
            session.token = r.token; session.user = r.user;
            location.hash = "#/"; window.dispatchEvent(new Event("hashchange"));
          } catch (err) { msg.replaceChildren(errBox(err)); btn.disabled = false; }
        },
      }, h("label", { for: "email" }, "Email"), email, h("label", { for: "pw" }, "Password"), pw, h("p", {}, btn), msg)));
}

export function setupView() {
  const msg = h("div");
  const f = {
    token: h("input", { id: "st", type: "password", autocomplete: "off", required: true }),
    name: h("input", { id: "sn", required: true, autocomplete: "name" }),
    email: h("input", { id: "se", type: "email", required: true, autocomplete: "username" }),
    pw: h("input", { id: "sp", type: "password", minlength: 12, required: true, autocomplete: "new-password" }),
  };
  mount(h("div", { class: "narrow" },
    h("h1", {}, "First-time setup"),
    h("p", { class: "muted" }, "No accounts exist yet. Create the first administrator. You need the setup token (the API_TOKEN secret on the API worker). This screen disappears once an account exists."),
    h("form", {
      onsubmit: async (e) => {
        e.preventDefault(); msg.replaceChildren();
        try {
          await api("/api/auth/setup", { method: "POST", auth: false, body: { setupToken: f.token.value, name: f.name.value, email: f.email.value, password: f.pw.value } });
          location.hash = "#/"; window.dispatchEvent(new Event("hashchange"));
        } catch (err) { msg.replaceChildren(errBox(err)); }
      },
    },
      h("label", { for: "st" }, "Setup token"), f.token, h("label", { for: "sn" }, "Your name"), f.name,
      h("label", { for: "se" }, "Email"), f.email, h("label", { for: "sp" }, "Password (at least 12 characters)"), f.pw,
      h("p", {}, h("button", { type: "submit" }, "Create administrator")), msg)));
}

export function changePasswordView(forced) {
  const msg = h("div");
  const cur = h("input", { id: "cp", type: "password", autocomplete: "current-password", required: true });
  const next = h("input", { id: "np", type: "password", autocomplete: "new-password", minlength: 12, required: true });
  mount(h("div", { class: "narrow" },
    h("h1", {}, forced ? "Choose a new password" : "Change password"),
    forced && note("You are using a temporary password. Choose your own before continuing."),
    h("form", {
      onsubmit: async (e) => {
        e.preventDefault(); msg.replaceChildren();
        try {
          await api("/api/auth/change-password", { method: "POST", body: { currentPassword: cur.value, newPassword: next.value } });
          session.user.mustChange = false;
          msg.replaceChildren(note("Password changed.", "ok"));
          if (forced) { location.hash = "#/"; window.dispatchEvent(new Event("hashchange")); }
        } catch (err) { msg.replaceChildren(errBox(err)); }
      },
    }, h("label", { for: "cp" }, "Current (or temporary) password"), cur,
      h("label", { for: "np" }, "New password (at least 12 characters)"), next,
      h("p", { class: "small muted" }, "Use a long passphrase. Changing it signs you out on other devices."),
      h("p", {}, h("button", { type: "submit" }, "Change password")), msg)));
}
