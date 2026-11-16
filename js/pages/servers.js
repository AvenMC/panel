import { el, icon } from "../dom.js";
import { api } from "../api.js";
import { can } from "../roles.js";
import { card, pageHeader, badge, button, attempt, field, confirmDialog, empty } from "../ui.js";
import { relTime, fmtDate } from "../format.js";
import { lineChart, legend, sparkline } from "../charts.js";
import { refresh } from "../app.js";

const STATUS = { online: ["Online", "success"], degraded: ["Degraded", "warn"], offline: ["Offline", "danger"] };
const uptime = (t) => {
  const m = Math.floor((Date.now() - t) / 60000);
  return m >= 1440 ? `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h` : `${Math.floor(m / 60)}h ${m % 60}m`;
};

export async function render(parts, user) {
  return parts[0] ? detail(parts[0], user) : list(user);
}

async function list(user) {
  const instances = await api.instances();
  const text = el("textarea", { className: "input", rows: 2, placeholder: "Message to all players …" });
  const broadcast = can(user.role, "broadcast.send") && card(el("h2", { text: "Broadcast" }), el("div", { className: "stack" }, field("Message", text),
    button("Send to everyone", async () => { if (text.value.trim() && await attempt(() => api.broadcast(text.value), "Broadcast sent (test)")) text.value = ""; }, "primary")));

  const tile = (i) => el("a", { className: "instance", href: `#/servers/${i.id}` },
    el("div", { className: "instanceHead" }, el("strong", { text: i.id }), badge(...STATUS[i.status])),
    el("div", { className: "small muted", text: `${i.type} · v${i.version} · up ${uptime(i.startedAt)}` }),
    el("div", { className: "meter" }, metric("Players", `${i.players}/${i.max}`), metric("TPS", i.tps), metric("CPU", `${i.cpu}%`), metric("RAM", `${i.mem}%`)));

  const total = instances.reduce((a, i) => a + i.players, 0);
  return el("div", { className: "stack" }, pageHeader("Servers", `${instances.length} instances · ${total} players connected`), broadcast,
    ["EU", "NA", "AS"].map((r) => card(el("h2", { text: r }), el("div", { className: "grid instances" }, instances.filter((i) => i.region === r).map(tile)))));
}

async function detail(iid, user) {
  const i = await api.instance(iid);
  const showConsole = can(user.role, "servers.logs");
  const pointLabels = Array.from({ length: 60 }, (_, k) => (k === 59 ? "now" : `${59 - k} min ago`));
  const labels = [[0, "-60 min"], [30, "-30 min"], [59, "now"]];
  const perf = [{ label: "TPS", color: "#66eb8c", values: i.history.tps }];
  const load = [{ label: "CPU %", color: "#28b9f5", values: i.history.cpu }, { label: "RAM %", color: "#b89efa", values: i.history.mem }];
  const pl = [{ label: "Players", color: "#ffa147", values: i.history.players }];

  const info = [["Host", i.host], ["Address", i.address], ["Region", i.region], ["Type", i.type], ["Version", `v${i.version}`], ["Endstone", i.endstone],
    ["Python", i.python], ["Started", fmtDate(i.startedAt)], ["Uptime", uptime(i.startedAt)], ["Last heartbeat", relTime(i.lastHeartbeat)],
    ["Network in/out", `${i.netIn} / ${i.netOut} kB/s`], ["Entities / chunks", `${i.entities} / ${i.chunks}`]];

  return el("div", { className: "stack" },
    el("a", { className: "backLink muted", href: "#/servers" }, icon("back", 16), "All servers"),
    el("div", { className: "profileHead" }, el("div", {}, el("h1", { text: i.id }), el("div", { className: "chips" }, badge(...STATUS[i.status]), badge(i.region, "neutral"), badge(i.type, "neutral"))),
      el("div", { className: "btnRow" }, can(user.role, "servers.control") && button("Restart", () => confirmDialog("Restart instance?", `${i.id} will disconnect ${i.players} players.`, "Restart",
        async () => { if (await attempt(() => api.restartInstance(i.id), `${i.id} restarted`)) refresh(); })))),
    el("div", { className: "grid stats small" }, miniStat("Players", `${i.players}/${i.max}`, i.history.players), miniStat("TPS", i.tps, i.history.tps), miniStat("CPU", `${i.cpu}%`, i.history.cpu), miniStat("RAM", `${i.mem}%`, i.history.mem)),
    showConsole && card(el("h2", { text: "Console" }), consoleView(i, user)),
    el("div", { className: "grid two" },
      card(el("h2", { text: "Performance (last 60 min)" }), legend(perf), lineChart(perf, { max: 20, labels, pointLabels })),
      card(el("h2", { text: "Resource usage" }), legend(load), lineChart(load, { max: 100, labels, pointLabels, format: (v) => `${v}%` }))),
    el("div", { className: "grid two" },
      card(el("h2", { text: "Player count" }), legend(pl), lineChart(pl, { max: i.max, labels, pointLabels })),
      card(el("h2", { text: "Details" }), el("div", { className: "kv" }, info.map(([k, v]) => [el("span", { className: "muted small", text: k }), el("span", { text: v })])))),
    el("div", { className: "grid two" },
      card(el("h2", { text: `Players on this instance (${i.onlinePlayers.length})` }), i.onlinePlayers.length ? el("div", { className: "list" }, i.onlinePlayers.map((p) => el("a", { className: "row", href: `#/players/${p.id}` },
        el("strong", { className: "mono", text: p.name }), el("span", { className: "small muted", text: `${p.ping} ms` })))) : empty("Nobody online.")),
      card(el("h2", { text: "Plugins" }), el("div", { className: "list" }, i.plugins.map(([n, v]) => el("div", { className: "row static" }, el("span", { className: "mono", text: n }), badge(`v${v}`, "neutral")))))));
}

