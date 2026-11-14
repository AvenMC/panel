import { HOUR, DAY } from "./format.js";

// Deterministic pseudo random so every reset yields the same demo data.
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

const NAMES = ["xShadow", "PvPKing", "CrystalFox", "NodeBuffer", "MaceMaster", "LunaStrike", "Voltz", "KenzoPvP", "BlazeRunner",
  "IceWolf", "Nightfall", "ZeroPing", "ClutchGod", "FrostByte", "Raven", "Hexa", "Pixelator", "Kiwi", "Rushyy", "TNTandy",
  "Sakura", "Orbit", "Mythic_Leo", "DrDuel", "Ghostly", "Tilted", "Wavey", "Axel", "Nova", "Comet", "Slick", "Bolt", "Echo",
  "Fenrir", "Jinx", "Kraken", "Lynx", "Mirage", "Onyx", "Quartz"];
const RANKS = ["Member", "Member", "Member", "VIP", "VIP+", "Youtuber"];
const REGIONS = ["EU", "EU", "EU", "NA", "AS"];
const MODES = ["Nodebuff", "Crystal", "Mace", "Lobby", "Hub"];

export function seedData() {
  const r = rng(42);
  const now = Date.now();
  const pick = (a) => a[Math.floor(r() * a.length)];

  const players = NAMES.map((name, i) => {
    const online = r() < 0.4;
    return {
      id: `p${i + 1}`, name, rank: pick(RANKS), region: pick(REGIONS), online,
      mode: online ? pick(MODES) : null,
      firstSeen: now - Math.floor(r() * 300) * DAY,
      lastSeen: online ? now : now - Math.floor(r() * 72) * HOUR,
      playtimeH: Math.floor(r() * 400), elo: 800 + Math.floor(r() * 1400),
      kills: Math.floor(r() * 5000), deaths: Math.floor(r() * 4000), notes: [],
    };
  });
  players[3].notes.push({ id: "n1", author: "Lena", text: "Wurde schon zweimal wegen Spam verwarnt.", at: now - 5 * DAY });

  const staff = [
    { discordId: "100000000000000001", name: "Chris", role: "owner" },
    { discordId: "100000000000000002", name: "Dev Dan", role: "developer" },
    { discordId: "100000000000000003", name: "Admin Alex", role: "admin" },
    { discordId: "100000000000000004", name: "Lena", role: "mod" },
    { discordId: "100000000000000005", name: "Tom", role: "mod" },
  ];

  const reasons = ["Hacking (Killaura)", "Beleidigung im Chat", "Spam", "Bug-Abuse", "Werbung", "Toxisches Verhalten"];
  const sanctions = [];
  const add = (playerId, type, reason, by, agoH, durH) => {
    const createdAt = now - agoH * HOUR;
    const expiresAt = durH === null ? null : createdAt + durH * HOUR;
    sanctions.push({
      id: `s${sanctions.length + 1}`, playerId, type, reason, by, createdAt, expiresAt,
      revokedBy: null, revokedAt: null,
    });
  };
  add("p2", "ban", reasons[0], "Admin Alex", 30, null);
  add("p5", "mute", reasons[1], "Lena", 4, 24);
  add("p9", "ban", reasons[3], "Tom", 60, 24 * 7);
  add("p4", "warn", reasons[2], "Lena", 24 * 5, 0);
  add("p4", "mute", reasons[2], "Tom", 24 * 3, 6);
  add("p12", "kick", reasons[5], "Tom", 12, 0);
  add("p15", "ban", reasons[0], "Chris", 200, 24 * 30);
  add("p20", "mute", reasons[4], "Lena", 1, 72);
  sanctions[sanctions.length - 1].playerId = "p20";

  const reports = [
    ["p2", "CrystalFox", "Killaura in Crystal", "open"],
    ["p7", "Voltz", "Beleidigt mich im Chat", "open"],
    ["p11", "Raven", "Spammt Werbung", "progress"],
    ["p18", "Orbit", "Nutzt Bug in der Arena", "open"],
    ["p23", "Wavey", "Toxisches Verhalten im Duell", "done"],
    ["p31", "Comet", "Reach-Hacks vermutet", "open"],
  ].map(([targetId, reporter, reason, status], i) => ({
    id: `r${i + 1}`, targetId, reporter, reason, status,
    assignee: status === "progress" ? "Lena" : null,
    createdAt: now - (i + 1) * 3 * HOUR, comments: [],
  }));

  const appeals = [
    { id: "a1", sanctionId: "s3", text: "Ich wusste nicht, dass das ein Bug war. Bitte um Entsperrung.", status: "open", createdAt: now - 6 * HOUR },
    { id: "a2", sanctionId: "s7", text: "Ich wurde fälschlich gemeldet.", status: "open", createdAt: now - 20 * HOUR },
  ];

  const mk = (type, region, n, max) => ({
    id: `${type.toLowerCase()}-${region.toLowerCase()}-${n}`, type, region,
    players: Math.floor(r() * max), max, tps: +(19 + r()).toFixed(1),
    cpu: 10 + Math.floor(r() * 60), mem: 30 + Math.floor(r() * 50),
    status: "online", version: "1.4.2", startedAt: now - Math.floor(r() * 10) * DAY,
  });
  const instances = [
    mk("Hub", "EU", 1, 120), mk("Lobby", "EU", 1, 80), mk("Lobby", "EU", 2, 80), mk("Duels", "EU", 1, 100),
    mk("FFA", "EU", 1, 60), mk("Training", "EU", 1, 40), mk("Hub", "NA", 1, 80), mk("Duels", "NA", 1, 60),
    mk("Hub", "AS", 1, 60), mk("Duels", "AS", 1, 40),
  ];
  instances[8].status = "degraded";
  instances[8].tps = 14.2;
  instances[9].status = "offline";
  instances[9].players = 0;

  const flags = [
    { key: "ranked_queue", label: "Ranked Queue", desc: "Ranked Matchmaking aktivieren", enabled: true },
    { key: "cross_region", label: "Cross-Region Matches", desc: "Spiele zwischen Regionen erlauben", enabled: false },
    { key: "new_hub_ui", label: "Neues Hub-Menü", desc: "Überarbeitetes Auswahlmenü im Hub", enabled: true },
    { key: "season_rewards", label: "Season Belohnungen", desc: "Belohnungen am Season-Ende vergeben", enabled: false },
  ];

  const audit = [
    { id: "l1", actor: "Admin Alex", role: "admin", action: "sanction.ban", target: "xShadow", details: "Permanent: Hacking (Killaura)", at: now - 30 * HOUR },
    { id: "l2", actor: "Lena", role: "mod", action: "sanction.mute", target: "Kiwi", details: "24 Std.: Beleidigung im Chat", at: now - 4 * HOUR },
    { id: "l3", actor: "Dev Dan", role: "developer", action: "flag.toggle", target: "new_hub_ui", details: "aktiviert", at: now - 2 * DAY },
  ];

  return {
    version: 1, players, staff, sanctions, reports, appeals, instances, flags, audit, broadcasts: [],
    maintenance: { enabled: false, message: "Wartungsarbeiten, wir sind gleich zurück!" },
    counters: { sanction: 100, note: 100, audit: 100, broadcast: 1 },
  };
}
