import { useRef, useState, type PointerEvent } from 'react';
import { hapticFeedback } from '@telegram-apps/sdk';

export type IndexSection = {
  /** key of the section this letter jumps to */
  key: string;
  /** single character shown in the bar */
  letter: string;
  /** full section name, shown in the drag bubble */
  label: string;
};

type Props = {
  sections: IndexSection[];
  activeKey: string | null;
  onSelect: (key: string, smooth: boolean) => void;
};

function haptic() {
  try {
    if (hapticFeedback.selectionChanged.isAvailable()) hapticFeedback.selectionChanged();
  } catch {
    /* running outside Telegram */
  }
}

export function IndexScrollbar({ sections, activeKey, onSelect }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const lastIndexRef = useRef<number | null>(null);
  const [bubble, setBubble] = useState<{ top: number; label: string } | null>(null);

  function pick(clientY: number) {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = (clientY - rect.top) / rect.height;
    const i = Math.max(0, Math.min(sections.length - 1, Math.floor(ratio * sections.length)));

    const el = track.children[i] as HTMLElement | undefined;
    setBubble({
      top: el ? el.offsetTop + el.offsetHeight / 2 : 0,
      label: sections[i].label,
    });

    if (lastIndexRef.current === i) return;
    lastIndexRef.current = i;
    haptic();
    onSelect(sections[i].key, false);
  }

  function onPointerDown(e: PointerEvent<HTMLElement>) {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* pointer already gone */
    }
    draggingRef.current = true;
    lastIndexRef.current = null;
    pick(e.clientY);
  }

  function onPointerMove(e: PointerEvent<HTMLElement>) {
    if (!draggingRef.current) return;
    pick(e.clientY);
  }

  function endDrag() {
    draggingRef.current = false;
    lastIndexRef.current = null;
    setBubble(null);
  }

  if (sections.length < 2) return null;

  return (
    <nav
      className="index-bar"
      aria-label="Указатель категорий"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {bubble && (
        <div className="index-bar__bubble" style={{ top: bubble.top }}>
          {bubble.label}
        </div>
      )}
      <div className="index-bar__track" ref={trackRef}>
        {sections.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`index-bar__letter${s.key === activeKey ? ' is-active' : ''}`}
            aria-label={`Перейти к «${s.label}»`}
            aria-current={s.key === activeKey ? 'true' : undefined}
            // pointer taps are handled by the drag logic above; detail === 0 means keyboard
            onClick={(e) => { if (e.detail === 0) onSelect(s.key, true); }}
          >
            {s.letter}
          </button>
        ))}
      </div>
    </nav>
  );
}
