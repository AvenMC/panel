import { el, icon, replaceContent } from "./dom.js";
import { getUser, setUser, logout, finishDiscordLogin } from "./auth.js";
import { api } from "./api.js";
import { can, ROLES } from "./roles.js";
import { roleBadge, toast } from "./ui.js";
import { config } from "./config.js";

const page = (file) => () => import(`./pages/${file}.js`);

const ROUTES = [
  { path: "dashboard", label: "Dashboard", icon: "home", perm: "dashboard.view", load: page("dashboard"), tab: true },
  { path: "analytics", label: "Analytics", icon: "chart", perm: "analytics.view", load: page("analytics") },
  { path: "players", label: "Players", icon: "users", perm: "players.view", load: page("players"), tab: true },
  { path: "reports", label: "Reports", icon: "flag", perm: "reports.handle", load: page("reports"), tab: true },
  { path: "sanctions", label: "Sanctions", icon: "gavel", perm: "sanction.issue", load: page("sanctions") },
  { path: "appeals", label: "Appeals", icon: "mail", perm: "appeals.handle", load: page("appeals") },
  { path: "servers", label: "Servers", icon: "server", perm: "servers.view", load: page("servers") },
  { path: "system", label: "System", icon: "tool", perm: "flags.manage", load: page("system") },
  { path: "staff", label: "Team", icon: "shield", perm: "staff.view", load: page("staff") },
  { path: "audit", label: "Audit-Log", icon: "log", perm: "audit.view", load: page("audit") },
];

const root = document.getElementById("app");
let token = 0;

export async function start() {
  try {
    const profile = await finishDiscordLogin();
    if (profile) await signInDiscord(profile);
  } catch (e) {
    sessionStorage.setItem("avenmc.panel.flash", e.message);
  }
  window.addEventListener("hashchange", render);
  render();
}

async function signInDiscord(profile) {
  const staff = api.findStaff(profile.discordId);
  const role = config.ownerDiscordIds.includes(profile.discordId) ? "owner" : staff?.role;
  if (!role) {
    sessionStorage.setItem("avenmc.panel.flash",
      `No access. Give this Discord ID to an owner to get unlocked: ${profile.discordId}`);
    return;
  }
  setUser({ ...profile, role });
}

export function refresh() {
  render();
}

export function signOut() {
  logout();
  location.hash = "";
  render();
}

async function render() {
  const user = getUser();
  const parts = location.hash.replace(/^#\/?/, "").split("/");
  const route = ROUTES.find((r) => r.path === parts[0]);

  if (!user) {
    const { renderLogin } = await import("./pages/login.js");
    replaceContent(root, renderLogin(async (u) => { setUser(u); location.hash = "#/dashboard"; render(); }));
    return;
  }
  if (!route) {
    location.hash = "#/dashboard";
    return;
  }

  const my = ++token;
  const view = el("div", { className: "view" });
  replaceContent(root, shell(user, route, view));
  const allowed = can(user.role, route.perm);
  try {
    const mod = await route.load();
    const content = allowed ? await mod.render(parts.slice(1), user) : el("div", { className: "empty muted", text: "You do not have access to this page." });
    if (my !== token) return;
    replaceContent(view, content);
  } catch (e) {
    if (my === token) replaceContent(view, el("div", { className: "empty muted", text: e.message }));
  }
  window.scrollTo(0, 0);
}

function shell(user, route, view) {
  const items = ROUTES.filter((r) => can(user.role, r.perm));
  const link = (r) => el("a", { href: `#/${r.path}`, className: `navItem${r.path === route.path ? " active" : ""}`, onClick: closeDrawer }, icon(r.icon), r.label);
  const tabs = items.filter((r) => r.tab);

  const sidebar = el("aside", { className: "sidebar", id: "sidebar" },
    el("div", { className: "brand" }, el("img", { src: "assets/logoMark.png", alt: "", width: 32, height: 32 }), el("strong", { text: "AVENMC Panel" })),
    el("nav", { className: "nav" }, items.map(link)),
    el("div", { className: "userBox" },
      user.avatar ? el("img", { className: "avatar", src: user.avatar, alt: "" }) : el("div", { className: "avatar fallback", text: user.name[0].toUpperCase() }),
      el("div", { className: "userInfo" }, el("strong", { text: user.name }), roleBadge(user.role)),
      el("button", { type: "button", className: "iconBtn", "aria-label": "Sign out", onClick: signOut }, icon("out"))));

  const scrim = el("div", { className: "scrim", id: "scrim", onClick: closeDrawer });
  const topbar = el("header", { className: "topbar" },
    el("button", { type: "button", className: "iconBtn menuBtn", "aria-label": "Menu", onClick: openDrawer }, icon("menu")),
    el("strong", { text: route.label }),
    config.apiMode === "mock" ? el("span", { className: "badge warn", text: "Test data" }) : null);

  const bottom = el("nav", { className: "bottomNav" },
    tabs.map((r) => el("a", { href: `#/${r.path}`, className: r.path === route.path ? "active" : "" }, icon(r.icon), r.label)),
    el("button", { type: "button", onClick: openDrawer }, icon("more"), "More"));

  return el("div", { className: "shell" }, sidebar, scrim, el("div", { className: "main" }, topbar, el("main", { className: "content" }, view)), bottom);
}

function openDrawer() { document.body.classList.add("drawerOpen"); }
function closeDrawer() { document.body.classList.remove("drawerOpen"); }

export { ROLES, toast };
