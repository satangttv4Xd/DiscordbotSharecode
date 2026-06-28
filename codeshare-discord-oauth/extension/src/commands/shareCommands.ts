import * as vscode from 'vscode';
import { ShareController } from './shareController';
import {
  fromActiveEditor,
  fromClipboard,
  fromFileUri,
} from '../services/payloadBuilder';
import { SharePayload } from '../types';

/** Register all share-related commands. */
export function registerShareCommands(
  context: vscode.ExtensionContext,
  controller: ShareController,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('codeshare.shareSelection', async () => {
      await controller.shareOne(fromActiveEditor(true), 'selection');
    }),

    vscode.commands.registerCommand('codeshare.shareCurrentFile', async () => {
      await controller.shareOne(fromActiveEditor(false), 'file');
    }),

    vscode.commands.registerCommand('codeshare.shareClipboard', async () => {
      await controller.shareOne(await fromClipboard(), 'clipboard');
    }),

    vscode.commands.registerCommand(
      'codeshare.shareFromExplorer',
      async (clicked?: vscode.Uri, selected?: vscode.Uri[]) => {
        const uris = await resolveFileUris(clicked, selected);
        if (uris.length === 0) {
          await vscode.window.showWarningMessage('No files selected to share.');
          return;
        }
        if (uris.length === 1) {
          await controller.shareOne(await fromFileUri(uris[0]), 'explorer');
          return;
        }
        const payloads: SharePayload[] = [];
        for (const uri of uris) {
          payloads.push(await fromFileUri(uri));
        }
        await controller.shareMany(payloads, 'explorer');
      },
    ),
  );
}

/** Normalise the Explorer command arguments into a list of file URIs. */
async function resolveFileUris(
  clicked?: vscode.Uri,
  selected?: vscode.Uri[],
): Promise<vscode.Uri[]> {
  const candidates = selected && selected.length > 0 ? selected : clicked ? [clicked] : [];
  const files: vscode.Uri[] = [];
  for (const uri of candidates) {
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.type === vscode.FileType.File) {
        files.push(uri);
      }
    } catch {
      /* skip unreadable entries */
    }
  }
  return files;
}
