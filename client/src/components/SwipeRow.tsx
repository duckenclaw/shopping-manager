import { useRef, useState, type ReactNode, type TouchEvent } from 'react';

type Props = {
  children: ReactNode;
  onSwipeLeft: () => void;
  leftLabel?: string;
  disabled?: boolean;
};

const THRESHOLD = 80;
const MAX = 140;

export function SwipeRow({ children, onSwipeLeft, leftLabel = 'Удалить', disabled }: Props) {
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
    const clamped = Math.max(-MAX, Math.min(0, dX));
    setDx(clamped);
  };

  const onTouchEnd = () => {
    if (disabled) return;
    if (dx <= -THRESHOLD) onSwipeLeft();
    setDx(0);
  };

  return (
    <div className="swipe-row" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        className="swipe-row__bg"
        style={{ background: dx < 0 ? 'var(--danger)' : 'transparent', justifyContent: 'flex-end' }}
      >
        <span className="swipe-row__label">{dx < 0 ? leftLabel : ''}</span>
      </div>
      <div className="swipe-row__fg" style={{ transform: `translateX(${dx}px)` }}>
        {children}
      </div>
    </div>
  );
}
