import { el } from "../dom.js";
import { api } from "../api.js";
import { can } from "../roles.js";
import { card, pageHeader, badge } from "../ui.js";
import { relTime } from "../format.js";
import { TYPE_LABEL, TYPE_TONE } from "../sanctionModal.js";

function stat(label, value, href, tone) {
  return el("a", { className: `stat ${tone || ""}`, href }, el("span", { className: "statValue", text: value }), el("span", { className: "small muted", text: label }));
}

export async function render(_, user) {
  const s = await api.stats();
  const max = Math.max(1, ...s.byRegion.map((r) => r.count));

  const stats = el("div", { className: "grid stats" },
    stat("Spieler online", s.online, "#/players"),
    stat("Offene Reports", s.openReports, "#/reports", s.openReports ? "warn" : ""),
    stat("Aktive Bans", s.activeBans, "#/sanctions"),
    stat("Aktive Mutes", s.activeMutes, "#/sanctions"),
    can(user.role, "appeals.handle") ? stat("Offene Einsprüche", s.openAppeals, "#/appeals", s.openAppeals ? "warn" : "") : null,
    stat("Server online", `${s.instances.online}/${s.instances.total}`, "#/servers", s.instances.online < s.instances.total ? "danger" : ""));

  const regions = card(el("h2", { text: "Spieler nach Region" }),
    el("div", { className: "bars" }, s.byRegion.map((r) => el("div", { className: "barRow" },
      el("span", { className: "barLabel", text: r.region }),
      el("div", { className: "bar" }, el("div", { className: "barFill", style: `width:${(r.count / max) * 100}%` })),
      el("span", { className: "barCount", text: r.count })))));

  const recent = card(el("h2", { text: "Letzte Sanktionen" }),
    s.recentSanctions.length ? el("div", { className: "list" }, s.recentSanctions.map((x) => el("a", { className: "row", href: `#/players/${x.playerId}` },
      el("div", {}, el("strong", { className: "mono", text: x.playerName }), el("div", { className: "small muted", text: `${x.reason} · ${x.by}` })),
      el("div", { className: "rowEnd" }, badge(TYPE_LABEL[x.type], TYPE_TONE[x.type]), el("span", { className: "small muted", text: relTime(x.createdAt) })))))
      : el("p", { className: "muted", text: "Noch nichts." }));

  return el("div", { className: "stack" }, pageHeader(`Hallo ${user.name}`, "Überblick über das Netzwerk"), stats, el("div", { className: "grid two" }, regions, recent));
}
