import * as vscode from 'vscode';
import { getHistorySize } from '../config/configuration';
import { HistoryEntry } from '../types';

const KEY = 'codeshare.history';

/**
 * Persists recent shares in the extension's globalState (workspace-independent),
 * capped at the configured history size. Newest entries first.
 */
export class HistoryManager {
  private readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChange = this.emitter.event;

  constructor(private readonly memento: vscode.Memento) {}

  getAll(): HistoryEntry[] {
    return this.memento.get<HistoryEntry[]>(KEY, []);
  }

  async add(entry: HistoryEntry): Promise<void> {
    const all = [entry, ...this.getAll()].slice(0, getHistorySize());
    await this.memento.update(KEY, all);
    this.emitter.fire();
  }

  async clear(): Promise<void> {
    await this.memento.update(KEY, []);
    this.emitter.fire();
  }

  dispose(): void {
    this.emitter.dispose();
  }
}
