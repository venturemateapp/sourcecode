import { useEffect, useRef } from 'react';

export function useDebouncedSave(enabled: boolean, value: unknown, save: () => Promise<void>, delay = 1600) {
  const first = useRef(true);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!enabled) return;
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = window.setTimeout(() => { void saveRef.current(); }, delay);
    return () => window.clearTimeout(timer);
  }, [delay, enabled, value]);
}
