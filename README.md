# AVENMC Staff Panel

Dashboard and admin panel for Owner, Developer, Admin and Moderator roles.
Plain HTML, CSS and ES modules (same approach and design tokens as [AvenMC/website](https://github.com/AvenMC/website)), no build step.

**Status: test build.** All data is mock data stored in the browser (`localStorage`). Nothing is connected to the network yet.

Live: https://avenmc.github.io/panel/ (always the latest `main`).

## Try it on a phone

Open the live URL, or locally:

```sh
python3 -m http.server 8000   # then open http://<your-LAN-IP>:8000
```

On the login screen use **Testmodus** to pick a role. On the phone you can add the page to the home screen (PWA).
Settings → System → "Reset test data" (owner) restores the demo data.

## Roles

| Area | Mod | Admin | Developer | Owner |
|---|:-:|:-:|:-:|:-:|
| Dashboard, players, reports, warn/mute/kick, temp ban (max 7 days) | x | x | x | x |
| Permanent/long sanctions, revoke, appeals, player ranks, team (mods) | | x | | x |
| Broadcast | | x | x | x |
| Instance details (metrics, players, plugins) | x | x | x | x |
| Console logs, console commands, restart, maintenance, feature flags | | | x | x |
| Analytics (retention, DAU/MAU, peak hours, modes, regions) | | x | x | x |
| Audit log | | x | x | x |
| Manage all team roles, reset test data | | | | x |

The matrix lives in `js/roles.js` and is the only place to change permissions.

## Discord login

1. Create an application in the [Discord developer portal](https://discord.com/developers/applications).
2. OAuth2 → add the redirect `https://avenmc.github.io/panel/` (and your local URL for testing).
3. Put the Client ID into `js/config.js` (`discordClientId`) and your Discord user ID into `ownerDiscordIds`.

Users can only enter if their Discord ID is in the team list (Team page) or in `ownerDiscordIds`.
This build uses the implicit grant with the `identify` scope. For production, switch to the authorization code flow on the backend and let it issue the role.

## Connecting the backend later

All pages use `js/api.js` only. Implement the same functions against the `practice_backend` API (`/admin/*` with role checks and an audit table) and switch `apiMode` to `live` in `js/config.js`.
Roles must then be enforced server-side; the checks in this repo are only for the UI.

## Structure

- `js/app.js` shell, routing, navigation (sidebar on desktop, bottom bar and drawer on mobile)
- `js/pages/*` one module per page
- `js/api.js`, `js/seed.js`, `js/analytics.js`, `js/consoleLogs.js` mock backend and demo data (analytics, live console output)
- `js/charts.js` dependency-free SVG charts
- `js/roles.js`, `js/auth.js` permissions and Discord login
