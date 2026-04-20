import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TagChip } from '../components/TagChip';
import { useCompleteTrip, useItems, usePlaces, useUpdateItem } from '../api/hooks';

export default function PlacePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const placeId = Number(id);
  const items = useItems();
  const places = usePlaces();
  const update = useUpdateItem();
  const complete = useCompleteTrip();

  const place = places.data?.find((p) => p.id === placeId);
  const placeItems = useMemo(
    () => (items.data ?? []).filter((it) => it.place_id === placeId),
    [items.data, placeId],
  );
  const checkedCount = placeItems.filter((i) => i.is_checked).length;

  return (
    <div className="page page--checklist">
      <header className="page__header">
        <button className="back-btn" onClick={() => navigate('/')} aria-label="Назад">←</button>
        <h1>{place?.name ?? 'Место'}</h1>
      </header>

      <ul className="checklist">
        {placeItems.map((it) => (
          <li key={it.id}>
            <label className={`checklist__row${it.is_checked ? ' is-checked' : ''}`}>
              <input
                type="checkbox"
                checked={it.is_checked}
                onChange={(e) => update.mutate({ id: it.id, isChecked: e.target.checked })}
              />
              <span className="checklist__box" aria-hidden="true" />
              <span className="checklist__name">{it.name}</span>
              {it.tag && <TagChip tag={it.tag} />}
            </label>
          </li>
        ))}
        {placeItems.length === 0 && <p className="muted">Здесь пока ничего нет.</p>}
      </ul>

      {placeItems.length > 0 && (
        <button
          className="btn btn--primary btn--full btn--sticky"
          disabled={checkedCount === 0 || complete.isPending}
          onClick={async () => {
            await complete.mutateAsync(placeId);
            navigate('/');
          }}
        >
          Завершить поездку ({checkedCount})
        </button>
      )}
    </div>
  );
}
