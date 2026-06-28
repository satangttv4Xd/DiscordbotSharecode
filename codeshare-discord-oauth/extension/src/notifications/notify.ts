import * as vscode from 'vscode';
import { getAutoCopyMessageLink, getShowNotifications } from '../config/configuration';
import { ShareResponse } from '../types';

/** Show a success notification (respecting the setting) with optional actions. */
export async function notifyShareSuccess(result: ShareResponse): Promise<void> {
  if (getAutoCopyMessageLink() && result.messageLink) {
    await vscode.env.clipboard.writeText(result.messageLink);
  }
  if (!getShowNotifications()) {
    return;
  }
  const how = result.delivery === 'file' ? 'as a file' : 'inline';
  const actions: string[] = [];
  if (result.messageLink) {
    actions.push('Open in Discord', 'Copy Link');
  }
  const choice = await vscode.window.showInformationMessage(
    `Shared to Discord ${how}.`,
    ...actions,
  );
  if (choice === 'Open in Discord' && result.messageLink) {
    await vscode.env.openExternal(vscode.Uri.parse(result.messageLink));
  } else if (choice === 'Copy Link' && result.messageLink) {
    await vscode.env.clipboard.writeText(result.messageLink);
    await vscode.window.showInformationMessage('Message link copied.');
  }
}

export function notifyShareError(message: string): void {
  vscode.window.showErrorMessage(`CodeShare: ${message}`);
}

export function notifyInfo(message: string): void {
  if (getShowNotifications()) {
    vscode.window.showInformationMessage(message);
  }
}
