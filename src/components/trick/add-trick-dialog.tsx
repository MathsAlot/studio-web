'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';

import { ErrorAlert } from '@/components/error-alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import type { TrickKind } from '@/lib/api-client';
import { createTrick } from '@/lib/client/studio';
import { toNullableText } from '@/lib/studio/fields';

interface AddTrickDialogProps {
  worldId: string;
  worldName: string;
}

interface TrickFormErrors {
  name?: string;
  methodDescription?: string;
}

/** Create-Trick flow in a dialog, so the World's primary surface stays the list. */
export function AddTrickDialog({ worldId, worldName }: AddTrickDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<TrickKind>('STANDARD');
  const [methodDescription, setMethodDescription] = useState('');
  const [workedExample, setWorkedExample] = useState('');
  const [errors, setErrors] = useState<TrickFormErrors>({});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const methodRef = useRef<HTMLTextAreaElement>(null);

  function reset() {
    setName('');
    setKind('STANDARD');
    setMethodDescription('');
    setWorkedExample('');
    setErrors({});
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: TrickFormErrors = {};
    if (name.trim().length === 0) {
      nextErrors.name = 'Enter a Trick name.';
    }
    if (methodDescription.trim().length === 0) {
      nextErrors.methodDescription = 'Describe the method.';
    }
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.methodDescription) {
      (nextErrors.name ? nameRef : methodRef).current?.focus();
      return;
    }

    setCreating(true);
    setError(null);
    const trimmedExample = toNullableText(workedExample);
    const result = await createTrick(worldId, {
      name: name.trim(),
      kind,
      methodDescription: methodDescription.trim(),
      draftSource: 'HUMAN',
      ...(trimmedExample === null ? {} : { workedExample: trimmedExample }),
    });
    setCreating(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOpen(false);
    reset();
    router.push(`/tricks/${result.data.id}`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button">
          <Plus aria-hidden="true" />
          Add Trick
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a Trick</DialogTitle>
          <DialogDescription>
            New Tricks start as drafts in {worldName} and are ordered after the existing ones.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} aria-label="Add a Trick" autoComplete="off" noValidate>
          <div className="space-y-4">
            {error ? <ErrorAlert>{error}</ErrorAlert> : null}
            <FormField id="new-trick-name" label="Name" required error={errors.name}>
              {(control) => (
                <Input
                  {...control}
                  ref={nameRef}
                  value={name}
                  placeholder="e.g. Addition with carrying"
                  onChange={(event) => setName(event.target.value)}
                  maxLength={200}
                />
              )}
            </FormField>
            <FormField id="new-trick-kind" label="Kind" required className="max-w-xs">
              {(control) => (
                <NativeSelect
                  {...control}
                  value={kind}
                  onChange={(event) => setKind(event.target.value as TrickKind)}
                >
                  <option value="STANDARD">Standard</option>
                  <option value="CAPSTONE">Capstone</option>
                </NativeSelect>
              )}
            </FormField>
            <FormField
              id="new-trick-method"
              label="Method description"
              required
              error={errors.methodDescription}
              hint="The core method the learner is taught."
            >
              {(control) => (
                <Textarea
                  {...control}
                  ref={methodRef}
                  value={methodDescription}
                  placeholder="Describe the method in one or two sentences."
                  onChange={(event) => setMethodDescription(event.target.value)}
                  maxLength={8000}
                  rows={3}
                />
              )}
            </FormField>
            <FormField
              id="new-trick-example"
              label="Worked example"
              hint="Optional. A concrete example that shows the method."
            >
              {(control) => (
                <Textarea
                  {...control}
                  value={workedExample}
                  placeholder="e.g. 27 + 15 = 42"
                  onChange={(event) => setWorkedExample(event.target.value)}
                  maxLength={8000}
                  rows={2}
                />
              )}
            </FormField>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating} aria-busy={creating}>
              <Plus aria-hidden="true" />
              {creating ? 'Creating…' : 'Create Trick'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
