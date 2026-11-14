import { el, icon } from "../dom.js";
import { api } from "../api.js";
import { card, pageHeader, empty, roleBadge, replaceContent } from "../ui.js";
import { fmtDate } from "../format.js";

export async function render() {
  const results = el("div", { className: "list" });
  const show = async (q) => {
    const entries = await api.audit(q);
    replaceContent(results, entries.length ? entries.map((e) => el("div", { className: "row static" },
      el("div", {}, el("div", {}, el("strong", { text: e.actor }), " ", roleBadge(e.role)),
        el("div", { text: `${e.action} · ${e.target}` }), el("div", { className: "small muted", text: e.details })),
      el("span", { className: "small muted", text: fmtDate(e.at) }))) : empty("Keine Einträge."));
  };
  const search = el("input", { className: "input", type: "search", placeholder: "Filtern …", "aria-label": "Filtern" });
  search.addEventListener("input", () => show(search.value));
  await show("");
  return el("div", { className: "stack" }, pageHeader("Audit-Log", "Jede Aktion im Panel wird protokolliert"),
    el("div", { className: "searchBox" }, icon("search", 18), search), card(results));
}
