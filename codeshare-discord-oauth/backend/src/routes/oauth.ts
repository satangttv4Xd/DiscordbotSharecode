import { Router, Request, Response } from 'express';
import { URL } from 'url';
import { config } from '../config/env';
import { logger } from '../config/logger';
import {
  buildAuthorizeUrl,
  exchangeCode,
  fetchUser,
  toProfile,
} from '../services/discordOAuth';
import { establishSession } from '../services/sessionService';
import { consumeState, createState } from '../utils/state';
import { errorPage, successPage } from '../views/callbackPages';

export const oauthRouter = Router();

/**
 * GET /oauth/start
 * Entry point the extension opens in the browser. Optionally accepts a
 * `redirect_uri` that, on success, the browser is bounced back to (the
 * vscode:// deep link). We default to the configured extension redirect.
 */
oauthRouter.get('/start', (req: Request, res: Response) => {
  const requested = typeof req.query.redirect_uri === 'string' ? req.query.redirect_uri : '';
  const returnUri = isAllowedReturnUri(requested) ? requested : config.extensionRedirectUri;
  const state = createState(returnUri);
  const authorizeUrl = buildAuthorizeUrl(state);
  logger.info('OAuth start', { returnUri });
  res.redirect(authorizeUrl);
});

/**
 * GET /oauth/callback
 * Discord redirects here with ?code & ?state. We validate state, exchange the
 * code for tokens, fetch the profile, mint a session token, and finally redirect
 * the browser back to VS Code via the vscode:// deep link carrying the token.
 */
oauthRouter.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query as Record<string, string>;

    if (error) {
      res.status(400).type('html').send(errorPage(error_description || error));
      return;
    }

    const returnUri = consumeState(state);
    if (!returnUri) {
      res.status(400).type('html').send(errorPage('Invalid or expired login state. Please retry.'));
      return;
    }
    if (!code) {
      res.status(400).type('html').send(errorPage('No authorization code was returned.'));
      return;
    }

    const tokens = await exchangeCode(code);
    const user = await fetchUser(tokens.access_token);
    const profile = toProfile(user);
    const sessionToken = await establishSession(tokens, profile);

    const deepLink = buildDeepLink(returnUri, sessionToken);
    logger.info('OAuth callback success', { userId: profile.id });
    res.status(200).type('html').send(successPage(deepLink));
  } catch (err) {
    logger.error('OAuth callback failed', { error: (err as Error).message });
    res
      .status(500)
      .type('html')
      .send(errorPage('Could not complete login with Discord. Please try again.'));
  }
});

function buildDeepLink(returnUri: string, token: string): string {
  // returnUri is a vscode:// URI. Append the token as a query param.
  const separator = returnUri.includes('?') ? '&' : '?';
  return `${returnUri}${separator}token=${encodeURIComponent(token)}`;
}

/** Only permit bouncing back to vscode:/vscode-insiders: deep links. */
function isAllowedReturnUri(value: string): boolean {
  if (!value) {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'vscode:' || url.protocol === 'vscode-insiders:';
  } catch {
    return false;
  }
}
