import { useState, useEffect, useRef } from "react";

// useState backed by localStorage.
// Always initialises with defaultValue (matching SSR), then reads the stored
// value after mount so server and client agree on the first render.
export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      // First run after mount: read stored value, don't write yet
      initialized.current = true;
      try {
        const stored = window.localStorage.getItem(key);
        if (stored !== null) setValue(JSON.parse(stored) as T);
      } catch {}
      return;
    }
    // Subsequent runs: value changed by the user, persist it
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  return [value, setValue] as const;
}
