import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFound } from './middleware/errorHandler';
import { oauthLimiter } from './middleware/rateLimit';
import { oauthRouter } from './routes/oauth';
import { apiRouter } from './routes/api';

export function createApp(): Application {
  const app = express();

  // Behind a reverse proxy / load balancer, trust X-Forwarded-* for correct IPs.
  app.set('trust proxy', 1);

  app.use(requestLogger);
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  if (config.corsOrigins.length > 0) {
    app.use(cors({ origin: config.corsOrigins, credentials: true }));
  }

  // Liveness/health probe.
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'codeshare-discord-backend' });
  });

  app.use('/oauth', oauthLimiter, oauthRouter);
  app.use('/api', apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
