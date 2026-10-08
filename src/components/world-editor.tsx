'use client';

import { useRef, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';

import { DraftStatusView } from '@/components/draft-status';
import { FormActions } from '@/components/form-actions';
import { AddTrickDialog } from '@/components/trick/add-trick-dialog';
import { TrickOrderList } from '@/components/trick/trick-order-list';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { WorldSummary } from '@/lib/api-client';
import { updateWorld } from '@/lib/client/studio';
import { DRAFT_KEYS } from '@/lib/client/draft-store';
import { useDraft } from '@/lib/client/use-draft';
import { asText, toNullableText } from '@/lib/studio/fields';
import type { StudioCapabilities } from '@/lib/studio/permissions';

interface WorldEditorProps {
  world: WorldSummary;
  capabilities: StudioCapabilities;
}

interface WorldForm {
  name: string;
  description: string;
}

const initialWorldForm = (world: WorldSummary): WorldForm => ({
  name: world.name,
  description: asText(world.description),
});

/** Server-computed World rollup, shown as a compact stat strip. */
function WorldStats({ world }: { world: WorldSummary }) {
  const stats = [
    { label: 'Tricks', value: String(world.rollup.trickCount) },
    { label: 'Complete', value: String(world.rollup.completeTrickCount) },
    { label: 'Ready', value: String(world.rollup.readyTrickCount) },
    { label: 'Complete %', value: `${world.rollup.completionPercent}%` },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg border border-border bg-surface px-3 py-2">
          <dt className="label-eyebrow text-muted-foreground">{stat.label}</dt>
          <dd className="font-mono text-heading-2 font-semibold text-foreground">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * World surface: the Trick list is the primary tab, with World metadata in a
 * secondary Settings tab. Draft preservation and reorder behavior are
 * unchanged; only the information architecture is regrouped (D-035).
 */
export function WorldEditor({ world, capabilities }: WorldEditorProps) {
  const readOnly = !capabilities.canWriteStructure;

  const draft = useDraft<WorldForm, WorldForm>({
    storageKey: DRAFT_KEYS.world(world.id),
    serverValue: initialWorldForm(world),
    toValue: (value) => value,
    persist: async (value) => {
      const result = await updateWorld(world.id, {
        name: value.name,
        description: toNullableText(value.description),
      });
      if (!result.ok) {
        throw new Error(result.message);
      }
    },
  });

  const nameRef = useRef<HTMLInputElement>(null);
  const [worldErrors, setWorldErrors] = useState<{ name?: string }>({});

  function handleSaveWorld() {
    const nameError = draft.value.name.trim().length === 0 ? 'Enter a World name.' : undefined;
    setWorldErrors({ name: nameError });
    if (nameError) {
      nameRef.current?.focus();
      return;
    }
    draft.save();
  }

  return (
    <div className="space-y-6">
      <WorldStats world={world} />

      <Tabs defaultValue="tricks">
        <TabsList variant="line" className="border-b border-border" aria-label="World sections">
          <TabsTrigger value="tricks">Tricks</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="tricks" forceMount className="pt-6 data-[state=inactive]:hidden">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-body-sm text-muted-foreground">
                Positions are deterministic; reorder with the move controls.
              </p>
              {capabilities.canWriteStructure ? (
                <AddTrickDialog worldId={world.id} worldName={draft.value.name || world.name} />
              ) : null}
            </div>
            <TrickOrderList
              worldId={world.id}
              initialTricks={world.tricks}
              canReorder={capabilities.canWriteStructure}
              heading={`Tricks in ${draft.value.name || world.name}`}
            />
          </div>
        </TabsContent>

        <TabsContent value="settings" forceMount className="pt-6 data-[state=inactive]:hidden">
          <section aria-labelledby="world-settings-heading" className="space-y-4">
            <h2
              id="world-settings-heading"
              className="text-heading-2 font-semibold text-foreground"
            >
              World details
            </h2>
            {readOnly ? (
              <p role="status" className="text-body-sm text-muted-foreground">
                Read-only: you do not hold <code className="font-mono">world.structure.write</code>.
              </p>
            ) : null}

            <FormField
              id="edit-world-name"
              label="Name"
              required
              error={worldErrors.name}
              hint="Shown across the Studio and in Curricula."
              className="max-w-2xl"
            >
              {(control) => (
                <Input
                  {...control}
                  ref={nameRef}
                  value={draft.value.name}
                  placeholder="e.g. Addition"
                  onChange={(event) =>
                    draft.setValue((current) => ({ ...current, name: event.target.value }))
                  }
                  disabled={readOnly}
                  maxLength={200}
                />
              )}
            </FormField>

            <FormField
              id="edit-world-description"
              label="Description"
              hint="Optional. Leave blank to clear."
              className="max-w-2xl"
            >
              {(control) => (
                <Textarea
                  {...control}
                  value={draft.value.description}
                  placeholder="What this World covers."
                  onChange={(event) =>
                    draft.setValue((current) => ({ ...current, description: event.target.value }))
                  }
                  disabled={readOnly}
                  maxLength={2000}
                  rows={3}
                />
              )}
            </FormField>

            {!readOnly ? (
              <FormActions>
                <Button
                  type="button"
                  onClick={handleSaveWorld}
                  disabled={!draft.isDirty || draft.status === 'saving'}
                  aria-busy={draft.status === 'saving'}
                >
                  <Save aria-hidden="true" />
                  Save World
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={draft.discard}
                  disabled={!draft.isDirty && !draft.restored}
                >
                  <RotateCcw aria-hidden="true" />
                  Discard local draft
                </Button>
                <DraftStatusView
                  status={draft.status}
                  error={draft.error}
                  isDirty={draft.isDirty}
                  restored={draft.restored}
                />
              </FormActions>
            ) : null}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
