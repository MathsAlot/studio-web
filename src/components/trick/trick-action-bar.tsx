'use client';

import { useEffect, useState } from 'react';
import { CircleAlert, Loader2, RotateCcw, Save } from 'lucide-react';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { useDraftRegistry, useDraftSections, type DraftSection } from './draft-registry';

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

interface TrickActionBarProps {
  /** Called with the failing section so the host can reveal its tab before focus. */
  onValidationError?: (section: DraftSection) => void;
}

/**
 * The single sticky action bar for the Trick editor (D-035). It appears only
 * when at least one section is dirty or a save is in flight, summarises the
 * count, and persists or clears every dirty draft at once. Validation stays in
 * each section; on failure the host reveals that section's tab and then focuses
 * its first invalid field.
 */
export function TrickActionBar({ onValidationError }: TrickActionBarProps) {
  const api = useDraftRegistry();
  const sections = useDraftSections();
  const [justSaved, setJustSaved] = useState(false);

  const dirty = sections.filter((section) => section.isDirty || section.restored);
  const saving = sections.filter((section) => section.status === 'saving');
  const errors = sections.filter((section) => section.status === 'error');
  const saved = sections.filter((section) => section.status === 'saved');
  const allClean = dirty.length === 0 && saving.length === 0 && errors.length === 0;

  useEffect(() => {
    if (!allClean || saved.length === 0) {
      setJustSaved(false);
      return;
    }
    setJustSaved(true);
    const timer = setTimeout(() => setJustSaved(false), 2500);
    return () => clearTimeout(timer);
  }, [allClean, saved.length]);

  const visible = dirty.length > 0 || saving.length > 0 || errors.length > 0 || justSaved;
  if (!visible) {
    return null;
  }

  const busy = saving.length > 0;

  function handleSaveAll() {
    const ordered = [...(api?.getSections() ?? [])].sort((a, b) => a.order - b.order);
    for (const section of ordered) {
      if (!section.isDirty && !section.restored) {
        continue;
      }
      if (!section.save()) {
        onValidationError?.(section);
        break;
      }
    }
  }

  function handleDiscardAll() {
    for (const section of api?.getSections() ?? []) {
      if (section.isDirty || section.restored) {
        section.discard();
      }
    }
  }

  const message =
    errors.length > 0
      ? `Could not save ${plural(errors.length, 'section')}. Retrying automatically; your input is preserved.`
      : busy
        ? `Saving ${plural(saving.length, 'section')}…`
        : dirty.length > 0
          ? `Unsaved changes in ${plural(dirty.length, 'section')}`
          : 'All changes saved.';

  return (
    <div
      data-slot="trick-action-bar"
      className="sticky bottom-0 z-10 mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface/95 px-4 py-3 backdrop-blur"
    >
      <p
        role={errors.length > 0 ? 'alert' : 'status'}
        aria-live={errors.length > 0 ? undefined : 'polite'}
        className="flex items-center gap-2 text-sm font-medium text-foreground"
      >
        {busy ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin text-muted-foreground" />
        ) : errors.length > 0 ? (
          <CircleAlert aria-hidden="true" className="size-4 text-danger" />
        ) : null}
        {message}
      </p>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <ConfirmDialog
          title="Discard all local drafts?"
          description="This clears every unsaved change stored in this browser. Saved Tricks are unaffected."
          confirmLabel="Discard drafts"
          destructive
          onConfirm={handleDiscardAll}
          trigger={
            <Button type="button" variant="outline" disabled={busy || dirty.length === 0}>
              <RotateCcw aria-hidden="true" />
              Discard all
            </Button>
          }
        />
        <Button
          type="button"
          onClick={handleSaveAll}
          disabled={busy || dirty.length === 0}
          aria-busy={busy}
        >
          <Save aria-hidden="true" />
          Save all
        </Button>
      </div>
    </div>
  );
}
