'use client';

import { useRef, useState } from 'react';
import { TriangleAlert } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { PublishReadiness } from '@/components/trust/publish-readiness';
import { TrickTrustPanel } from '@/components/trust/trick-trust-panel';
import { cn } from '@/lib/utils';
import type { AgeTier, TrickDetail, TrickKind, WorldSummary } from '@/lib/api-client';
import { getTrick, publishTrick, unpublishTrick, updateTrick } from '@/lib/client/studio';
import { DRAFT_KEYS } from '@/lib/client/draft-store';
import { useDraft } from '@/lib/client/use-draft';
import { AGE_TIERS, TIER_LABELS, asText, toNullableText } from '@/lib/studio/fields';
import type { StudioCapabilities } from '@/lib/studio/permissions';
import { trickReadinessChecks } from '@/lib/studio/trust';
import { AgeTierTabs } from './age-tier-tabs';
import { DraftRegistryProvider, useRegisterDraftSection } from './draft-registry';
import { PreviewPanel } from './preview-panel';
import { TrickActionBar } from './trick-action-bar';
import { TrickPositionControl } from './trick-position-control';
import { TrickStatusStrip } from './trick-status-strip';

interface TrickDetailViewProps {
  trick: TrickDetail;
  world: WorldSummary | null;
  capabilities: StudioCapabilities;
}

interface StructureForm {
  name: string;
  kind: TrickKind;
}

interface ContentForm {
  methodDescription: string;
  workedExample: string;
}

/** Trick editor shell: one shared draft registry, one action bar. */
export function TrickDetailView({ trick, world, capabilities }: TrickDetailViewProps) {
  return (
    <DraftRegistryProvider>
      <TrickDetailEditor trick={trick} world={world} capabilities={capabilities} />
    </DraftRegistryProvider>
  );
}

