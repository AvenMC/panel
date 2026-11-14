import { el } from "./dom.js";

const NS = "http://www.w3.org/2000/svg";
const svg = (tag, attrs = {}) => {
  const n = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
  return n;
};

// Line/area chart. series: [{ label, color, values }], x labels optional.
export function lineChart(series, { height = 160, max, labels = [], format = (v) => v } = {}) {
  const w = 600;
  const pad = { l: 34, r: 8, t: 8, b: 20 };
  const all = series.flatMap((s) => s.values);
  const top = max ?? Math.max(1, Math.ceil(Math.max(...all) * 1.1));
  const n = series[0].values.length;
  const x = (i) => pad.l + (i / Math.max(1, n - 1)) * (w - pad.l - pad.r);
  const y = (v) => pad.t + (1 - v / top) * (height - pad.t - pad.b);

  const root = svg("svg", { viewBox: `0 0 ${w} ${height}`, class: "chart", role: "img" });
  for (let g = 0; g <= 3; g++) {
    const v = (top / 3) * g;
    root.append(svg("line", { x1: pad.l, x2: w - pad.r, y1: y(v), y2: y(v), class: "gridLine" }));
    const t = svg("text", { x: pad.l - 6, y: y(v) + 4, class: "axis", "text-anchor": "end" });
    t.textContent = format(Math.round(v * 10) / 10);
    root.append(t);
  }
  labels.forEach(([i, text]) => {
    const t = svg("text", { x: x(i), y: height - 4, class: "axis", "text-anchor": i === 0 ? "start" : i === n - 1 ? "end" : "middle" });
    t.textContent = text;
    root.append(t);
  });
  series.forEach((s) => {
    const pts = s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
    root.append(svg("polygon", { points: `${x(0)},${y(0)} ${pts.join(" ")} ${x(n - 1)},${y(0)}`, fill: s.color, opacity: 0.12 }));
    root.append(svg("polyline", { points: pts.join(" "), fill: "none", stroke: s.color, "stroke-width": 2, "stroke-linejoin": "round", "vector-effect": "non-scaling-stroke" }));
  });
  return root;
}

export function sparkline(values, color = "var(--colorPrimary)") {
  const w = 120;
  const h = 32;
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - 3 - ((v - min) / (max - min || 1)) * (h - 6)).toFixed(1)}`);
  const root = svg("svg", { viewBox: `0 0 ${w} ${h}`, class: "spark", preserveAspectRatio: "none", "aria-hidden": "true" });
  root.append(svg("polyline", { points: pts.join(" "), fill: "none", stroke: color, "stroke-width": 2, "vector-effect": "non-scaling-stroke" }));
  return root;
}

export function legend(series) {
  return el("div", { className: "legend" }, series.map((s) => {
    const dot = el("span", { className: "dot" });
    dot.style.background = s.color;
    return el("span", { className: "small muted" }, dot, s.label);
  }));
}

export function hbar(rows) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return el("div", { className: "bars" }, rows.map((r) => el("div", { className: "barRow wide" },
    el("span", { className: "barLabel", text: r.label }),
    el("div", { className: "bar" }, el("div", { className: "barFill", style: `width:${(r.value / max) * 100}%` })),
    el("span", { className: "barCount", text: r.text ?? r.value }))));
}