function consoleView(i, user) {
  const out = el("pre", { className: "console", tabindex: 0 });
  let lines = [];
  let level = "ALL";
  let query = "";
  let follow = true;
  let paused = false;

  const draw = () => {
    const shown = lines.filter((l) => (level === "ALL" || l.level === level || (level === "WARN" && l.level === "ERROR")) && (!query || l.text.toLowerCase().includes(query)));
    out.replaceChildren(...shown.slice(-400).map((l) => {
      const row = el("div", { className: `logLine ${l.level}` }, el("span", { className: "logTime", text: new Date(l.ts).toLocaleTimeString("en-GB") }), el("span", { className: "logLevel", text: l.level }), el("span", { text: l.text }));
      return row;
    }));
    if (follow) out.scrollTop = out.scrollHeight;
  };
  out.addEventListener("scroll", () => { follow = out.scrollTop + out.clientHeight >= out.scrollHeight - 24; });

  const levels = el("div", { className: "tabs" }, ["ALL", "INFO", "WARN", "ERROR", "DEBUG"].map((l) =>
    el("button", { type: "button", className: `tab${l === level ? " active" : ""}`, onClick: (e) => { level = l; levels.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === e.currentTarget)); draw(); } }, l === "WARN" ? "WARN+" : l)));
  const search = el("input", { className: "input", type: "search", placeholder: "Filter log …", "aria-label": "Filter log" });
  search.addEventListener("input", () => { query = search.value.toLowerCase(); draw(); });
  const pause = button("Pause", () => { paused = !paused; pause.textContent = paused ? "Resume" : "Pause"; });
  const download = button("Download", () => {
    const a = el("a", { href: URL.createObjectURL(new Blob([lines.map((l) => `${new Date(l.ts).toISOString()} ${l.level} ${l.text}`).join("\n")], { type: "text/plain" })), download: `${i.id}.log` });
    a.click();
    URL.revokeObjectURL(a.href);
  });

  const parts = [el("div", { className: "toolbar wrap" }, el("div", { className: "searchBox" }, icon("search", 18), search), pause, download), levels, out];

  if (can(user.role, "servers.console")) {
    const cmd = el("input", { className: "input mono", placeholder: "Command (try: help)", "aria-label": "Console command", autocapitalize: "off", autocomplete: "off", spellcheck: "false" });
    const history = [];
    let h = 0;
    const run = async () => {
      const text = cmd.value.trim();
      if (!text) return;
      history.push(text);
      h = history.length;
      cmd.value = "";
      if (await attempt(async () => { lines = lines.concat(await api.consoleExec(i.id, text)); })) { follow = true; draw(); }
    };
    cmd.addEventListener("keydown", (e) => {
      if (e.key === "Enter") run();
      if (e.key === "ArrowUp" && h > 0) cmd.value = history[--h];
      if (e.key === "ArrowDown") cmd.value = history[++h] ?? (h = history.length, "");
    });
    parts.push(el("div", { className: "toolbar" }, cmd, button("Send", run, "primary")), el("p", { className: "small muted", text: "Commands are sent to the instance console and recorded in the audit log." }));
  }

  const root = el("div", { className: "stack" }, parts);
  api.consoleLogs(i.id).then((l) => { lines = l; draw(); });
  const timer = setInterval(async () => {
    if (!root.isConnected) { clearInterval(timer); return; }
    if (paused || i.status === "offline") return;
    try { lines.push(await api.consoleTail(i.id)); if (lines.length > 1000) lines.shift(); draw(); } catch { /* ignore */ }
  }, 1800);
  return root;
}

function metric(label, value) {
  return el("div", {}, el("div", { className: "metricValue", text: value }), el("div", { className: "small muted", text: label }));
}

function miniStat(label, value, series) {
  return el("div", { className: "stat" }, el("span", { className: "statValue", text: value }), el("span", { className: "small muted", text: label }), sparkline(series));
}
