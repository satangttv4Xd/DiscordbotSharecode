/** Raw token response returned by Discord's /oauth2/token endpoint. */
export interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

/** Subset of Discord's /users/@me response we care about. */
export interface DiscordUser {
  id: string;
  username: string;
  /** Legacy discriminator (e.g. "0001"); "0" for migrated accounts. */
  discriminator: string;
  /** New unique handle; may be null on legacy accounts. */
  global_name: string | null;
  avatar: string | null;
  email?: string | null;
  verified?: boolean;
}

/** Normalised user profile we expose to the extension. */
export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  globalName: string | null;
  discriminator: string;
  avatarUrl: string | null;
  email: string | null;
}

/** Discord OAuth tokens kept server-side, keyed by user id. */
export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds at which the access token expires. */
  expiresAt: number;
  scope: string;
}

/** Payload embedded inside the signed session JWT handed to the extension. */
export interface SessionClaims {
  sub: string; // Discord user id
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

/** Metadata the extension sends with a share request. */
export interface ShareRequest {
  content: string;
  fileName: string;
  languageId: string;
  fenceHint: string;
  workspaceName?: string;
  relativePath?: string;
  lineCount: number;
  byteSize: number;
  operatingSystem: string;
  vscodeVersion: string;
  /** When true, force upload as a file attachment. */
  forceFile?: boolean;
}

/** Result of forwarding a share to Discord. */
export interface ShareResult {
  ok: boolean;
  delivery: 'inline' | 'file';
  messageLink?: string;
  status: number;
}
