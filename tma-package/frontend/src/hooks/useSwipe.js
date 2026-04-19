/**
 * useSwipe - Touch swipe detection for gallery
 * B16 Mobile Retail Polish
 */
import { useRef, useCallback } from "react";

export default function useSwipe({ onLeft, onRight, threshold = 35 }) {
  const startX = useRef(null);
  const startY = useRef(null);

  const onTouchStart = useCallback((e) => {
    startX.current = e.touches?.[0]?.clientX ?? null;
    startY.current = e.touches?.[0]?.clientY ?? null;
  }, []);

  const onTouchEnd = useCallback((e) => {
    if (startX.current == null) return;
    
    const endX = e.changedTouches?.[0]?.clientX ?? startX.current;
    const endY = e.changedTouches?.[0]?.clientY ?? startY.current;
    
    const dx = endX - startX.current;
    const dy = Math.abs(endY - startY.current);

    // Only trigger if horizontal swipe is stronger than vertical
    if (Math.abs(dx) > dy) {
      if (dx > threshold) onRight?.();
      if (dx < -threshold) onLeft?.();
    }

    startX.current = null;
    startY.current = null;
  }, [onLeft, onRight, threshold]);

  return { onTouchStart, onTouchEnd };
}
