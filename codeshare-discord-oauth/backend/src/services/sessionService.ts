import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { logger } from '../config/logger';
import {
  DiscordTokenResponse,
  SessionClaims,
  StoredTokens,
  UserProfile,
} from '../types';
import { tokenStore } from './tokenStore';
import { refreshTokens, toProfile, fetchUser } from './discordOAuth';

/** Refresh the access token if it expires within this window. */
const REFRESH_SKEW_MS = 60 * 1000;

function toStored(tokenResponse: DiscordTokenResponse): StoredTokens {
  return {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    expiresAt: Date.now() + tokenResponse.expires_in * 1000,
    scope: tokenResponse.scope,
  };
}

/**
 * Persist a freshly-obtained set of Discord tokens + profile and return a signed
 * session token the extension can store. The session token contains only public
 * profile fields; the sensitive Discord tokens stay in the server-side store.
 */
export async function establishSession(
  tokenResponse: DiscordTokenResponse,
  profile: UserProfile,
): Promise<string> {
  await tokenStore.save(profile.id, toStored(tokenResponse), profile);

  const claims: SessionClaims = {
    sub: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
  };

  return jwt.sign(claims, config.session.secret, {
    expiresIn: config.session.ttl as jwt.SignOptions['expiresIn'],
    issuer: 'codeshare-discord-backend',
  });
}

/** Verify a session token and return its claims, or null if invalid/expired. */
export function verifySession(token: string): SessionClaims | null {
  try {
    const decoded = jwt.verify(token, config.session.secret, {
      issuer: 'codeshare-discord-backend',
    });
    if (typeof decoded === 'string') {
      return null;
    }
    const { sub, username, displayName, avatarUrl } = decoded as jwt.JwtPayload & SessionClaims;
    if (!sub) {
      return null;
    }
    return { sub, username, displayName, avatarUrl: avatarUrl ?? null };
  } catch {
    return null;
  }
}

/**
 * Return a valid Discord access token for the user, transparently refreshing it
 * (and updating the stored profile) when it is close to expiry. Returns null if
 * the user is unknown or the refresh fails — meaning the user must log in again.
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const tokens = await tokenStore.getTokens(userId);
  if (!tokens) {
    return null;
  }
  if (tokens.expiresAt - Date.now() > REFRESH_SKEW_MS) {
    return tokens.accessToken;
  }

  try {
    const refreshed = await refreshTokens(tokens.refreshToken);
    const user = await fetchUser(refreshed.access_token);
    const profile = toProfile(user);
    await tokenStore.save(userId, toStored(refreshed), profile);
    logger.info('Refreshed Discord access token', { userId });
    return refreshed.access_token;
  } catch (err) {
    logger.warn('Token refresh failed; user must re-authenticate', {
      userId,
      error: (err as Error).message,
    });
    return null;
  }
}

export async function getProfile(userId: string): Promise<UserProfile | undefined> {
  return tokenStore.getProfile(userId);
}

export async function endSession(userId: string): Promise<void> {
  await tokenStore.delete(userId);
}
