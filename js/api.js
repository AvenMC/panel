import { config } from "./config.js";
import { seedData } from "./seed.js";
import { can, canManageRole, MAX_TEMP_MS } from "./roles.js";
import { getUser } from "./auth.js";

// All pages talk to this module only. "mock" keeps data in localStorage;
// a "live" adapter can implement the same functions against the backend later.
const KEY = "avenmc.panel.data.v1";
let db = load();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && raw.version === 1) return raw;
  } catch { /* fall through to seed */ }
  return seedData();
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(db));
}

const wait = () => new Promise((r) => setTimeout(r, 60));
const id = (prefix, counter) => `${prefix}${++db.counters[counter]}`;

function actor() {
  const u = getUser();
  if (!u) throw new Error("Nicht angemeldet.");
  return u;
}

function need(permission) {
  const u = actor();
  if (!can(u.role, permission)) throw new Error("Dafür fehlt dir die Berechtigung.");
  return u;
}

function log(action, target, details) {
  const u = actor();
  db.audit.unshift({ id: id("l", "audit"), actor: u.name, role: u.role, action, target, details, at: Date.now() });
  db.audit.length = Math.min(db.audit.length, 500);
}

const player = (pid) => db.players.find((p) => p.id === pid);

export function isActive(s) {
  return (s.type === "ban" || s.type === "mute") && !s.revokedAt && (s.expiresAt === null || s.expiresAt > Date.now());
}

function withState(p) {
  const active = db.sanctions.filter((s) => s.playerId === p.id && isActive(s));
  return { ...p, banned: active.some((s) => s.type === "ban"), muted: active.some((s) => s.type === "mute") };
}

async function call(fn) {
  if (config.apiMode !== "mock") throw new Error("Live-Modus ist noch nicht angebunden.");
  await wait();
  const result = fn();
  save();
  return result;
}

