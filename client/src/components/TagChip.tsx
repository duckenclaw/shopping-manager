import type { Tag } from '../types';

const TAG_COLORS: Record<Tag, string> = {
  Фрукты: '#d14b8f',
  Овощи: '#3fa34d',
  Мясо: '#c0392b',
  Кондименты: '#e67e22',
  Крупы: '#b98b3a',
  Молочка: '#4a90b8',
  Сладкое: '#b36ac9',
  Дом: '#7d8597',
};

export function TagChip({ tag, selected, onClick }: { tag: Tag; selected?: boolean; onClick?: () => void }) {
  const color = TAG_COLORS[tag];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tag-chip${selected ? ' tag-chip--selected' : ''}${onClick ? ' tag-chip--clickable' : ''}`}
      style={{ '--tag-color': color } as React.CSSProperties}
    >
      {tag}
    </button>
  );
}
