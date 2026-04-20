import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TagChip } from '../components/TagChip';
import { useCatalog, useCreateItem } from '../api/hooks';
import { TAGS, type Tag } from '../types';

export default function AddItemPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [tag, setTag] = useState<Tag | null>(null);
  const catalog = useCatalog(q);
  const createItem = useCreateItem();

  const suggestions = catalog.data ?? [];
  const exactMatch = useMemo(
    () => suggestions.find((s) => s.name.toLowerCase() === q.trim().toLowerCase()),
    [suggestions, q],
  );
  const hasQuery = q.trim().length > 0;
  const noResults = hasQuery && suggestions.length === 0;

  async function addExisting(name: string, existingTag: Tag | null) {
    await createItem.mutateAsync({ name, tag: existingTag });
    navigate('/');
  }

  async function addNew() {
    const name = q.trim();
    if (!name) return;
    await createItem.mutateAsync({ name, tag });
    navigate('/');
  }

  return (
    <div className="page">
      <header className="page__header">
        <button className="back-btn" onClick={() => navigate('/')} aria-label="Назад">←</button>
        <h1>Добавить товар</h1>
      </header>

      <input
        className="input"
        autoFocus
        placeholder="Начните вводить название…"
        value={q}
        onChange={(e) => { setQ(e.target.value); setTag(null); }}
      />

      {/* Show catalog matches */}
      {suggestions.length > 0 && (
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
      )}

      {/* Tag picker — only when no catalog results for the typed query */}
      {noResults && (
        <>
          <p className="muted" style={{ marginBottom: 8 }}>Категория (необязательно):</p>
          <div className="tag-grid">
            {TAGS.map((t) => (
              <TagChip key={t} tag={t} selected={tag === t} onClick={() => setTag(tag === t ? null : t)} />
            ))}
          </div>
        </>
      )}

      {/* Add as new — when typed and no exact match */}
      {hasQuery && !exactMatch && (
        <button
          className="btn btn--primary btn--full btn--sticky"
          onClick={addNew}
          disabled={createItem.isPending}
        >
          Добавить «{q.trim()}»
        </button>
      )}
    </div>
  );
}