export const api = {
  stats: () => call(() => {
    const online = db.players.filter((p) => p.online);
    const byRegion = ["EU", "NA", "AS"].map((r) => ({
      region: r, count: online.filter((p) => p.region === r).length,
    }));
    return {
      online: online.length, byRegion,
      openReports: db.reports.filter((r) => r.status === "open").length,
      activeBans: db.sanctions.filter((s) => s.type === "ban" && isActive(s)).length,
      activeMutes: db.sanctions.filter((s) => s.type === "mute" && isActive(s)).length,
      openAppeals: db.appeals.filter((a) => a.status === "open").length,
      instances: {
        online: db.instances.filter((i) => i.status === "online").length,
        total: db.instances.length,
      },
      recentSanctions: db.sanctions.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)
        .map((s) => ({ ...s, playerName: player(s.playerId)?.name })),
    };
  }),

  players: (q = "", filter = "all") => call(() => {
    const term = q.trim().toLowerCase();
    return db.players.map(withState).filter((p) => {
      if (term && !p.name.toLowerCase().includes(term)) return false;
      if (filter === "online") return p.online;
      if (filter === "banned") return p.banned;
      if (filter === "muted") return p.muted;
      return true;
    }).sort((a, b) => b.online - a.online || a.name.localeCompare(b.name));
  }),

  player: (pid) => call(() => {
    const p = player(pid);
    if (!p) throw new Error("Spieler nicht gefunden.");
    return {
      ...withState(p),
      sanctions: db.sanctions.filter((s) => s.playerId === pid).sort((a, b) => b.createdAt - a.createdAt),
      reports: db.reports.filter((r) => r.targetId === pid),
    };
  }),

  addNote: (pid, text) => call(() => {
    const u = need("players.notes");
    const p = player(pid);
    p.notes.unshift({ id: id("n", "note"), author: u.name, text: text.trim(), at: Date.now() });
    log("player.note", p.name, text.trim());
  }),

  setRank: (pid, rank) => call(() => {
    need("players.rank");
    const p = player(pid);
    log("player.rank", p.name, `${p.rank} → ${rank}`);
    p.rank = rank;
  }),

  // durationMs: 0 for instant types (warn/kick), null for permanent.
  sanction: (pid, type, reason, durationMs) => call(() => {
    const u = need("sanction.issue");
    const p = player(pid);
    if (!reason.trim()) throw new Error("Bitte einen Grund angeben.");
    const timed = type === "ban" || type === "mute";
    if (timed && (durationMs === null || durationMs > MAX_TEMP_MS) && !can(u.role, "sanction.permanent")) {
      throw new Error("Längere Sanktionen darf nur ein Admin verhängen.");
    }
    const now = Date.now();
    db.sanctions.push({
      id: id("s", "sanction"), playerId: pid, type, reason: reason.trim(), by: u.name, createdAt: now,
      expiresAt: timed ? (durationMs === null ? null : now + durationMs) : now, revokedBy: null, revokedAt: null,
    });
    if (type === "kick" || type === "ban") p.online = false;
    log(`sanction.${type}`, p.name, reason.trim());
  }),

  sanctions: (filter = "active") => call(() => db.sanctions.slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .filter((s) => filter === "all" || (filter === "active" ? isActive(s) : s.type === filter))
    .map((s) => ({ ...s, playerName: player(s.playerId)?.name, active: isActive(s) }))),

  revoke: (sid) => call(() => {
    const u = need("sanction.revoke");
    const s = db.sanctions.find((x) => x.id === sid);
    s.revokedBy = u.name;
    s.revokedAt = Date.now();
    log(`sanction.revoke`, player(s.playerId).name, `${s.type} aufgehoben`);
  }),

  reports: (status = "all") => call(() => db.reports.slice().sort((a, b) => b.createdAt - a.createdAt)
    .filter((r) => status === "all" || r.status === status)
    .map((r) => ({ ...r, targetName: player(r.targetId)?.name }))),

  report: (rid) => call(() => {
    const r = db.reports.find((x) => x.id === rid);
    if (!r) throw new Error("Report nicht gefunden.");
    return { ...r, targetName: player(r.targetId)?.name };
  }),

  updateReport: (rid, patch) => call(() => {
    const u = need("reports.handle");
    const r = db.reports.find((x) => x.id === rid);
    if (patch.status) r.status = patch.status;
    if (patch.assignee !== undefined) r.assignee = patch.assignee === "me" ? u.name : patch.assignee;
    if (patch.comment) r.comments.push({ author: u.name, text: patch.comment.trim(), at: Date.now() });
    log("report.update", `#${r.id}`, patch.status ? `Status: ${patch.status}` : patch.comment ? "Kommentar" : "Zugewiesen");
  }),

  appeals: () => call(() => db.appeals.slice().sort((a, b) => b.createdAt - a.createdAt).map((a) => {
    const s = db.sanctions.find((x) => x.id === a.sanctionId);
    return { ...a, sanction: s, playerName: s && player(s.playerId)?.name };
  })),

  decideAppeal: (aid, accept) => call(() => {
    const u = need("appeals.handle");
    const a = db.appeals.find((x) => x.id === aid);
    const s = db.sanctions.find((x) => x.id === a.sanctionId);
    a.status = accept ? "accepted" : "denied";
    if (accept && isActive(s)) {
      s.revokedBy = u.name;
      s.revokedAt = Date.now();
    }
    log("appeal.decide", player(s.playerId).name, accept ? "angenommen" : "abgelehnt");
  }),

  instances: () => call(() => db.instances.slice()),

  restartInstance: (iid) => call(() => {
    need("servers.control");
    const i = db.instances.find((x) => x.id === iid);
    i.status = "online";
    i.tps = 20;
    i.startedAt = Date.now();
    log("server.restart", i.id, "Neustart ausgelöst");
  }),

  instanceLogs: (iid) => call(() => {
    need("servers.logs");
    const i = db.instances.find((x) => x.id === iid);
    const t = (m) => new Date(Date.now() - m * 60000).toLocaleTimeString("de-DE");
    return [
      `[${t(9)}] INFO  Heartbeat an Registry gesendet (${i.players}/${i.max})`,
      `[${t(7)}] INFO  Tick-Durchschnitt ${i.tps} TPS`,
      ...(i.status !== "online" ? [`[${t(5)}] WARN  Heartbeat-Timeout, Status: ${i.status}`] : []),
      `[${t(3)}] INFO  Spieler verbunden, Auslastung ${i.cpu}% CPU`,
      `[${t(1)}] INFO  Heartbeat an Registry gesendet (${i.players}/${i.max})`,
    ];
  }),

  system: () => call(() => ({ flags: db.flags, maintenance: db.maintenance, broadcasts: db.broadcasts })),

  toggleFlag: (key) => call(() => {
    need("flags.manage");
    const f = db.flags.find((x) => x.key === key);
    f.enabled = !f.enabled;
    log("flag.toggle", key, f.enabled ? "aktiviert" : "deaktiviert");
  }),

  setMaintenance: (enabled, message) => call(() => {
    need("servers.control");
    db.maintenance = { enabled, message: message.trim() || db.maintenance.message };
    log("maintenance.set", "Netzwerk", enabled ? "aktiviert" : "deaktiviert");
  }),

  broadcast: (text) => call(() => {
    const u = need("broadcast.send");
    db.broadcasts.unshift({ id: id("b", "broadcast"), text: text.trim(), by: u.name, at: Date.now() });
    log("broadcast.send", "Netzwerk", text.trim());
  }),

  staff: () => call(() => {
    need("staff.view");
    return db.staff.slice();
  }),

  addStaff: (discordId, name, role) => call(() => {
    const u = need("staff.view");
    if (!canManageRole(u.role, role)) throw new Error("Diese Rolle darfst du nicht vergeben.");
    if (!/^\d{5,25}$/.test(discordId)) throw new Error("Ungültige Discord-ID.");
    if (db.staff.some((s) => s.discordId === discordId)) throw new Error("Diese Discord-ID ist bereits Staff.");
    db.staff.push({ discordId, name: name.trim() || discordId, role });
    log("staff.add", name, `Rolle: ${role}`);
  }),

  setStaffRole: (discordId, role) => call(() => {
    const u = need("staff.view");
    const s = db.staff.find((x) => x.discordId === discordId);
    if (!canManageRole(u.role, s.role) || !canManageRole(u.role, role)) throw new Error("Keine Berechtigung für diese Rolle.");
    log("staff.role", s.name, `${s.role} → ${role}`);
    s.role = role;
  }),

  removeStaff: (discordId) => call(() => {
    const u = need("staff.view");
    const s = db.staff.find((x) => x.discordId === discordId);
    if (!canManageRole(u.role, s.role)) throw new Error("Keine Berechtigung für diese Rolle.");
    db.staff = db.staff.filter((x) => x !== s);
    log("staff.remove", s.name, s.role);
  }),

  audit: (q = "") => call(() => {
    need("audit.view");
    const term = q.trim().toLowerCase();
    return db.audit.filter((e) => !term || [e.actor, e.action, e.target, e.details].join(" ").toLowerCase().includes(term));
  }),

  resetData: () => call(() => {
    need("system.reset");
    const u = getUser();
    db = seedData();
    if (!db.staff.some((s) => s.discordId === u.discordId)) db.staff.push({ discordId: u.discordId, name: u.name, role: u.role });
  }),

  // Used by login; no permission needed.
  findStaff: (discordId) => db.staff.find((s) => s.discordId === discordId) || null,
};
