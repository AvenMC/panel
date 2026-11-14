import { el, icon } from "../dom.js";
import { api } from "../api.js";
import { can } from "../roles.js";
import { card, pageHeader, badge, button, empty, field, select, attempt, loading, replaceContent } from "../ui.js";
import { relTime, fmtDate } from "../format.js";
import { openSanctionModal, TYPE_LABEL, TYPE_TONE } from "../sanctionModal.js";
import { refresh } from "../app.js";

const RANKS = ["Member", "VIP", "VIP+", "Youtuber", "Helper"];

export async function render(parts, user) {
  return parts[0] ? detail(parts[0], user) : list();
}

function list() {
  let q = "";
  let filter = "all";
  const results = el("div", { className: "list" });

  const load = async () => {
    replaceContent(results, loading());
    const players = await api.players(q, filter);
    replaceContent(results, players.length ? players.map((p) => el("a", { className: "row", href: `#/players/${p.id}` },
      el("div", {}, el("strong", { className: "mono", text: p.name }), el("div", { className: "small muted", text: `${p.rank} · ${p.region}${p.online ? ` · ${p.mode}` : ""}` })),
      el("div", { className: "rowEnd" }, p.banned && badge("Gebannt", "danger"), p.muted && badge("Gemutet", "info"), p.online ? badge("Online", "success") : el("span", { className: "small muted", text: relTime(p.lastSeen) })))) : empty("Keine Spieler gefunden."));
  };

  const search = el("input", { className: "input", type: "search", placeholder: "Spieler suchen …", "aria-label": "Spieler suchen" });
  let timer;
  search.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => { q = search.value; load(); }, 200); });
  const filters = select([["all", "Alle"], ["online", "Online"], ["banned", "Gebannt"], ["muted", "Gemutet"]], "all", { "aria-label": "Filter" });
  filters.addEventListener("change", () => { filter = filters.value; load(); });
  load();

  return el("div", { className: "stack" }, pageHeader("Spieler", "Suchen, ansehen und moderieren"),
    el("div", { className: "toolbar" }, el("div", { className: "searchBox" }, icon("search", 18), search), filters), card(results));
}

async function detail(pid, user) {
  const p = await api.player(pid);
  const canSanction = can(user.role, "sanction.issue");
  const act = (type) => button(TYPE_LABEL[type], () => openSanctionModal(user, p.id, p.name, type, refresh), type === "ban" ? "danger" : "secondary");

  const noteInput = el("textarea", { className: "input", rows: 2, placeholder: "Interne Notiz …" });
  const addNote = button("Notiz speichern", async () => {
    if (noteInput.value.trim() && await attempt(() => api.addNote(p.id, noteInput.value), "Notiz gespeichert")) refresh();
  });

  const rank = select(RANKS.includes(p.rank) ? RANKS.map((r) => [r, r]) : [...RANKS, p.rank].map((r) => [r, r]), p.rank);
  rank.addEventListener("change", async () => { if (await attempt(() => api.setRank(p.id, rank.value), "Rang geändert")) refresh(); });

  const sanctions = p.sanctions.length ? p.sanctions.map((s) => el("div", { className: "row static" },
    el("div", {}, el("div", {}, badge(TYPE_LABEL[s.type], TYPE_TONE[s.type]), " ", s.revokedAt && badge("Aufgehoben", "neutral")),
      el("div", { text: s.reason }), el("div", { className: "small muted", text: `${s.by} · ${fmtDate(s.createdAt)}${s.expiresAt && s.expiresAt !== s.createdAt ? ` · bis ${fmtDate(s.expiresAt)}` : s.expiresAt === null ? " · permanent" : ""}` })))) : [empty("Keine Einträge.")];

  return el("div", { className: "stack" },
    el("a", { className: "backLink muted", href: "#/players" }, icon("back", 16), "Alle Spieler"),
    el("div", { className: "profileHead" },
      el("div", {}, el("h1", { className: "mono", text: p.name }),
        el("div", { className: "chips" }, badge(p.rank, "neutral"), badge(p.region, "neutral"), p.online ? badge(`Online · ${p.mode}`, "success") : badge("Offline", "neutral"),
          p.banned && badge("Gebannt", "danger"), p.muted && badge("Gemutet", "info")))),
    canSanction && card(el("h2", { text: "Aktionen" }), el("div", { className: "btnRow" }, ["warn", "mute", "kick", "ban"].map(act))),
    el("div", { className: "grid stats small" },
      miniStat("Elo", p.elo), miniStat("Kills", p.kills), miniStat("Tode", p.deaths), miniStat("Spielzeit", `${p.playtimeH} Std.`)),
    el("div", { className: "grid two" },
      card(el("h2", { text: "Verlauf" }), el("div", { className: "list" }, sanctions)),
      el("div", { className: "stack" },
        can(user.role, "players.rank") && card(el("h2", { text: "Rang" }), field("Netzwerk-Rang", rank)),
        card(el("h2", { text: "Notizen" }), can(user.role, "players.notes") && el("div", { className: "stack" }, noteInput, addNote),
          el("div", { className: "list" }, p.notes.map((n) => el("div", { className: "row static" }, el("div", {}, el("div", { text: n.text }), el("div", { className: "small muted", text: `${n.author} · ${relTime(n.at)}` })))))))));
}

function miniStat(label, value) {
  return el("div", { className: "stat" }, el("span", { className: "statValue", text: value }), el("span", { className: "small muted", text: label }));
}
