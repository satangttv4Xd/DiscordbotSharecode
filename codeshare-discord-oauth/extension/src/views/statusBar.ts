import * as vscode from 'vscode';
import { AuthService } from '../auth/authService';

/**
 * A status bar entry that reflects auth state:
 *  - signed out → "$(sign-in) Login Discord" (runs login)
 *  - signed in  → "$(cloud-upload) Share Code" (shares current selection/file)
 */
export class StatusBar {
  private readonly item: vscode.StatusBarItem;

  constructor(private readonly auth: AuthService) {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.auth.onDidChangeAuth(() => this.update());
    this.update();
    this.item.show();
  }

  private update(): void {
    const profile = this.auth.getProfile();
    if (profile) {
      this.item.text = '$(cloud-upload) Share Code';
      this.item.tooltip = `CodeShare Discord — signed in as ${profile.displayName}. Click to share.`;
      this.item.command = 'codeshare.shareSelection';
    } else {
      this.item.text = '$(sign-in) Login Discord';
      this.item.tooltip = 'CodeShare Discord — click to sign in with Discord';
      this.item.command = 'codeshare.login';
    }
  }

  dispose(): void {
    this.item.dispose();
  }
}
