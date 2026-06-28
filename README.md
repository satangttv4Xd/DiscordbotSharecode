# CodeShare Discord

Share source code from VS Code straight to a Discord channel — signed in with your **Discord account via OAuth2**, so every shared message clearly shows **who sent it**.

This repository contains two parts:

| Folder | What it is |
|---|---|
| [`backend/`](./backend) | A secure Express + TypeScript API that performs Discord OAuth2 (token exchange & refresh) and forwards code to a Discord webhook. **All secrets live here.** |
| [`extension/`](./extension) | The VS Code extension: Discord login, code sharing, history, status bar, sidebar views, and a first-launch wizard. |

> 🇹🇭 มีคู่มือภาษาไทยฉบับเต็มที่ [`GUIDE_TH.md`](./GUIDE_TH.md) — สอนตั้งแต่ศูนย์จนใช้งานจริง

```
VS Code Extension ──OAuth login──► Secure Backend API ──webhook──► Discord Channel
   (holds only a              (holds Client Secret,
    session JWT)               Webhook URL, tokens)
```

---

## Why a backend?

Three secrets must **never** ship to the user's machine:

- the Discord **Client Secret**
- the **Webhook URL** (anyone with it can post to your channel)
- the user's Discord **access / refresh tokens**

The backend keeps all of these server-side. The extension only ever holds an opaque **session JWT** that contains nothing sensitive.

---

## Quick start (local development)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # then fill in the values (see GUIDE_TH.md §5)
npm run dev               # starts on http://localhost:8787
```

You will need a Discord Application (Client ID + Secret), an OAuth2 **Redirect URI** of `http://localhost:8787/oauth/callback`, and a channel **Webhook URL**. Full step-by-step in [`GUIDE_TH.md`](./GUIDE_TH.md) §4.

### 2. Extension

```bash
cd extension
npm install
npm run compile
```

Open the `extension/` folder in VS Code and press **F5** to launch the Extension Development Host. Set `codeshare.backendUrl` to `http://localhost:8787`, then run **CodeShare: Login with Discord**.

---

## User Guide

Once signed in, share code via any of:

- **Editor toolbar** — the cloud-upload icon shares the current file
- **Right-click in the editor** — *CodeShare: Share Selection*
- **Right-click a file (or multiple) in the Explorer** — *Share File(s) to Discord*
- **Status bar** — click *Share Code*
- **Command Palette** — *CodeShare: Share Clipboard*, etc.
- **Sidebar** — the CodeShare activity-bar icon shows Account, Quick Share, Connection Status, Recent Shares, and Settings

Each share posts an embed titled **“📤 Code Shared”** containing the sharer's avatar, display name, username, Discord ID, local + UTC + Unix time, file name, language, workspace, relative path, line count, file size, OS, and VS Code version — followed by the code itself (inline, or uploaded as a file when large).

---

## Developer Guide

- **Backend stack:** Express 4, TypeScript (strict, CommonJS), `jsonwebtoken` for sessions, `express-rate-limit`, and Node's built-in `https` for all Discord calls (no `discord.js`).
- **Extension stack:** TypeScript (strict), VS Code API ^1.85, Node built-in `http/https`, zero runtime dependencies.
- **Auth model:** OAuth2 Authorization Code flow, fully driven by the backend. The extension opens `/oauth/start` in the browser and receives a session JWT back via a `vscode://` deep link handled by a `UriHandler`.
- **Token lifecycle:** Discord tokens are stored server-side keyed by user id and refreshed automatically (60-second skew). Refresh failure surfaces as HTTP 401 so the extension can prompt re-login.

Build & verify:

```bash
# backend
cd backend && npm run build && npm run lint

# extension
cd extension && npm run compile && npm run lint
```

A complete per-file walkthrough is in [`GUIDE_TH.md`](./GUIDE_TH.md) §8.

### Backend API surface

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /health` | – | Liveness probe |
| `GET /oauth/start` | – | Begin OAuth (redirects to Discord) |
| `GET /oauth/callback` | – | Exchange code, mint session, bounce to VS Code |
| `GET /api/me` | Bearer | Current user profile / session probe |
| `GET /api/connection` | Bearer | Auth + webhook status |
| `POST /api/share` | Bearer | Forward a snippet to Discord |
| `POST /api/logout` | Bearer | Clear server-side tokens |

---

## Deployment Guide

1. **Use HTTPS.** Discord requires a secure redirect in production.
2. Set environment variables (see `backend/.env.example`), especially:
   - `PUBLIC_BASE_URL=https://api.yourdomain.com`
   - `DISCORD_REDIRECT_URI=https://api.yourdomain.com/oauth/callback` — and add this exact value to the Discord app's **OAuth2 → Redirects**.
   - a fresh, long `SESSION_SECRET`.
3. The app sets `trust proxy`, so rate limiting reads the real client IP behind a reverse proxy.
4. `tokenStore` is in-memory by default. For multiple instances or persistence across restarts, implement the `TokenStore` interface on Redis/DB and swap the export in `backend/src/services/tokenStore.ts`.
5. Never commit `.env` (already in `.gitignore`).

Full deployment notes: [`GUIDE_TH.md`](./GUIDE_TH.md) §13.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `invalid_redirect_uri` | Redirect mismatch | Make `DISCORD_REDIRECT_URI` match the Discord app exactly (scheme + slash) |
| Browser hangs after Authorize | `EXTENSION_REDIRECT_URI` wrong | Use `vscode://<publisher>.codeshare-discord/auth` |
| `Invalid or expired login state` | Took > 10 min / multiple tabs | Start login again |
| Share returns 401 `session_expired` | JWT expired or access revoked | Log in again (the extension offers this) |
| Share returns 502 `webhook_failed` | Bad/deleted webhook | Recreate the webhook, update `.env` |
| `Backend is not reachable` | Backend down / wrong URL | Start backend, check `codeshare.backendUrl` |

More cases: [`GUIDE_TH.md`](./GUIDE_TH.md) §11.

---

## Packaging & Publishing

```bash
cd extension
npm install -g @vscode/vsce
vsce package          # produces codeshare-discord-1.0.0.vsix
```

Set a real `publisher` in `extension/package.json` first, and keep `EXTENSION_REDIRECT_URI` on the backend in sync. See [`GUIDE_TH.md`](./GUIDE_TH.md) §12.

---

## License

MIT — see [`LICENSE`](./LICENSE).
