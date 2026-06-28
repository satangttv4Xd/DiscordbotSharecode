import * as os from 'os';

/** Human-readable byte size. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB'];
  let size = bytes / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(1)} ${units[unit]}`;
}

/** UTF-8 byte length of a string. */
export function utf8ByteLength(text: string): number {
  return Buffer.byteLength(text, 'utf8');
}

/** Count lines in a block of text. */
export function countLines(text: string): number {
  if (text.length === 0) {
    return 0;
  }
  return text.split(/\r\n|\r|\n/).length;
}

/** A friendly OS description, e.g. "macOS 14.4 (arm64)". */
export function describeOperatingSystem(): string {
  const platform = os.platform();
  const names: Record<string, string> = {
    darwin: 'macOS',
    win32: 'Windows',
    linux: 'Linux',
  };
  const name = names[platform] ?? platform;
  return `${name} ${os.release()} (${os.arch()})`;
}
