import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TagChip, getTagColor } from '../components/TagChip';
import { SwipeRow } from '../components/SwipeRow';
import { IndexScrollbar, type IndexSection } from '../components/IndexScrollbar';
import { useCatalog, useCategories, useCreateItem, useDeleteCatalogEntry } from '../api/hooks';
import { TAGS } from '../types';
import type { CatalogEntry } from '../types';

const UNTAGGED_KEY = '__untagged__';
const UNTAGGED_LABEL = 'Без категории';
/** distance from the viewport top a section is parked at when jumped to */
const SCROLL_MARGIN = 28;

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
  const categories = useCategories();
  const createItem = useCreateItem();
  const deleteCatalog = useDeleteCatalogEntry();

  const categoryColors = useMemo(
    () => Object.fromEntries((categories.data ?? []).map((c) => [c.name, c.color])),
    [categories.data],
  );
  const customCategories = useMemo(
    () => (categories.data ?? []).map((c) => c.name).filter((n) => !TAGS.includes(n as (typeof TAGS)[number])),
    [categories.data],
  );

  const suggestions = catalog.data ?? [];
  const groupedSuggestions = useMemo(() => groupSuggestions(suggestions), [suggestions]);
  const exactMatch = useMemo(
    () => suggestions.find((s) => s.name.toLowerCase() === q.trim().toLowerCase()),
    [suggestions, q],
  );
  const hasQuery = q.trim().length > 0;
  const noResults = hasQuery && suggestions.length === 0;

  // one index letter per category, first-come wins when two categories share a letter
  const indexSections = useMemo(() => {
    const seen = new Set<string>();
    const out: IndexSection[] = [];
    for (const group of groupedSuggestions) {
      const label = group.tag ?? UNTAGGED_LABEL;
      const letter = group.tag ? group.tag.trim().charAt(0).toUpperCase() : '#';
      if (seen.has(letter)) continue;
      seen.add(letter);
      out.push({ key: group.tag ?? UNTAGGED_KEY, letter, label });
    }
    return out;
  }, [groupedSuggestions]);
  const showIndex = !hasQuery && indexSections.length > 1;

  const sectionRefs = useRef(new Map<string, HTMLElement>());
  const [activeKey, setActiveKey] = useState<string | null>(null);
  // while jumping, the scroll spy must not fight the target we just picked
  const spyLockUntil = useRef(0);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!showIndex) {
      setActiveKey(null);
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      if (performance.now() < spyLockUntil.current) return;
      let current = indexSections[0].key;
      for (const section of indexSections) {
        const el = sectionRefs.current.get(section.key);
        if (!el) continue;
        if (el.getBoundingClientRect().top - SCROLL_MARGIN > 1) break;
        current = section.key;
      }
      // the last sections can sit closer together than a screen height
      const doc = document.documentElement;
      if (window.scrollY + window.innerHeight >= doc.scrollHeight - 2) {
        current = indexSections[indexSections.length - 1].key;
      }
      setActiveKey(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [showIndex, indexSections]);

  function jumpToSection(key: string, smooth: boolean) {
    const el = sectionRefs.current.get(key);
    if (!el) return;
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - SCROLL_MARGIN,
      behavior: smooth ? 'smooth' : 'auto',
    });
    setActiveKey(key);
    spyLockUntil.current = performance.now() + (smooth ? 700 : 250);
  }

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
    <div className={`page page--add${showIndex ? ' page--indexed' : ''}`}>
      <header className="page__header">
        <button className="back-btn" onClick={() => navigate('/')} aria-label="Назад">←</button>
        <h1>Добавить товар</h1>
      </header>

      {groupedSuggestions.map((group) => {
        const key = group.tag ?? UNTAGGED_KEY;
        return (
          <section
            key={key}
            ref={(el) => {
              if (el) sectionRefs.current.set(key, el);
              else sectionRefs.current.delete(key);
            }}
            className="item-group item-group--catalog"
            style={{ '--tag-color': getTagColor(group.tag, categoryColors) } as React.CSSProperties}
          >
            <span className="item-group__label">{group.tag ?? UNTAGGED_LABEL}</span>
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
        );
      })}

      {showIndex && (
        <IndexScrollbar sections={indexSections} activeKey={activeKey} onSelect={jumpToSection} />
      )}

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
                categoryColors={categoryColors}
              />
            ))}
            {customCategories.map((t) => (
              <TagChip
                key={t}
                tag={t}
                selected={tag === t}
                onClick={() => setTag(tag === t ? null : t)}
                categoryColors={categoryColors}
              />
            ))}

            {tag && !TAGS.includes(tag as (typeof TAGS)[number]) && !customCategories.includes(tag) ? (
              <button
                type="button"
                className="tag-chip tag-chip--selected tag-chip--clickable"
                style={{ '--tag-color': getTagColor(tag, categoryColors) } as React.CSSProperties}
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
