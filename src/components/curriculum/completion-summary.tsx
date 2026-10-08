import { CircleCheck, TriangleAlert } from 'lucide-react';

import type { CurriculumCompletion, SequenceDetail } from '@/lib/api-client';
import { StatusBadge } from '@/components/status-badge';
import { asText } from '@/lib/studio/fields';

/**
 * Server-computed completion readouts (D-024). These render only values the
 * API reported — curriculum rollups and per-Sequence counts. They never
 * recompute or infer readiness.
 */

export function CurriculumCompletionSummary({ completion }: { completion: CurriculumCompletion }) {
  return (
    <p
      data-testid="curriculum-completeness"
      className="font-mono text-body-sm text-muted-foreground"
    >
      {completion.sequenceCount} Sequences · {completion.completeSequenceCount} complete ·{' '}
      {completion.assignmentCount} role assignments · {completion.coveredTrickCount} Tricks covered
      · {completion.introduceCount} introduce / {completion.retainCount} retain /{' '}
      {completion.revisitCount} revisit · {completion.completionPercent}% complete
    </p>
  );
}

/**
 * Per-Sequence completeness. `isComplete` and the role counts come straight
 * from the server. The "Missing" line only echoes server-reported fields: an
 * empty objective, a null difficulty description, and a zero assignment count.
 * It never labels a Sequence "ready"; the server does not report readiness here.
 */
export function SequenceCompletionSummary({ sequence }: { sequence: SequenceDetail }) {
  const { completion } = sequence;
  const missing: string[] = [];
  if (sequence.objective.trim().length === 0) {
    missing.push('objective');
  }
  if (asText(sequence.difficultyDescription).trim().length === 0) {
    missing.push('difficulty description');
  }
  if (completion.assignmentCount === 0) {
    missing.push('Trick assignments');
  }

  return (
    <div
      data-testid="sequence-completeness"
      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-muted-foreground"
    >
      <StatusBadge
        tone={completion.isComplete ? 'success' : 'warning'}
        icon={completion.isComplete ? CircleCheck : TriangleAlert}
      >
        {completion.isComplete ? 'Complete' : 'Incomplete'}
      </StatusBadge>
      <span className="font-mono">
        {completion.assignmentCount} assignments ({completion.introduceCount} introduce /{' '}
        {completion.retainCount} retain / {completion.revisitCount} revisit)
      </span>
      {missing.length > 0 ? (
        <span className="text-warning-foreground">· Missing: {missing.join(', ')}</span>
      ) : null}
    </div>
  );
}
