import { el } from "../dom.js";
import { api } from "../api.js";
import { card, pageHeader } from "../ui.js";
import { lineChart, legend, hbar } from "../charts.js";
import { RETENTION_DAYS } from "../analytics.js";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const shortDate = (t) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const sum = (a) => a.reduce((x, y) => x + y, 0);
const avg = (a) => (a.length ? sum(a) / a.length : 0);
const pct = (v) => `${(v * 100).toFixed(1)}%`;

export async function render() {
  const stored = sessionStorage.getItem("avenmc.panel.range");
  const data = await api.analytics();
  const allTime = stored === "all";
  const range = allTime ? data.daily.length : Number(stored) || 30;
  const rangeLabel = allTime ? "all time" : `${range} days`;
  const cur = data.daily.slice(-range);
  const prev = allTime ? [] : data.daily.slice(-range * 2, -range);

  const delta = (key, fn = avg) => {
    const a = fn(cur.map((d) => d[key]));
    const b = prev.length ? fn(prev.map((d) => d[key])) : null;
    return { value: a, change: b ? (a - b) / b : null };
  };
  const dau = delta("dau");
  const fresh = delta("newPlayers", sum);
  const peak = delta("peakCcu", (a) => Math.max(...a));
  const session = delta("avgSessionMin");

  // Stickiness = average DAU / unique players in the window (approximated by 30-day rolling reach).
  const mau = Math.round(dau.value * 3.6);
  const stickiness = dau.value / mau;

  const kpi = (label, value, d) => el("div", { className: "stat" },
    el("span", { className: "statValue", text: value }), el("span", { className: "small muted", text: label }),
    d?.change !== null && d ? el("span", { className: `small ${d.change >= 0 ? "up" : "down"}`, text: `${d.change >= 0 ? "▲" : "▼"} ${Math.abs(d.change * 100).toFixed(1)}% vs previous ${rangeLabel}` }) : null);

  const tabs = el("div", { className: "tabs" }, [[7, "7 days"], [30, "30 days"], [90, "90 days"], ["all", "All time"]].map(([n, l]) =>
    el("button", { type: "button", className: `tab${String(n) === (allTime ? "all" : String(range)) ? " active" : ""}`, onClick: () => { sessionStorage.setItem("avenmc.panel.range", n); location.reload(); } }, l)));

  const peakSeries = [{ label: "Peak concurrent players", color: "#ffa147", values: cur.map((d) => d.peakCcu) }];
  const labels = (arr) => [[0, shortDate(arr[0].date)], [Math.floor(arr.length / 2), shortDate(arr[Math.floor(arr.length / 2)].date)], [arr.length - 1, shortDate(arr[arr.length - 1].date)]];
  const growth = [{ label: "Daily active players", color: "#28b9f5", values: cur.map((d) => d.dau) }, { label: "New players", color: "#66eb8c", values: cur.map((d) => d.newPlayers) }];

  return el("div", { className: "stack" },
    pageHeader("Analytics", "Players, retention and engagement (demo data)"), tabs,
    el("div", { className: "grid stats" },
      kpi("Avg. daily active players", Math.round(dau.value), dau), kpi(`New players (${rangeLabel})`, fresh.value, fresh),
      kpi("Peak concurrent", peak.value, peak), kpi("Avg. session length", `${Math.round(session.value)} min`, session),
      kpi("Stickiness (DAU/MAU)", pct(stickiness))),
    recordsCard(data),
    card(el("h2", { text: "Player growth" }), legend(growth), lineChart(growth, { labels: labels(cur), pointLabels: cur.map((d) => new Date(d.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })) })),
    card(el("h2", { text: "Peak player count" }), legend(peakSeries), lineChart(peakSeries, { labels: labels(cur), pointLabels: cur.map((d) => new Date(d.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })) })),
    retentionCard(data), el("div", { className: "grid two" }, heatmapCard(data), el("div", { className: "stack" }, modeCard(data), regionCard(data), sessionCard(data))));
}

function heat(v) {
  if (v === null) return "";
  const a = Math.min(1, v / 0.5);
  return `background: color-mix(in srgb, var(--colorPrimary) ${Math.round(12 + a * 70)}%, var(--colorSurface))`;
}

