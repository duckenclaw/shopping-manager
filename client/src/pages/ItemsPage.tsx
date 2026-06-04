import { useEffect, useMemo, useState } from 'react';
import { SwipeRow } from '../components/SwipeRow';
import { getTagColor } from '../components/TagChip';
import { useCategories, useCompleteAll, useDeleteItem, useItems, useUpdateItem } from '../api/hooks';
import type { Item } from '../types';

const UNTAGGED_KEY = '__untagged__';
const COLLAPSED_KEY = 'collapsedCategories';

function loadCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    /* ignore malformed storage */
  }
  return new Set();
}

function groupItems(items: Item[]) {
  const groups = new Map<string, { tag: string | null; items: Item[] }>();
  for (const it of items) {
    const key = it.tag ?? UNTAGGED_KEY;
    let bucket = groups.get(key);
    if (!bucket) {
      bucket = { tag: it.tag, items: [] };
      groups.set(key, bucket);
    }
    bucket.items.push(it);
  }
  const ordered: { tag: string | null; items: Item[] }[] = [];
  let untagged: { tag: string | null; items: Item[] } | null = null;
  for (const [key, bucket] of groups) {
    if (key === UNTAGGED_KEY) untagged = bucket;
    else ordered.push(bucket);
  }
  if (untagged) ordered.push(untagged);
  return ordered;
}

export default function ItemsPage() {
  const items = useItems();
  const categories = useCategories();
  const deleteItem = useDeleteItem();
  const updateItem = useUpdateItem();
  const completeAll = useCompleteAll();

  const [collapsed, setCollapsed] = useState<Set<string>>(loadCollapsed);

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...collapsed]));
  }, [collapsed]);

  function toggleCollapsed(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const categoryColors = useMemo(
    () => Object.fromEntries((categories.data ?? []).map((c) => [c.name, c.color])),
    [categories.data],
  );

  const allItems = items.data ?? [];
  const checkedCount = allItems.filter((i) => i.is_checked).length;
  const groups = groupItems(allItems);

  return (
    <div className="page">
      {items.isLoading && <p className="muted">Загружаю…</p>}

      {!items.isLoading && allItems.length === 0 && (
        <div className="empty">
          <p>Список пуст.</p>
        </div>
      )}

      {groups.map((group) => {
        const key = group.tag ?? UNTAGGED_KEY;
        const isCollapsed = collapsed.has(key);
        return (
        <section
          key={key}
          className="item-group"
          style={{ '--tag-color': getTagColor(group.tag, categoryColors) } as React.CSSProperties}
        >
          <button
            type="button"
            className="item-group__label item-group__label--toggle"
            onClick={() => toggleCollapsed(key)}
            aria-expanded={!isCollapsed}
          >
            <span className={`item-group__arrow${isCollapsed ? ' item-group__arrow--collapsed' : ''}`} aria-hidden="true">▾</span>
            {group.tag ?? 'Без категории'}
          </button>
          {!isCollapsed && (
          <ul className="item-list">
            {group.items.map((it) => (
              <li key={it.id}>
                <SwipeRow onSwipeLeft={() => deleteItem.mutate(it.id)}>
                  <label className={`checklist__row${it.is_checked ? ' is-checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={it.is_checked}
                      onChange={(e) => updateItem.mutate({ id: it.id, isChecked: e.target.checked })}
                    />
                    <span className="checklist__box" aria-hidden="true" />
                    <span className="checklist__name">{it.name}</span>
                    <div className="amount-ctrl" onClick={(e) => e.preventDefault()}>
                      <button
                        className="amount-ctrl__btn"
                        disabled={it.amount <= 1}
                        onClick={() => updateItem.mutate({ id: it.id, amount: it.amount - 1 })}
                      >−</button>
                      <span className="amount-ctrl__val">{it.amount}</span>
                      <button
                        className="amount-ctrl__btn"
                        onClick={() => updateItem.mutate({ id: it.id, amount: it.amount + 1 })}
                      >+</button>
                    </div>
                  </label>
                </SwipeRow>
              </li>
            ))}
          </ul>
          )}
        </section>
        );
      })}

      {checkedCount > 0 && (
        <button
          className="btn btn--primary btn--full btn--sticky"
          disabled={completeAll.isPending}
          onClick={() => completeAll.mutate()}
        >
          Готово ({checkedCount})
        </button>
      )}
    </div>
  );
}
