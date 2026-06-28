import dotenv from 'dotenv';

dotenv.config();

/**
 * Strongly-typed, validated view of the environment.
 *
 * Every value the backend needs is read exactly once here so that the rest of
 * the codebase never touches process.env directly. If a required value is
 * missing we fail fast at boot with a clear message rather than crashing later
 * mid-request.
 */
export interface AppConfig {
  port: number;
  publicBaseUrl: string;
  discord: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string;
  };
  webhookUrl: string;
  session: {
    secret: string;
    ttl: string;
  };
  extensionRedirectUri: string;
  corsOrigins: string[];
}

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(
      `Missing required environment variable "${name}". Copy .env.example to .env and fill it in.`,
    );
  }
  return value.trim();
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value.trim() === '' ? fallback : value.trim();
}

function buildConfig(): AppConfig {
  const port = Number.parseInt(optional('PORT', '8787'), 10);
  if (Number.isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(`PORT must be a valid TCP port number, received "${process.env.PORT}".`);
  }

  const corsRaw = optional('CORS_ORIGINS', '');
  const corsOrigins = corsRaw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return {
    port,
    publicBaseUrl: optional('PUBLIC_BASE_URL', `http://localhost:${port}`).replace(/\/+$/, ''),
    discord: {
      clientId: required('DISCORD_CLIENT_ID'),
      clientSecret: required('DISCORD_CLIENT_SECRET'),
      redirectUri: required('DISCORD_REDIRECT_URI'),
      scopes: optional('DISCORD_SCOPES', 'identify email'),
    },
    webhookUrl: required('DISCORD_WEBHOOK_URL'),
    session: {
      secret: required('SESSION_SECRET'),
      ttl: optional('SESSION_TTL', '7d'),
    },
    extensionRedirectUri: optional(
      'EXTENSION_REDIRECT_URI',
      'vscode://your-publisher-name.codeshare-discord/auth',
    ),
    corsOrigins,
  };
}

export const config: AppConfig = buildConfig();
