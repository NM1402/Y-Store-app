/**
 * useHoverIntent - Delayed hover for mega menu
 * B15 MegaMenu PRO
 */
import { useRef, useCallback } from "react";

export default function useHoverIntent(defaultDelay = 120) {
  const timerRef = useRef(null);

  const onEnter = useCallback((callback, delay = defaultDelay) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(callback, delay);
  }, [defaultDelay]);

  const onLeave = useCallback((callback, delay = defaultDelay) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(callback, delay);
  }, [defaultDelay]);

  const cancel = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { onEnter, onLeave, cancel };
}
