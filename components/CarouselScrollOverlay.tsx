import { useRef, useEffect, ReactNode } from 'react';

interface CarouselScrollOverlayProps {
  children: ReactNode;
  threshold?: number; // px to lock direction
}

const CarouselScrollOverlay = ({ children, threshold = 15 }: CarouselScrollOverlayProps) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const lockRef = useRef<'horizontal' | 'vertical' | null>(null);
  const preventDefaultRef = useRef<boolean>(false);

  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return; // ignore multi-touch
      const t = e.touches[0];
      startRef.current = { x: t.clientX, y: t.clientY };
      lockRef.current = null;
      preventDefaultRef.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!startRef.current || e.touches.length !== 1) return;

      const t = e.touches[0];
      const dx = Math.abs(t.clientX - startRef.current.x);
      const dy = Math.abs(t.clientY - startRef.current.y);

      // Lock direction once movement exceeds threshold
      if (!lockRef.current && (dx > threshold || dy > threshold)) {
        lockRef.current = dx > dy ? 'horizontal' : 'vertical';
        // Only prevent default for clear horizontal swipes
        preventDefaultRef.current = (lockRef.current === 'horizontal' && dx > dy * 1.5);
      }

      // Only prevent default for horizontal carousel swiping, allow vertical scrolling
      if (preventDefaultRef.current && lockRef.current === 'horizontal' && e.cancelable) {
        e.preventDefault();
      }
    };

    const onTouchEnd = () => {
      startRef.current = null;
      lockRef.current = null;
      preventDefaultRef.current = false;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [threshold]);

  return (
    <div 
      ref={overlayRef} 
      style={{ 
        touchAction: 'pan-y pinch-zoom',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {children}
    </div>
  );
};

export default CarouselScrollOverlay;
