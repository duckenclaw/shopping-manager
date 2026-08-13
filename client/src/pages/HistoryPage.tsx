import { useMemo } from 'react';
import { getTagColor } from '../components/TagChip';
import { useCategories, useHistory } from '../api/hooks';
import type { HistoryEntry } from '../types';

/** Local calendar day, so grouping follows the user's timezone rather than UTC. */
function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(d: Date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const key = dayKey(d);
  if (key === dayKey(today)) return 'Сегодня';
  if (key === dayKey(yesterday)) return 'Вчера';
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' as const } : {}),
  });
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

/** Entries arrive newest-first, so Map insertion order already gives newest day first. */
function groupByDay(entries: HistoryEntry[]) {
  const groups = new Map<string, { date: Date; items: HistoryEntry[] }>();
  for (const e of entries) {
    const date = new Date(e.completed_at);
    const key = dayKey(date);
    let bucket = groups.get(key);
    if (!bucket) {
      bucket = { date, items: [] };
      groups.set(key, bucket);
    }
    bucket.items.push(e);
  }
  return [...groups.entries()].map(([key, bucket]) => ({ key, ...bucket }));
}

export default function HistoryPage() {
  const history = useHistory();
  const categories = useCategories();

  const categoryColors = useMemo(
    () => Object.fromEntries((categories.data ?? []).map((c) => [c.name, c.color])),
    [categories.data],
  );

  const entries = history.data ?? [];
  const days = useMemo(() => groupByDay(entries), [entries]);

  return (
    <div className="page">
      <header className="page__header">
        <h1>История</h1>
      </header>

      {history.isLoading && <p className="muted">Загружаю…</p>}

      {!history.isLoading && entries.length === 0 && (
        <div className="empty">
          <p>Пока ничего не куплено.</p>
        </div>
      )}

      {days.map((day) => (
        <section key={day.key} className="group">
          <div className="group__header">
            <h2>{dayLabel(day.date)}</h2>
          </div>
          <ul className="item-list">
            {day.items.map((e) => (
              <li key={e.id} className="history-row">
                <div className="history-row__main">
                  <span className="history-row__name">{e.name}</span>
                  {e.tag && (
                    <span
                      className="tag-chip"
                      style={{ '--tag-color': getTagColor(e.tag, categoryColors) } as React.CSSProperties}
                    >
                      {e.tag}
                    </span>
                  )}
                  {e.amount > 1 && <span className="history-row__amount">× {e.amount}</span>}
                </div>
                <span className="history-row__meta">добавлено {shortDate(e.added_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
