import * as vscode from 'vscode';
import { BackendClient } from '../api/backendClient';
import { AuthService } from '../auth/authService';
import { getBackendUrl } from '../config/configuration';

/** Shows backend reachability, webhook status, and the signed-in user. */
export class ConnectionProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.emitter.event;

  constructor(
    private readonly auth: AuthService,
    private readonly backend: BackendClient,
  ) {
    this.auth.onDidChangeAuth(() => this.emitter.fire());
  }

  refresh(): void {
    this.emitter.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<vscode.TreeItem[]> {
    const items: vscode.TreeItem[] = [];

    const backendItem = new vscode.TreeItem(getBackendUrl(), vscode.TreeItemCollapsibleState.None);
    backendItem.iconPath = new vscode.ThemeIcon('server-environment');
    backendItem.tooltip = 'Configured backend URL';
    items.push(backendItem);

    const reachable = await this.backend.health();
    items.push(
      statusItem(
        reachable ? 'Backend: reachable' : 'Backend: unreachable',
        reachable ? 'pass' : 'error',
      ),
    );

    if (!this.auth.isAuthenticated()) {
      items.push(statusItem('Not signed in', 'circle-slash'));
      return items;
    }

    try {
      const status = await this.backend.getConnection();
      items.push(statusItem('Signed in', 'pass'));
      items.push(
        statusItem(
          status.webhookConfigured ? 'Webhook: configured' : 'Webhook: missing',
          status.webhookConfigured ? 'pass' : 'warning',
        ),
      );
    } catch {
      items.push(statusItem('Session check failed', 'warning'));
    }

    return items;
  }
}

function statusItem(label: string, icon: string): vscode.TreeItem {
  const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
  item.iconPath = new vscode.ThemeIcon(icon);
  return item;
}
