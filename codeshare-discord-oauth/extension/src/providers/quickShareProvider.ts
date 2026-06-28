import * as vscode from 'vscode';

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

/** Static list of one-click share actions. */
export class QuickShareProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): vscode.TreeItem[] {
    return ACTIONS.map((action) => {
      const item = new vscode.TreeItem(action.label, vscode.TreeItemCollapsibleState.None);
      item.iconPath = new vscode.ThemeIcon(action.icon);
      item.command = { command: action.command, title: action.label };
      item.tooltip = action.tooltip;
      return item;
    });
  }
}
