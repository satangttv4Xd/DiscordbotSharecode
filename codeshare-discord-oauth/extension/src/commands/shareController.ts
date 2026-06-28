import * as vscode from 'vscode';
import { BackendClient, BackendError } from '../api/backendClient';
import { AuthService } from '../auth/authService';
import { HistoryManager } from '../history/historyManager';
import { Logger } from '../utils/logger';
import { notifyShareError, notifyShareSuccess } from '../notifications/notify';
import { SharePayload, ShareSource } from '../types';

export class ShareController {
  constructor(
    private readonly auth: AuthService,
    private readonly backend: BackendClient,
    private readonly history: HistoryManager,
    private readonly logger: Logger,
  ) {}

  /** Share a single payload end-to-end. */
  async shareOne(payload: SharePayload | undefined, source: ShareSource): Promise<void> {
    if (!payload || !payload.content.trim()) {
      notifyShareError(this.emptyMessage(source));
      return;
    }
    if (!(await this.auth.ensureAuthenticated())) {
      return;
    }
    await this.send(payload);
  }

  /** Share multiple payloads sequentially (Explorer multi-select). */
  async shareMany(payloads: SharePayload[], _source: ShareSource): Promise<void> {
    const usable = payloads.filter((p) => p.content.trim().length > 0);
    if (usable.length === 0) {
      notifyShareError('None of the selected files have shareable content.');
      return;
    }
    if (!(await this.auth.ensureAuthenticated())) {
      return;
    }
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Sharing ${usable.length} file(s) to Discord…`,
        cancellable: true,
      },
      async (progress, token) => {
        let done = 0;
        for (const payload of usable) {
          if (token.isCancellationRequested) {
            break;
          }
          progress.report({
            message: `${payload.fileName} (${done + 1}/${usable.length})`,
            increment: 100 / usable.length,
          });
          await this.send(payload, false);
          done += 1;
        }
        if (done > 0) {
          vscode.window.showInformationMessage(`Shared ${done} file(s) to Discord.`);
        }
      },
    );
  }

  /** Core send with progress, history recording, and error handling. */
  private async send(payload: SharePayload, withOwnProgress = true): Promise<void> {
    const started = Date.now();
    const run = async () => {
      try {
        const result = await this.backend.share(payload);
        await this.history.add({
          fileName: payload.fileName,
          languageId: payload.languageId,
          timestamp: Date.now(),
          success: true,
          durationMs: Date.now() - started,
          delivery: result.delivery,
          user: result.sharedBy.displayName,
        });
        if (withOwnProgress) {
          await notifyShareSuccess(result);
        }
      } catch (err) {
        await this.history.add({
          fileName: payload.fileName,
          languageId: payload.languageId,
          timestamp: Date.now(),
          success: false,
          durationMs: Date.now() - started,
          error: (err as Error).message,
        });
        await this.handleError(err);
      }
    };

    if (!withOwnProgress) {
      await run();
      return;
    }
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Sharing ${payload.fileName} to Discord…`,
        cancellable: false,
      },
      run,
    );
  }

  private async handleError(err: unknown): Promise<void> {
    if (err instanceof BackendError && err.isAuthError) {
      this.logger.warn('Share rejected: session expired.');
      const choice = await vscode.window.showWarningMessage(
        'Your Discord session expired. Please sign in again.',
        'Login with Discord',
      );
      if (choice === 'Login with Discord') {
        await this.auth.login();
      }
      return;
    }
    if (err instanceof BackendError && err.code === 'network') {
      notifyShareError('Could not reach the backend. Check that it is running and the URL is correct.');
      this.logger.error('Network error during share', err);
      return;
    }
    this.logger.error('Share failed', err);
    notifyShareError((err as Error).message || 'Failed to share code.');
  }

  private emptyMessage(source: ShareSource): string {
    switch (source) {
      case 'selection':
        return 'Nothing to share — open a file or select some code.';
      case 'file':
        return 'The active file is empty.';
      case 'clipboard':
        return 'Your clipboard is empty.';
      case 'explorer':
        return 'The selected file is empty.';
      default:
        return 'Nothing to share.';
    }
  }
}
