'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { clearDraft, readDraft, writeDraft } from './draft-store';

export type DraftStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export interface DraftController<T> {
  value: T;
  status: DraftStatus;
  error: string | null;
  isDirty: boolean;
  restored: boolean;
  setValue: (next: T | ((current: T) => T)) => void;
  save: () => void;
  discard: () => void;
}

export interface UseDraftOptions<TServer, T> {
  storageKey: string;
  serverValue: TServer;
  toValue: (server: TServer) => T;
  persist: (value: T) => Promise<void>;
  equals?: (a: T, b: T) => boolean;
  /** Backoff schedule for automatic retries after a failed save. */
  retryDelaysMs?: number[];
}

const DEFAULT_RETRY_DELAYS = [1000, 2000, 4000, 8000];

function defaultEquals<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Draft-preserving editor state (D-021):
 * - writes every keystroke to a local draft so nothing is lost,
 * - retries failed saves with exponential backoff while the input survives,
 * - exposes saved / dirty / error states, and
 * - reconciles against the server on mount/reload (a local draft wins; it is
 *   never overwritten by remote data while dirty).
 */
export function useDraft<TServer, T>(options: UseDraftOptions<TServer, T>): DraftController<T> {
  const { storageKey, serverValue, toValue, persist } = options;
  const equals = options.equals ?? defaultEquals;
  const retryDelays = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS;

  const [value, setValueState] = useState<T>(() => toValue(serverValue));
  const [baseline, setBaseline] = useState<T>(() => toValue(serverValue));
  const [status, setStatus] = useState<DraftStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  const valueRef = useRef(value);
  const persistRef = useRef(persist);
  const saveRef = useRef<() => void>(() => {});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const savingRef = useRef(false);
  const firstServerSync = useRef(true);

  valueRef.current = value;
  persistRef.current = persist;

  const isDirty = !equals(value, baseline);

  // Restore a local draft once per entity key.
  useEffect(() => {
    const draft = readDraft<T>(storageKey);
    const serverNow = toValue(serverValue);
    if (draft === null) {
      return;
    }
    if (equals(draft, serverNow)) {
      clearDraft(storageKey);
      return;
    }
    valueRef.current = draft;
    setValueState(draft);
    setBaseline(serverNow);
    setStatus('dirty');
    setRestored(true);
    // Intentionally keyed only by entity: we restore the latest saved draft.
  }, [storageKey]);

  // Adopt fresh server data only when the editor is clean, so a dirty draft is
  // never clobbered by a background refresh. Keyed by a stable signature so a
  // re-created (but identical) `serverValue` object does not loop.
  const serverSignature = JSON.stringify(serverValue);
  useEffect(() => {
    if (firstServerSync.current) {
      firstServerSync.current = false;
      return;
    }
    const serverNow = toValue(serverValue);
    setBaseline((current) => (equals(current, serverNow) ? current : serverNow));
    if (!equals(valueRef.current, serverNow)) {
      valueRef.current = serverNow;
      setValueState(serverNow);
      setStatus('idle');
      setError(null);
      clearDraft(storageKey);
    }
    // Keyed by the stable signature only: a re-created but equal serverValue
    // object must not wipe a restored draft.
  }, [serverSignature]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const scheduleRetry = useCallback(() => {
    if (attemptRef.current >= retryDelays.length) {
      return;
    }
    const index = Math.min(attemptRef.current, retryDelays.length - 1);
    const delay = retryDelays[index] ?? 1000;
    attemptRef.current += 1;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      saveRef.current();
    }, delay);
  }, [retryDelays]);

  const setValue = useCallback(
    (next: T | ((current: T) => T)) => {
      const updated =
        typeof next === 'function' ? (next as (current: T) => T)(valueRef.current) : next;
      valueRef.current = updated;
      writeDraft(storageKey, updated);
      setValueState(updated);
      setStatus('dirty');
      setError(null);
    },
    [storageKey],
  );

  const save = useCallback(() => {
    if (savingRef.current) {
      return;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const snapshot = valueRef.current;
    savingRef.current = true;
    setStatus('saving');
    setError(null);

    void (async () => {
      try {
        await persistRef.current(snapshot);
        attemptRef.current = 0;
        savingRef.current = false;
        setBaseline(snapshot);
        if (!equals(valueRef.current, snapshot)) {
          // Newer edits arrived mid-save: stay dirty and keep the draft.
          setStatus('dirty');
          return;
        }
        clearDraft(storageKey);
        setStatus('saved');
      } catch (caught) {
        savingRef.current = false;
        setStatus('error');
        setError(caught instanceof Error ? caught.message : 'Could not save your changes.');
        scheduleRetry();
      }
    })();
  }, [equals, scheduleRetry, storageKey]);

  saveRef.current = save;

  const discard = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    attemptRef.current = 0;
    savingRef.current = false;
    clearDraft(storageKey);
    const serverNow = toValue(serverValue);
    valueRef.current = serverNow;
    setValueState(serverNow);
    setBaseline(serverNow);
    setStatus('idle');
    setError(null);
    setRestored(false);
  }, [storageKey, serverValue, toValue]);

  return { value, status, error, isDirty, restored, setValue, save, discard };
}
