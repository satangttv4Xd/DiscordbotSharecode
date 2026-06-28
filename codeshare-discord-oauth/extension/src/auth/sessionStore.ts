import * as vscode from 'vscode';

/**
 * Stores the backend session token in VS Code SecretStorage.
 *
 * SecretStorage is backed by the OS keychain/credential manager, so the token
 * is encrypted at rest and never written to settings.json. The token itself is
 * an opaque JWT minted by the backend; the sensitive Discord tokens it
 * represents live only on the server.
 */
const KEY = 'codeshare.session.token';

export class SessionStore {
  constructor(private readonly secrets: vscode.SecretStorage) {}

  async setToken(token: string): Promise<void> {
    await this.secrets.store(KEY, token);
  }

  async getToken(): Promise<string | undefined> {
    return this.secrets.get(KEY);
  }

  async clear(): Promise<void> {
    await this.secrets.delete(KEY);
  }

  async hasToken(): Promise<boolean> {
    return (await this.getToken()) !== undefined;
  }

  /** Fires whenever the stored secret changes (e.g. cleared in another window). */
  get onDidChange(): vscode.Event<vscode.SecretStorageChangeEvent> {
    return this.secrets.onDidChange;
  }
}
