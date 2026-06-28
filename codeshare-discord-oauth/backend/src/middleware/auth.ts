import { NextFunction, Request, Response } from 'express';
import { verifySession } from '../services/sessionService';
import { SessionClaims } from '../types';
import { HttpError } from './errorHandler';

/** Express request augmented with the verified session claims. */
export interface AuthedRequest extends Request {
  session?: SessionClaims;
}

/**
 * Require a valid Bearer session token. Attaches the decoded claims to
 * req.session for downstream handlers. Rejects with 401 when missing/invalid so
 * the extension knows it must prompt the user to log in again.
 */
export function requireSession(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    throw new HttpError(401, 'Missing Bearer token.', 'unauthenticated');
  }
  const claims = verifySession(match[1]);
  if (!claims) {
    throw new HttpError(401, 'Session is invalid or expired.', 'session_expired');
  }
  req.session = claims;
  next();
}
