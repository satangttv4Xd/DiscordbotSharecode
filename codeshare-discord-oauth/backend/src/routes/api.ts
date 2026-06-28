import { Router, Response, NextFunction } from 'express';
import { config } from '../config/env';
import { AuthedRequest, requireSession } from '../middleware/auth';
import { HttpError } from '../middleware/errorHandler';
import { shareLimiter } from '../middleware/rateLimit';
import {
  endSession,
  getProfile,
  getValidAccessToken,
} from '../services/sessionService';
import { forwardShare } from '../services/webhookForwarder';
import { ShareRequest } from '../types';

export const apiRouter = Router();

/**
 * GET /api/me
 * Returns the signed-in user's profile. Doubles as a session-validity probe the
 * extension calls on startup to decide whether to auto-login.
 */
apiRouter.get('/me', requireSession, async (req: AuthedRequest, res: Response) => {
  const userId = req.session!.sub;
  const profile = await getProfile(userId);
  if (!profile) {
    throw new HttpError(401, 'Session no longer valid. Please log in again.', 'session_expired');
  }
  res.json({ profile });
});

/**
 * GET /api/connection
 * Reports whether the backend itself is wired up (webhook present) plus the
 * signed-in user. Used by the extension's "Connection Status" view.
 */
apiRouter.get('/connection', requireSession, async (req: AuthedRequest, res: Response) => {
  const userId = req.session!.sub;
  const profile = await getProfile(userId);
  res.json({
    authenticated: Boolean(profile),
    webhookConfigured: Boolean(config.webhookUrl),
    user: profile ? { id: profile.id, displayName: profile.displayName } : null,
  });
});

/**
 * POST /api/share
 * The core endpoint: validates the session, ensures the Discord token is still
 * valid (refreshing if needed), then forwards the code to the Discord webhook
 * with an embed that identifies the sharer.
 */
apiRouter.post(
  '/share',
  shareLimiter,
  requireSession,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.session!.sub;
      const profile = await getProfile(userId);
      if (!profile) {
        throw new HttpError(401, 'Session no longer valid. Please log in again.', 'session_expired');
      }

      // Touch the token store to confirm the user is still authorised; if the
      // refresh fails the user has been deauthorised and must log in again.
      const accessToken = await getValidAccessToken(userId);
      if (!accessToken) {
        throw new HttpError(401, 'Discord authorization expired. Please log in again.', 'session_expired');
      }

      const share = validateShareRequest(req.body);
      const result = await forwardShare(profile, share);

      if (!result.ok) {
        throw new HttpError(
          502,
          `Discord rejected the message (HTTP ${result.status}).`,
          'webhook_failed',
        );
      }

      res.json({
        ok: true,
        delivery: result.delivery,
        messageLink: result.messageLink ?? null,
        sharedBy: { id: profile.id, displayName: profile.displayName },
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/logout
 * Clears the server-side Discord tokens for this user. The extension also drops
 * its stored session token locally.
 */
apiRouter.post('/logout', requireSession, async (req: AuthedRequest, res: Response) => {
  await endSession(req.session!.sub);
  res.json({ ok: true });
});

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function validateShareRequest(body: unknown): ShareRequest {
  if (typeof body !== 'object' || body === null) {
    throw new HttpError(400, 'Request body must be a JSON object.', 'bad_request');
  }
  const b = body as Record<string, unknown>;
  const content = asString(b.content);
  if (!content.trim()) {
    throw new HttpError(400, 'Nothing to share: "content" is empty.', 'empty_content');
  }
  if (content.length > 200_000) {
    throw new HttpError(413, 'Content is too large to share.', 'too_large');
  }
  return {
    content,
    fileName: asString(b.fileName, 'snippet.txt'),
    languageId: asString(b.languageId, 'plaintext'),
    fenceHint: asString(b.fenceHint, ''),
    workspaceName: b.workspaceName ? asString(b.workspaceName) : undefined,
    relativePath: b.relativePath ? asString(b.relativePath) : undefined,
    lineCount: asNumber(b.lineCount, content.split('\n').length),
    byteSize: asNumber(b.byteSize, Buffer.byteLength(content, 'utf8')),
    operatingSystem: asString(b.operatingSystem, 'unknown'),
    vscodeVersion: asString(b.vscodeVersion, 'unknown'),
    forceFile: b.forceFile === true,
  };
}
