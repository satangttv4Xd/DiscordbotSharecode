import https from 'https';
import { URL } from 'url';

export interface HttpResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

interface BaseOptions {
  method: string;
  url: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

interface RawBodyOptions extends BaseOptions {
  body?: Buffer | string;
}

const DEFAULT_TIMEOUT = 15000;

/**
 * Perform an HTTPS request using only Node's built-in https module.
 * Returns the raw status, headers, and body string. Never throws on non-2xx —
 * the caller inspects status — but does reject on transport/timeout errors.
 */
export function httpRequest(options: RawBodyOptions): Promise<HttpResponse> {
  const { method, url, headers = {}, body, timeoutMs = DEFAULT_TIMEOUT } = options;

  return new Promise((resolve, reject) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      reject(new Error(`Invalid URL: ${url}`));
      return;
    }

    const payload =
      body === undefined ? undefined : Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8');

    const requestHeaders: Record<string, string> = { ...headers };
    if (payload) {
      requestHeaders['Content-Length'] = String(payload.length);
    }

    const req = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method,
        headers: requestHeaders,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk as Buffer));
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      },
    );

    req.on('error', (err) => reject(err));
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Request to ${parsed.hostname} timed out after ${timeoutMs}ms`));
    });

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

/** POST application/x-www-form-urlencoded and parse the JSON response. */
export async function postForm<T>(
  url: string,
  form: Record<string, string>,
  headers: Record<string, string> = {},
): Promise<{ status: number; data: T }> {
  const encoded = new URLSearchParams(form).toString();
  const res = await httpRequest({
    method: 'POST',
    url,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      ...headers,
    },
    body: encoded,
  });
  return { status: res.status, data: safeParse<T>(res.body) };
}

/** GET and parse a JSON response. */
export async function getJson<T>(
  url: string,
  headers: Record<string, string> = {},
): Promise<{ status: number; data: T }> {
  const res = await httpRequest({
    method: 'GET',
    url,
    headers: { Accept: 'application/json', ...headers },
  });
  return { status: res.status, data: safeParse<T>(res.body) };
}

function safeParse<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}
