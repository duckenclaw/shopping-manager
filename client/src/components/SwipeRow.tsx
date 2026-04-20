import { useRef, useState, type ReactNode, type TouchEvent } from 'react';

type Props = {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftLabel?: string;
  rightLabel?: string;
  disabled?: boolean;
};

const THRESHOLD = 80;
const MAX = 140;

export function SwipeRow({ children, onSwipeLeft, onSwipeRight, leftLabel = 'Удалить', rightLabel = 'Переместить', disabled }: Props) {
  const [dx, setDx] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const locked = useRef<'x' | 'y' | null>(null);

  const onTouchStart = (e: TouchEvent) => {
    if (disabled) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    locked.current = null;
  };

  const onTouchMove = (e: TouchEvent) => {
    if (disabled) return;
    const dX = e.touches[0].clientX - startX.current;
    const dY = e.touches[0].clientY - startY.current;
    if (locked.current === null) {
      if (Math.abs(dX) > 6 || Math.abs(dY) > 6) {
        locked.current = Math.abs(dX) > Math.abs(dY) ? 'x' : 'y';
      }
    }
    if (locked.current !== 'x') return;
    const clamped = Math.max(-MAX, Math.min(MAX, dX));
    setDx(clamped);
  };

  const onTouchEnd = () => {
    if (disabled) return;
    if (dx <= -THRESHOLD && onSwipeLeft) onSwipeLeft();
    else if (dx >= THRESHOLD && onSwipeRight) onSwipeRight();
    setDx(0);
  };

  const bgColor =
    dx < 0 ? 'var(--danger)' : dx > 0 ? 'var(--accent)' : 'transparent';
  const label = dx < 0 ? leftLabel : dx > 0 ? rightLabel : '';
  const align = dx < 0 ? 'flex-end' : 'flex-start';

  return (
    <div className="swipe-row" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div className="swipe-row__bg" style={{ background: bgColor, justifyContent: align }}>
        <span className="swipe-row__label">{label}</span>
      </div>
      <div className="swipe-row__fg" style={{ transform: `translateX(${dx}px)` }}>
        {children}
      </div>
    </div>
  );
}
