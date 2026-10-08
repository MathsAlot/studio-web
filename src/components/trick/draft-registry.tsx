'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { DraftStatus } from '@/lib/client/use-draft';

/**
 * A single authoring surface (structure, content, or one age-tier variant) that
 * participates in the Trick page's consolidated save model. Editors register
 * themselves so the one sticky action bar can summarise and save every dirty
 * section without each card owning its own Save button (D-035).
 */
export interface DraftSection {
  id: string;
  label: string;
  /** Deterministic save order across sections (lower first). */
  order: number;
  /** Editor tab that hosts this section, so a failed save can reveal it. */
  tab: string;
  isDirty: boolean;
  status: DraftStatus;
  error: string | null;
  restored: boolean;
  /** Validates then saves; returns false (without focusing) on validation failure. */
  save: () => boolean;
  /** Focuses the first invalid field; called after the host tab is visible. */
  focusFirstInvalid: () => void;
  discard: () => void;
}

interface DraftRegistryApi {
  register: (id: string, getter: () => DraftSection) => void;
  unregister: (id: string) => void;
  notify: () => void;
  /** Reads the live sections at call time so a save never uses a stale snapshot. */
  getSections: () => DraftSection[];
}

const DraftRegistryApiContext = createContext<DraftRegistryApi | null>(null);
const DraftSectionsContext = createContext<DraftSection[]>([]);

/** Stable registry API; `null` when rendered outside a provider (standalone editor). */
export function useDraftRegistry(): DraftRegistryApi | null {
  return useContext(DraftRegistryApiContext);
}

/** Snapshot of registered sections for rendering; refreshes as section state changes. */
export function useDraftSections(): DraftSection[] {
  return useContext(DraftSectionsContext);
}

export function DraftRegistryProvider({ children }: { children: ReactNode }) {
  const gettersRef = useRef(new Map<string, () => DraftSection>());
  const [, setVersion] = useState(0);

  const notify = useCallback(() => {
    setVersion((current) => current + 1);
  }, []);

  const register = useCallback((id: string, getter: () => DraftSection) => {
    gettersRef.current.set(id, getter);
  }, []);

  const unregister = useCallback(
    (id: string) => {
      if (gettersRef.current.delete(id)) {
        notify();
      }
    },
    [notify],
  );

  const getSections = useCallback(
    () => Array.from(gettersRef.current.values()).map((get) => get()),
    [],
  );

  const api = useMemo<DraftRegistryApi>(
    () => ({ register, unregister, notify, getSections }),
    [register, unregister, notify, getSections],
  );

  // Recomputed on each render; `notify` forces a render whenever a section's
  // meaningful state (dirty/status/error/restored) changes.
  const sections = getSections();

  return (
    <DraftRegistryApiContext.Provider value={api}>
      <DraftSectionsContext.Provider value={sections}>{children}</DraftSectionsContext.Provider>
    </DraftRegistryApiContext.Provider>
  );
}

/**
 * Registers an editor's draft with the nearest provider. No-op without one, so
 * the same editor can still be rendered standalone with its own controls.
 * Returns whether the editor is embedded in a registry.
 */
export function useRegisterDraftSection(section: DraftSection): boolean {
  const api = useDraftRegistry();
  const ref = useRef(section);
  ref.current = section;
  const { id } = section;
  const signature = `${section.label}|${section.isDirty}|${section.status}|${section.error ?? ''}|${section.restored}`;

  useEffect(() => {
    if (!api) {
      return;
    }
    api.register(id, () => ref.current);
    api.notify();
    return () => api.unregister(id);
  }, [api, id]);

  useEffect(() => {
    if (!api) {
      return;
    }
    api.notify();
  }, [api, signature]);

  return api !== null;
}
