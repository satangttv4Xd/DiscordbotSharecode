import { URL } from 'url';
import { config } from '../config/env';
import { getJson, postForm } from '../utils/http';
import { DiscordTokenResponse, DiscordUser, UserProfile } from '../types';

const DISCORD_API = 'https://discord.com/api';
const AUTHORIZE_URL = 'https://discord.com/oauth2/authorize';
const TOKEN_URL = `${DISCORD_API}/oauth2/token`;
const USER_URL = `${DISCORD_API}/users/@me`;

/**
 * Build the Discord authorization URL the user's browser is sent to.
 * Uses the Authorization Code grant ("response_type=code").
 */
export function buildAuthorizeUrl(state: string): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_id', config.discord.clientId);
  url.searchParams.set('redirect_uri', config.discord.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.discord.scopes);
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'consent');
  return url.toString();
}

/** Exchange an authorization code for access + refresh tokens. */
export async function exchangeCode(code: string): Promise<DiscordTokenResponse> {
  const { status, data } = await postForm<DiscordTokenResponse & { error?: string }>(TOKEN_URL, {
    client_id: config.discord.clientId,
    client_secret: config.discord.clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.discord.redirectUri,
  });
  if (status !== 200 || !data.access_token) {
    throw new OAuthError(
      `Token exchange failed (HTTP ${status})`,
      data.error ?? 'token_exchange_failed',
    );
  }
  return data;
}

/** Use a refresh token to obtain a fresh access token. */
export async function refreshTokens(refreshToken: string): Promise<DiscordTokenResponse> {
  const { status, data } = await postForm<DiscordTokenResponse & { error?: string }>(TOKEN_URL, {
    client_id: config.discord.clientId,
    client_secret: config.discord.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  if (status !== 200 || !data.access_token) {
    throw new OAuthError(`Token refresh failed (HTTP ${status})`, data.error ?? 'refresh_failed');
  }
  return data;
}

/** Fetch the authenticated user's profile using a valid access token. */
export async function fetchUser(accessToken: string): Promise<DiscordUser> {
  const { status, data } = await getJson<DiscordUser & { message?: string }>(USER_URL, {
    Authorization: `Bearer ${accessToken}`,
  });
  if (status !== 200 || !data.id) {
    throw new OAuthError(`Failed to fetch user (HTTP ${status})`, 'user_fetch_failed');
  }
  return data;
}

/**
 * Convert a raw Discord user into the normalised profile we expose.
 * Handles both legacy (username#discriminator) and migrated (global_name)
 * accounts, and builds a CDN avatar URL (or a default avatar fallback).
 */
export function toProfile(user: DiscordUser): UserProfile {
  const displayName = user.global_name?.trim() || user.username;
  return {
    id: user.id,
    username: user.username,
    displayName,
    globalName: user.global_name ?? null,
    discriminator: user.discriminator,
    avatarUrl: buildAvatarUrl(user),
    email: user.email ?? null,
  };
}

function buildAvatarUrl(user: DiscordUser): string {
  if (user.avatar) {
    const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=128`;
  }
  // Default avatar: for migrated accounts Discord uses (id >> 22) % 6.
  let index: number;
  if (user.discriminator && user.discriminator !== '0') {
    index = Number.parseInt(user.discriminator, 10) % 5;
  } else {
    index = Number((BigInt(user.id) >> 22n) % 6n);
  }
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

export class OAuthError extends Error {
  public readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'OAuthError';
    this.code = code;
  }
}
