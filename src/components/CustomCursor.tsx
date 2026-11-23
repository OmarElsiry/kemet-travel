import { useEffect, useRef, useState } from 'react';

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [isRecMode, setIsRecMode] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsRecMode(window.location.search.includes('rec'));

    const finePointer = window.matchMedia('(pointer: fine)').matches;
    if (!finePointer) return;

    const handleMove = (e: PointerEvent) => {
      if (!visible) setVisible(true);
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }
      const target = e.target as HTMLElement | null;
      const clickable = target?.closest(
        'button, a, input, select, textarea, label, [role="button"], [data-cursor="clickable"]',
      );
      setHovered(Boolean(clickable));
    };

    const handleDown = () => setPressed(true);
    const handleUp = () => setPressed(false);
    const handleLeave = () => setVisible(false);

    window.addEventListener('pointermove', handleMove, { passive: true });
    window.addEventListener('pointerdown', handleDown, { passive: true });
    window.addEventListener('pointerup', handleUp, { passive: true });
    document.addEventListener('mouseleave', handleLeave);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerdown', handleDown);
      window.removeEventListener('pointerup', handleUp);
      document.removeEventListener('mouseleave', handleLeave);
    };
  }, [visible]);

  const size = isRecMode
    ? pressed
      ? 62
      : hovered
        ? 58
        : 50
    : pressed
      ? 44
      : hovered
        ? 38
        : 26;

  const borderWidth = isRecMode ? 7 : 5;

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[9999] hidden rounded-full [@media(pointer:fine)]:block"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        marginLeft: `${-size / 2}px`,
        marginTop: `${-size / 2}px`,
        opacity: visible ? 1 : 0,
        backgroundColor: pressed
          ? 'transparent'
          : hovered
            ? 'rgba(72, 62, 68, 0.35)'
            : 'rgba(72, 62, 68, 0.55)',
        border: pressed ? `${borderWidth}px solid rgba(20, 16, 18, 0.9)` : '0px solid transparent',
        transition:
          'width 0.25s cubic-bezier(.16,1,.3,1), height 0.25s cubic-bezier(.16,1,.3,1), margin-left 0.25s cubic-bezier(.16,1,.3,1), margin-top 0.25s cubic-bezier(.16,1,.3,1), background-color 0.25s cubic-bezier(.16,1,.3,1), border 0.2s cubic-bezier(.16,1,.3,1), opacity 0.2s ease',
        willChange: 'transform',
      }}
    />
  );
}
