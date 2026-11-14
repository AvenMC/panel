import { el, icon } from "../dom.js";
import { api } from "../api.js";
import { card, pageHeader, badge, button, empty, select, attempt } from "../ui.js";
import { relTime } from "../format.js";
import { openSanctionModal, TYPE_LABEL } from "../sanctionModal.js";
import { refresh } from "../app.js";

const STATUS = { open: ["Offen", "danger"], progress: ["In Arbeit", "warn"], done: ["Erledigt", "success"] };

export async function render(parts, user) {
  return parts[0] ? detail(parts[0], user) : list(parts);
}

async function list() {
  const filter = sessionStorage.getItem("avenmc.panel.reportFilter") || "open";
  const reports = await api.reports(filter);
  const tabs = el("div", { className: "tabs" }, [["open", "Offen"], ["progress", "In Arbeit"], ["done", "Erledigt"], ["all", "Alle"]].map(([v, l]) =>
    el("button", { type: "button", className: `tab${v === filter ? " active" : ""}`, onClick: () => { sessionStorage.setItem("avenmc.panel.reportFilter", v); refresh(); } }, l)));
  return el("div", { className: "stack" }, pageHeader("Reports", "Meldungen von Spielern bearbeiten"), tabs,
    card(reports.length ? el("div", { className: "list" }, reports.map((r) => el("a", { className: "row", href: `#/reports/${r.id}` },
      el("div", {}, el("strong", { className: "mono", text: r.targetName }), el("div", { className: "small muted", text: `${r.reason} · von ${r.reporter}` })),
      el("div", { className: "rowEnd" }, badge(...STATUS[r.status]), el("span", { className: "small muted", text: relTime(r.createdAt) }))))) : empty("Keine Reports.")));
}

async function detail(rid, user) {
  const r = await api.report(rid);
  const status = select(Object.entries(STATUS).map(([k, [l]]) => [k, l]), r.status);
  status.addEventListener("change", async () => { if (await attempt(() => api.updateReport(r.id, { status: status.value }), "Status geändert")) refresh(); });
  const comment = el("textarea", { className: "input", rows: 2, placeholder: "Kommentar …" });

  return el("div", { className: "stack" },
    el("a", { className: "backLink muted", href: "#/reports" }, icon("back", 16), "Alle Reports"),
    card(el("div", { className: "profileHead" }, el("div", {}, el("h1", { className: "mono", text: r.targetName }), el("p", { className: "muted", text: r.reason }),
      el("div", { className: "chips" }, badge(...STATUS[r.status]), badge(`Von ${r.reporter}`, "neutral"), r.assignee && badge(`Bearbeitet: ${r.assignee}`, "info")))),
      el("div", { className: "btnRow" },
        button("Mir zuweisen", async () => { if (await attempt(() => api.updateReport(r.id, { assignee: "me", status: "progress" }), "Zugewiesen")) refresh(); }, "primary"),
        ["warn", "mute", "ban"].map((t) => button(TYPE_LABEL[t], () => openSanctionModal(user, r.targetId, r.targetName, t, async () => { await api.updateReport(r.id, { status: "done" }); refresh(); }), t === "ban" ? "danger" : "secondary")),
        el("a", { className: "btn secondary", href: `#/players/${r.targetId}` }, "Spielerprofil")),
      el("label", { className: "field" }, el("span", { className: "small muted", text: "Status" }), status)),
    card(el("h2", { text: "Kommentare" }), el("div", { className: "list" }, r.comments.map((c) => el("div", { className: "row static" }, el("div", {}, el("div", { text: c.text }), el("div", { className: "small muted", text: `${c.author} · ${relTime(c.at)}` }))))),
      el("div", { className: "stack" }, comment, button("Kommentar senden", async () => { if (comment.value.trim() && await attempt(() => api.updateReport(r.id, { comment: comment.value }))) refresh(); }))));
}
