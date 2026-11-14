const rtf = new Intl.RelativeTimeFormat("de", { numeric: "auto" });
const UNITS = [["day", 86400000], ["hour", 3600000], ["minute", 60000]];

export function relTime(ts) {
  const diff = ts - Date.now();
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return "gerade eben";
}

export function fmtDate(ts) {
  return new Date(ts).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

export function fmtDuration(ms) {
  if (ms === null) return "Permanent";
  const h = ms / 3600000;
  return h < 24 ? `${h} Std.` : `${Math.round(h / 24)} Tage`;
}

export const HOUR = 3600000;
export const DAY = 24 * HOUR;
