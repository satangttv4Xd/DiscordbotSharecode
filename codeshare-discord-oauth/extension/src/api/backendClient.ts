import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { getBackendUrl } from '../config/configuration';
import { SessionStore } from '../auth/sessionStore';
import {
  ConnectionStatus,
  SharePayload,
  ShareResponse,
  UserProfile,
} from '../types';

/** Error raised for any non-2xx backend response. */
export class BackendError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = 'error',
  ) {
    super(message);
    this.name = 'BackendError';
  }

  /** True when the backend says the session is missing/expired. */
  get isAuthError(): boolean {
    return this.status === 401;
  }
}

interface RawResponse {
  status: number;
  body: string;
}

function rawRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: string,
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      reject(new BackendError(0, `Invalid backend URL: ${url}`, 'bad_url'));
      return;
    }
    const transport = parsed.protocol === 'https:' ? https : http;
    const payload = body ? Buffer.from(body, 'utf8') : undefined;
    const finalHeaders = { ...headers };
    if (payload) {
      finalHeaders['Content-Length'] = String(payload.length);
    }

    const req = transport.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: `${parsed.pathname}${parsed.search}`,
        method,
        headers: finalHeaders,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c as Buffer));
        res.on('end', () =>
          resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }),
        );
      },
    );
    req.on('error', (err) =>
      reject(new BackendError(0, `Cannot reach backend: ${err.message}`, 'network')),
    );
    req.setTimeout(20000, () => {
      req.destroy(new BackendError(0, 'Backend request timed out.', 'timeout'));
    });
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

export class BackendClient {
  constructor(private readonly sessions: SessionStore) {}

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.sessions.getToken();
    if (!token) {
      throw new BackendError(401, 'Not signed in.', 'unauthenticated');
    }
    return { Authorization: `Bearer ${token}` };
  }

  private parse<T>(res: RawResponse): T {
    let data: any = {};
    try {
      data = JSON.parse(res.body);
    } catch {
      /* leave as {} */
    }
    if (res.status < 200 || res.status >= 300) {
      throw new BackendError(
        res.status,
        data?.message || `Backend returned HTTP ${res.status}.`,
        data?.error || 'error',
      );
    }
    return data as T;
  }

  /** Fetch the signed-in user's profile (also used as a session probe). */
  async getMe(): Promise<UserProfile> {
    const res = await rawRequest('GET', `${getBackendUrl()}/api/me`, await this.authHeaders());
    return this.parse<{ profile: UserProfile }>(res).profile;
  }

  /** Fetch the backend/connection status. */
  async getConnection(): Promise<ConnectionStatus> {
    const res = await rawRequest(
      'GET',
      `${getBackendUrl()}/api/connection`,
      await this.authHeaders(),
    );
    return this.parse<ConnectionStatus>(res);
  }

  /** Send a snippet to Discord through the backend. */
  async share(payload: SharePayload): Promise<ShareResponse> {
    const res = await rawRequest(
      'POST',
      `${getBackendUrl()}/api/share`,
      { ...(await this.authHeaders()), 'Content-Type': 'application/json' },
      JSON.stringify(payload),
    );
    return this.parse<ShareResponse>(res);
  }

  /** Best-effort logout; ignores failures so local logout always proceeds. */
  async logout(): Promise<void> {
    try {
      const res = await rawRequest(
        'POST',
        `${getBackendUrl()}/api/logout`,
        await this.authHeaders(),
      );
      this.parse<{ ok: boolean }>(res);
    } catch {
      /* ignore */
    }
  }

  /** Lightweight health check (no auth). */
  async health(): Promise<boolean> {
    try {
      const res = await rawRequest('GET', `${getBackendUrl()}/health`, {});
      return res.status === 200;
    } catch {
      return false;
    }
  }
}
