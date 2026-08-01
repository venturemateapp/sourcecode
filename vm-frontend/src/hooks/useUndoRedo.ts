import { useCallback, useRef, useState } from 'react';

export function useUndoRedo<T>(initial: T, limit = 60) {
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const [value, setValueState] = useState<T>(initial);

  const setValue = useCallback((next: T | ((current: T) => T), record = true) => {
    setValueState(current => {
      const resolved = typeof next === 'function' ? (next as (current: T) => T)(current) : next;
      if (record) {
        past.current = [...past.current.slice(-(limit - 1)), current];
        future.current = [];
      }
      return resolved;
    });
  }, [limit]);

  const replace = useCallback((next: T) => {
    past.current = [];
    future.current = [];
    setValueState(next);
  }, []);

  const undo = useCallback(() => {
    setValueState(current => {
      const previous = past.current.pop();
      if (previous === undefined) return current;
      future.current.push(current);
      return previous;
    });
  }, []);

  const redo = useCallback(() => {
    setValueState(current => {
      const next = future.current.pop();
      if (next === undefined) return current;
      past.current.push(current);
      return next;
    });
  }, []);

  return {
    value, setValue, replace, undo, redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}
