// Panel configuration. Test build: data is mocked in the browser (localStorage).
export const config = {
  // "mock" = local test data, "live" = real backend (see README, not connected yet).
  apiMode: "mock",
  apiBaseUrl: "",

  // Discord OAuth2 application (Client ID is public). Add this page's URL
  // (e.g. https://avenmc.github.io/panel/) as a redirect in the Discord developer portal.
  discordClientId: "",

  // Discord user IDs that always get the owner role (bootstrap).
  ownerDiscordIds: [],

  // Demo login with a role picker. Disable once the real backend is connected.
  demoLogin: true,
};
