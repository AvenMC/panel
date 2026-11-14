import { el } from "../dom.js";
import { api } from "../api.js";
import { can } from "../roles.js";
import { card, pageHeader, button, field, attempt, confirmDialog } from "../ui.js";
import { refresh } from "../app.js";

export async function render(_, user) {
  const s = await api.system();
  const msg = el("input", { className: "input", value: s.maintenance.message, "aria-label": "Maintenance message" });

  const maintenance = card(el("h2", { text: "Maintenance mode" }),
    el("p", { className: "muted", text: s.maintenance.enabled ? "Active: only staff can join." : "Off: the network is reachable as normal." }),
    field("Message for players", msg),
    button(s.maintenance.enabled ? "End maintenance mode" : "Start maintenance mode", () => confirmDialog(
      "Change maintenance mode?", "This affects every player on the network.", "Confirm",
      async () => { if (await attempt(() => api.setMaintenance(!s.maintenance.enabled, msg.value), "Saved")) refresh(); }, "primary"),
      s.maintenance.enabled ? "secondary" : "danger"));

  const flags = card(el("h2", { text: "Feature flags" }), el("div", { className: "list" }, s.flags.map((f) => el("div", { className: "row static" },
    el("div", {}, el("strong", { text: f.label }), el("div", { className: "small muted", text: f.desc })),
    el("button", { type: "button", className: `switch${f.enabled ? " on" : ""}`, role: "switch", "aria-checked": String(f.enabled), "aria-label": f.label,
      onClick: async () => { if (await attempt(() => api.toggleFlag(f.key))) refresh(); } }, el("span", { className: "knob" }))))));

  const reset = can(user.role, "system.reset") && card(el("h2", { text: "Test data" }), el("p", { className: "muted", text: "Resets all test data to its initial state." }),
    button("Reset test data", () => confirmDialog("Reset?", "All local changes will be lost.", "Reset", async () => { if (await attempt(() => api.resetData(), "Reset done")) refresh(); })));

  return el("div", { className: "stack" }, pageHeader("System", "Maintenance and feature flags"), el("div", { className: "grid two" }, maintenance, flags), reset);
}
