export const ROLES = {
  owner: { label: "Owner", level: 4, color: "#ffa147" },
  developer: { label: "Developer", level: 3, color: "#b89efa" },
  admin: { label: "Admin", level: 2, color: "#f07878" },
  mod: { label: "Moderator", level: 1, color: "#28b9f5" },
};

const ALL = ["owner", "developer", "admin", "mod"];

// Single source of truth: which roles may do what. Menus, routes and API calls all use this.
const PERMISSIONS = {
  "dashboard.view": ALL,
  "players.view": ALL,
  "players.notes": ALL,
  "players.rank": ["owner", "admin"],
  "sanction.issue": ALL,
  "sanction.permanent": ["owner", "admin"],
  "sanction.revoke": ["owner", "admin"],
  "reports.handle": ALL,
  "appeals.handle": ["owner", "admin"],
  "servers.view": ALL,
  "servers.control": ["owner", "developer"],
  "servers.logs": ["owner", "developer"],
  "broadcast.send": ["owner", "admin", "developer"],
  "flags.manage": ["owner", "developer"],
  "staff.view": ["owner", "admin"],
  "audit.view": ["owner", "admin", "developer"],
  "system.reset": ["owner"],
};

// Moderators and developers may only issue temporary sanctions up to this length.
export const MAX_TEMP_MS = 7 * 24 * 3600000;

export function can(role, permission) {
  return !!role && (PERMISSIONS[permission] || []).includes(role);
}

// Owners manage everyone, admins manage moderators only.
export function canManageRole(actorRole, targetRole) {
  if (actorRole === "owner") return true;
  return actorRole === "admin" && targetRole === "mod";
}

export function assignableRoles(actorRole) {
  return ALL.filter((r) => canManageRole(actorRole, r));
}
