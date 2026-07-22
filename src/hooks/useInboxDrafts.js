import { useCallback, useRef } from 'react';

// Per-thread reply drafts, persisted to localStorage so an unsent reply
// survives switching threads, navigating away, or an accidental reload. Fails
// soft: an in-memory mirror keeps drafts working within the session even when
// storage is unavailable (private mode / quota).
const STORAGE_KEY = 'landline.inbox.drafts';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function writeAll(obj) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

export function useInboxDrafts() {
  // In-memory mirror so reads are synchronous and cheap during render.
  const cache = useRef(readAll());

  const getDraft = useCallback((threadId) => {
    if (!threadId) return null;
    return cache.current[threadId] || null;
  }, []);

  // draft = { html, text, subject }. An empty draft is deleted so we don't
  // accumulate blank entries or resurrect an empty composer.
  const setDraft = useCallback((threadId, draft) => {
    if (!threadId) return;
    const hasContent =
      (draft?.text || '').trim() || (draft?.subject || '').trim();
    if (!hasContent) {
      if (cache.current[threadId]) {
        delete cache.current[threadId];
        writeAll(cache.current);
      }
      return;
    }
    cache.current[threadId] = {
      html: draft.html || '',
      text: draft.text || '',
      subject: draft.subject || '',
      savedAt: Date.now(),
    };
    writeAll(cache.current);
  }, []);

  const clearDraft = useCallback((threadId) => {
    if (!threadId || !cache.current[threadId]) return;
    delete cache.current[threadId];
    writeAll(cache.current);
  }, []);

  return { getDraft, setDraft, clearDraft };
}
