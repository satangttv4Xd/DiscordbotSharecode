import { StoredTokens, UserProfile } from '../types';

/**
 * Server-side store for Discord tokens and the last-known profile.
 *
 * Tokens NEVER leave the backend — the extension only ever holds an opaque
 * session JWT. This keeps the Discord client secret and the user's Discord
 * access/refresh tokens off the client entirely.
 *
 * The default implementation is in-memory, which is perfect for local
 * development and single-instance deployments. For horizontal scaling or
 * persistence across restarts, implement the same TokenStore interface on top
 * of Redis or a database and swap the export at the bottom of the file.
 */
export interface TokenStore {
  save(userId: string, tokens: StoredTokens, profile: UserProfile): Promise<void>;
  getTokens(userId: string): Promise<StoredTokens | undefined>;
  getProfile(userId: string): Promise<UserProfile | undefined>;
  delete(userId: string): Promise<void>;
}

interface Record_ {
  tokens: StoredTokens;
  profile: UserProfile;
}

class InMemoryTokenStore implements TokenStore {
  private readonly map = new Map<string, Record_>();

  async save(userId: string, tokens: StoredTokens, profile: UserProfile): Promise<void> {
    this.map.set(userId, { tokens, profile });
  }

  async getTokens(userId: string): Promise<StoredTokens | undefined> {
    return this.map.get(userId)?.tokens;
  }

  async getProfile(userId: string): Promise<UserProfile | undefined> {
    return this.map.get(userId)?.profile;
  }

  async delete(userId: string): Promise<void> {
    this.map.delete(userId);
  }
}

export const tokenStore: TokenStore = new InMemoryTokenStore();
