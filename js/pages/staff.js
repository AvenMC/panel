import { el } from "../dom.js";
import { api } from "../api.js";
import { ROLES, assignableRoles, canManageRole } from "../roles.js";
import { card, pageHeader, roleBadge, button, field, select, attempt, modal, confirmDialog } from "../ui.js";
import { refresh } from "../app.js";

export async function render(_, user) {
  const staff = await api.staff();
  const roles = assignableRoles(user.role);

  const addBtn = roles.length && button("Add team member", () => {
    const name = el("input", { className: "input", placeholder: "Display name" });
    const did = el("input", { className: "input", placeholder: "Discord-ID", inputmode: "numeric" });
    const role = select(roles.map((r) => [r, ROLES[r].label]), roles[roles.length - 1]);
    modal("Add team member", el("div", { className: "stack" }, field("Name", name), field("Discord-ID", did), field("Role", role)), [
      (close) => button("Cancel", close),
      (close) => button("Add", async () => { if (await attempt(() => api.addStaff(did.value.trim(), name.value, role.value), "Added")) { close(); refresh(); } }, "primary"),
    ]);
  }, "primary");

  const row = (m) => {
    const manageable = canManageRole(user.role, m.role) && m.discordId !== user.discordId;
    const sel = select(roles.map((r) => [r, ROLES[r].label]), m.role);
    sel.addEventListener("change", async () => { if (await attempt(() => api.setStaffRole(m.discordId, sel.value), "Role changed")) refresh(); });
    return el("div", { className: "row static" }, el("div", {}, el("strong", { text: m.name }), el("div", { className: "small muted mono", text: m.discordId })),
      el("div", { className: "rowEnd" }, manageable ? sel : roleBadge(m.role),
        manageable && button("Remove", () => confirmDialog("Remove?", `${m.name} will lose access to the panel.`, "Remove",
          async () => { if (await attempt(() => api.removeStaff(m.discordId), "Removed")) refresh(); }))));
  };

  return el("div", { className: "stack" }, pageHeader("Team", "Who has access to the panel?", addBtn || null), card(el("div", { className: "list" }, staff.map(row))));
}
