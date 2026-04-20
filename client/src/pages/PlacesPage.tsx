import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SwipeRow } from '../components/SwipeRow';
import { useCreatePlace, useDeletePlace, usePlaces } from '../api/hooks';

export default function PlacesPage() {
  const navigate = useNavigate();
  const places = usePlaces();
  const createPlace = useCreatePlace();
  const deletePlace = useDeletePlace();
  const [name, setName] = useState('');

  async function onAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await createPlace.mutateAsync(trimmed);
    setName('');
  }

  return (
    <div className="page">
      <header className="page__header">
        <h1>Места</h1>
      </header>

      <div className="row-input">
        <input
          className="input"
          placeholder="Новое место"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAdd()}
        />
        <button className="btn btn--primary" onClick={onAdd} disabled={!name.trim()}>+</button>
      </div>

      <ul className="item-list">
        {places.data?.map((p) => (
          <li key={p.id}>
            <SwipeRow onSwipeLeft={() => deletePlace.mutate(p.id)}>
              <button className="place-row" onClick={() => navigate(`/place/${p.id}`)}>
                <span>{p.name}</span>
                <span className="chev">›</span>
              </button>
            </SwipeRow>
          </li>
        ))}
        {places.data && places.data.length === 0 && <p className="muted">Пока нет мест.</p>}
      </ul>
    </div>
  );
}
