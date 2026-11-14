import { el } from "../dom.js";
import { api } from "../api.js";
import { card, pageHeader, badge, button, empty, attempt } from "../ui.js";
import { relTime } from "../format.js";
import { TYPE_LABEL } from "../sanctionModal.js";
import { refresh } from "../app.js";

const STATUS = { open: ["Open", "warn"], accepted: ["Accepted", "success"], denied: ["Denied", "neutral"] };

export async function render() {
  const appeals = await api.appeals();
  return el("div", { className: "stack" }, pageHeader("Appeals", "Decide on sanction appeals"),
    appeals.length ? appeals.map((a) => card(
      el("div", { className: "profileHead" }, el("div", {}, el("a", { className: "mono", href: `#/players/${a.sanction.playerId}`, text: a.playerName }),
        el("p", { className: "muted small", text: `${TYPE_LABEL[a.sanction.type]}: ${a.sanction.reason} · ${relTime(a.createdAt)}` })), badge(...STATUS[a.status])),
      el("p", { text: `“${a.text}”` }),
      a.status === "open" && el("div", { className: "btnRow" },
        button("Accept and revoke", async () => { if (await attempt(() => api.decideAppeal(a.id, true), "Appeal accepted")) refresh(); }, "primary"),
        button("Deny", async () => { if (await attempt(() => api.decideAppeal(a.id, false), "Appeal denied")) refresh(); }, "danger")))) : card(empty("No appeals.")));
}
