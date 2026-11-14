// Fake but realistic Endstone console output for the test build.
const rngFor = (seed) => { let s = seed; return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296); };

const NAMES = ["xShadow", "PvPKing", "CrystalFox", "NodeBuffer", "MaceMaster", "LunaStrike", "Voltz", "KenzoPvP", "IceWolf", "Raven"];

function templates(i, r) {
  const n = () => NAMES[Math.floor(r() * NAMES.length)];
  const ms = Math.round(30 + r() * 400);
  return [
    ["INFO", `[Registry] Heartbeat sent (${i.players}/${i.max} players, ${i.tps} TPS)`],
    ["INFO", `[Server] ${n()} logged in from ${["EU", "NA", "AS"][Math.floor(r() * 3)]} proxy`],
    ["INFO", `[Server] ${n()} left the game`],
    ["INFO", `[Duels] Match started: ${n()} vs ${n()} on arena_${Math.floor(r() * 9) + 1}`],
    ["INFO", `[Duels] Match finished in ${Math.round(20 + r() * 90)}s, winner ${n()}`],
    ["INFO", `[Proxy] Transfer accepted for ${n()} (${ms} ms)`],
    ["DEBUG", `[Core] Arena reset completed in ${ms} ms`],
    ["DEBUG", `[Core] Directory refresh: ${Math.floor(r() * 6) + 3} instances known`],
    ["WARN", `[Server] Can't keep up! Tick took ${Math.round(55 + r() * 70)} ms`],
    ["WARN", `[Anticheat] ${n()} flagged for reach (${(3.1 + r()).toFixed(2)} blocks)`],
    ["ERROR", `[Registry] Heartbeat failed: timeout after 5000 ms, retrying`],
  ];
}

const WEIGHTS = [16, 10, 8, 10, 8, 8, 6, 5, 3, 3, 1];

function pickLine(i, r) {
  const t = templates(i, r);
  let roll = r() * WEIGHTS.reduce((a, b) => a + b, 0);
  for (let k = 0; k < t.length; k++) {
    roll -= WEIGHTS[k];
    if (roll <= 0) return t[k];
  }
  return t[0];
}

export function initialLogs(instance, count = 160) {
  const r = rngFor([...instance.id].reduce((a, c) => a + c.charCodeAt(0), 1));
  const now = Date.now();
  const lines = [
    { ts: now - count * 4000 - 9000, level: "INFO", text: `[Server] Starting Endstone ${instance.type} instance ${instance.id} v${instance.version}` },
    { ts: now - count * 4000 - 6000, level: "INFO", text: `[Plugins] Loaded endstone_${instance.type.toLowerCase()}, practice_core` },
    { ts: now - count * 4000 - 2000, level: "INFO", text: `[Server] Done! Listening on 0.0.0.0:19132` },
  ];
  for (let k = count; k > 0; k--) {
    const [level, text] = pickLine(instance, r);
    lines.push({ ts: now - k * 4000, level, text });
  }
  if (instance.status !== "online") lines.push({ ts: now - 3000, level: "ERROR", text: `[Registry] Instance status changed to ${instance.status}` });
  return lines;
}

export function nextLine(instance) {
  const [level, text] = pickLine(instance, Math.random);
  return { ts: Date.now(), level, text };
}

// Mock console commands. Every command is audited by the caller.
export function runCommand(instance, input, players) {
  const [cmd, ...args] = input.trim().split(/\s+/);
  const out = (text, level = "INFO") => [{ ts: Date.now(), level, text }];
  switch (cmd.toLowerCase()) {
    case "help": return out("Commands: help, list, tps, version, say <message>, kick <player>");
    case "list": return out(`There are ${instance.players}/${instance.max} players online: ${players.slice(0, 8).join(", ") || "-"}`);
    case "tps": return out(`TPS: ${instance.tps} (CPU ${instance.cpu}%, RAM ${instance.mem}%)`);
    case "version": return out(`Endstone 0.10.x, ${instance.type} plugin v${instance.version}`);
    case "say": return args.length ? out(`[Server] ${args.join(" ")}`) : out("Usage: say <message>", "WARN");
    case "kick": return args[0] ? out(`Kicked ${args[0]} from ${instance.id}`) : out("Usage: kick <player>", "WARN");
    default: return out(`Unknown command "${cmd}". Type "help" for a list.`, "WARN");
  }
}
