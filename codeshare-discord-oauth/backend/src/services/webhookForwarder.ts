import crypto from 'crypto';
import { URL } from 'url';
import { config } from '../config/env';
import { logger } from '../config/logger';
import { httpRequest, HttpResponse } from '../utils/http';
import { ShareRequest, ShareResult, UserProfile } from '../types';
import { buildCodeBlock, buildShareEmbed, DiscordEmbed } from './embedBuilder';

/** Hard ceiling Discord enforces on message `content`. */
const CONTENT_HARD_LIMIT = 2000;
/** Leave headroom for the code fence and hint. */
const INLINE_SAFE_LIMIT = 1900;

interface WebhookMessageResponse {
  id?: string;
  channel_id?: string;
}

function withWait(webhookUrl: string): string {
  const url = new URL(webhookUrl);
  url.searchParams.set('wait', 'true');
  return url.toString();
}

function extractMessageLink(body: string): string | undefined {
  try {
    const data = JSON.parse(body) as WebhookMessageResponse;
    if (data.id && data.channel_id) {
      return `https://discord.com/channels/@me/${data.channel_id}/${data.id}`;
    }
  } catch {
    /* ignore malformed body */
  }
  return undefined;
}

function parseRetryAfterMs(body: string, header: string | string[] | undefined): number {
  try {
    const data = JSON.parse(body) as { retry_after?: number };
    if (typeof data.retry_after === 'number') {
      return Math.ceil(data.retry_after * 1000);
    }
  } catch {
    /* fall through to header */
  }
  const raw = Array.isArray(header) ? header[0] : header;
  const seconds = raw ? Number.parseFloat(raw) : NaN;
  return Number.isNaN(seconds) ? 1000 : Math.ceil(seconds * 1000);
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Raw inline POST (embed + inline code block). Returns the unparsed response. */
function postInline(embed: DiscordEmbed, codeBlock: string): Promise<HttpResponse> {
  return httpRequest({
    method: 'POST',
    url: withWait(config.webhookUrl),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: codeBlock,
      embeds: [embed],
      allowed_mentions: { parse: [] },
    }),
  });
}

/** Raw multipart POST (embed + .txt attachment). Returns the unparsed response. */
function postFile(embed: DiscordEmbed, share: ShareRequest): Promise<HttpResponse> {
  const boundary = `----CodeShare${crypto.randomBytes(16).toString('hex')}`;
  const fileName = sanitiseFileName(share.fileName, share.fenceHint);

  const payloadJson = JSON.stringify({
    content: '',
    embeds: [embed],
    allowed_mentions: { parse: [] },
    attachments: [{ id: 0, filename: fileName }],
  });

  const parts: Buffer[] = [];
  const push = (text: string) => parts.push(Buffer.from(text, 'utf8'));

  push(`--${boundary}\r\n`);
  push('Content-Disposition: form-data; name="payload_json"\r\n');
  push('Content-Type: application/json\r\n\r\n');
  push(payloadJson);
  push('\r\n');

  push(`--${boundary}\r\n`);
  push(`Content-Disposition: form-data; name="files[0]"; filename="${fileName}"\r\n`);
  push('Content-Type: text/plain; charset=utf-8\r\n\r\n');
  parts.push(Buffer.from(share.content, 'utf8'));
  push('\r\n');
  push(`--${boundary}--\r\n`);

  return httpRequest({
    method: 'POST',
    url: withWait(config.webhookUrl),
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body: Buffer.concat(parts),
  });
}

function sanitiseFileName(name: string, fenceHint: string): string {
  const base = (name || 'snippet').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  if (/\.[a-zA-Z0-9]+$/.test(base)) {
    return base;
  }
  const ext = fenceHint && /^[a-z0-9]+$/i.test(fenceHint) ? fenceHint : 'txt';
  return `${base}.${ext}`;
}

/**
 * Forward a share to the configured Discord webhook. Chooses inline vs file
 * automatically (unless forced), retries once on HTTP 429 honouring the
 * Retry-After value from the throttled response, and returns a structured
 * result including a clickable message link.
 */
export async function forwardShare(
  profile: UserProfile,
  share: ShareRequest,
): Promise<ShareResult> {
  const embed = buildShareEmbed(profile, share);
  const codeBlock = buildCodeBlock(share.content, share.fenceHint);

  const useFile =
    share.forceFile === true ||
    codeBlock.length > INLINE_SAFE_LIMIT ||
    share.content.length >= CONTENT_HARD_LIMIT;

  const send = (): Promise<HttpResponse> =>
    useFile ? postFile(embed, share) : postInline(embed, codeBlock);

  let res = await send();

  if (res.status === 429) {
    const waitMs = parseRetryAfterMs(res.body, res.headers['retry-after']);
    logger.warn('Webhook rate-limited; retrying after delay', { waitMs });
    await sleep(Math.min(waitMs, 10000));
    res = await send();
  }

  const result: ShareResult = {
    ok: res.status >= 200 && res.status < 300,
    delivery: useFile ? 'file' : 'inline',
    status: res.status,
    messageLink: extractMessageLink(res.body),
  };

  logger.info('Forwarded share to webhook', {
    userId: profile.id,
    delivery: result.delivery,
    status: result.status,
    ok: result.ok,
  });
  return result;
}
