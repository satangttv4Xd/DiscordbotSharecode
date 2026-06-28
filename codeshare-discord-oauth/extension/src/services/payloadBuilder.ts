import * as vscode from 'vscode';
import * as path from 'path';
import { getUploadMode } from '../config/configuration';
import { countLines, describeOperatingSystem, utf8ByteLength } from '../utils/format';
import { guessLanguageFromExtension, toFenceHint } from '../utils/languageMap';
import { SharePayload } from '../types';

function workspaceInfo(uri: vscode.Uri | undefined): {
  workspaceName?: string;
  relativePath?: string;
} {
  if (!uri) {
    return {};
  }
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (!folder) {
    return { relativePath: path.basename(uri.fsPath) };
  }
  return {
    workspaceName: folder.name,
    relativePath: path.relative(folder.uri.fsPath, uri.fsPath) || path.basename(uri.fsPath),
  };
}

function finalize(
  content: string,
  fileName: string,
  languageId: string,
  uri: vscode.Uri | undefined,
): SharePayload {
  const { workspaceName, relativePath } = workspaceInfo(uri);
  return {
    content,
    fileName,
    languageId,
    fenceHint: toFenceHint(languageId),
    workspaceName,
    relativePath,
    lineCount: countLines(content),
    byteSize: utf8ByteLength(content),
    operatingSystem: describeOperatingSystem(),
    vscodeVersion: vscode.version,
    forceFile: getUploadMode() === 'alwaysFile',
  };
}

/** Build a payload from the active editor (selection or whole document). */
export function fromActiveEditor(selectionOnly: boolean): SharePayload | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return undefined;
  }
  const doc = editor.document;
  const useSelection = selectionOnly && !editor.selection.isEmpty;
  const content = useSelection ? doc.getText(editor.selection) : doc.getText();
  const fileName = doc.isUntitled ? `untitled.${extFor(doc.languageId)}` : path.basename(doc.fileName);
  const uri = doc.isUntitled ? undefined : doc.uri;
  return finalize(content, fileName, doc.languageId, uri);
}

/** Build a payload from a file on disk (used by the Explorer command). */
export async function fromFileUri(uri: vscode.Uri): Promise<SharePayload> {
  const bytes = await vscode.workspace.fs.readFile(uri);
  const content = Buffer.from(bytes).toString('utf8');
  let languageId: string;
  try {
    const doc = await vscode.workspace.openTextDocument(uri);
    languageId = doc.languageId;
  } catch {
    languageId = guessLanguageFromExtension(uri.fsPath);
  }
  return finalize(content, path.basename(uri.fsPath), languageId, uri);
}

/** Build a payload from the clipboard contents. */
export async function fromClipboard(): Promise<SharePayload | undefined> {
  const content = await vscode.env.clipboard.readText();
  if (!content) {
    return undefined;
  }
  const languageId = vscode.window.activeTextEditor?.document.languageId ?? 'plaintext';
  return finalize(content, `clipboard.${extFor(languageId)}`, languageId, undefined);
}

function extFor(languageId: string): string {
  const map: Record<string, string> = {
    typescript: 'ts',
    typescriptreact: 'tsx',
    javascript: 'js',
    javascriptreact: 'jsx',
    python: 'py',
    csharp: 'cs',
    shellscript: 'sh',
    markdown: 'md',
    plaintext: 'txt',
  };
  return map[languageId] ?? (languageId && /^[a-z0-9]+$/i.test(languageId) ? languageId : 'txt');
}
