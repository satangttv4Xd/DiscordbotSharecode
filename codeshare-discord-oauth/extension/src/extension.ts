import * as vscode from 'vscode';
import { BackendClient } from './api/backendClient';
import { AuthService } from './auth/authService';
import { SessionStore } from './auth/sessionStore';
import { AuthUriHandler } from './auth/uriHandler';
import { registerAuthCommands } from './commands/authCommands';
import { registerShareCommands } from './commands/shareCommands';
import { ShareController } from './commands/shareController';
import { openSettings } from './config/configuration';
import { HistoryManager } from './history/historyManager';
import { AccountProvider } from './providers/accountProvider';
import { ConnectionProvider } from './providers/connectionProvider';
import { HistoryProvider } from './providers/historyProvider';
import { QuickShareProvider } from './providers/quickShareProvider';
import { SettingsProvider } from './providers/settingsProvider';
import { Logger } from './utils/logger';
import { StatusBar } from './views/statusBar';
import { WelcomeWizard } from './wizard/welcomeWizard';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const logger = new Logger();
  logger.info('Activating CodeShare Discord');

  // --- Core services ---
  const sessions = new SessionStore(context.secrets);
  const backend = new BackendClient(sessions);
  const uriHandler = new AuthUriHandler(logger);
  const auth = new AuthService(context.extension.id, sessions, backend, uriHandler, logger);
  const history = new HistoryManager(context.globalState);
  const controller = new ShareController(auth, backend, history, logger);
  const statusBar = new StatusBar(auth);
  const wizard = new WelcomeWizard(context, auth);

  // --- URI handler for the OAuth callback deep link ---
  context.subscriptions.push(vscode.window.registerUriHandler(uriHandler));

  // --- Tree views ---
  const accountProvider = new AccountProvider(auth);
  const quickShareProvider = new QuickShareProvider(auth);
  const connectionProvider = new ConnectionProvider(auth, backend);
  const historyProvider = new HistoryProvider(history);
  const settingsProvider = new SettingsProvider();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('codeshareAccount', accountProvider),
    vscode.window.registerTreeDataProvider('codeshareQuickShare', quickShareProvider),
    vscode.window.registerTreeDataProvider('codeshareConnection', connectionProvider),
    vscode.window.registerTreeDataProvider('codeshareHistory', historyProvider),
    vscode.window.registerTreeDataProvider('codeshareSettings', settingsProvider),
  );

  // --- Commands ---
  registerAuthCommands(context, auth);
  registerShareCommands(context, controller);

  context.subscriptions.push(
    vscode.commands.registerCommand('codeshare.testConnection', async () => {
      const reachable = await backend.health();
      if (!reachable) {
        await vscode.window.showErrorMessage(
          'Backend is not reachable. Check codeshare.backendUrl and that the server is running.',
        );
        connectionProvider.refresh();
        return;
      }
      if (!auth.isAuthenticated()) {
        await vscode.window.showWarningMessage('Backend reachable, but you are not signed in.');
        connectionProvider.refresh();
        return;
      }
      try {
        const status = await backend.getConnection();
        await vscode.window.showInformationMessage(
          `Connected. Webhook ${status.webhookConfigured ? 'configured' : 'NOT configured'}.`,
        );
      } catch (err) {
        await vscode.window.showErrorMessage(`Connection check failed: ${(err as Error).message}`);
      }
      connectionProvider.refresh();
    }),

    vscode.commands.registerCommand('codeshare.showWelcome', () => wizard.show()),

    vscode.commands.registerCommand('codeshare.clearHistory', async () => {
      const choice = await vscode.window.showWarningMessage(
        'Clear all local share history?',
        { modal: true },
        'Clear',
      );
      if (choice === 'Clear') {
        await history.clear();
        await vscode.window.showInformationMessage('History cleared.');
      }
    }),

    vscode.commands.registerCommand('codeshare.openSettings', () => openSettings()),

    vscode.commands.registerCommand('codeshare.refreshAccount', () => accountProvider.refresh()),
    vscode.commands.registerCommand('codeshare.refreshConnection', () =>
      connectionProvider.refresh(),
    ),
    vscode.commands.registerCommand('codeshare.refreshHistory', () => historyProvider.refresh()),
  );

  // --- Disposables that own resources ---
  context.subscriptions.push(logger, statusBar, history, auth, uriHandler, {
    dispose: () => undefined,
  });

  // --- Sync context key so viewsWelcome conditions work ---
  const syncAuthContext = (profile: import('./types').UserProfile | undefined): void => {
    void vscode.commands.executeCommand(
      'setContext',
      'codeshare.isAuthenticated',
      profile !== undefined,
    );
  };
  auth.onDidChangeAuth(syncAuthContext);

  // --- Restore prior session, then first-run wizard ---
  await auth.restoreSession();
  syncAuthContext(auth.getProfile());
  await wizard.maybeShowOnFirstRun();

  // --- Auto-open login only if truly not authenticated after restore ---
  if (!auth.isAuthenticated()) {
    // Fire-and-forget so activate() resolves immediately and the progress
    // notification is owned entirely by login() itself (it will close on its own).
    void auth.login();
  }

  logger.info('CodeShare Discord activated');
}

export function deactivate(): void {
  // Resources are disposed via context.subscriptions.
}
