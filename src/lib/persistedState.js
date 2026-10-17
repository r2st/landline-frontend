import { useCallback, useEffect, useRef, useState } from 'react';

// Storage can throw (private mode, blocked site data) or be missing in tests;
// every access is guarded so the UI works with in-memory state alone.
function storageFor(kind) {
  try {
    return kind === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

export function readStored(key, fallback, kind = 'local') {
  try {
    const raw = storageFor(kind)?.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeStored(key, value, kind = 'local') {
  try {
    const store = storageFor(kind);
    if (!store) return;
    if (value === undefined) store.removeItem(key);
    else store.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or blocked storage — the in-memory copy still works */
  }
}

/**
 * useState that survives navigating away and back. A null `key` disables
 * persistence. When the key changes (e.g. a different document opens) the
 * state re-reads from storage for the new key.
 */
export function usePersistedState(key, initial, kind = 'local') {
  const init = () => {
    const fallback = typeof initial === 'function' ? initial() : initial;
    return key ? readStored(key, fallback, kind) : fallback;
  };
  const [value, setValue] = useState(init);
  const keyRef = useRef(key);

  useEffect(() => {
    if (keyRef.current === key) return;
    keyRef.current = key;
    setValue(init());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (key && keyRef.current === key) writeStored(key, value, kind);
  }, [key, value, kind]);

  const clear = useCallback(() => {
    if (key) writeStored(key, undefined, kind);
  }, [key, kind]);

  return [value, setValue, clear];
}
