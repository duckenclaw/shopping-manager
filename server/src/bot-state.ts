import type { SimilarMatch } from './services/items.js';

/**
 * A question the bot has asked and is waiting on. Telegram caps callback_data at
 * 64 bytes and Cyrillic costs 2 bytes a character, so the names never travel in
 * the button — only a short ASCII token pointing here.
 *
 * In memory is the right home: the bot long-polls in-process with Express as a
 * single instance, and the worst case for a lost entry is one retyped message.
 */
export interface Pending {
  /** What the user actually typed. */
  query: string;
  /** Category from a "Товар. Категория" message, if there was one. */
  explicitTag: string | null;
  matches: SimilarMatch[];
  categories: string[];
  createdAt: number;
}

const TTL_MS = 15 * 60 * 1000;
const MAX_ENTRIES = 500;

const pending = new Map<string, Pending>();
let counter = 0;

export function putPending(entry: Omit<Pending, 'createdAt'>): string {
  sweep();
  const token = (Date.now().toString(36) + (counter++).toString(36)).slice(-10);
  pending.set(token, { ...entry, createdAt: Date.now() });
  return token;
}

export function getPending(token: string): Pending | undefined {
  const found = pending.get(token);
  if (!found) return undefined;
  if (Date.now() - found.createdAt > TTL_MS) {
    pending.delete(token);
    return undefined;
  }
  return found;
}

export function dropPending(token: string): void {
  pending.delete(token);
}

/** Drop expired entries, then oldest-first if the map is still over its cap. */
function sweep(): void {
  const now = Date.now();
  for (const [token, entry] of pending) {
    if (now - entry.createdAt > TTL_MS) pending.delete(token);
  }
  if (pending.size < MAX_ENTRIES) return;
  const oldestFirst = [...pending.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
  for (const [token] of oldestFirst.slice(0, pending.size - MAX_ENTRIES + 1)) {
    pending.delete(token);
  }
}
