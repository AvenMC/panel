import { el } from "../dom.js";
import { api } from "../api.js";
import { can } from "../roles.js";
import { card, pageHeader, badge, button, empty, attempt, confirmDialog } from "../ui.js";
import { fmtDate } from "../format.js";
import { TYPE_LABEL, TYPE_TONE } from "../sanctionModal.js";
import { refresh } from "../app.js";

export async function render(_, user) {
  const filter = sessionStorage.getItem("avenmc.panel.sanctionFilter") || "active";
  const items = await api.sanctions(filter);
  const tabs = el("div", { className: "tabs" }, [["active", "Aktiv"], ["ban", "Bans"], ["mute", "Mutes"], ["warn", "Warns"], ["kick", "Kicks"], ["all", "Alle"]].map(([v, l]) =>
    el("button", { type: "button", className: `tab${v === filter ? " active" : ""}`, onClick: () => { sessionStorage.setItem("avenmc.panel.sanctionFilter", v); refresh(); } }, l)));

  return el("div", { className: "stack" }, pageHeader("Sanktionen", "Bans, Mutes, Warns und Kicks"), tabs,
    card(items.length ? el("div", { className: "list" }, items.map((s) => el("div", { className: "row static" },
      el("div", {}, el("a", { className: "mono", href: `#/players/${s.playerId}`, text: s.playerName }), el("div", { text: s.reason }),
        el("div", { className: "small muted", text: `${s.by} · ${fmtDate(s.createdAt)}${s.expiresAt === null ? " · permanent" : s.active ? ` · bis ${fmtDate(s.expiresAt)}` : ""}` })),
      el("div", { className: "rowEnd" }, badge(TYPE_LABEL[s.type], TYPE_TONE[s.type]),
        s.active && can(user.role, "sanction.revoke") && button("Aufheben", () => confirmDialog("Sanktion aufheben?", `${TYPE_LABEL[s.type]} von ${s.playerName} wird aufgehoben.`, "Aufheben",
          async () => { if (await attempt(() => api.revoke(s.id), "Aufgehoben")) refresh(); }, "primary")))))) : empty("Keine Einträge.")));
}
