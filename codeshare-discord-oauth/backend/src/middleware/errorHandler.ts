import { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';

export class HttpError extends Error {
  public readonly status: number;
  public readonly code: string;
  constructor(status: number, message: string, code = 'error') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** 404 fallback for unmatched routes. */
export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'not_found', message: 'Route not found.' });
}

/** Centralised error handler. Must have four args for Express to register it. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.code, message: err.message });
    return;
  }
  logger.error('Unhandled error', { error: (err as Error)?.message });
  res.status(500).json({ error: 'internal_error', message: 'Something went wrong.' });
}
