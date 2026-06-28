import { ShareRequest, UserProfile } from '../types';

const BLURPLE = 0x5865f2;
/** Discord embed field values are capped at 1024 characters. */
const FIELD_LIMIT = 1024;

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title: string;
  color: number;
  fields: DiscordEmbedField[];
  author?: { name: string; icon_url?: string };
  thumbnail?: { url: string };
  footer?: { text: string };
  timestamp?: string;
}

function clamp(value: string): string {
  if (value.length <= FIELD_LIMIT) {
    return value;
  }
  return `${value.slice(0, FIELD_LIMIT - 1)}…`;
}

function formatBytes(bytes: number): string {
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

/**
 * Build the metadata embed for a share. The embed makes the sharer unmistakable:
 * their Discord avatar is the author icon + thumbnail, and their username,
 * display name, and ID appear as fields, alongside file/workspace/environment
 * details and both local and UTC timestamps.
 */
export function buildShareEmbed(profile: UserProfile, share: ShareRequest): DiscordEmbed {
  const now = new Date();
  const unix = Math.floor(now.getTime() / 1000);

  const fields: DiscordEmbedField[] = [
    { name: '👤 Shared By', value: clamp(profile.displayName), inline: true },
    { name: '🔖 Username', value: clamp(`@${profile.username}`), inline: true },
    { name: '🆔 Discord ID', value: clamp(profile.id), inline: true },
    // <t:unix:F> renders full local time, <t:unix:R> a relative time — both are
    // localised per-viewer by Discord. We also include an explicit UTC string.
    { name: '🕒 Time', value: `<t:${unix}:F> (<t:${unix}:R>)`, inline: false },
    { name: '🌐 UTC', value: now.toISOString(), inline: true },
    { name: '⏱ Unix', value: String(unix), inline: true },
    { name: '📄 File Name', value: clamp(share.fileName || 'untitled'), inline: true },
    { name: '💻 Language', value: clamp(share.languageId || 'plaintext'), inline: true },
    { name: '📏 Lines', value: String(share.lineCount), inline: true },
    { name: '📦 Size', value: formatBytes(share.byteSize), inline: true },
  ];

  if (share.workspaceName) {
    fields.push({ name: '📁 Workspace', value: clamp(share.workspaceName), inline: true });
  }
  if (share.relativePath) {
    fields.push({ name: '📂 Relative Path', value: clamp(share.relativePath), inline: false });
  }
  fields.push({ name: '📝 VS Code', value: clamp(share.vscodeVersion), inline: true });

  const embed: DiscordEmbed = {
    title: '📤 Code Shared',
    color: BLURPLE,
    fields,
    author: {
      name: profile.displayName,
      ...(profile.avatarUrl ? { icon_url: profile.avatarUrl } : {}),
    },
    footer: { text: 'CodeShare Discord' },
    timestamp: now.toISOString(),
  };
  if (profile.avatarUrl) {
    embed.thumbnail = { url: profile.avatarUrl };
  }
  return embed;
}

/**
 * Build a fenced markdown code block whose fence is guaranteed to be longer than
 * any backtick run inside the content, so nested code blocks cannot break out.
 */
export function buildCodeBlock(content: string, fenceHint: string): string {
  const longestRun = (content.match(/`+/g) ?? []).reduce((max, run) => Math.max(max, run.length), 0);
  const fence = '`'.repeat(Math.max(3, longestRun + 1));
  return `${fence}${fenceHint}\n${content}\n${fence}`;
}
