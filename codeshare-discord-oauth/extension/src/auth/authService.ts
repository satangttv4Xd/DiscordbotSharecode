import * as vscode from 'vscode';
import { BackendClient, BackendError } from '../api/backendClient';
import { getBackendUrl, isBackendUrlValid } from '../config/configuration';
import { Logger } from '../utils/logger';
import { UserProfile } from '../types';
import { SessionStore } from './sessionStore';
import { AuthUriHandler } from './uriHandler';

/**
 * Owns authentication state for the extension.
 *
 * Login uses the OAuth2 Authorization Code flow driven entirely by the backend:
 * the extension opens the backend's /oauth/start in the browser, the user
 * authorises on Discord, and the backend redirects back to a vscode:// deep link
 * carrying an opaque session token which we persist in SecretStorage.
 */
export class AuthService {
  private profile: UserProfile | undefined;
  private readonly emitter = new vscode.EventEmitter<UserProfile | undefined>();

  /** Fires with the new profile on login, or undefined on logout/expiry. */
  readonly onDidChangeAuth = this.emitter.event;

  constructor(
    private readonly extensionId: string,
    private readonly sessions: SessionStore,
    private readonly backend: BackendClient,
    private readonly uriHandler: AuthUriHandler,
    private readonly logger: Logger,
  ) {}

  isAuthenticated(): boolean {
    return this.profile !== undefined;
  }

  getProfile(): UserProfile | undefined {
    return this.profile;
  }

  /** On startup: if a token exists, validate it and load the profile. */
  async restoreSession(): Promise<void> {
    if (!(await this.sessions.hasToken())) {
      return;
    }
    try {
      this.profile = await this.backend.getMe();
      this.logger.info(`Restored session for ${this.profile.username}`);
      this.emitter.fire(this.profile);
    } catch (err) {
      if (err instanceof BackendError && err.isAuthError) {
        this.logger.warn('Stored session expired; clearing.');
        await this.sessions.clear();
        this.profile = undefined;
        this.emitter.fire(undefined);
      } else {
        // Network/backend down: keep the token, try again later.
        this.logger.warn(`Could not validate session now: ${(err as Error).message}`);
      }
    }
  }

  /** Run the full interactive login flow. Returns true on success. */
  async login(): Promise<boolean> {
    if (!isBackendUrlValid()) {
      const choice = await vscode.window.showErrorMessage(
        'The CodeShare backend URL is not configured correctly.',
        'Open Settings',
      );
      if (choice === 'Open Settings') {
        await vscode.commands.executeCommand('codeshare.openSettings');
      }
      return false;
    }

    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Signing in with Discord…',
        cancellable: true,
      },
      async (_progress, cancelToken) => {
        try {
          // Build the deep link VS Code will receive after authorisation.
          const callback = await vscode.env.asExternalUri(
            vscode.Uri.parse(`${vscode.env.uriScheme}://${this.extensionId}/auth`),
          );
          const startUrl = `${getBackendUrl()}/oauth/start?redirect_uri=${encodeURIComponent(
            callback.toString(true),
          )}`;

          // Begin waiting BEFORE opening the browser to avoid a race.
          const tokenPromise = this.uriHandler.waitForToken();
          cancelToken.onCancellationRequested(() => {
            this.uriHandler.dispose();
          });

          const opened = await vscode.env.openExternal(vscode.Uri.parse(startUrl));
          if (!opened) {
            throw new Error('Could not open the browser for Discord login.');
          }

          const token = await tokenPromise;
          await this.sessions.setToken(token);

          this.profile = await this.backend.getMe();
          this.logger.info(`Logged in as ${this.profile.username}`);
          this.emitter.fire(this.profile);

          await vscode.window.showInformationMessage(
            `Signed in to Discord as ${this.profile.displayName}.`,
          );
          return true;
        } catch (err) {
          this.logger.error('Login failed', err);
          await vscode.window.showErrorMessage(`Discord login failed: ${(err as Error).message}`);
          return false;
        }
      },
    );
  }

  /** Clear the local session and notify the backend. */
  async logout(): Promise<void> {
    await this.backend.logout();
    await this.sessions.clear();
    const wasUser = this.profile?.displayName;
    this.profile = undefined;
    this.emitter.fire(undefined);
    this.logger.info('Logged out.');
    if (wasUser) {
      await vscode.window.showInformationMessage(`Signed out of Discord (${wasUser}).`);
    }
  }

  /** Logout then immediately start a fresh login. */
  async reconnect(): Promise<boolean> {
    await this.logout();
    return this.login();
  }

  /**
   * Ensure the user is signed in before a gated action. If not, offer to log in
   * and run the flow. Returns true only when authenticated afterwards.
   */
  async ensureAuthenticated(): Promise<boolean> {
    if (this.isAuthenticated()) {
      return true;
    }
    const choice = await vscode.window.showInformationMessage(
      'You need to sign in with Discord before sharing code.',
      'Login with Discord',
    );
    if (choice !== 'Login with Discord') {
      return false;
    }
    return this.login();
  }

  dispose(): void {
    this.emitter.dispose();
  }
}
