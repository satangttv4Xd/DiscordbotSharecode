import * as vscode from 'vscode';
import { Logger } from '../utils/logger';

/**
 * Handles the vscode://<publisher>.<name>/auth?token=... deep link the backend
 * redirects the browser to after a successful Discord login.
 *
 * A login flow registers a one-shot waiter via waitForToken(); when the URI
 * arrives we resolve it with the token. A timeout guards against the user
 * abandoning the browser.
 */
type Pending = {
  resolve: (token: string) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
};

export class AuthUriHandler implements vscode.UriHandler {
  private pending: Pending | undefined;

  constructor(private readonly logger: Logger) {}

  handleUri(uri: vscode.Uri): void {
    this.logger.info(`Received URI: ${uri.path}`);
    if (uri.path !== '/auth') {
      return;
    }
    const token = new URLSearchParams(uri.query).get('token');
    if (!token) {
      this.failPending(new Error('Login callback did not include a token.'));
      return;
    }
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.resolve(token);
      this.pending = undefined;
    }
  }

  /** Wait for the next auth callback, rejecting after timeoutMs. */
  waitForToken(timeoutMs = 5 * 60 * 1000): Promise<string> {
    // Cancel any previous waiter.
    this.failPending(new Error('Superseded by a new login attempt.'));
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending = undefined;
        reject(new Error('Timed out waiting for Discord login to complete.'));
      }, timeoutMs);
      this.pending = { resolve, reject, timer };
    });
  }

  private failPending(err: Error): void {
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(err);
      this.pending = undefined;
    }
  }

  dispose(): void {
    this.failPending(new Error('Extension is deactivating.'));
  }
}
