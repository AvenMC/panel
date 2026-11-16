import { el } from "./dom.js";

const NS = "http://www.w3.org/2000/svg";
const svg = (tag, attrs = {}) => {
  const n = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
  return n;
};

// Line/area chart. series: [{ label, color, values }], x labels optional.
export function lineChart(series, { height = 160, max, labels = [], pointLabels = [], format = (v) => v } = {}) {
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

  const guide = svg("line", { class: "guide", y1: pad.t, y2: height - pad.b, visibility: "hidden" });
  const dots = series.map((s) => svg("circle", { r: 4, fill: s.color, class: "pointDot", visibility: "hidden" }));
  root.append(guide, ...dots);
  const tip = el("div", { className: "tip", hidden: true });
  const wrap = el("div", { className: "chartWrap" }, root, tip);
  const show = (e) => {
    const r = root.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * w;
    const i = Math.min(n - 1, Math.max(0, Math.round(((vx - pad.l) / (w - pad.l - pad.r)) * (n - 1))));
    guide.setAttribute("x1", x(i)); guide.setAttribute("x2", x(i)); guide.setAttribute("visibility", "visible");
    dots.forEach((d, k) => { d.setAttribute("cx", x(i)); d.setAttribute("cy", y(series[k].values[i])); d.setAttribute("visibility", "visible"); });
    tip.replaceChildren(el("strong", { text: pointLabels[i] ?? `#${i + 1}` }),
      ...series.map((s) => {
        const dot = el("span", { className: "dot" }); dot.style.background = s.color;
        return el("div", { className: "tipRow" }, dot, el("span", { className: "muted", text: s.label }), el("b", { text: format(s.values[i]) }));
      }));
    tip.hidden = false;
    const px = (x(i) / w) * r.width;
    const tw = tip.offsetWidth;
    tip.style.left = `${Math.min(Math.max(px - tw / 2, 0), r.width - tw)}px`;
  };
  const hide = () => { tip.hidden = true; guide.setAttribute("visibility", "hidden"); dots.forEach((d) => d.setAttribute("visibility", "hidden")); };
  root.addEventListener("pointerdown", show);
  root.addEventListener("pointermove", show);
  root.addEventListener("pointerleave", hide);
  root.addEventListener("pointercancel", hide);
  return wrap;
}

// Generic tooltip for any element with a data-tip attribute (works with touch).
let globalTip;
export function initTips() {
  if (globalTip) return;
  globalTip = el("div", { className: "tip floating", hidden: true });
  document.body.append(globalTip);
  const move = (e) => {
    const t = e.target.closest?.("[data-tip]");
    if (!t) { globalTip.hidden = true; return; }
    globalTip.textContent = t.dataset.tip;
    globalTip.hidden = false;
    const tw = globalTip.offsetWidth;
    globalTip.style.left = `${Math.min(Math.max(e.clientX - tw / 2, 4), window.innerWidth - tw - 4)}px`;
    globalTip.style.top = `${Math.max(4, e.clientY - globalTip.offsetHeight - 14)}px`;
  };
  document.addEventListener("pointerover", move);
  document.addEventListener("pointermove", move);
  document.addEventListener("pointerdown", move);
  document.addEventListener("pointerleave", () => { globalTip.hidden = true; });
  window.addEventListener("hashchange", () => { globalTip.hidden = true; });
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
  return el("div", { className: "bars" }, rows.map((r) => el("div", { className: "barRow wide", "data-tip": `${r.label}: ${r.text ?? r.value}` },
    el("span", { className: "barLabel", text: r.label }),
    el("div", { className: "bar" }, el("div", { className: "barFill", style: `width:${(r.value / max) * 100}%` })),
    el("span", { className: "barCount", text: r.text ?? r.value }))));
}
