import crypto from 'crypto';

/**
 * Short-lived store for OAuth "state" values.
 *
 * The `state` parameter defends against CSRF on the OAuth callback: we mint a
 * random value before redirecting to Discord and only accept a callback whose
 * state we previously issued. Each entry is single-use and expires quickly.
 *
 * For a single-instance deployment an in-memory map is sufficient. For multiple
 * instances behind a load balancer, swap this for Redis with the same interface.
 */
interface StateEntry {
  createdAt: number;
  /** Where to bounce the browser back to once auth completes. */
  returnUri: string;
}

const TTL_MS = 10 * 60 * 1000; // 10 minutes
const store = new Map<string, StateEntry>();

export function createState(returnUri: string): string {
  const state = crypto.randomBytes(24).toString('hex');
  store.set(state, { createdAt: Date.now(), returnUri });
  return state;
}

/** Validate and consume a state value. Returns the stored returnUri or null. */
export function consumeState(state: string | undefined): string | null {
  if (!state) {
    return null;
  }
  const entry = store.get(state);
  if (!entry) {
    return null;
  }
  store.delete(state);
  if (Date.now() - entry.createdAt > TTL_MS) {
    return null;
  }
  return entry.returnUri;
}

/** Periodically drop expired entries so the map cannot grow unbounded. */
function sweep(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.createdAt > TTL_MS) {
      store.delete(key);
    }
  }
}

const timer = setInterval(sweep, TTL_MS);
// Do not keep the event loop alive solely for the sweeper.
timer.unref();
