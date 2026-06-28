import * as vscode from 'vscode';

interface Link {
  label: string;
  icon: string;
  command: string;
  args?: unknown[];
  tooltip: string;
}

const LINKS: Link[] = [
  {
    label: 'Open Settings',
    icon: 'settings-gear',
    command: 'codeshare.openSettings',
    tooltip: 'Open CodeShare Discord settings',
  },
  {
    label: 'Test Connection',
    icon: 'plug',
    command: 'codeshare.testConnection',
    tooltip: 'Check the backend and session',
  },
  {
    label: 'Reconnect Discord',
    icon: 'sync',
    command: 'codeshare.reconnect',
    tooltip: 'Sign out and sign back in',
  },
  {
    label: 'Open Welcome Wizard',
    icon: 'book',
    command: 'codeshare.showWelcome',
    tooltip: 'Re-run the first-launch wizard',
  },
  {
    label: 'Clear History',
    icon: 'trash',
    command: 'codeshare.clearHistory',
    tooltip: 'Remove all local share history',
  },
];

/** Quick links into settings and maintenance commands. */
export class SettingsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): vscode.TreeItem[] {
    return LINKS.map((link) => {
      const item = new vscode.TreeItem(link.label, vscode.TreeItemCollapsibleState.None);
      item.iconPath = new vscode.ThemeIcon(link.icon);
      item.command = { command: link.command, title: link.label, arguments: link.args };
      item.tooltip = link.tooltip;
      return item;
    });
  }
}
