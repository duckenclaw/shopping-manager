import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TagChip, getTagColor } from '../components/TagChip';
import { SwipeRow } from '../components/SwipeRow';
import { useCatalog, useCreateItem, useDeleteCatalogEntry } from '../api/hooks';
import { TAGS } from '../types';
import type { CatalogEntry } from '../types';

const UNTAGGED_KEY = '__untagged__';

function groupSuggestions(items: CatalogEntry[]) {
  const groups = new Map<string, { tag: string | null; items: CatalogEntry[] }>();
  for (const it of items) {
    const key = it.tag ?? UNTAGGED_KEY;
    let bucket = groups.get(key);
    if (!bucket) {
      bucket = { tag: it.tag, items: [] };
      groups.set(key, bucket);
    }
    bucket.items.push(it);
  }
  const ordered: { tag: string | null; items: CatalogEntry[] }[] = [];
  let untagged: { tag: string | null; items: CatalogEntry[] } | null = null;
  for (const [key, bucket] of groups) {
    if (key === UNTAGGED_KEY) untagged = bucket;
    else ordered.push(bucket);
  }
  ordered.sort((a, b) => (a.tag ?? '').localeCompare(b.tag ?? '', 'ru'));
  if (untagged) ordered.push(untagged);
  return ordered;
}

export default function AddItemPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customVal, setCustomVal] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const customInputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<number | null>(null);
  const catalog = useCatalog(q);
  const createItem = useCreateItem();
  const deleteCatalog = useDeleteCatalogEntry();

  const suggestions = catalog.data ?? [];
  const groupedSuggestions = useMemo(() => groupSuggestions(suggestions), [suggestions]);
  const exactMatch = useMemo(
    () => suggestions.find((s) => s.name.toLowerCase() === q.trim().toLowerCase()),
    [suggestions, q],
  );
  const hasQuery = q.trim().length > 0;
  const noResults = hasQuery && suggestions.length === 0;

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  function showToast(name: string) {
    setToast(`✅ ${name} был успешно добавлен`);
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2000);
  }

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
    showToast(name);
  }

  async function addNew() {
    const name = q.trim();
    if (!name) return;
    await createItem.mutateAsync({ name, tag });
    navigate('/');
  }

  return (
    <div className="page page--add">
      <header className="page__header">
        <button className="back-btn" onClick={() => navigate('/')} aria-label="Назад">←</button>
        <h1>Добавить товар</h1>
      </header>

      {groupedSuggestions.map((group) => (
        <section
          key={group.tag ?? UNTAGGED_KEY}
          className="item-group item-group--catalog"
          style={{ '--tag-color': getTagColor(group.tag) } as React.CSSProperties}
        >
          <span className="item-group__label">{group.tag ?? 'Без категории'}</span>
          <div className="catalog-grid">
            {group.items.map((s) => (
              <SwipeRow
                key={s.id}
                leftLabel="Удалить"
                onSwipeLeft={() => deleteCatalog.mutate(s.id)}
              >
                <button
                  className="catalog-tile"
                  onClick={() => addExisting(s.name, s.tag)}
                >
                  <span className="catalog-tile__name">{s.name}</span>
                </button>
              </SwipeRow>
            ))}
          </div>
        </section>
      ))}

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

      {hasQuery && !exactMatch && (
        <button
          className="btn btn--primary btn--full btn--add-new"
          onClick={addNew}
          disabled={createItem.isPending}
        >
          Добавить «{q.trim()}»{tag ? ` [${tag}]` : ''}
        </button>
      )}

      {toast && <div className="toast">{toast}</div>}

      <div className="search-bar--fixed">
        <input
          className="input"
          placeholder="Начните вводить название…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setTag(null); }}
        />
      </div>
    </div>
  );
}
