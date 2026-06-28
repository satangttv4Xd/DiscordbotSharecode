import * as vscode from 'vscode';
import { HistoryManager } from '../history/historyManager';
import { HistoryEntry } from '../types';

/** Lists recent shares with success/failure icons and rich tooltips. */
export class HistoryProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.emitter.event;

  constructor(private readonly history: HistoryManager) {
    this.history.onDidChange(() => this.emitter.fire());
  }

  refresh(): void {
    this.emitter.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): vscode.TreeItem[] {
    const entries = this.history.getAll();
    if (entries.length === 0) {
      const empty = new vscode.TreeItem('No shares yet', vscode.TreeItemCollapsibleState.None);
      empty.iconPath = new vscode.ThemeIcon('history');
      return [empty];
    }
    return entries.map((entry) => toItem(entry));
  }
}

function toItem(entry: HistoryEntry): vscode.TreeItem {
  const item = new vscode.TreeItem(entry.fileName, vscode.TreeItemCollapsibleState.None);
  const when = new Date(entry.timestamp).toLocaleString();
  item.description = `${entry.languageId} · ${when}`;
  item.iconPath = new vscode.ThemeIcon(
    entry.success ? 'check' : 'error',
    new vscode.ThemeColor(entry.success ? 'testing.iconPassed' : 'testing.iconFailed'),
  );
  const lines = [
    `File: ${entry.fileName}`,
    `Language: ${entry.languageId}`,
    `When: ${when}`,
    `Duration: ${entry.durationMs} ms`,
    `Result: ${entry.success ? 'Success' : 'Failed'}`,
  ];
  if (entry.user) {
    lines.push(`Shared by: ${entry.user}`);
  }
  if (entry.delivery) {
    lines.push(`Delivery: ${entry.delivery}`);
  }
  if (entry.error) {
    lines.push(`Error: ${entry.error}`);
  }
  item.tooltip = lines.join('\n');
  return item;
}
