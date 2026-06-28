import rateLimit from 'express-rate-limit';

/** Generous limiter for the OAuth endpoints (per IP). */
export const oauthLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'Too many auth attempts, slow down.' },
});

/** Tighter limiter for the share endpoint to avoid hammering the webhook. */
export const shareLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'You are sharing too fast, try again shortly.' },
});
