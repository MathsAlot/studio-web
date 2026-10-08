import { describe, expect, it } from 'vitest';

import { factDetail, trickDetail, variant } from '@/test/fixtures';
import { factReadinessChecks, trickReadinessChecks } from '@/lib/studio/trust';

function readyTrick() {
  return trickDetail({
    vettingStatus: 'VERIFIED',
    reviewStatus: 'APPROVED',
    variants: [
      variant({ id: 'v1', ageTier: 'FORMATIVE', reviewStatus: 'APPROVED' }),
      variant({ id: 'v2', ageTier: 'MIDRANGE', reviewStatus: 'APPROVED' }),
      variant({ id: 'v3', ageTier: 'MATURE', reviewStatus: 'APPROVED' }),
    ],
  });
}

describe('trickReadinessChecks', () => {
  it('passes every check for a fully verified, approved, complete Trick', () => {
    const checks = trickReadinessChecks(readyTrick());
    expect(checks.every((check) => check.passed)).toBe(true);
    expect(checks.map((check) => check.label)).toContain('All three age tiers present');
  });

  it('blocks an unapproved AI draft', () => {
    const checks = trickReadinessChecks(
      trickDetail({
        draftSource: 'AI',
        reviewStatus: 'NEEDS_REVIEW',
        vettingStatus: 'VERIFIED',
        variants: [
          variant({ id: 'v1', ageTier: 'FORMATIVE', reviewStatus: 'APPROVED' }),
          variant({ id: 'v2', ageTier: 'MIDRANGE', reviewStatus: 'APPROVED' }),
          variant({ id: 'v3', ageTier: 'MATURE', reviewStatus: 'APPROVED' }),
        ],
      }),
    );
    const ai = checks.find((check) => check.key === 'ai');
    expect(ai?.passed).toBe(false);
    expect(checks.every((check) => check.passed)).toBe(false);
  });

  it('blocks when a variant is not approved', () => {
    const trick = readyTrick();
    trick.variants[1] = { ...trick.variants[1]!, reviewStatus: 'NEEDS_REVIEW' };
    const checks = trickReadinessChecks(trick);
    expect(checks.find((check) => check.key === 'variants')?.passed).toBe(false);
  });
});

describe('factReadinessChecks', () => {
  it('requires verified vetting and an approved review', () => {
    const checks = factReadinessChecks(
      factDetail({ vettingStatus: 'VERIFIED', reviewStatus: 'APPROVED' }),
    );
    expect(checks.every((check) => check.passed)).toBe(true);
  });

  it('blocks an unvetted Fact', () => {
    const checks = factReadinessChecks(factDetail());
    expect(checks.find((check) => check.key === 'vetting')?.passed).toBe(false);
  });
});
