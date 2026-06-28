import * as vscode from 'vscode';
import { AuthService } from '../auth/authService';
import { getTheme } from '../config/configuration';
import { UserProfile } from '../types';

/**
 * The first-launch wizard. Walks the user through signing in with Discord before
 * they can share. Rendered as a Webview so we can show a friendly stepper and
 * live-update when authentication completes.
 */
export class WelcomeWizard {
  private panel: vscode.WebviewPanel | undefined;
  private authSub: vscode.Disposable | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly auth: AuthService,
  ) {}

  show(): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      this.render();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'codeshareWelcome',
      'Welcome to CodeShare Discord',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true },
    );

    this.panel.webview.onDidReceiveMessage(async (msg: { command: string }) => {
      switch (msg.command) {
        case 'login':
          await this.auth.login();
          break;
        case 'settings':
          await vscode.commands.executeCommand('codeshare.openSettings');
          break;
        case 'close':
          this.panel?.dispose();
          break;
        case 'shareDemo':
          await vscode.commands.executeCommand('codeshare.shareCurrentFile');
          break;
      }
    });

    this.authSub = this.auth.onDidChangeAuth(() => this.render());

    this.panel.onDidDispose(() => {
      this.authSub?.dispose();
      this.authSub = undefined;
      this.panel = undefined;
    });

    this.render();
  }

  private render(): void {
    if (!this.panel) {
      return;
    }
    this.panel.webview.html = this.html(this.auth.getProfile());
  }

  private html(profile: UserProfile | undefined): string {
    const nonce = makeNonce();
    const csp = `default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';`;
    const themeClass =
      getTheme() === 'light' ? 'force-light' : getTheme() === 'dark' ? 'force-dark' : '';
    const authed = Boolean(profile);

    const step = (n: number, title: string, body: string, state: 'done' | 'active' | 'todo') => `
      <li class="step ${state}">
        <div class="dot">${state === 'done' ? '✓' : n}</div>
        <div class="step-body">
          <h3>${title}</h3>
          <p>${body}</p>
        </div>
      </li>`;

    const loginState: 'done' | 'active' = authed ? 'done' : 'active';
    const authorizeState: 'done' | 'todo' = authed ? 'done' : 'todo';
    const readyState: 'done' | 'todo' = authed ? 'done' : 'todo';

    const actionArea = authed
      ? `<div class="card success">
           <div class="avatar">${
             profile?.avatarUrl
               ? `<img src="${escapeAttr(profile.avatarUrl)}" alt="avatar" />`
               : '🎉'
           }</div>
           <div>
             <strong>Signed in as ${escapeHtml(profile?.displayName ?? '')}</strong>
             <div class="muted">@${escapeHtml(profile?.username ?? '')}</div>
           </div>
         </div>
         <button class="primary" id="share">Share the current file →</button>
         <button class="ghost" id="done">Close</button>`
      : `<button class="primary" id="login">Login with Discord</button>
         <button class="ghost" id="settings">Backend settings</button>
         <p class="muted small">You can't share code until you sign in.</p>`;

    return `<!doctype html>
<html lang="en" class="${themeClass}">
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root {
    --bg: var(--vscode-editor-background);
    --fg: var(--vscode-editor-foreground);
    --muted: var(--vscode-descriptionForeground);
    --accent: #5865f2;
    --border: var(--vscode-panel-border, rgba(128,128,128,.3));
  }
  .force-light { --bg:#ffffff; --fg:#1f2328; --muted:#57606a; --border:#d0d7de; }
  .force-dark  { --bg:#0d1117; --fg:#e6edf3; --muted:#8b949e; --border:#30363d; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: var(--vscode-font-family); color: var(--fg);
         background: var(--bg); padding: 32px; }
  .hero { display:flex; align-items:center; gap:16px; margin-bottom:8px; }
  .logo { width:56px; height:56px; border-radius:14px; background:var(--accent);
          display:flex; align-items:center; justify-content:center; font-size:30px; }
  h1 { font-size:24px; margin:0; }
  .sub { color:var(--muted); margin:4px 0 28px; font-size:14px; }
  ul.steps { list-style:none; padding:0; margin:0 0 28px; }
  .step { display:flex; gap:14px; padding:14px 0; border-bottom:1px solid var(--border); }
  .step:last-child { border-bottom:none; }
  .dot { flex:0 0 30px; width:30px; height:30px; border-radius:50%; display:flex;
         align-items:center; justify-content:center; font-weight:700; font-size:14px;
         border:2px solid var(--border); color:var(--muted); }
  .step.active .dot { border-color:var(--accent); color:var(--accent); }
  .step.done .dot { background:#3ba55d; border-color:#3ba55d; color:#fff; }
  .step-body h3 { margin:2px 0 4px; font-size:15px; }
  .step-body p { margin:0; color:var(--muted); font-size:13px; line-height:1.5; }
  button { font-family:inherit; font-size:14px; border:none; border-radius:8px;
           padding:11px 18px; cursor:pointer; margin:6px 8px 0 0; }
  button.primary { background:var(--accent); color:#fff; font-weight:600; }
  button.ghost { background:transparent; color:var(--fg); border:1px solid var(--border); }
  .card { display:flex; align-items:center; gap:14px; padding:14px; border:1px solid var(--border);
          border-radius:10px; margin-bottom:14px; }
  .card.success { border-color:#3ba55d55; background:#3ba55d12; }
  .avatar { width:44px; height:44px; border-radius:50%; overflow:hidden; display:flex;
            align-items:center; justify-content:center; font-size:24px; background:var(--border); }
  .avatar img { width:100%; height:100%; object-fit:cover; }
  .muted { color:var(--muted); }
  .small { font-size:12px; }
</style>
</head>
<body>
  <div class="hero">
    <div class="logo">📤</div>
    <div>
      <h1>CodeShare Discord</h1>
      <div class="sub">Share code to Discord — every message shows who sent it.</div>
    </div>
  </div>

  <ul class="steps">
    ${step(1, 'Welcome', 'Share files, selections, or your clipboard straight to a Discord channel.', 'done')}
    ${step(2, 'Login with Discord', 'Authenticate securely with OAuth2. We never see your password.', loginState)}
    ${step(3, 'Authorize the app', 'Approve the requested scopes (identify, email) in your browser.', authorizeState)}
    ${step(4, 'Ready to share', 'Use the editor toolbar, right-click menu, or the status bar.', readyState)}
  </ul>

  ${actionArea}

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    function on(id, command) {
      const el = document.getElementById(id);
      if (el) { el.addEventListener('click', () => vscode.postMessage({ command })); }
    }
    on('login', 'login');
    on('settings', 'settings');
    on('done', 'close');
    on('share', 'shareDemo');
  </script>
</body>
</html>`;
  }

  /** Show the wizard only on the very first activation. */
  async maybeShowOnFirstRun(): Promise<void> {
    const KEY = 'codeshare.hasSeenWelcome';
    const seen = this.context.globalState.get<boolean>(KEY, false);
    if (!seen) {
      await this.context.globalState.update(KEY, true);
      this.show();
    }
  }
}

function makeNonce(): string {
  let text = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(input: string): string {
  return escapeHtml(input).replace(/'/g, '&#39;');
}
