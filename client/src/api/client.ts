import { retrieveRawInitData } from '@telegram-apps/sdk';

let cachedAuth: string | null = null;

function authHeader(): string | null {
  if (cachedAuth) return cachedAuth;
  try {
    const raw = retrieveRawInitData();
    if (!raw) return null;
    cachedAuth = `tma ${raw}`;
    return cachedAuth;
  } catch {
    return null;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  const auth = authHeader();
  if (auth) headers.set('Authorization', auth);

  const res = await fetch(path, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
  return body as T;
}
