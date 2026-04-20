import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SwipeRow } from '../components/SwipeRow';
import { useCreateDraft, useDeleteDraft, useDrafts } from '../api/hooks';

export default function DraftsPage() {
  const drafts = useDrafts();
  const createDraft = useCreateDraft();
  const deleteDraft = useDeleteDraft();
  const [name, setName] = useState('');

  async function onAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await createDraft.mutateAsync(trimmed);
    setName('');
  }

  return (
    <div className="page">
      <header className="page__header">
        <h1>Шаблоны</h1>
      </header>

      <div className="row-input">
        <input
          className="input"
          placeholder="Название шаблона"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAdd()}
        />
        <button className="btn btn--primary" onClick={onAdd} disabled={!name.trim()}>+</button>
      </div>

      <ul className="item-list">
        {drafts.data?.map((d) => (
          <li key={d.id}>
            <SwipeRow onSwipeLeft={() => deleteDraft.mutate(d.id)}>
              <Link to={`/drafts/${d.id}`} className="place-row">
                <span>
                  {d.name}
                  <small className="muted"> · {d.items.length}</small>
                </span>
                <span className="chev">›</span>
              </Link>
            </SwipeRow>
          </li>
        ))}
        {drafts.data && drafts.data.length === 0 && <p className="muted">Пока нет шаблонов.</p>}
      </ul>
    </div>
  );
}
