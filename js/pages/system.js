import { el } from "../dom.js";
import { api } from "../api.js";
import { can } from "../roles.js";
import { card, pageHeader, button, field, attempt, confirmDialog } from "../ui.js";
import { refresh } from "../app.js";

export async function render(_, user) {
  const s = await api.system();
  const msg = el("input", { className: "input", value: s.maintenance.message, "aria-label": "Wartungsnachricht" });

  const maintenance = card(el("h2", { text: "Wartungsmodus" }),
    el("p", { className: "muted", text: s.maintenance.enabled ? "Aktiv: nur Staff kann beitreten." : "Aus: Netzwerk ist normal erreichbar." }),
    field("Nachricht für Spieler", msg),
    button(s.maintenance.enabled ? "Wartungsmodus beenden" : "Wartungsmodus starten", () => confirmDialog(
      "Wartungsmodus ändern?", "Das betrifft alle Spieler im Netzwerk.", "Bestätigen",
      async () => { if (await attempt(() => api.setMaintenance(!s.maintenance.enabled, msg.value), "Gespeichert")) refresh(); }, "primary"),
      s.maintenance.enabled ? "secondary" : "danger"));

  const flags = card(el("h2", { text: "Feature-Flags" }), el("div", { className: "list" }, s.flags.map((f) => el("div", { className: "row static" },
    el("div", {}, el("strong", { text: f.label }), el("div", { className: "small muted", text: f.desc })),
    el("button", { type: "button", className: `switch${f.enabled ? " on" : ""}`, role: "switch", "aria-checked": String(f.enabled), "aria-label": f.label,
      onClick: async () => { if (await attempt(() => api.toggleFlag(f.key))) refresh(); } }, el("span", { className: "knob" }))))));

  const reset = can(user.role, "system.reset") && card(el("h2", { text: "Testdaten" }), el("p", { className: "muted", text: "Setzt alle Testdaten auf den Ausgangszustand zurück." }),
    button("Testdaten zurücksetzen", () => confirmDialog("Zurücksetzen?", "Alle lokalen Änderungen gehen verloren.", "Zurücksetzen", async () => { if (await attempt(() => api.resetData(), "Zurückgesetzt")) refresh(); })));

  return el("div", { className: "stack" }, pageHeader("System", "Wartung und Feature-Flags"), el("div", { className: "grid two" }, maintenance, flags), reset);
}
