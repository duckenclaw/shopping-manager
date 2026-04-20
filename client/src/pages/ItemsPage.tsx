import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SwipeRow } from '../components/SwipeRow';
import { TagChip } from '../components/TagChip';
import { Sheet } from '../components/Sheet';
import { useDeleteItem, useItems, usePlaces, useUpdateItem } from '../api/hooks';
import type { Item, Place } from '../types';

const UNASSIGNED_KEY = 0;

export default function ItemsPage() {
  const navigate = useNavigate();
  const items = useItems();
  const places = usePlaces();
  const deleteItem = useDeleteItem();
  const updateItem = useUpdateItem();
  const [moving, setMoving] = useState<Item | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<number, { place: Place | null; items: Item[] }>();
    if (items.data) {
      for (const it of items.data) {
        const key = it.place_id ?? UNASSIGNED_KEY;
        const place = places.data?.find((p) => p.id === it.place_id) ?? null;
        if (!map.has(key)) map.set(key, { place, items: [] });
        map.get(key)!.items.push(it);
      }
    }
    return [...map.entries()].sort((a, b) => {
      if (a[0] === UNASSIGNED_KEY) return 1;
      if (b[0] === UNASSIGNED_KEY) return -1;
      return (a[1].place?.name ?? '').localeCompare(b[1].place?.name ?? '');
    });
  }, [items.data, places.data]);

  return (
    <div className="page">
      <header className="page__header">
        <h1>Мой список</h1>
        <Link to="/add-item" className="fab" aria-label="Добавить товар">+</Link>
      </header>

      {items.isLoading && <p className="muted">Загружаю…</p>}
      {items.data && items.data.length === 0 && (
        <div className="empty">
          <p>Список пуст.</p>
          <Link to="/add-item" className="btn btn--primary">Добавить товар</Link>
        </div>
      )}

      {grouped.map(([key, group]) => (
        <section className="group" key={key}>
          <div className="group__header">
            <h2>{group.place?.name ?? 'Без места'}</h2>
            {group.place && (
              <button
                className="btn btn--ghost"
                onClick={() => navigate(`/place/${group.place!.id}`)}
              >
                Начать
              </button>
            )}
          </div>
          <ul className="item-list">
            {group.items.map((it) => (
              <li key={it.id}>
                <SwipeRow
                  onSwipeLeft={() => deleteItem.mutate(it.id)}
                  onSwipeRight={() => setMoving(it)}
                >
                  <div className="item-row">
                    <span className="item-row__name">{it.name}</span>
                    {it.tag && <TagChip tag={it.tag} />}
                  </div>
                </SwipeRow>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Sheet open={!!moving} onClose={() => setMoving(null)} title="Переместить в…">
        <ul className="place-picker">
          {places.data?.map((p) => (
            <li key={p.id}>
              <button
                className="place-picker__btn"
                onClick={() => {
                  if (moving) updateItem.mutate({ id: moving.id, placeId: p.id });
                  setMoving(null);
                }}
              >
                {p.name}
              </button>
            </li>
          ))}
          <li>
            <button
              className="place-picker__btn place-picker__btn--muted"
              onClick={() => {
                if (moving) updateItem.mutate({ id: moving.id, placeId: null });
                setMoving(null);
              }}
            >
              Без места
            </button>
          </li>
        </ul>
      </Sheet>
    </div>
  );
}
