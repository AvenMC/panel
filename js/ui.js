import { el, icon, replaceContent } from "./dom.js";
import { ROLES } from "./roles.js";

export function badge(text, tone = "neutral") {
  return el("span", { className: `badge ${tone}`, text });
}

export function roleBadge(role) {
  const r = ROLES[role];
  const b = el("span", { className: "badge role", text: r.label });
  b.style.setProperty("--badgeColor", r.color);
  return b;
}

export function card(...children) {
  return el("section", { className: "card" }, ...children);
}

export function pageHeader(title, subtitle, ...actions) {
  return el("div", { className: "pageHeader" },
    el("div", {}, el("h1", { text: title }), subtitle && el("p", { className: "muted", text: subtitle })),
    actions.length ? el("div", { className: "headerActions" }, ...actions) : null);
}

export function button(label, onClick, variant = "secondary", extra = {}) {
  return el("button", { type: "button", className: `btn ${variant}`, onClick, ...extra }, label);
}

export function empty(text) {
  return el("div", { className: "empty muted", text });
}

export function loading() {
  return el("div", { className: "empty muted", text: "Loading …" });
}

export function field(label, control) {
  return el("label", { className: "field" }, el("span", { className: "small muted", text: label }), control);
}

export function select(options, value, props = {}) {
  const s = el("select", { className: "input", ...props },
    options.map(([v, l]) => el("option", { value: v, text: l, selected: v === value ? true : null })));
  s.value = value;
  return s;
}

export function toast(message, tone = "info") {
  let host = document.getElementById("toasts");
  if (!host) {
    host = el("div", { id: "toasts", "aria-live": "polite" });
    document.body.append(host);
  }
  const t = el("div", { className: `toast ${tone}`, text: message });
  host.append(t);
  setTimeout(() => t.remove(), 3500);
}

// Runs an async action, shows errors as toast and returns whether it worked.
export async function attempt(fn, successMessage) {
  try {
    await fn();
    if (successMessage) toast(successMessage, "success");
    return true;
  } catch (e) {
    toast(e.message || "Error", "danger");
    return false;
  }
}

// Bottom sheet on mobile, centered dialog on desktop.
export function modal(title, body, actions = []) {
  const close = () => { overlay.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = (e) => e.key === "Escape" && close();
  const overlay = el("div", { className: "overlay", onClick: (e) => e.target === overlay && close() },
    el("div", { className: "sheet", role: "dialog", "aria-modal": "true", "aria-label": title },
      el("div", { className: "sheetHead" }, el("h2", { text: title }),
        el("button", { type: "button", className: "iconBtn", "aria-label": "Close", onClick: close }, icon("close"))),
      el("div", { className: "sheetBody" }, body),
      actions.length ? el("div", { className: "sheetActions" }, actions.map((a) => a(close))) : null));
  document.addEventListener("keydown", onKey);
  document.body.append(overlay);
  return close;
}

export function confirmDialog(title, text, confirmLabel, onConfirm, variant = "danger") {
  modal(title, el("p", { className: "muted", text }), [
    (close) => button("Cancel", close),
    (close) => button(confirmLabel, async () => { close(); await onConfirm(); }, variant),
  ]);
}

export { replaceContent };
