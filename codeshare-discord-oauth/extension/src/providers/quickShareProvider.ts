import * as vscode from 'vscode';
import { AuthService } from '../auth/authService';

interface Action {
  label: string;
  icon: string;
  command: string;
  tooltip: string;
}

const ACTIONS: Action[] = [
  {
    label: 'Share Selection',
    icon: 'selection',
    command: 'codeshare.shareSelection',
    tooltip: 'Share the selected code',
  },
  {
    label: 'Share Current File',
    icon: 'file-code',
    command: 'codeshare.shareCurrentFile',
    tooltip: 'Share the whole active file',
  },
  {
    label: 'Share Clipboard',
    icon: 'clippy',
    command: 'codeshare.shareClipboard',
    tooltip: 'Share the current clipboard contents',
  },
];

/** Static list of one-click share actions — hidden until signed in. */
export class QuickShareProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.emitter.event;

  constructor(private readonly auth: AuthService) {
    this.auth.onDidChangeAuth(() => this.emitter.fire());
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): vscode.TreeItem[] {
    // Return empty when not signed in so viewsWelcome Login button is shown instead
    if (!this.auth.isAuthenticated()) {
      return [];
    }
    return ACTIONS.map((action) => {
      const item = new vscode.TreeItem(action.label, vscode.TreeItemCollapsibleState.None);
      item.iconPath = new vscode.ThemeIcon(action.icon);
      item.command = { command: action.command, title: action.label };
      item.tooltip = action.tooltip;
      return item;
    });
  }
}
