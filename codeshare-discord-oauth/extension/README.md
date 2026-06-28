# CodeShare Discord — VS Code Extension

Share source code to Discord, signed in with your Discord account so every
message shows exactly who sent it. Requires the companion backend (see
`../backend`).

## Features

- **Discord OAuth2 login** with secure session storage (SecretStorage) and
  auto-login on next launch.
- **Share** the current file, a selection, the clipboard, or multiple files from
  the Explorer.
- **Rich embed** identifying the sharer (avatar, name, ID) plus file/workspace/
  environment metadata, with automatic language highlighting.
- **Sidebar** views: Account, Quick Share, Connection Status, Recent Shares,
  Settings.
- **Status bar** entry, context menus, notifications, and a first-launch wizard.
- **Local history** of recent shares.

## Develop

```bash
npm install
npm run compile      # or: npm run watch
```

Open this folder in VS Code and press **F5**. In the Extension Development Host,
set `codeshare.backendUrl`, then run **CodeShare: Login with Discord**.

## Settings

`codeshare.backendUrl`, `codeshare.showNotifications`,
`codeshare.autoCopyMessageLink`, `codeshare.historySize`,
`codeshare.uploadMode`, `codeshare.theme`.

## Package

```bash
npm install -g @vscode/vsce
vsce package
```

Set a real `publisher` in `package.json` first. Full guide: `../GUIDE_TH.md`.