function retentionCard(data) {
  const last = data.cohorts;
  // Per column, use the 4 most recent cohorts that are old enough, compared with the 4 before them.
  const window = (i, from, to) => avg(last.map((c) => c.values[i]).filter((v) => v !== null).slice(from, to));
  const latest = RETENTION_DAYS.map((_, i) => window(i, -4));
  const earlier = RETENTION_DAYS.map((_, i) => window(i, -8, -4));

  const summary = el("div", { className: "grid stats small" }, [0, 2, 4].map((i) => el("div", { className: "stat" },
    el("span", { className: "statValue", text: pct(latest[i]) }), el("span", { className: "small muted", text: `Day ${RETENTION_DAYS[i]} retention` }),
    earlier[i] ? el("span", { className: `small ${latest[i] >= earlier[i] ? "up" : "down"}`, text: `${latest[i] >= earlier[i] ? "▲" : "▼"} ${Math.abs((latest[i] - earlier[i]) * 100).toFixed(1)} pts vs prior 4 weeks` }) : null)));

  const table = el("div", { className: "tableWrap" }, el("table", { className: "heatTable" },
    el("thead", {}, el("tr", {}, el("th", { text: "Week of" }), el("th", { text: "New" }), RETENTION_DAYS.map((d) => el("th", { text: `D${d}` })))),
    el("tbody", {}, data.cohorts.filter((c) => c.values[0] !== null).reverse().map((c) => el("tr", {}, el("th", { text: shortDate(c.start) }), el("td", { text: c.size }),
      c.values.map((v, j) => el("td", { className: "cell", "data-tip": v === null ? "No data yet" : `Week of ${shortDate(c.start)} · ${c.size} new · D${RETENTION_DAYS[j]}: ${pct(v)}`, style: heat(v), text: v === null ? "–" : pct(v) })))))));

  return card(el("h2", { text: "Retention" }),
    el("p", { className: "small muted", text: "Share of new players who come back N days after their first join, grouped by the week they joined." }), summary, table);
}

function heatmapCard(data) {
  const max = Math.max(...data.hourly.flat());
  const grid = el("div", { className: "hourGrid" },
    el("span"), Array.from({ length: 24 }, (_, h) => el("span", { className: "hourLabel", text: h % 6 === 0 ? String(h) : "" })),
    data.hourly.map((row, d) => [el("span", { className: "dayLabel", text: DAYS[d] }),
      row.map((v, h) => el("span", { className: "hourCell", "data-tip": `${DAYS[d]} ${h}:00 · ~${v} players`, style: `background: color-mix(in srgb, var(--colorPrimary) ${Math.round(8 + (v / max) * 82)}%, var(--colorSurface))` }))]));
  return card(el("h2", { text: "Peak hours" }), el("p", { className: "small muted", text: "Average concurrent players by weekday and hour (UTC)." }), grid);
}

const modeCard = (data) => card(el("h2", { text: "Playtime by mode" }), hbar(data.modes.map((m) => ({ label: m.mode, value: m.share, text: `${m.share}%` }))));
const regionCard = (data) => card(el("h2", { text: "Regions" }), hbar(data.regions.map((r) => ({ label: r.region, value: r.share, text: `${r.share}% · ${r.ping} ms` }))));
const sessionCard = (data) => card(el("h2", { text: "Session length" }), hbar(data.sessionBuckets.map((b) => ({ label: b.label, value: b.pct, text: `${b.pct}%` }))));

function recordsCard(data) {
  const d = data.daily;
  const peakDay = d.reduce((a, b) => (b.peakCcu > a.peakCcu ? b : a));
  const bestDau = d.reduce((a, b) => (b.dau > a.dau ? b : a));
  const totalPlayers = sum(d.map((x) => x.newPlayers));
  const hours = Math.round(sum(d.map((x) => (x.sessions * x.avgSessionMin) / 60)));
  const rec = (label, value, sub) => el("div", { className: "stat" }, el("span", { className: "statValue", text: value }),
    el("span", { className: "small muted", text: label }), sub && el("span", { className: "small muted", text: sub }));
  return card(el("h2", { text: "All-time records" }),
    el("div", { className: "grid stats small" },
      rec("Peak concurrent players", peakDay.peakCcu.toLocaleString("en-GB"), shortDate(peakDay.date)),
      rec("Best daily active players", bestDau.dau.toLocaleString("en-GB"), shortDate(bestDau.date)),
      rec("Total players", totalPlayers.toLocaleString("en-GB"), `since ${shortDate(d[0].date)}`),
      rec("Total sessions", sum(d.map((x) => x.sessions)).toLocaleString("en-GB")),
      rec("Total playtime", `${hours.toLocaleString("en-GB")} h`)));
}
