// Vitest global setup — runs before each test file.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Node 22+ ships an experimental global `localStorage` that throws unless
// `--localstorage-file` is passed, and it shadows jsdom's implementation. Detect
// the broken/missing case and install a simple in-memory Storage shim so code
// that touches `localStorage` (e.g. the auth token store) behaves like a browser.
function localStorageWorks() {
  try {
    globalThis.localStorage.setItem('__probe__', '1');
    globalThis.localStorage.removeItem('__probe__');
    return true;
  } catch {
    return false;
  }
}

if (!localStorageWorks()) {
  const store = new Map();
  const shim = {
    getItem: (k) => (store.has(String(k)) ? store.get(String(k)) : null),
    setItem: (k, v) => store.set(String(k), String(v)),
    removeItem: (k) => store.delete(String(k)),
    clear: () => store.clear(),
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: shim,
  });
}

// Unmount React trees and clear jsdom between tests so they don't leak state.
afterEach(() => {
  cleanup();
});
