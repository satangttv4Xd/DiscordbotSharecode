import * as vscode from 'vscode';
import { AuthService } from '../auth/authService';

/** Register login / logout / reconnect commands backed by AuthService. */
export function registerAuthCommands(
  context: vscode.ExtensionContext,
  auth: AuthService,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('codeshare.login', async () => {
      if (auth.isAuthenticated()) {
        const choice = await vscode.window.showInformationMessage(
          `Already signed in as ${auth.getProfile()?.displayName}.`,
          'Reconnect',
          'Logout',
        );
        if (choice === 'Reconnect') {
          await auth.reconnect();
        } else if (choice === 'Logout') {
          await auth.logout();
        }
        return;
      }
      await auth.login();
    }),

    vscode.commands.registerCommand('codeshare.logout', async () => {
      if (!auth.isAuthenticated()) {
        await vscode.window.showInformationMessage('You are not signed in.');
        return;
      }
      await auth.logout();
    }),

    vscode.commands.registerCommand('codeshare.reconnect', async () => {
      await auth.reconnect();
    }),
  );
}
