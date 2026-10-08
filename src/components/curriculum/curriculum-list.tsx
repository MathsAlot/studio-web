'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Plus } from 'lucide-react';

import { CurriculumCompletionSummary } from '@/components/curriculum/completion-summary';
import { ContentStatusBadge } from '@/components/status-badge';
import { EmptyState } from '@/components/empty-state';
import { ErrorAlert } from '@/components/error-alert';
import { FormActions } from '@/components/form-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { VersionField, versionError } from '@/components/ui/version-field';
import type { ContentStatus, CurriculumSummary } from '@/lib/api-client';
import { createCurriculum } from '@/lib/client/studio';
import {
  CONTENT_STATUSES,
  CONTENT_STATUS_LABELS,
  asText,
  toNullableText,
} from '@/lib/studio/fields';
import type { StudioCapabilities } from '@/lib/studio/permissions';

interface CurriculumListProps {
  worldId: string;
  worldName: string;
  initialCurricula: CurriculumSummary[];
  capabilities: StudioCapabilities;
}

interface CurriculumFormErrors {
  name?: string;
  version?: string;
}

/**
 * Curricula for one World (FR-12). Read is open to any authenticated Staff or
 * Admin user; create is offered only when `curriculum.write` is held, and the
 * API still authorizes every write.
 */
export function CurriculumList({
  worldId,
  worldName,
  initialCurricula,
  capabilities,
}: CurriculumListProps) {
  const [curricula, setCurricula] = useState<CurriculumSummary[]>(initialCurricula);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('v1');
  const [status, setStatus] = useState<ContentStatus>('DRAFT');
  const [errors, setErrors] = useState<CurriculumFormErrors>({});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const versionRef = useRef<HTMLInputElement>(null);

  const readOnly = !capabilities.canWriteCurriculum;

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nameError = name.trim().length === 0 ? 'Enter a Curriculum name.' : undefined;
    const versionValidation = versionError(version) ?? undefined;
    setErrors({ name: nameError, version: versionValidation });
    if (nameError) {
      nameRef.current?.focus();
      return;
    }
    if (versionValidation) {
      versionRef.current?.focus();
      return;
    }
    setCreating(true);
    setError(null);
    setNotice(null);

    const result = await createCurriculum(worldId, {
      name: name.trim(),
      version: version.trim(),
      description: toNullableText(description),
      status,
    });
    setCreating(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    setCurricula((current) => [...current, result.data]);
    setName('');
    setDescription('');
    setVersion('v1');
    setStatus('DRAFT');
    setErrors({});
    setNotice(`Created “${result.data.name}”.`);
  }

  return (
    <div className="space-y-6">
      {error ? <ErrorAlert>{error}</ErrorAlert> : null}
      {notice ? (
        <p role="status" aria-live="polite" className="text-body-sm text-success-foreground">
          {notice}
        </p>
      ) : null}

      {readOnly ? (
        <p role="status" className="text-body-sm text-muted-foreground">
          Read-only: you do not hold <code className="font-mono">curriculum.write</code>.
        </p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2
                id="create-curriculum-heading"
                className="text-heading-2 font-semibold text-foreground"
              >
                New Curriculum
              </h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleCreate}
              aria-labelledby="create-curriculum-heading"
              autoComplete="off"
              noValidate
              className="space-y-4"
            >
              <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
                <FormField id="curriculum-name" label="Name" required error={errors.name}>
                  {(control) => (
                    <Input
                      {...control}
                      ref={nameRef}
                      value={name}
                      placeholder="e.g. Addition Core"
                      onChange={(event) => setName(event.target.value)}
                      maxLength={200}
                    />
                  )}
                </FormField>
                <VersionField
                  id="curriculum-version"
                  value={version}
                  inputRef={versionRef}
                  onChange={setVersion}
                  error={errors.version}
                />
              </div>
              <FormField
                id="curriculum-description"
                label="Description"
                hint="Optional. Leave blank to clear."
                className="max-w-2xl"
              >
                {(control) => (
                  <Textarea
                    {...control}
                    value={description}
                    placeholder="What this Curriculum covers."
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={2000}
                    rows={2}
                  />
                )}
              </FormField>
              <FormField id="curriculum-status" label="Status" required className="max-w-xs">
                {(control) => (
                  <NativeSelect
                    {...control}
                    value={status}
                    onChange={(event) => setStatus(event.target.value as ContentStatus)}
                  >
                    {CONTENT_STATUSES.map((option) => (
                      <option key={option} value={option}>
                        {CONTENT_STATUS_LABELS[option]}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </FormField>
              <FormActions>
                <Button type="submit" disabled={creating} aria-busy={creating}>
                  <Plus aria-hidden="true" />
                  {creating ? 'Creating…' : 'Create Curriculum'}
                </Button>
              </FormActions>
            </form>
          </CardContent>
        </Card>
      )}

      {curricula.length === 0 ? (
        <EmptyState
          title="No Curricula for this World yet."
          description="Create a Curriculum to group Tricks into ordered Sequences."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <Table>
            <TableCaption className="sr-only">Curricula for {worldName}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Curriculum</TableHead>
                <TableHead className="w-24">Version</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead>Completion</TableHead>
                <TableHead className="w-56 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {curricula.map((curriculum) => (
                <TableRow key={curriculum.id}>
                  <TableCell className="whitespace-normal align-top">
                    <span className="text-body font-semibold text-foreground">
                      {curriculum.name}
                    </span>
                    {asText(curriculum.description).length > 0 ? (
                      <p className="max-w-2xl text-body-sm text-muted-foreground">
                        {asText(curriculum.description)}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-mono align-top">{curriculum.version}</TableCell>
                  <TableCell className="align-top">
                    <ContentStatusBadge status={curriculum.status} />
                  </TableCell>
                  <TableCell className="whitespace-normal align-top">
                    <CurriculumCompletionSummary completion={curriculum.completion} />
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex justify-end">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/worlds/${worldId}/curriculums/${curriculum.id}`}>
                          Open Sequence builder
                          <ArrowRight aria-hidden="true" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
