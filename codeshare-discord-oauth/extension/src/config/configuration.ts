import * as vscode from 'vscode';
import { validateBackendUrl } from '../utils/validation';

export type UploadMode = 'auto' | 'alwaysFile' | 'alwaysInline';

const SECTION = 'codeshare';

function cfg(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration(SECTION);
}

/** Backend base URL, trailing slash stripped. */
export function getBackendUrl(): string {
  return cfg().get<string>('backendUrl', 'http://localhost:8787').trim().replace(/\/+$/, '');
}

export function isBackendUrlValid(): boolean {
  return validateBackendUrl(getBackendUrl()) === undefined;
}

export function getShowNotifications(): boolean {
  return cfg().get<boolean>('showNotifications', true);
}

export function getAutoCopyMessageLink(): boolean {
  return cfg().get<boolean>('autoCopyMessageLink', false);
}

export function getHistorySize(): number {
  const value = cfg().get<number>('historySize', 50);
  return Math.max(1, Math.min(500, Math.floor(value)));
}

export function getUploadMode(): UploadMode {
  return cfg().get<UploadMode>('uploadMode', 'auto');
}

export function getTheme(): 'auto' | 'light' | 'dark' {
  return cfg().get<'auto' | 'light' | 'dark'>('theme', 'auto');
}

/** Open the Settings UI focused on this extension's settings. */
export async function openSettings(): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.openSettings', `@ext:`);
  await vscode.commands.executeCommand('workbench.action.openSettings', SECTION);
}
