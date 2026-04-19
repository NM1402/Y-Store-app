/**
 * useIsMobile - Hook to detect mobile viewport
 * B16 Mobile Retail Polish
 */
import { useEffect, useState, useCallback } from "react";

export default function useIsMobile(breakpoint = 920) {
  // Use a function to get initial value that runs on client
  const getIsMobile = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  }, [breakpoint]);

  const [isMobile, setIsMobile] = useState(getIsMobile);

  useEffect(() => {
    // Re-check on mount (for SSR hydration)
    setIsMobile(getIsMobile());
    
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint, getIsMobile]);

  return isMobile;
}
