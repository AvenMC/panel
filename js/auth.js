import { config } from "./config.js";

const SESSION_KEY = "avenmc.panel.session";
const STATE_KEY = "avenmc.panel.oauthState";

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function setUser(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

const redirectUri = () => location.origin + location.pathname;

export function discordConfigured() {
  return !!config.discordClientId;
}

// Implicit grant: no secret needed, fine for the test build. The live version
// should use the authorization code flow handled by the backend.
export function startDiscordLogin() {
  const state = crypto.randomUUID();
  sessionStorage.setItem(STATE_KEY, state);
  const params = new URLSearchParams({
    client_id: config.discordClientId,
    redirect_uri: redirectUri(),
    response_type: "token",
    scope: "identify",
    state,
  });
  location.href = `https://discord.com/oauth2/authorize?${params}`;
}

// Returns a Discord profile if the URL carries an OAuth result, otherwise null.
export async function finishDiscordLogin() {
  const hash = new URLSearchParams(location.hash.slice(1));
  const token = hash.get("access_token");
  if (!token) return null;

  const expected = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  history.replaceState(null, "", location.pathname + location.search);
  if (!expected || hash.get("state") !== expected) throw new Error("Invalid login state. Please try again.");

  const res = await fetch("https://discord.com/api/users/@me", { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Could not load the Discord profile.");
  const d = await res.json();
  return {
    discordId: d.id,
    name: d.global_name || d.username,
    avatar: d.avatar ? `https://cdn.discordapp.com/avatars/${d.id}/${d.avatar}.png?size=64` : null,
  };
}
