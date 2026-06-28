/**
 * Self-contained HTML pages rendered in the user's browser at the end of the
 * OAuth flow. They are intentionally dependency-free (inline CSS) and instruct
 * the user to return to VS Code. On success we also attempt to auto-open the
 * vscode:// deep link that carries the session token back to the extension.
 */

function page(title: string, accent: string, heading: string, body: string, redirect?: string): string {
  const meta = redirect
    ? `<meta http-equiv="refresh" content="0;url=${escapeAttr(redirect)}" />`
    : '';
  const script = redirect
    ? `<script>setTimeout(function(){location.href=${JSON.stringify(redirect)};},250);</script>`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
${meta}
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light dark; }
  body { margin:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
         display:flex; min-height:100vh; align-items:center; justify-content:center;
         background:#0b0c10; color:#e7e9ee; }
  .card { max-width:460px; width:90%; background:#16181f; border:1px solid #262a33;
          border-radius:16px; padding:40px 36px; text-align:center;
          box-shadow:0 20px 60px rgba(0,0,0,.45); }
  .badge { width:64px; height:64px; border-radius:16px; margin:0 auto 20px;
           display:flex; align-items:center; justify-content:center; font-size:30px;
           background:${accent}1a; color:${accent}; border:1px solid ${accent}55; }
  h1 { font-size:22px; margin:0 0 10px; }
  p { font-size:15px; line-height:1.6; color:#aeb4c0; margin:0 0 6px; }
  .hint { margin-top:22px; font-size:13px; color:#6b7280; }
  a.button { display:inline-block; margin-top:22px; text-decoration:none; font-weight:600;
             background:${accent}; color:#0b0c10; padding:11px 20px; border-radius:10px; }
</style>
</head>
<body>
  <div class="card">
    <div class="badge">${heading}</div>
    ${body}
    ${redirect ? `<a class="button" href="${escapeAttr(redirect)}">Return to VS Code</a>` : ''}
    <p class="hint">You can close this tab.</p>
  </div>
  ${script}
</body>
</html>`;
}

export function successPage(deepLink: string): string {
  return page(
    'Login successful',
    '#3ba55d',
    '✓',
    `<h1>Discord login successful</h1>
     <p>You are now signed in to <strong>CodeShare Discord</strong>.</p>
     <p>If VS Code does not open automatically, click the button below.</p>`,
    deepLink,
  );
}

export function errorPage(message: string): string {
  return page(
    'Login failed',
    '#ed4245',
    '✕',
    `<h1>Login failed</h1>
     <p>${escapeHtml(message)}</p>
     <p>Please return to VS Code and try logging in again.</p>`,
  );
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
