# CodeShare Discord — Backend

Secure Express + TypeScript API that performs Discord OAuth2 and forwards code to
a Discord webhook. **All secrets stay here**; the VS Code extension only holds an
opaque session JWT.

## Setup

```bash
npm install
cp .env.example .env   # fill in the values
npm run dev            # http://localhost:8787 (auto-reload)
# or
npm run build && npm start
```

## Environment

See `.env.example` for every variable. Required: `DISCORD_CLIENT_ID`,
`DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`, `DISCORD_WEBHOOK_URL`,
`SESSION_SECRET`. Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Endpoints

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /health` | – | Liveness probe |
| `GET /oauth/start` | – | Begin OAuth (redirects to Discord) |
| `GET /oauth/callback` | – | Exchange code, mint session, redirect to VS Code |
| `GET /api/me` | Bearer | Current user profile |
| `GET /api/connection` | Bearer | Auth + webhook status |
| `POST /api/share` | Bearer | Forward a snippet to Discord |
| `POST /api/logout` | Bearer | Clear server-side tokens |

## Notes

- Discord is called via Node's built-in `https` only (no `discord.js`).
- Tokens are stored in-memory (`src/services/tokenStore.ts`); swap for Redis/DB
  in production by implementing the `TokenStore` interface.
- See the Thai guide (`../GUIDE_TH.md`) for a complete walkthrough.
