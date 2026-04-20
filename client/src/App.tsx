import { useEffect, useState } from 'react';
import { retrieveRawInitData } from '@telegram-apps/sdk';

type AuthUser = {
  id: number;
  username?: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
};

type AuthResult =
  | { ok: true; hasAccess: boolean; user: AuthUser }
  | { ok: false; error: string };

export default function App() {
  const [state, setState] = useState<AuthResult | null>(null);

  useEffect(() => {
    let raw: string | undefined;
    try {
      raw = retrieveRawInitData();
    } catch {
      raw = undefined;
    }

    if (!raw) {
      setState({ ok: false, error: 'Open this app from Telegram.' });
      return;
    }

    fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initDataRaw: raw }),
    })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
        return body as { hasAccess: boolean; user: AuthUser };
      })
      .then((data) => setState({ ok: true, ...data }))
      .catch((err) => setState({ ok: false, error: err.message ?? 'Auth failed' }));
  }, []);

  if (!state) {
    return <div className="page"><div className="card">Loading…</div></div>;
  }

  if (!state.ok) {
    return (
      <div className="page">
        <div className="card">
          <p className="deny">{state.error}</p>
        </div>
      </div>
    );
  }

  const { user, hasAccess } = state;
  const initials =
    (user.firstName?.[0] ?? '?') + (user.lastName?.[0] ?? '');

  return (
    <div className="page">
      <div className="card">
        {user.photoUrl ? (
          <img className="avatar" src={user.photoUrl} alt="" />
        ) : (
          <div className="avatar avatar--fallback">{initials.toUpperCase()}</div>
        )}
        <h1 className="name">
          {user.username ? `@${user.username}` : user.firstName}
        </h1>
        <p className={`status ${hasAccess ? 'ok' : 'deny'}`}>
          {hasAccess ? 'You have access' : "You don't have access"}
        </p>
      </div>
    </div>
  );
}
