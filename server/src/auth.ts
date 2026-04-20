import type { RequestHandler } from 'express';
import { validate, parse } from '@telegram-apps/init-data-node';

const BOT_TOKEN = process.env.BOT_TOKEN!;
const ALLOWED = (process.env.ALLOWED_USERNAMES ?? '')
  .trim()
  .split(/\s+/)
  .filter(Boolean);

export type AuthUser = {
  id: number;
  username?: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
};

declare global {
  namespace Express {
    interface Locals {
      user?: AuthUser;
      hasAccess?: boolean;
    }
  }
}

export const authMiddleware: RequestHandler = (req, res, next) => {
  const header = req.header('authorization') ?? '';
  const [scheme, raw] = header.split(' ');
  if (scheme !== 'tma' || !raw) {
    res.status(401).json({ error: 'missing tma authorization' });
    return;
  }
  try {
    validate(raw, BOT_TOKEN, { expiresIn: 3600 });
  } catch {
    res.status(401).json({ error: 'invalid initData' });
    return;
  }
  const parsed = parse(raw);
  const u = parsed.user;
  if (!u) {
    res.status(401).json({ error: 'no user in initData' });
    return;
  }
  const user: AuthUser = {
    id: Number(u.id),
    username: u.username,
    firstName: u.first_name,
    lastName: u.last_name,
    photoUrl: u.photo_url,
  };
  res.locals.user = user;
  res.locals.hasAccess = !!user.username && ALLOWED.includes(user.username);
  next();
};

export const requireAccess: RequestHandler = (_req, res, next) => {
  if (!res.locals.hasAccess) {
    res.status(403).json({ error: 'no access' });
    return;
  }
  next();
};

export function isUsernameAllowed(username?: string): boolean {
  return !!username && ALLOWED.includes(username);
}
