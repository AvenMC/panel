import { el } from "./dom.js";
import { api } from "./api.js";
import { can, MAX_TEMP_MS } from "./roles.js";
import { HOUR, DAY } from "./format.js";
import { modal, button, field, select, attempt } from "./ui.js";

export const TYPE_LABEL = { warn: "Warning", mute: "Mute", kick: "Kick", ban: "Ban" };
export const TYPE_TONE = { warn: "warn", mute: "info", kick: "neutral", ban: "danger" };

const DURATIONS = [["1", "1 hour", HOUR], ["6", "6 hours", 6 * HOUR], ["24", "1 day", DAY],
  ["72", "3 days", 3 * DAY], ["168", "7 days", 7 * DAY], ["720", "30 days", 30 * DAY], ["perm", "Permanent", null]];

export function openSanctionModal(user, playerId, playerName, type, onDone) {
  const timed = type === "ban" || type === "mute";
  const unlimited = can(user.role, "sanction.permanent");
  const options = DURATIONS.filter(([, , ms]) => unlimited || (ms !== null && ms <= MAX_TEMP_MS));
  const duration = select(options.map(([v, l]) => [v, l]), options[0][0]);
  const reason = el("textarea", { className: "input", rows: 3, placeholder: "Reason (saved in the history)" });

  modal(`${TYPE_LABEL[type]}: ${playerName}`, el("div", { className: "stack" },
    timed && field("Duration", duration), field("Reason", reason)), [
    (close) => button("Cancel", close),
    (close) => button(`Issue ${TYPE_LABEL[type].toLowerCase()}`, async () => {
      const ms = timed ? DURATIONS.find(([v]) => v === duration.value)[2] : 0;
      if (await attempt(() => api.sanction(playerId, type, reason.value, ms), `${TYPE_LABEL[type]} issued`)) {
        close();
        onDone?.();
      }
    }, type === "ban" ? "danger" : "primary"),
  ]);
}
