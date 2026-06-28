import { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';

/** Log one line per request with method, path, status, and duration. */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms: Date.now() - start,
    });
  });
  next();
}
