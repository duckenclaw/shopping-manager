import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TagChip } from '../components/TagChip';
import { useCatalog, useCreateItem, usePlaces } from '../api/hooks';
import { TAGS, type Tag } from '../types';

export default function AddItemPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [tag, setTag] = useState<Tag | null>(null);
  const [placeId, setPlaceId] = useState<number | null>(null);
  const catalog = useCatalog(q);
  const places = usePlaces();
  const createItem = useCreateItem();

  const suggestions = catalog.data ?? [];
  const exactMatch = useMemo(
    () => suggestions.find((s) => s.name.toLowerCase() === q.trim().toLowerCase()),
    [suggestions, q],
  );
  const isNew = q.trim().length > 0 && !exactMatch;

  async function addExisting(name: string, existingTag: Tag | null) {
    await createItem.mutateAsync({ name, tag: existingTag, placeId });
    navigate('/');
  }

  async function addNew() {
    const name = q.trim();
    if (!name) return;
    await createItem.mutateAsync({ name, tag, placeId });
    navigate('/');
  }

  return (
    <div className="page">
      <header className="page__header">
        <button className="back-btn" onClick={() => navigate('/')} aria-label="Назад">←</button>
        <h1>Новый товар</h1>
      </header>

      <input
        className="input"
        autoFocus
        placeholder="Название товара"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <label className="field">
        <span className="field__label">Место</span>
        <select
          className="input"
          value={placeId ?? ''}
          onChange={(e) => setPlaceId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Без места</option>
          {places.data?.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>

      {!isNew && suggestions.length > 0 && (
        <>
          <p className="muted">Уже добавляли:</p>
          <ul className="suggestion-list">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button className="suggestion" onClick={() => addExisting(s.name, s.tag)}>
                  <span>{s.name}</span>
                  {s.tag && <TagChip tag={s.tag} />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {isNew && (
        <>
          <p className="muted">Категория (необязательно):</p>
          <div className="tag-grid">
            {TAGS.map((t) => (
              <TagChip key={t} tag={t} selected={tag === t} onClick={() => setTag(tag === t ? null : t)} />
            ))}
          </div>
          <button
            className="btn btn--primary btn--full btn--sticky"
            onClick={addNew}
            disabled={createItem.isPending}
          >
            Добавить новый товар
          </button>
        </>
      )}
    </div>
  );
}
