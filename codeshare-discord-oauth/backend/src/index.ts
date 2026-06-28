import { createApp } from './app';
import { config } from './config/env';
import { logger } from './config/logger';

function main(): void {
  const app = createApp();

  const server = app.listen(config.port, () => {
    logger.info('CodeShare Discord backend started', {
      port: config.port,
      publicBaseUrl: config.publicBaseUrl,
      redirectUri: config.discord.redirectUri,
      scopes: config.discord.scopes,
      webhookConfigured: Boolean(config.webhookUrl),
    });
    logger.info('OAuth start endpoint', {
      url: `${config.publicBaseUrl}/oauth/start`,
    });
  });

  const shutdown = (signal: string) => {
    logger.info('Shutting down', { signal });
    server.close(() => process.exit(0));
    // Force-exit if connections do not drain promptly.
    setTimeout(() => process.exit(1), 5000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main();
