import { SwipeRow } from '../components/SwipeRow';
import { getTagColor } from '../components/TagChip';
import { useCompleteAll, useDeleteItem, useItems, useUpdateItem } from '../api/hooks';
import type { Item } from '../types';

const UNTAGGED_KEY = '__untagged__';

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
  const deleteItem = useDeleteItem();
  const updateItem = useUpdateItem();
  const completeAll = useCompleteAll();

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

      {groups.map((group) => (
        <section
          key={group.tag ?? UNTAGGED_KEY}
          className="item-group"
          style={{ '--tag-color': getTagColor(group.tag) } as React.CSSProperties}
        >
          <span className="item-group__label">{group.tag ?? 'Без категории'}</span>
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
        </section>
      ))}

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
