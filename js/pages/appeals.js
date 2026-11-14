import { el } from "../dom.js";
import { api } from "../api.js";
import { card, pageHeader, badge, button, empty, attempt } from "../ui.js";
import { relTime } from "../format.js";
import { TYPE_LABEL } from "../sanctionModal.js";
import { refresh } from "../app.js";

const STATUS = { open: ["Offen", "warn"], accepted: ["Angenommen", "success"], denied: ["Abgelehnt", "neutral"] };

export async function render() {
  const appeals = await api.appeals();
  return el("div", { className: "stack" }, pageHeader("Einsprüche", "Entscheidungen über Sanktionen"),
    appeals.length ? appeals.map((a) => card(
      el("div", { className: "profileHead" }, el("div", {}, el("a", { className: "mono", href: `#/players/${a.sanction.playerId}`, text: a.playerName }),
        el("p", { className: "muted small", text: `${TYPE_LABEL[a.sanction.type]}: ${a.sanction.reason} · ${relTime(a.createdAt)}` })), badge(...STATUS[a.status])),
      el("p", { text: `„${a.text}“` }),
      a.status === "open" && el("div", { className: "btnRow" },
        button("Annehmen & aufheben", async () => { if (await attempt(() => api.decideAppeal(a.id, true), "Einspruch angenommen")) refresh(); }, "primary"),
        button("Ablehnen", async () => { if (await attempt(() => api.decideAppeal(a.id, false), "Einspruch abgelehnt")) refresh(); }, "danger")))) : card(empty("Keine Einsprüche.")));
}
