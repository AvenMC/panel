import { el } from "../dom.js";
import { api } from "../api.js";
import { can } from "../roles.js";
import { card, pageHeader, badge, button, attempt, modal, field } from "../ui.js";
import { relTime } from "../format.js";
import { refresh } from "../app.js";

const STATUS = { online: ["Online", "success"], degraded: ["Eingeschränkt", "warn"], offline: ["Offline", "danger"] };

export async function render(_, user) {
  const instances = await api.instances();
  const regions = ["EU", "NA", "AS"];
  const text = el("textarea", { className: "input", rows: 2, placeholder: "Nachricht an alle Spieler …" });

  const broadcast = can(user.role, "broadcast.send") && card(el("h2", { text: "Broadcast" }), el("div", { className: "stack" }, field("Nachricht", text),
    button("An alle senden", async () => { if (text.value.trim() && await attempt(() => api.broadcast(text.value), "Broadcast gesendet (Test)")) { text.value = ""; } }, "primary")));

  const tile = (i) => el("div", { className: "instance" },
    el("div", { className: "instanceHead" }, el("strong", { text: i.id }), badge(...STATUS[i.status])),
    el("div", { className: "small muted", text: `${i.type} · v${i.version}` }),
    el("div", { className: "meter" }, metric("Spieler", `${i.players}/${i.max}`), metric("TPS", i.tps), metric("CPU", `${i.cpu}%`), metric("RAM", `${i.mem}%`)),
    el("div", { className: "btnRow" },
      can(user.role, "servers.logs") && button("Logs", async () => {
        const lines = await api.instanceLogs(i.id);
        modal(`Logs: ${i.id}`, el("pre", { className: "logs", text: lines.join("\n") }));
      }),
      can(user.role, "servers.control") && button("Neustart", async () => { if (await attempt(() => api.restartInstance(i.id), `${i.id} neu gestartet`)) refresh(); })));

  return el("div", { className: "stack" }, pageHeader("Server", "Instanzen pro Region"), broadcast,
    regions.map((r) => card(el("h2", { text: r }), el("div", { className: "grid instances" }, instances.filter((i) => i.region === r).map(tile)))),
    el("p", { className: "small muted", text: `Stand: ${relTime(Date.now())}` }));
}

function metric(label, value) {
  return el("div", {}, el("div", { className: "metricValue", text: value }), el("div", { className: "small muted", text: label }));
}
