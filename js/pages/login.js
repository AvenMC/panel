import { el } from "../dom.js";
import { config } from "../config.js";
import { discordConfigured, startDiscordLogin } from "../auth.js";
import { ROLES } from "../roles.js";
import { toast } from "../ui.js";

const DEMO_USERS = {
  owner: { discordId: "100000000000000001", name: "Chris" },
  developer: { discordId: "100000000000000002", name: "Dev Dan" },
  admin: { discordId: "100000000000000003", name: "Admin Alex" },
  mod: { discordId: "100000000000000004", name: "Lena" },
};

export function renderLogin(onLogin) {
  const flash = sessionStorage.getItem("avenmc.panel.flash");
  sessionStorage.removeItem("avenmc.panel.flash");

  const discordBtn = el("button", {
    type: "button", className: "btn primary wide",
    onClick: () => (discordConfigured() ? startDiscordLogin() : toast("Discord is not set up yet (client ID in js/config.js).", "danger")),
  }, el("img", { src: "assets/discord.svg", alt: "", width: 20, height: 20 }), "Sign in with Discord");

  return el("div", { className: "loginWrap" },
    el("div", { className: "loginCard card" },
      el("img", { src: "assets/logoMark.png", alt: "AVENMC", width: 56, height: 56 }),
      el("h1", { text: "Staff Panel" }),
      el("p", { className: "muted", text: "For owners, developers, admins and moderators only." }),
      flash && el("div", { className: "notice danger", text: flash }),
      discordBtn,
      config.demoLogin && el("div", { className: "demo" },
        el("p", { className: "small muted", text: "Test mode: sign in as a role" }),
        el("div", { className: "demoGrid" }, Object.entries(DEMO_USERS).map(([role, u]) =>
          el("button", { type: "button", className: "btn secondary", onClick: () => onLogin({ ...u, avatar: null, role }) }, ROLES[role].label))))));
}
