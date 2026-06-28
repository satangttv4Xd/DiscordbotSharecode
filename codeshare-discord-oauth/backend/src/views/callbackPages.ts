/**
 * Self-contained HTML pages rendered in the user's browser at the end of the
 * OAuth flow. They are intentionally dependency-free (inline CSS) and instruct
 * the user to return to VS Code. On success we also attempt to auto-open the
 * vscode:// deep link that carries the session token back to the extension.
 */

function page(title: string, accent: string, heading: string, body: string, redirect?: string): string {
  // No JS/meta auto-redirect for custom protocol URIs — Chrome blocks it unless triggered
  // by a user gesture. We render a prominent click-to-open button instead.
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light dark; }
  body { margin:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
         display:flex; min-height:100vh; align-items:center; justify-content:center;
         background:#0b0c10; color:#e7e9ee; }
  .card { max-width:480px; width:90%; background:#16181f; border:1px solid #262a33;
          border-radius:16px; padding:40px 36px; text-align:center;
          box-shadow:0 20px 60px rgba(0,0,0,.45); }
  .badge { width:72px; height:72px; border-radius:18px; margin:0 auto 24px;
           display:flex; align-items:center; justify-content:center; font-size:34px;
           background:${accent}1a; color:${accent}; border:1px solid ${accent}55; }
  h1 { font-size:22px; margin:0 0 12px; }
  p { font-size:15px; line-height:1.6; color:#aeb4c0; margin:0 0 6px; }
  .hint { margin-top:18px; font-size:13px; color:#6b7280; }
  a.button { display:inline-block; margin-top:28px; text-decoration:none; font-weight:700;
             background:${accent}; color:#0b0c10; padding:14px 32px; border-radius:12px;
             font-size:16px; cursor:pointer; letter-spacing:0.01em; }
  a.button:hover { opacity:0.88; }
</style>
</head>
<body>
  <div class="card">
    <div class="badge">${heading}</div>
    ${body}
    ${redirect ? `<a class="button" href="${escapeAttr(redirect)}">เปิด VS Code</a>` : ''}
    <p class="hint">คลิกปุ่มด้านบนเพื่อกลับไปยัง VS Code<br>จากนั้นปิด tab นี้ได้เลย</p>
  </div>
</body>
</html>`;
}

export function successPage(deepLink: string): string {
  const escaped = escapeAttr(deepLink);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Login successful</title>
<style>
  :root { color-scheme: light dark; }
  body { margin:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
         display:flex; min-height:100vh; align-items:center; justify-content:center;
         background:#0b0c10; color:#e7e9ee; }
  .card { max-width:480px; width:90%; background:#16181f; border:1px solid #262a33;
          border-radius:16px; padding:40px 36px; text-align:center;
          box-shadow:0 20px 60px rgba(0,0,0,.45); }
  .badge { width:72px; height:72px; border-radius:18px; margin:0 auto 24px;
           display:flex; align-items:center; justify-content:center; font-size:34px;
           background:#3ba55d1a; color:#3ba55d; border:1px solid #3ba55d55; }
  h1 { font-size:22px; margin:0 0 12px; }
  p { font-size:15px; line-height:1.6; color:#aeb4c0; margin:0 0 6px; }
  .hint { margin-top:18px; font-size:13px; color:#6b7280; }
  a#openBtn { display:inline-block; margin-top:28px; text-decoration:none; font-weight:700;
              background:#3ba55d; color:#0b0c10; padding:14px 32px; border-radius:12px;
              font-size:16px; cursor:pointer; letter-spacing:0.01em; }
  a#openBtn:hover { opacity:0.88; }
</style>
</head>
<body>
  <div class="card">
    <div class="badge">✓</div>
    <h1>เข้าสู่ระบบ Discord สำเร็จ</h1>
    <p>คุณได้ลงชื่อเข้าใช้ <strong>CodeShare Discord</strong> แล้ว</p>
    <a id="openBtn" href="${escaped}">เปิด VS Code</a>
    <p class="hint">หากไม่มีอะไรเกิดขึ้น ให้คลิกปุ่มด้านบน<br>จากนั้นปิด tab นี้ได้เลย</p>
  </div>
  <script>
    // Auto-click the anchor — clicking a link IS a user gesture,
    // so Chrome will show the "Open VS Code?" dialog automatically.
    window.addEventListener('load', function() {
      document.getElementById('openBtn').click();
    });
  </script>
</body>
</html>`;
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
