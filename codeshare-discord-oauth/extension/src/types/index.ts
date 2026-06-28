/** Profile returned by the backend's /api/me endpoint. */
export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  globalName: string | null;
  discriminator: string;
  avatarUrl: string | null;
  email: string | null;
}

/** Everything gathered locally about a snippet before sending to the backend. */
export interface SharePayload {
  content: string;
  fileName: string;
  languageId: string;
  fenceHint: string;
  workspaceName?: string;
  relativePath?: string;
  lineCount: number;
  byteSize: number;
  operatingSystem: string;
  vscodeVersion: string;
  forceFile?: boolean;
}

/** Successful share response from the backend. */
export interface ShareResponse {
  ok: boolean;
  delivery: 'inline' | 'file';
  messageLink: string | null;
  sharedBy: { id: string; displayName: string };
}

/** Connection status reported by the backend. */
export interface ConnectionStatus {
  authenticated: boolean;
  webhookConfigured: boolean;
  user: { id: string; displayName: string } | null;
}

/** One entry in the local share history. */
export interface HistoryEntry {
  fileName: string;
  languageId: string;
  timestamp: number;
  success: boolean;
  durationMs: number;
  delivery?: 'inline' | 'file';
  user?: string;
  error?: string;
}

/** Source of a share request. */
export type ShareSource = 'selection' | 'file' | 'clipboard' | 'explorer';
