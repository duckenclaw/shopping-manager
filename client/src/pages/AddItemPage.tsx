import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TagChip } from '../components/TagChip';
import { SwipeRow } from '../components/SwipeRow';
import { useCatalog, useCreateItem, useDeleteCatalogEntry } from '../api/hooks';
import { TAGS } from '../types';

export default function AddItemPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customVal, setCustomVal] = useState('');
  const customInputRef = useRef<HTMLInputElement>(null);
  const catalog = useCatalog(q);
  const createItem = useCreateItem();
  const deleteCatalog = useDeleteCatalogEntry();

  const suggestions = catalog.data ?? [];
  const exactMatch = useMemo(
    () => suggestions.find((s) => s.name.toLowerCase() === q.trim().toLowerCase()),
    [suggestions, q],
  );
  const hasQuery = q.trim().length > 0;
  const noResults = hasQuery && suggestions.length === 0;

  function openCustom() {
    setCustomOpen(true);
    setTimeout(() => customInputRef.current?.focus(), 0);
  }

  function confirmCustom() {
    const val = customVal.trim();
    if (val) setTag(val);
    setCustomOpen(false);
    setCustomVal('');
  }

  async function addExisting(name: string, existingTag: string | null) {
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

      {/* Catalog suggestions — swipe left to delete from history */}
      {suggestions.length > 0 && (
        <ul className="suggestion-list">
          {suggestions.map((s) => (
            <li key={s.id}>
              <SwipeRow
                leftLabel="Удалить"
                onSwipeLeft={() => deleteCatalog.mutate(s.id)}
              >
                <button className="suggestion" onClick={() => addExisting(s.name, s.tag)}>
                  <span>{s.name}</span>
                  {s.tag && <TagChip tag={s.tag} />}
                </button>
              </SwipeRow>
            </li>
          ))}
        </ul>
      )}

      {/* Tag picker — only when search returns nothing */}
      {noResults && (
        <>
          <p className="muted" style={{ marginBottom: 8 }}>Категория (необязательно):</p>
          <div className="tag-grid">
            {TAGS.map((t) => (
              <TagChip
                key={t}
                tag={t}
                selected={tag === t}
                onClick={() => setTag(tag === t ? null : t)}
              />
            ))}

            {/* Custom tag: selected state OR input OR + button */}
            {tag && !TAGS.includes(tag as (typeof TAGS)[number]) ? (
              <button
                type="button"
                className="tag-chip tag-chip--selected tag-chip--clickable"
                style={{ '--tag-color': '#6b7280' } as React.CSSProperties}
                onClick={() => setTag(null)}
              >
                {tag} ×
              </button>
            ) : customOpen ? (
              <input
                ref={customInputRef}
                className="tag-input"
                placeholder="Своя…"
                value={customVal}
                onChange={(e) => setCustomVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); confirmCustom(); }
                  if (e.key === 'Escape') { setCustomOpen(false); setCustomVal(''); }
                }}
                onBlur={confirmCustom}
              />
            ) : (
              <button
                type="button"
                className="tag-chip tag-chip--add tag-chip--clickable"
                onClick={openCustom}
              >
                +
              </button>
            )}
          </div>
        </>
      )}

      {/* Add button — shown when typed and no exact match found */}
      {hasQuery && !exactMatch && (
        <button
          className="btn btn--primary btn--full btn--sticky"
          onClick={addNew}
          disabled={createItem.isPending}
        >
          Добавить «{q.trim()}»{tag ? ` [${tag}]` : ''}
        </button>
      )}
    </div>
  );
}
