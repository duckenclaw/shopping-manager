import { Link } from 'react-router-dom';
import { SwipeRow } from '../components/SwipeRow';
import { TagChip } from '../components/TagChip';
import { useCompleteAll, useDeleteItem, useItems, useUpdateItem } from '../api/hooks';

export default function ItemsPage() {
  const items = useItems();
  const deleteItem = useDeleteItem();
  const updateItem = useUpdateItem();
  const completeAll = useCompleteAll();

  const allItems = items.data ?? [];
  const checkedCount = allItems.filter((i) => i.is_checked).length;

  return (
    <div className="page">
      <header className="page__header">
        <h1>Мой список</h1>
      </header>

      {items.isLoading && <p className="muted">Загружаю…</p>}

      {!items.isLoading && allItems.length === 0 && (
        <div className="empty">
          <p>Список пуст.</p>
        </div>
      )}

      {allItems.length > 0 && (
        <ul className="item-list">
          {allItems.map((it) => (
            <li key={it.id}>
              <SwipeRow onSwipeLeft={() => deleteItem.mutate(it.id)}>
                <label className={`checklist__row${it.is_checked ? ' is-checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={it.is_checked}
                    onChange={(e) => updateItem.mutate({ id: it.id, isChecked: e.target.checked })}
                  />
                  <span className="checklist__box" aria-hidden="true" />
                  <span className="checklist__name">{it.name}</span>
                  {it.tag && <TagChip tag={it.tag} />}
                  <div className="amount-ctrl" onClick={(e) => e.preventDefault()}>
                    <button
                      className="amount-ctrl__btn"
                      disabled={it.amount <= 1}
                      onClick={() => updateItem.mutate({ id: it.id, amount: it.amount - 1 })}
                    >−</button>
                    <span className="amount-ctrl__val">{it.amount}</span>
                    <button
                      className="amount-ctrl__btn"
                      onClick={() => updateItem.mutate({ id: it.id, amount: it.amount + 1 })}
                    >+</button>
                  </div>
                </label>
              </SwipeRow>
            </li>
          ))}
        </ul>
      )}

      {checkedCount > 0 && (
        <button
          className="btn btn--primary btn--full btn--sticky"
          disabled={completeAll.isPending}
          onClick={() => completeAll.mutate()}
        >
          Готово ({checkedCount})
        </button>
      )}

      <Link to="/add-item" className="add-btn">+ Добавить</Link>
    </div>
  );
}
