# Changelog

All notable changes to this project are documented here.

## [1.0.0] - 2026-06-27

### Added
- Discord OAuth2 Authorization Code login, driven entirely by a secure backend.
- Automatic token refresh with expiry detection and re-login prompts.
- Session persistence via VS Code SecretStorage (auto-login on next launch).
- Secure backend API: OAuth start/callback, token exchange/refresh, webhook
  forwarding, rate limiting, request logging, and centralised error handling.
- Share Current File, Share Selection, Share Clipboard, and multi-file share
  from the Explorer.
- Rich Discord embed identifying the sharer (avatar, display name, username,
  Discord ID), plus file/workspace/environment metadata and local + UTC + Unix
  timestamps.
- Automatic language detection and syntax-highlighted code blocks; large
  snippets are uploaded as file attachments.
- Activity-bar sidebar with Account, Quick Share, Connection Status, Recent
  Shares, and Settings views.
- Status bar entry, editor and Explorer context menus, notifications with
  "Open in Discord" / "Copy Link" actions.
- Local share history (configurable size, default 50).
- First-launch Welcome wizard that gates sharing behind authentication.
- Configurable settings: backend URL, notifications, auto-copy link, history
  size, upload mode, and wizard theme.
- Full Thai guide book and English README/Developer/Deployment/Troubleshooting
  documentation.
