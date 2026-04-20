import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TagChip } from '../components/TagChip';
import { Sheet } from '../components/Sheet';
import {
  useAddDraftItem,
  useApplyDraft,
  useDeleteDraftItem,
  useDrafts,
  usePlaces,
} from '../api/hooks';
import { TAGS, type Tag } from '../types';

export default function DraftPage() {
  const { id } = useParams();
  const draftId = Number(id);
  const navigate = useNavigate();
  const drafts = useDrafts();
  const places = usePlaces();
  const addItem = useAddDraftItem();
  const deleteItem = useDeleteDraftItem();
  const apply = useApplyDraft();

  const draft = useMemo(() => drafts.data?.find((d) => d.id === draftId), [drafts.data, draftId]);
  const [name, setName] = useState('');
  const [tag, setTag] = useState<Tag | null>(null);
  const [applying, setApplying] = useState(false);

  async function onAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await addItem.mutateAsync({ draftId, name: trimmed, tag });
    setName('');
    setTag(null);
  }

  return (
    <div className="page">
      <header className="page__header">
        <button className="back-btn" onClick={() => navigate('/drafts')} aria-label="Назад">←</button>
        <h1>{draft?.name ?? 'Шаблон'}</h1>
      </header>

      <ul className="item-list">
        {draft?.items.map((it) => (
          <li key={it.id} className="item-row item-row--static">
            <span>{it.name}</span>
            {it.tag && <TagChip tag={it.tag} />}
            <button
              className="icon-btn"
              onClick={() => deleteItem.mutate({ draftId, itemId: it.id })}
              aria-label="Удалить"
            >×</button>
          </li>
        ))}
      </ul>

      <input
        className="input"
        placeholder="Название товара"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="tag-grid">
        {TAGS.map((t) => (
          <TagChip key={t} tag={t} selected={tag === t} onClick={() => setTag(tag === t ? null : t)} />
        ))}
      </div>
      <button className="btn btn--ghost btn--full" onClick={onAdd} disabled={!name.trim()}>
        Добавить в шаблон
      </button>

      <button
        className="btn btn--primary btn--full btn--sticky"
        onClick={() => setApplying(true)}
        disabled={!draft?.items.length}
      >
        Применить к поездке
      </button>

      <Sheet open={applying} onClose={() => setApplying(false)} title="В какое место?">
        <ul className="place-picker">
          {places.data?.map((p) => (
            <li key={p.id}>
              <button
                className="place-picker__btn"
                onClick={async () => {
                  await apply.mutateAsync({ draftId, placeId: p.id });
                  setApplying(false);
                  navigate('/');
                }}
              >
                {p.name}
              </button>
            </li>
          ))}
          <li>
            <button
              className="place-picker__btn place-picker__btn--muted"
              onClick={async () => {
                await apply.mutateAsync({ draftId, placeId: null });
                setApplying(false);
                navigate('/');
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
