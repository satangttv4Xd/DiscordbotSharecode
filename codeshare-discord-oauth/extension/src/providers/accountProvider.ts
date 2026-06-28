import * as vscode from 'vscode';
import { AuthService } from '../auth/authService';

/** Sidebar view showing the signed-in Discord account, or a login prompt. */
export class AccountProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.emitter.event;

  constructor(private readonly auth: AuthService) {
    this.auth.onDidChangeAuth(() => this.emitter.fire());
  }

  refresh(): void {
    this.emitter.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): vscode.TreeItem[] {
    const profile = this.auth.getProfile();
    if (!profile) {
      // Return empty so VS Code renders the viewsWelcome button from package.json
      return [];
    }

    const items: vscode.TreeItem[] = [];

    const name = new vscode.TreeItem(profile.displayName, vscode.TreeItemCollapsibleState.None);
    name.description = `@${profile.username}`;
    name.iconPath = new vscode.ThemeIcon('verified-filled');
    name.tooltip = 'Signed in to Discord';
    items.push(name);

    const id = new vscode.TreeItem(`ID: ${profile.id}`, vscode.TreeItemCollapsibleState.None);
    id.iconPath = new vscode.ThemeIcon('key');
    items.push(id);

    if (profile.email) {
      const email = new vscode.TreeItem(profile.email, vscode.TreeItemCollapsibleState.None);
      email.iconPath = new vscode.ThemeIcon('mail');
      items.push(email);
    }

    const logout = new vscode.TreeItem('Logout', vscode.TreeItemCollapsibleState.None);
    logout.iconPath = new vscode.ThemeIcon('sign-out');
    logout.command = { command: 'codeshare.logout', title: 'Logout' };
    items.push(logout);

    return items;
  }
}