function TrickDetailEditor({ trick, world, capabilities }: TrickDetailViewProps) {
  const structureNameRef = useRef<HTMLInputElement>(null);
  const methodDescriptionRef = useRef<HTMLTextAreaElement>(null);
  const [structureErrors, setStructureErrors] = useState<{ name?: string }>({});
  const [contentErrors, setContentErrors] = useState<{ methodDescription?: string }>({});
  const [activeTab, setActiveTab] = useState('content');
  const [live, setLive] = useState<TrickDetail>(trick);
  const [publishBusy, setPublishBusy] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [previewTier, setPreviewTier] = useState<AgeTier>(
    trick.completeness.missingTiers[0] ?? 'FORMATIVE',
  );

  async function refreshLive() {
    const result = await getTrick(trick.id);
    if (result.ok) {
      setLive(result.data);
    }
  }

  async function handlePublish() {
    setPublishBusy(true);
    setPublishError(null);
    const result = await publishTrick(trick.id);
    if (!result.ok) {
      setPublishBusy(false);
      setPublishError(result.message);
      return;
    }
    await refreshLive();
    setPublishBusy(false);
  }

  async function handleUnpublish() {
    setPublishBusy(true);
    setPublishError(null);
    const result = await unpublishTrick(trick.id);
    if (!result.ok) {
      setPublishBusy(false);
      setPublishError(result.message);
      return;
    }
    await refreshLive();
    setPublishBusy(false);
  }

  const structure = useDraft<StructureForm, StructureForm>({
    storageKey: DRAFT_KEYS.trickStructure(trick.id),
    serverValue: { name: trick.name, kind: trick.kind },
    toValue: (value) => value,
    persist: async (value) => {
      const result = await updateTrick(trick.id, { name: value.name, kind: value.kind });
      if (!result.ok) {
        throw new Error(result.message);
      }
    },
  });

  const content = useDraft<ContentForm, ContentForm>({
    storageKey: DRAFT_KEYS.trickContent(trick.id),
    serverValue: {
      methodDescription: trick.methodDescription,
      workedExample: asText(trick.workedExample),
    },
    toValue: (value) => value,
    persist: async (value) => {
      const result = await updateTrick(trick.id, {
        methodDescription: value.methodDescription,
        workedExample: toNullableText(value.workedExample),
      });
      if (!result.ok) {
        throw new Error(result.message);
      }
    },
  });

  const aiPending = live.draftSource === 'AI' && live.reviewStatus !== 'APPROVED';

  function validateStructure(): boolean {
    const nameError = structure.value.name.trim().length === 0 ? 'Enter a Trick name.' : undefined;
    setStructureErrors({ name: nameError });
    return !nameError;
  }

  function focusStructureInvalid() {
    structureNameRef.current?.focus();
  }

  function validateContent(): boolean {
    const methodError =
      content.value.methodDescription.trim().length === 0 ? 'Describe the method.' : undefined;
    setContentErrors({ methodDescription: methodError });
    return !methodError;
  }

  function focusContentInvalid() {
    methodDescriptionRef.current?.focus();
  }

  useRegisterDraftSection({
    id: 'structure',
    label: 'Structure',
    order: 0,
    tab: 'structure',
    isDirty: structure.isDirty,
    status: structure.status,
    error: structure.error,
    restored: structure.restored,
    save: () => {
      if (!validateStructure()) {
        return false;
      }
      structure.save();
      return true;
    },
    focusFirstInvalid: focusStructureInvalid,
    discard: structure.discard,
  });

  useRegisterDraftSection({
    id: 'content',
    label: 'Method and example',
    order: 1,
    tab: 'content',
    isDirty: content.isDirty,
    status: content.status,
    error: content.error,
    restored: content.restored,
    save: () => {
      if (!validateContent()) {
        return false;
      }
      content.save();
      return true;
    },
    focusFirstInvalid: focusContentInvalid,
    discard: content.discard,
  });

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <TrickStatusStrip trick={live} />
        {world ? (
          <TrickPositionControl
            worldId={world.id}
            worldName={world.name}
            tricks={world.tricks}
            activeTrickId={trick.id}
            canReorder={capabilities.canWriteStructure}
          />
        ) : null}
        {aiPending ? (
          <Alert className="max-w-2xl border-warning/30 bg-warning-subtle text-warning-foreground">
            <TriangleAlert aria-hidden="true" />
            <AlertTitle>AI draft held from publication</AlertTitle>
            <AlertDescription className="text-warning-foreground/90">
              AI-drafted content is held from publication until a human reviewer approves it.
            </AlertDescription>
          </Alert>
        ) : null}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList variant="line" className="border-b border-border" aria-label="Trick editor">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="structure">Structure</TabsTrigger>
              <TabsTrigger value="review">Review</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="content" forceMount className="pt-6 data-[state=inactive]:hidden">
              <div className="space-y-6">
                {capabilities.canWriteContent ? null : (
                  <p role="status" className="text-body-sm text-muted-foreground">
                    Read-only: you do not hold{' '}
                    <code className="font-mono">trick.content.write</code>.
                  </p>
                )}
                <section aria-labelledby="trick-method-heading" className="space-y-4">
                  <h2
                    id="trick-method-heading"
                    className="text-heading-2 font-semibold text-foreground"
                  >
                    Method and worked example
                  </h2>
                  <div className="grid max-w-2xl gap-4">
                    <FormField
                      id="trick-method-description"
                      label="Method description"
                      required
                      error={contentErrors.methodDescription}
                      hint="The core method the learner is taught."
                    >
                      {(control) => (
                        <Textarea
                          {...control}
                          ref={methodDescriptionRef}
                          value={content.value.methodDescription}
                          placeholder="Describe the method in one or two sentences."
                          onChange={(event) => {
                            setContentErrors({});
                            content.setValue((current) => ({
                              ...current,
                              methodDescription: event.target.value,
                            }));
                          }}
                          disabled={!capabilities.canWriteContent}
                          maxLength={8000}
                          rows={4}
                        />
                      )}
                    </FormField>
                    <FormField
                      id="trick-worked-example"
                      label="Worked example"
                      hint="Optional. Leave blank to clear."
                    >
                      {(control) => (
                        <Textarea
                          {...control}
                          value={content.value.workedExample}
                          placeholder="e.g. 27 + 15 = 42"
                          onChange={(event) =>
                            content.setValue((current) => ({
                              ...current,
                              workedExample: event.target.value,
                            }))
                          }
                          disabled={!capabilities.canWriteContent}
                          maxLength={8000}
                          rows={3}
                        />
                      )}
                    </FormField>
                  </div>
                </section>

                <section aria-labelledby="trick-tiers-heading" className="space-y-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2
                      id="trick-tiers-heading"
                      className="text-heading-2 font-semibold text-foreground"
                    >
                      Age-tier content
                    </h2>
                    <p className="text-body-sm text-muted-foreground">
                      {trick.completeness.variantCount} of {trick.completeness.totalTiers} tiers
                      present.
                    </p>
                  </div>
                  <AgeTierTabs trick={live} canWriteContent={capabilities.canWriteContent} />
                </section>
              </div>
            </TabsContent>

            <TabsContent value="structure" forceMount className="pt-6 data-[state=inactive]:hidden">
              <section aria-labelledby="trick-structure-heading" className="space-y-4">
                <h2
                  id="trick-structure-heading"
                  className="text-heading-2 font-semibold text-foreground"
                >
                  Structure
                </h2>
                {capabilities.canWriteStructure ? null : (
                  <p role="status" className="text-body-sm text-muted-foreground">
                    Read-only: you do not hold{' '}
                    <code className="font-mono">world.structure.write</code>.
                  </p>
                )}
                <div className="grid max-w-2xl gap-4">
                  <FormField
                    id="trick-name"
                    label="Name"
                    required
                    error={structureErrors.name}
                    hint="Shown in World lists and Curricula."
                  >
                    {(control) => (
                      <Input
                        {...control}
                        ref={structureNameRef}
                        value={structure.value.name}
                        placeholder="e.g. Addition with carrying"
                        autoComplete="off"
                        spellCheck={false}
                        onChange={(event) => {
                          setStructureErrors({});
                          structure.setValue((current) => ({
                            ...current,
                            name: event.target.value,
                          }));
                        }}
                        disabled={!capabilities.canWriteStructure}
                        maxLength={200}
                      />
                    )}
                  </FormField>
                  <FormField id="trick-kind" label="Kind" required className="max-w-xs">
                    {(control) => (
                      <NativeSelect
                        {...control}
                        value={structure.value.kind}
                        onChange={(event) =>
                          structure.setValue((current) => ({
                            ...current,
                            kind: event.target.value as TrickKind,
                          }))
                        }
                        disabled={!capabilities.canWriteStructure}
                      >
                        <option value="STANDARD">Standard</option>
                        <option value="CAPSTONE">Capstone</option>
                      </NativeSelect>
                    )}
                  </FormField>
                </div>
              </section>
            </TabsContent>

            <TabsContent value="review" className="pt-6">
              {activeTab === 'review' ? (
                <TrickTrustPanel trick={live} capabilities={capabilities} onTrickChange={setLive} />
              ) : null}
            </TabsContent>

            <TabsContent value="preview" forceMount className="pt-6 data-[state=inactive]:hidden">
              <section aria-labelledby="trick-preview-heading" className="space-y-4">
                <h2
                  id="trick-preview-heading"
                  className="text-heading-2 font-semibold text-foreground"
                >
                  Preview saved content
                </h2>
                <div role="group" aria-label="Preview age tier" className="flex flex-wrap gap-1">
                  {AGE_TIERS.map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      aria-pressed={tier === previewTier}
                      onClick={() => setPreviewTier(tier)}
                      className={cn(
                        'rounded-md border px-3 py-1.5 text-sm transition-colors',
                        tier === previewTier
                          ? 'border-primary bg-primary-subtle font-semibold text-primary-subtle-foreground'
                          : 'border-border bg-surface text-muted-foreground hover:bg-surface-muted hover:text-foreground',
                      )}
                    >
                      {TIER_LABELS[tier]}
                    </button>
                  ))}
                </div>
                <PreviewPanel
                  trickId={trick.id}
                  ageTier={previewTier}
                  tierLabel={TIER_LABELS[previewTier]}
                />
              </section>
            </TabsContent>
          </Tabs>
        </div>

        <PublishReadiness
          entityLabel="Trick"
          checks={trickReadinessChecks(live)}
          publishedAt={live.publishedAt}
          canPublish={capabilities.canVetTrick}
          busy={publishBusy}
          error={publishError}
          onPublish={() => void handlePublish()}
          onUnpublish={() => void handleUnpublish()}
          className="lg:sticky lg:top-20"
        />
      </div>

      <TrickActionBar
        onValidationError={(section) => {
          setActiveTab(section.tab);
          // Reveal the hosting tab, then focus its first invalid field.
          setTimeout(() => section.focusFirstInvalid(), 0);
        }}
      />
    </div>
  );
}
