import { el } from "../dom.js";
import { api } from "../api.js";
import { ROLES, assignableRoles, canManageRole } from "../roles.js";
import { card, pageHeader, roleBadge, button, field, select, attempt, modal, confirmDialog } from "../ui.js";
import { refresh } from "../app.js";

export async function render(_, user) {
  const staff = await api.staff();
  const roles = assignableRoles(user.role);

  const addBtn = roles.length && button("Teammitglied hinzufügen", () => {
    const name = el("input", { className: "input", placeholder: "Anzeigename" });
    const did = el("input", { className: "input", placeholder: "Discord-ID", inputmode: "numeric" });
    const role = select(roles.map((r) => [r, ROLES[r].label]), roles[roles.length - 1]);
    modal("Teammitglied hinzufügen", el("div", { className: "stack" }, field("Name", name), field("Discord-ID", did), field("Rolle", role)), [
      (close) => button("Abbrechen", close),
      (close) => button("Hinzufügen", async () => { if (await attempt(() => api.addStaff(did.value.trim(), name.value, role.value), "Hinzugefügt")) { close(); refresh(); } }, "primary"),
    ]);
  }, "primary");

  const row = (m) => {
    const manageable = canManageRole(user.role, m.role) && m.discordId !== user.discordId;
    const sel = select(roles.map((r) => [r, ROLES[r].label]), m.role);
    sel.addEventListener("change", async () => { if (await attempt(() => api.setStaffRole(m.discordId, sel.value), "Rolle geändert")) refresh(); });
    return el("div", { className: "row static" }, el("div", {}, el("strong", { text: m.name }), el("div", { className: "small muted mono", text: m.discordId })),
      el("div", { className: "rowEnd" }, manageable ? sel : roleBadge(m.role),
        manageable && button("Entfernen", () => confirmDialog("Entfernen?", `${m.name} verliert den Zugriff auf das Panel.`, "Entfernen",
          async () => { if (await attempt(() => api.removeStaff(m.discordId), "Entfernt")) refresh(); }))));
  };

  return el("div", { className: "stack" }, pageHeader("Team", "Wer hat Zugriff auf das Panel?", addBtn || null), card(el("div", { className: "list" }, staff.map(row))));
}
