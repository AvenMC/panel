// Deterministic demo analytics. A real backend would aggregate these from sessions and matches.
const DAY = 86400000;

function rng(seed) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

export const RETENTION_DAYS = [1, 3, 7, 14, 30];
export const MODES = ["Nodebuff", "Crystal", "Mace", "FFA", "Training"];
const startOfDay = (t) => Math.floor(t / DAY) * DAY;

export function buildAnalytics(totalDays = 90) {
  const r = rng(7);
  const today = startOfDay(Date.now());
  const daily = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const date = today - i * DAY;
    const weekend = [0, 6].includes(new Date(date).getUTCDay());
    const growth = 1 + (totalDays - i) / totalDays * 0.6;
    const dau = Math.round((180 + r() * 40) * growth * (weekend ? 1.25 : 1));
    daily.push({
      date, dau, newPlayers: Math.round(dau * (0.16 + r() * 0.08)),
      sessions: Math.round(dau * (1.8 + r() * 0.5)), avgSessionMin: Math.round(24 + r() * 10 + (weekend ? 5 : 0)),
      peakCcu: Math.round(dau * (0.24 + r() * 0.05)),
    });
  }

  // Weekly cohorts: share of new players that return exactly N days after their first join.
  const base = { 1: 0.46, 3: 0.33, 7: 0.25, 14: 0.18, 30: 0.12 };
  const cohorts = [];
  for (let w = 11; w >= 0; w--) {
    const start = today - (w * 7 + 6) * DAY;
    const ageDays = Math.floor((today - start) / DAY);
    const size = daily.filter((d) => d.date >= start && d.date < start + 7 * DAY).reduce((a, d) => a + d.newPlayers, 0);
    const lift = 0.9 + (11 - w) * 0.012 + r() * 0.06;
    cohorts.push({
      start, size, values: RETENTION_DAYS.map((d) => (ageDays >= d + 6 ? Math.min(0.95, base[d] * lift * (0.95 + r() * 0.1)) : null)),
    });
  }

  const hourly = Array.from({ length: 7 }, (_, d) => Array.from({ length: 24 }, (_, h) => {
    const dist = Math.min(Math.abs(h - 20.5), 24 - Math.abs(h - 20.5));
    const evening = Math.exp(-(dist ** 2) / 18);
    const weekend = d >= 5 ? 1.3 : 1;
    return Math.round((20 + evening * 150 * weekend) * (0.9 + r() * 0.2));
  }));

  const mix = [32, 28, 15, 15, 10].map((v) => v + Math.round(r() * 4));
  const modes = MODES.map((m, i) => ({ mode: m, share: mix[i] }));
  const total = modes.reduce((a, m) => a + m.share, 0);
  modes.forEach((m) => { m.share = Math.round((m.share / total) * 1000) / 10; });

  const regions = [
    { region: "EU", share: 62, ping: 38 }, { region: "NA", share: 23, ping: 52 }, { region: "AS", share: 15, ping: 71 },
  ];
  const sessionBuckets = [["< 5 min", 9], ["5–15 min", 21], ["15–30 min", 28], ["30–60 min", 25], ["1 h +", 17]]
    .map(([label, pct]) => ({ label, pct }));

  return { daily, cohorts, hourly, modes, regions, sessionBuckets };
}
